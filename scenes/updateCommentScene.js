const {Telegraf, Markup, Composer, Scenes} = require('telegraf');
const constants = require('../constants');
const db = require('../db/db')




const start = new Composer();
start.on('message', async (ctx) => {
    if (ctx.message.text) {
        let currentOrder = ctx.session.data.currentOrder
        db.run(constants.UPDATE_COMMENT_SQL, [`${ctx.message.text}`, currentOrder], async (err, row) => {
          if (err) {
            await ctx.reply(err.message)
          } else {
            await ctx.reply(`Комментарий обновлён.✅`, Markup.inlineKeyboard(constants.MAIN_MENU_BTNS))
            ctx.scene.leave()
          }
        })
    } 
})




const updateCommentScene = new Scenes.WizardScene('updateCommentScene', start) 


module.exports = updateCommentScene