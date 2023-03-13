const { Telegraf, Markup, Scenes, session} = require('telegraf');
require('dotenv').config();
const bot = new Telegraf(process.env.BOT_TOKEN);
const db = require('./db/db')
const fns = require('./functions');
const updateDatesScene = require('./scenes/updateDatesScene')
const insertPaymentScene = require('./scenes/insertPaymentScene');
const addNewEmpScene = require('./scenes/addNewEmpScene');
const newDealOldDebtorScene = require('./scenes/newDealOldDebtorScene');
const newDealNewDebtorScene = require('./scenes/newDealNewDebtorScene');
const updateCommentScene = require('./scenes/updateCommentScene');
const stage = new Scenes.Stage([addNewEmpScene, newDealOldDebtorScene, newDealNewDebtorScene, updateCommentScene, insertPaymentScene, updateDatesScene])



bot
.use(fns.catchErrs)
.use(session())
.use(stage.middleware())
.start( async (ctx) => fns.startBot(ctx) )
.command( 'getid', async (ctx) => ctx.replyWithHTML(`Ваш Telegram ID: <code>${ctx.message.from.id}</code>`) )
.action( 'menu', async (ctx) => fns.showMenu(ctx) )
.action( 'orderList', async (ctx) =>  fns.showDealsList(ctx) )
.action('deleteThisMsg', async (ctx) => await ctx.deleteMessage())
.action( /order:(.*)/, async (ctx) => {await ctx.answerCbQuery(); await fns.showDealData(ctx, ctx.match[1]) })
.action( /payAMonth:(.*)/, async (ctx) => fns.payAMonth(ctx) )
.action( /showCustomer:(.*)/, async (ctx) => fns.showCustomer(ctx) )
.action( /updateComment:(.*)/, async (ctx) => fns.updateComment(ctx) )
.action( 'employees', async (ctx) => fns.showEmployees(ctx) )
.action( /employee:(.*)/, async (ctx) => fns.showEmployee(ctx) )
.action( /deleteEmp:([0-9]+)/, async (ctx) => fns.deleteEmp(ctx) )
.action(/updateDates:(.*)/, async (ctx) => fns.updateDates(ctx))
.action( 'stats', async (ctx) => fns.showStats(ctx) )
.action( 'circulation', async (ctx)=> fns.getCirculation(ctx) )
.action( 'netProfit', async (ctx) => fns.getNet(ctx) )
.action( 'profit', async (ctx) => fns.getProfit(ctx) )
.action( 'empSales', async (ctx) => fns.empSales(ctx) )
.action( 'archive', async (ctx) => fns.getArchiveSalesInfo(ctx) )
.action( 'newDeal', async (ctx) => fns.initNewDeal(ctx))
.action( 'newDealOldDebtor', async (ctx) => {await ctx.answerCbQuery();await ctx.scene.enter('newDealOldDebtorScene')})
.action('newDealNewDebtor', async (ctx) => {await ctx.answerCbQuery(); await ctx.scene.enter('newDealNewDebtorScene')})
.action('addNewEmployee', async (ctx) => {await ctx.answerCbQuery(); await ctx.scene.enter('addNewEmpScene')})
.action(/insertPayment:(.*)/, async (ctx) => {await ctx.answerCbQuery(); await ctx.scene.enter('insertPaymentScene')})





bot.launch();
// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
                
                


