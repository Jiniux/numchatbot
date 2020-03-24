const config = require('./config.json')
const database = require('./database')

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
    console.log("Message time: " + ctx.message.date)

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
                message += `${i + 1}. <b>${user['tg_username'].replace(/\s+$/, '')}</b>: ${user['message_count_today']}\n`
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

bot.on('message', async (ctx, next) => {
    if (ctx.message.text)
    {
        if (['/','.'].includes(ctx.message.text.charAt(0)))
        {
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