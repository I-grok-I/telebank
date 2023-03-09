const { Telegraf, Markup, Composer, Scenes } = require('telegraf');
const bot = new Telegraf(process.env.BOT_TOKEN);
const db = require('../db/db');
const constants = require('../constants');
const fns = require('../functions');


const start = new Composer()
start.on('callback_query', async (ctx) => {
  try {
    ctx.session.data = {}
    ctx.session.data.currentOrder = +ctx.match[1]
    console.log(ctx.session.data.currentOrder)
    await ctx.reply('Введите сумму платежа')
    await ctx.wizard.next()
  } catch (e) {
    console.log(e.message);
  }
})

const second = new Composer()
second.on('message', async (ctx) => {
  try {
    if ( ctx.message.text.match(/\D/giu) ) {
      await ctx.reply('Вводите только цифры!')
    } else {
        db.all(constants.GET_UNPAID_PAYMENTS_SQL, [ctx.session.data.currentOrder], async (err, pays) => {
          if (err) console.log(err.message);
          if (ctx.message.text < pays[0].payment_sum) { 
            let sql = `UPDATE PAYMENTS SET payment_sum = (?) WHERE payment_id = (?) AND is_paid = 0`
            db.run(sql, [pays[0].payment_sum-ctx.message.text, pays[0].payment_id], async (err, rows) => {
              if (err) console.log(err.message)
            })
            let sql2 = `INSERT INTO PAYMENTS (order_id, payment_sum, payment_date, is_paid) VALUES (?,?,?,?)`
            db.run(sql2, [ctx.session.data.currentOrder, +ctx.message.text, new Date(new Date().setMonth(new Date().getMonth())).toISOString().slice(0, 10), 1], async (err, rows) => {
              if (err) console.log(err.message)
            })
            await fns.showDealData(ctx, ctx.session.data.currentOrder)
            await ctx.scene.leave()
          } else if (ctx.message.text == pays[0].payment_sum){
              db.run(constants.UPDATE_PAYMENTS_SQL, [pays[0].payment_id], (err) => {
                if (err) console.log(err)
                console.log('Платеж обновлён')
              })
              await fns.showDealData(ctx, ctx.session.data.currentOrder)
              await ctx.scene.leave()
          } else if (ctx.message.text > pays[0].payment_sum) {
            await ctx.reply('Ошибка. Введите сумме не превышающую сумму платежа!')
          } 
        })
      }
  } catch (e) {
    console.log(e.message);
  }
})

const insertPaymentScene = new Scenes.WizardScene('insertPaymentScene', start, second)
module.exports = insertPaymentScene
