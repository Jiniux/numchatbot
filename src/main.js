const config = require('./config.json')
const database = require('./database')
const { Mutex } = require('async-mutex');

const Telegraf = require('telegraf')

var warnedChats = [];

const bot = new Telegraf(config.token);

var semaphore = new Mutex();

bot.on('message', async (ctx, next) => {
    if (ctx.from.is_bot) {
        next();
        return;
    }

    if (!(ctx.chat.type == 'group' || ctx.chat.type == 'supergroup')) {
        if (!warnedChats.includes(ctx.chat.id)) {
            await ctx.reply('È possibile usare questo bot solo in un gruppo o in un supergruppo.')
            
            warnedChats.push(ctx.chat.id)
        }
        
        next();
        return;
    }

    var release = await semaphore.acquire();
    database.updateGroupMember(ctx.from.id, ctx.chat.id, ctx.from.username)
    .then(() => {
        database.updateGroupMembersUsername(ctx.from.id, ctx.from.username)
            .then(() => { release(); next(); })
            .catch(err => {console.log(err); release(); next(); })
    })
    .catch(err => { console.log(err); release(); next();  })
});

bot.command('classifica_giornaliera', (ctx) => {
    database.getTopTenDayGroup(ctx.chat.id)
        .then(async users => {
            var message = "<i>Classifica giornaliera</i>\n\n";
            users.forEach((user, i) => {
                message += `${i+1}. <b>${user['tg_username'].replace(/\s+$/, '')}</b>: ${user['message_count_today']}\n`
            });
            
            await ctx.replyWithHTML(message)
        }).catch(err => {
            console.log(err)
        })
})

bot.command('classifica', (ctx) => {
    database.getTopTenGroup(ctx.chat.id)
        .then(async users => {
            var message = "<i>Classifica</i>\n\n";
            users.forEach((user, i) => {
                message += `${i+1}. <b>${user['tg_username'].replace(/\s+$/, '')}</b>: ${user['message_count_today']}\n`
            });
            
            await ctx.replyWithHTML(message)
        }).catch(err => {
            console.log(err)
        })
})

bot.launch()