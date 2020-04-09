const config = require('./config.json')
const database = require('./database')
const fun = require('./fun')

const fs = require('fs');
const fetch = require('node-fetch')

const Telegraf = require('telegraf')

var warnedChats = [];

const bot = new Telegraf(config['token']);

var queueStatus = false;
var queue = [];

execNextOp = async () => {
    if (queue.length > 0) {
        var [ctx, fn] = queue.shift();
        fn(ctx)
            .then(execNextOp)
            .catch(err => {
                console.log(err);
                queue.push([ctx, fn]);
            });
    }
    else
        queueStatus = false;
}

enqueue = (ctx, fn) => {
    queue.push([ctx, fn]);

    if (!queueStatus)
        queueStatus = true;
    else
        return;

    execNextOp();
}

onMessage = (ctx) => new Promise(async (rs, rj) => {

    if (ctx.from.is_bot) {
        rs();
        return;
    }

    if (!(ctx.chat.type == 'group' || ctx.chat.type == 'supergroup')) {
        if (!warnedChats.includes(ctx.chat.id)) {
            await ctx.reply('È possibile usare questo bot solo in un gruppo o in un supergruppo.')

            warnedChats.push(ctx.chat.id)
        }

        rs();
        return;
    }

    database.updateGroupMember(ctx.from.id, ctx.chat.id, ctx.from.username, ctx.message.date * 1000)
        .then(() => {
            database.updateGroupMembersUsername(ctx.from.id, ctx.from.username)
                .then(rs)
                .catch(err => {
                    console.log(err); rs();
                })
        })
        .catch(rj)
})

onClassify = (ctx) => new Promise(async (rs, rj) => {
    database.getTopTenGroup(ctx.chat.id)
        .then(async users => {
            var message = "<i>Classifica</i>\n\n";
            users.forEach((user, i) => {
                message += `${i + 1}. <b>${user['tg_username'].replace(/\s+$/, '')}</b>: ${user['message_count_total']}\n`
            });
            
            await ctx.replyWithHTML(message); rs();
        }).catch(rj)
})

onDailyClassify = (ctx) => new Promise(async (rs, rj) => {
    database.getTopTenDayGroup(ctx.chat.id)
        .then(async users => {
            var message = "<i>Classifica giornaliera</i>\n\n";
            users.forEach((user, i) => {
                message += `${i + 1}. <b>${user['tg_username'].replace(/\s+$/, '')}</b>: ${user['message_count_today']}\n`
            });

            await ctx.replyWithHTML(message); rs();
        }).catch(rj);
})

getPicture = (ctx) => new Promise((rs, rj) => {
    if (ctx.message.photo) {
        var fileId = ctx.message.photo.pop()['file_id'];

        ctx.telegram.getFileLink(fileId).then(url => {
            return fetch(url)
                .then(result => result.buffer())
                .then(rs)
                .catch(rj)
        })
    } else
        rs(null);
});

const funCommands = [
    { cmd: '/memino', exec: fun.fry }
]

bot.on('message', async (ctx, next) => {
    console.log("Message time: " + ctx.message.date)

    if (ctx.message.caption) {
        var command = ctx.message.caption.split(' ')[0], index;
        if ((index = funCommands.findIndex(x => x.cmd == command)) != -1) {
            getPicture(ctx)
                .then(result => {
                    if (result == null) {
                        ctx.reply("You need to specify a photo to process.");
                        return;
                    }

                    var params = ctx.message.caption.split(' ');
                    params.shift();

                    funCommands[index]
                        .exec(result, params)
                        .then(img => {
                            ctx.replyWithPhoto({ source: img })
                        })
                        .catch(err => {
                            console.log(err)
                            ctx.reply("Could not process the picture. The error has been logged.")
                        })
                })
                .catch(err => {
                    console.log(err)
                    ctx.reply("Could not download the picture. The error has been logged.");
                })
        }
    }

    if (ctx.message.text) {
        if (['/', '.'].includes(ctx.message.text.charAt(0))) {
            next();
            return;
        }
    }

    enqueue(ctx, onMessage);
    next();
});

bot.command('classifica_giornaliera', (ctx, next) => {
    enqueue(ctx, onDailyClassify); next()
})

bot.command('classifica', (ctx, next) => {
    enqueue(ctx, onClassify); next()
})

bot.launch()