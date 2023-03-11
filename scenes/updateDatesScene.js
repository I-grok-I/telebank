const {Telegraf, Markup, Composer, Scenes} = require('telegraf');
const constants = require('../constants');
const db = require('../db/db')
const fns = require('../functions')




const start = new Composer();
start.on('message', async (ctx) => {
  try {
    if (ctx.message.text.match(/\d\d/) && +ctx.message.text <32 && +ctx.message.text >0) {
        let currentOrder = +ctx.session.data.currentOrder
        let sql = `SELECT * FROM payments WHERE order_id = (?) AND is_paid = 0`
        db.all(sql, [currentOrder], async (err, rows) => {
          if (err) console.log(err.message)
          let newDates = rows.map((row) => row.payment_date.slice(0,8)+`${ctx.message.text}`)
          for (let i = 0; i < newDates.length; i++) {
            db.run(constants.UPDATE_DATES_SQL, [newDates[i], rows[i].payment_id], (e, rows) => {
              if (e) console.log(e.message)
              console.log('даты обновлены');
            })
          }
          await ctx.answerCbQuery('✅ День оплаты обновлен', {show_alert: true})
          await fns.showDealData(ctx, currentOrder)
          await ctx.scene.leave()
        })
      } else {
        await ctx.reply('Ошибка, введите день оплат. (например 15)')
      }
  } catch (e) {
    console.log(e.message);
  }
})




const updateDatesScene = new Scenes.WizardScene('updateDatesScene', start) 


module.exports = updateDatesScene