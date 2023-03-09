const { Telegraf, Markup, Scenes, session} = require('telegraf');
require('dotenv').config();
const bot = new Telegraf(process.env.BOT_TOKEN);
const db = require('./db/db')
const constants = require('./constants');

const catchErrs = async (ctx, next) => {
  try { 
    await next(); 
  } catch (err) {
      if (err.status === 400) console.log('Bad Request: The request was invalid or cannot be otherwise served.');
      else if (err.status === 401) console.log('Unauthorized: Authentication failed or user does not have permissions for the requested operation.');
      else if (err.status === 403) console.log('Forbidden: The request is valid, but the server is refusing to respond to it.');
      else if (err.status === 404) console.log('Not Found: The requested resource could not be found.');
      else if (err.status === 409) console.log('Conflict: The request could not be completed due to a conflict with the current state of the resource.');
      else if (err.status === 429) console.log('Too Many Requests: The user has sent too many requests in a given amount of time.');
      else if (err.status === 500) console.log('Internal Server Error: An unexpected condition was encountered by the server.');
      else console.log('An unexpected error has occurred.', err)
  }
}


const startBot = async (ctx) => {
  try {
    db.all(constants.GET_EMPLOYEES_SQL, async (err, rows) => {
      if (err) await ctx.reply(err.message)
      let employee = rows.find(employee => employee.tg_id == ctx.message.from.id)
      if (!employee) return ctx.reply('Вы не являетесь работником')
      await ctx.replyWithHTML(`Ассаламу 1алайкум! \n\n<b>Имя: ${employee.full_name}\nСтатус: ${employee.status}</b>`, 
      constants.MAIN_MENU_BTNS)
    })
  } catch (e) {
    console.log(e.message);
  }
} 

const showDealsList = async (ctx) => {
  try {
    await ctx.answerCbQuery()
    db.all(constants.GET_EMPLOYEES_SQL, [], async (err, rows) => {
      if (err) await ctx.reply(err.message)
      let userStatus = rows.find(employee => employee.tg_id == ctx.callbackQuery.from.id).status || 'Аноним'
      if (userStatus != '🔐 Администратор' && userStatus != '✍️ Продавец') {
        await ctx.answerCbQuery(`Недостаточно прав для просмотра. \nВаш статус: ${userStatus}`, {show_alert: true})
      } else {
        db.all(constants.GET_ALL_ORDERS_AND_PAYMENTS, [], async (err, rows) => {
          if (err) await ctx.reply(err.message)
          let buttons = rows.map((item) => {
            let today = new Date()
            let payday =  new Date(`${item.payment_date}`)
            let daysLeft = Math.ceil((payday.getTime() - today.getTime())/(1000 * 3600 * 24)+1)
            if (daysLeft < 4 && daysLeft > 0) return Markup.button.callback(`🟠${item.last_name} ${item.first_name[0]}.`, `order:${item.order_id}`)
            else if (daysLeft < 1 ) return Markup.button.callback(`🔴${item.last_name} ${item.first_name[0]}.`, `order:${item.order_id}`)
            else return Markup.button.callback(`${item.last_name} ${item.first_name[0]}.`, `order:${item.order_id}`)
          }).filter((item, index, arr) => index === arr.findIndex(i =>  i.callback_data === item.callback_data));
          let newButtons = [];
          while (buttons.length) newButtons.push(buttons.splice(0, 2));
          newButtons.push([Markup.button.callback(`🔙Назад`, `menu`)])
          await ctx.editMessageText('Текущие заказы', Markup.inlineKeyboard(newButtons))
        })
      }
    }) 
  } catch (e) {
    console.log(e.message);
  }
}



const getNet = (ctx) => {
  try {
    db.get(constants.GET_NET_PROFIT_SQL, [], async (err, row) => {
      if(err) await ctx.reply(err.message)
      await ctx.answerCbQuery(`Сумма всех оплаченных платежей: \n${row.net_profit}₽` ?? 'Данные для статистики отсутствуют..', {show_alert: true})
    })
  } catch (e) {
    console.log(e.message);
  }
}

const getProfit = async (ctx) => {
 try {
  db.get(constants.GET_PROFIT_SQL, [], async (err, row) => {
    if(err) await ctx.reply(err.message)
    await ctx.answerCbQuery(`Чистая прибыль: \n${row.net_profit}₽ \n (с оплаченных заказов)` ?? 'Данные для статистики отсутствуют..', {show_alert: true})
  })
 } catch (e) {
  console.log(e.message)
 } 
}


const empSales = async (ctx) => {
  try {
    await ctx.answerCbQuery()
    db.all(constants.GET_EMPLOYEES_SALES_SQL, [], async (err, rows) => {
      if (err) await ctx.reply(err.message)
      let employeeData = rows.map(row => `\n\n<b>👤 ${row.full_name}\n📞 ${row.phone} \nСумма продаж: ${row.sum}₽</b>`)
      await ctx.replyWithHTML(`${employeeData}` || 'Данные для статистики отсутствуют..')
    })
  } catch (e) {
    console.log(e.message);
  }
}


const getArchiveSalesInfo = async (ctx) => {
  try {
    await ctx.answerCbQuery()
    db.each(constants.GET_ALL_ORDERS, [], async (err, row) => {
        if(err) await ctx.reply(err.message)
        await ctx.replyWithHTML(`
Сотрудник: ${row.full_name}

Имя товара: ${row.title} 
Стоимость: ${row.cost}₽
Сумма сделки: ${row.order_sum}₽

Чистыми: ${row.order_sum - row.cost}₽` || 'Данные для статистики отсутствуют..')

    })
  } catch (e) {
    console.log(e.message);
  }
}


const updateComment = async (ctx) => {
  try {
    await ctx.answerCbQuery()
    let [,currentOrder] = ctx.match
    ctx.session.data = {}
    ctx.session.data.currentOrder = currentOrder
    db.get(constants.GET_ORDER_INFO_SQL, [currentOrder], async (err, row) => {
      if (err) await ctx.reply(err.message)
      await ctx.reply(`Введите новый комментарий для ${row.title}`)
      await ctx.scene.enter('updateCommentScene')
    })
    await ctx.scene.enter('updateCommentScene')
  } catch (e) {
    console.log(e.message);
  }
}

const initNewDeal = async (ctx) => {
  try {
    db.all(constants.GET_EMPLOYEES_SQL, [], async (err, rows) => {
      if (err) console.log(err.message)
      let userStatus = rows.find(employee => employee.tg_id == ctx.callbackQuery.from.id).status || 'Аноним'
      if (userStatus != '🔐 Администратор' && userStatus != '✍️ Продавец') {
        await ctx.answerCbQuery(`Недостаточно прав для просмотра. \nВаш статус: ${userStatus}`, {show_alert: true})
      } else {
        await ctx.editMessageText('Выберите действие')
        await ctx.editMessageReplyMarkup({inline_keyboard: constants.NEW_DEAL_BUTTONS})
      }
    })
  } catch (e) {
    console.log(e.message);
  }
}

const getCirculation = async (ctx) => {
  try {
    db.get(constants.GET_CIRCULAR_SQL, [], async (err, row) => {
      if(err) await ctx.reply(err.message)
      await ctx.answerCbQuery(`Сумма в обороте: ${row.circular}₽`, {show_alert: true})
    })
  } catch (e) {
    console.log(e.message);
  }
}

const showStats = async (ctx) => {
  try {
    await ctx.answerCbQuery()
    await ctx.editMessageText('Выберите тип статистики', Markup.inlineKeyboard(constants.STATS_BTNS))
  } catch (e) {
    console.log(e.message);
  }
} 

const deleteEmp = async (ctx) => {
  try {
    db.all(constants.GET_EMPLOYEES_SQL, [], async (err, rows) => {
      if (err) console.log(err.message);
      let userStatus = rows.find(employee => employee.tg_id == ctx.callbackQuery.from.id).status || 'Аноним'
      if (userStatus != '🔐 Администратор') {
          await ctx.answerCbQuery(`Недостаточно прав для удаления. \nВаш статус: ${userStatus}`, {show_alert: true})
      } else {
        let [,,employee] = ctx.match
        await ctx.editMessageReplyMarkup({inline_keyboard:[[{text:"Сотрудник удалён", callback_data:"userIsDeleted"}]] })
        let sql = `DELETE FROM employees WHERE id = (?)`
        db.run(sql,[employee], async (err) => {
          if (err) console.log(err.message)
          await ctx.reply('сотрудник был удалён..') 
        })
      }
    })
  } catch (e) {
    console.log(e.message);
  }
}

const showEmployees = async (ctx) => {
  try {
    db.all(constants.GET_EMPLOYEES_SQL, [], async (err, rows) => {
      if(err) console.log(err.message)
      let employeeBtns = rows.map(item => [Markup.button.callback(`${item.full_name}`, `employee:${item.id}`)])
      employeeBtns.push([Markup.button.callback(`🔙Назад`, `menu`), Markup.button.callback(`➕Добавить`, `addNewEmployee`)])
      await ctx.answerCbQuery()
      await ctx.editMessageText('Выберите сотрудника')
      await ctx.editMessageReplyMarkup({inline_keyboard: employeeBtns})
    })
  } catch (e) {
    console.log(e.message);
  }
}

const showEmployee = async (ctx) => {
  try {
    await ctx.deleteMessage()
    let sql = `SELECT * FROM employees`
    db.all(sql, [], async (err, rows) => {
      if(err)console.log(err.message)
      await ctx.answerCbQuery()
      let [,matchedEmp] = ctx.match
      let employee = rows.find(row => row.id == matchedEmp)
      await ctx.telegram.sendPhoto(ctx.chat.id, `${employee.photo}`, {
        caption: `
  Имя: ${employee.full_name}
  Статус: ${employee.status}
  Личный номер: ${employee.phone}
  ✉️<a href="tg://user?id=${employee.tg_id}">Написать</a>` ,
        reply_markup: {
          inline_keyboard: [
            [{text: 'Удалить сотрудника', callback_data: `deleteEmp:${employee.id}`}],
            [{text: '🔙Назад', callback_data: `menu`}],
          ]
        }, parse_mode: 'HTML'
      })
    })
  } catch (e) {
    console.log(e.message);
  }
}

const showDealData = async (ctx, currentOrder) => {
  try {
    db.all(constants.GET_ORDER_INFO_SQL, [currentOrder], (err, rows) => {
      if (err) console.log(err.message)
      let orderPhoto = rows[0].photo_id
      let customerFullName = rows[0].last_name + ' ' + rows[0].first_name
      let customerPhone = rows[0].phone
      let customerAddress = rows[0].address
      let productName = rows[0].title
      let cost = rows[0].cost
      let sum = rows[0].order_sum
      let extraCharge = sum-cost
      let guarantor_info = rows[0].guarantor_info
      let comment = rows[0].order_comment
  
      let payments = rows.map(item => {
        let today = new Date()
        let payday =  new Date(`${item.payment_date}`)
        let daysLeft = Math.ceil((payday.getTime() - today.getTime())/(1000 * 3600 * 24)+1)
        if (item.is_paid == 1) return `\n 🟢 ${item.payment_date.split('-').reverse().join('-')} ${item.payment_sum} ₽`
        else if (daysLeft < 4 && daysLeft > 0) return `\n 🟠 ${item.payment_date.split('-').reverse().join('-')} ${item.payment_sum} ₽`
        else if (daysLeft > 4) return `\n ⚪️ ${item.payment_date.split('-').reverse().join('-')} ${item.payment_sum} ₽`
        else if ( daysLeft < 1) return `\n 🔴 ${item.payment_date.split('-').reverse().join('-')} ${item.payment_sum} ₽`
      })
      bot.telegram.sendPhoto(ctx.chat.id,`${orderPhoto}`, 
      {caption: 
  `👤
  └ ${customerFullName}
  └ ${customerPhone}
  └ ${customerAddress}
  
  <i>${productName}</i>
    └Стоимость ${cost} ₽
    └Переплата ${extraCharge} ₽
    └Всего ${sum} ₽
  
  Платежи: ${payments.sort((a, b) => a - b)} 
  
  Поручитель: ${guarantor_info}
  
  Комментарий: ${comment}`, parse_mode: 'HTML', reply_markup:{inline_keyboard: [
        [{text:'Подтвердить оплату', callback_data: `payAMonth:${currentOrder}`}],
        [{text:'Изменить комментарий', callback_data: `updateComment:${currentOrder}`}],
        [{text:'Внести сумму', callback_data: `insertPayment:${currentOrder}`}],
        [{text:'🔙Назад', callback_data: 'menu'}],
        ]}
      })
    })
  } catch (e) {
    console.log(e.message);
  }
}


const payAMonth = async (ctx) => {
  try {
    await ctx.answerCbQuery()
    let [,currentOrder] = ctx.match
    db.all(constants.GET_UNPAID_PAYMENTS_SQL, [currentOrder], async (err, rows) => {
      if (err) console.log(err.message)
      console.log(rows)
      console.log(rows.length)
      if (rows.length > 1) {
        db.run(constants.UPDATE_PAYMENTS_SQL, [rows[0].payment_id], (err) => {
          if (err) console.log(err)
          console.log('Платеж обновлён')
        })
        db.all(constants.GET_ORDER_INFO_SQL, [currentOrder], async (err, rows) => {
          if (err) console.log(err.message)
          let customerFullName = rows[0].last_name + ' ' + rows[0].first_name
          let customerPhone = rows[0].phone
          let customerAddress = rows[0].address
          let productName = rows[0].title
          let cost = rows[0].cost
          let sum = rows[0].order_sum
          let extraCharge = sum-cost
          let guarantor_info = rows[0].guarantor_info
          let comment = rows[0].order_comment
          let payments = rows.map(item => {
          let today = new Date()
          let payday =  new Date(`${item.payment_date}`)
          let daysLeft = Math.ceil((payday.getTime() - today.getTime())/(1000 * 3600 * 24)+1)
          if (item.is_paid == 1) return `\n🟢 ${item.payment_date.split('-').reverse().join('-')} ${item.payment_sum} ₽`
          else if (daysLeft < 4 && daysLeft > 0) return `\n🟠 ${item.payment_date.split('-').reverse().join('-')} ${item.payment_sum} ₽`
          else if (daysLeft > 4) return `\n⚪️ ${item.payment_date.split('-').reverse().join('-')} ${item.payment_sum} ₽`
          else if ( daysLeft < 1) return `\n🔴 ${item.payment_date.split('-').reverse().join('-')} ${item.payment_sum} ₽`  
          })
          console.log(payments);
          await ctx.editMessageCaption(
          {caption: 
  `👤
  └ ${customerFullName}
  └ ${customerPhone}
  └ ${customerAddress}
        
  <i>${productName}</i>
    └Стоимость ${cost} ₽
    └Переплата ${extraCharge} ₽
    └Всего ${sum} ₽
    
  Платежи: ${payments.sort((a, b) => a - b)}
    
  Поручитель: ${guarantor_info}
  
  Комментарий: ${comment}`, parse_mode: 'HTML', reply_markup: {inline_keyboard: [
            [{text:'Подтвердить оплату', callback_data: `payAMonth:${currentOrder}`}],
            [{text:'Изменить комментарий', callback_data: `updateComment:${currentOrder}`}],
            [{text:'Внести сумму', callback_data: `insertPayment:${currentOrder}`}],
            [{text:'Назад', callback_data: 'menu'}],
            ]}
          })
        })
      } else {
          console.log(ctx.update)
          db.serialize(() => {
            db.run(constants.UPDATE_ORDER_IS_PAYED_SQL, [currentOrder], async (err, rows)=> {
              if (err) await ctx.reply(err.message)
              await ctx.reply('Сделка завершена✅')
            })
            db.run(constants.UPDATE_PAYMENTS_SQL, [rows[0].payment_id], (err) => {
              if (err) console.log(err)
              console.log('Платеж обновлён')
            })
            db.all(constants.GET_ORDER_INFO_SQL, [currentOrder], async (err, rows) => {
            if (err) console.log(err.message)
            let customerFullName = rows[0].last_name + ' ' + rows[0].first_name
            let customerPhone = rows[0].phone
            let customerAddress = rows[0].address
            let productName = rows[0].title
            let cost = rows[0].cost
            let sum = rows[0].order_sum
            let extraCharge = sum-cost
            let guarantor_info = rows[0].guarantor_info
            let comment = rows[0].order_comment
  
            let payments = rows.map(item => item.is_paid == 0? `\n ⚪️${item.payment_date} ${item.payment_sum} ₽` : `\n🟢 ${item.payment_date} ${item.payment_sum} ₽`)
            console.log(payments);
            await ctx.editMessageCaption(
              {caption: 
  `👤
  └ ${customerFullName}
  └ ${customerPhone}
  └ ${customerAddress}
        
  <i>${productName}</i>
    └Стоимость ${cost}
    └Переплата ${extraCharge}
    └Всего ${sum}
    
  Платежи: ${payments.sort((a, b) => a - b)}
    
  Поручитель: ${guarantor_info}
  
  Комментарий: ${comment}`,
  parse_mode: 'HTML', reply_markup: {inline_keyboard: [[{text:'🔙Назад', callback_data: 'menu'}],]}
            })
          })
        })
      }
    })
  } catch (e) {
    console.log(e.message);
  }
}


const showMenu = async (ctx) => {
  try {
    await ctx.answerCbQuery()
    await ctx.deleteMessage();
    await ctx.reply('Главное меню', constants.MAIN_MENU_BTNS)
  } catch (e) {
    console.log(e.message);
  }
}


module.exports = {
  getNet, 
  empSales, 
  getArchiveSalesInfo, 
  updateComment, 
  initNewDeal, 
  getCirculation, 
  showStats,
  deleteEmp,
  showEmployees,
  showEmployee,
  showDealsList,
  startBot,
  showDealData,
  payAMonth,
  showMenu,
  catchErrs,
  getProfit
}