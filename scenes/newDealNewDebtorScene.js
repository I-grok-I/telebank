const { Telegraf, Markup, Composer, Scenes } = require('telegraf');
const bot = new Telegraf(process.env.BOT_TOKEN);
const db = require('../db/db');
const constants = require('../constants');
 

const askFirstName = new Composer()
askFirstName.on('callback_query', async (ctx) => {
  ctx.session.data = {}
  ctx.session.data.user_id = ctx.update.callback_query.from.id
  db.all(constants.GET_EMPLOYEES_SQL, [], (err, rows) => {
    if (err) console.log(err.message)
    if (rows.find(row => row.tg_id == ctx.session.data.user_id)) {
      let employee = rows.find(row => row.tg_id == ctx.session.data.user_id)
      ctx.session.data.user_id = employee.id
    } else {
      ctx.reply(`Ошибка. Работника с telegram id ${ctx.session.data.user_id} нет в базе данных.`)
      ctx.scene.leave()
    } 
  })
  await ctx.reply('Напишите имя покупателя', constants.LEAVE_WIZARD_BTN)
  await ctx.wizard.next()
})

const askLastName = new Composer()
askLastName.on('message', async (ctx) => {
  if (ctx.message.text == 'Отменить сделку') {
    await ctx.reply('Главное меню', constants.MAIN_MENU_BTNS)
    await ctx.scene.leave()
  } else if (ctx.message.text.length > 3) {
    ctx.session.data.newCustomerFirstName = ctx.message.text
    await ctx.reply('Введите фамилию покупателя', constants.LEAVE_WIZARD_BTN)
    await ctx.wizard.next()
  } else {
    await ctx.reply('Ошибка. Введите имя покупателя!', constants.LEAVE_WIZARD_BTN)
  }
})

const askAddress = new Composer()
askAddress.on('message', async (ctx) => {
  if (ctx.message.text == 'Отменить сделку') {
    await ctx.reply('Главное меню', constants.MAIN_MENU_BTNS)
    await ctx.scene.leave()
  } else if (ctx.message.text.length > 3) {
      ctx.session.data.newCustomerLastName = ctx.message.text
      await ctx.reply('Введите адрес покупателя', constants.LEAVE_WIZARD_BTN)
      await ctx.wizard.next()
    } else {
        await ctx.reply('Ошибка. Введите фамилию покупателя!', constants.LEAVE_WIZARD_BTN)
    }
})

const askPhone = new Composer()
askPhone.on('message', async (ctx) => {
  if (ctx.message.text == 'Отменить сделку') {
    await ctx.reply('Главное меню', constants.MAIN_MENU_BTNS)
    await ctx.scene.leave()
  } else if (ctx.message.text.length > 3) {
    ctx.session.data.newAddress = ctx.message.text
    await ctx.reply('Введите телефон покупателя в формате 89123456789', constants.LEAVE_WIZARD_BTN)
    await ctx.wizard.next()
  } else {
    await ctx.reply('Ошибка. Введите адрес покупателя!', constants.LEAVE_WIZARD_BTN)
  }
})

const askComment = new Composer()
askComment.on('message', async (ctx) => {
  if (ctx.message.text == 'Отменить сделку') {
    await ctx.reply('Главное меню', constants.MAIN_MENU_BTNS)
    await ctx.scene.leave()
  } else if (ctx.message.text.length !== 11 || ctx.message.text.match(/\D/gi)) {
      await ctx.reply('Введите Номер телефона в формате 89123456677', constants.LEAVE_WIZARD_BTN)
    } else {
      ctx.session.data.newPhone = ctx.message.text
      await ctx.reply('Напишите комментарий к покупателю', constants.LEAVE_WIZARD_BTN)
      await ctx.wizard.next()
    }
})

const askPhoto = new Composer()
askPhoto.on('message', async (ctx) => {
  if (ctx.message.text == 'Отменить сделку') {
    await ctx.reply('Главное меню', constants.MAIN_MENU_BTNS)
    await ctx.scene.leave()
  } else {
    ctx.session.data.newComment = ctx.message.text
    await ctx.reply('Отправьте фото покупателя или нажмите "без фото"', Markup.keyboard([['без фото', 'Отменить сделку']]).oneTime().resize())
    await ctx.wizard.next()
  }
})

const someStep = new Composer();
someStep.on('message', async (ctx)=> {
    if (ctx.message.photo || ctx.message.text == 'без фото') {
      ctx.session.data.newCustomerPhoto = ctx.message.photo ? ctx.message.photo[ctx.message.photo.length - 1].file_id : 'AgACAgIAAxkBAAIBI2PtTwABKtOBXXVWqTw92tQAAeJq1X8AAsfKMRti-WlLkyQThRFSZZgBAAMCAAN4AAMuBA'
      let customer_insert_data = [ctx.session.data.newCustomerLastName, ctx.session.data.newCustomerFirstName, ctx.session.data.newAddress, ctx.session.data.newPhone, ctx.session.data.newComment, 0, ctx.session.data.newCustomerPhoto]
      db.serialize(() => {
        db.run(constants.CUSTOMER_INSERT_SQL, customer_insert_data, (err) => {
          if (err) console.log(err.message);
          console.log(ctx.session.data)
          console.log('покупатель успешно добавлен')      
        })
        db.get('SELECT * FROM customers WHERE phone = (?) AND last_name = (?) AND first_name = (?)', [ctx.session.data.newPhone, ctx.session.data.newCustomerLastName, ctx.session.data.newCustomerFirstName], async (err, row) => {
          if (err) console.log(err);
          await ctx.reply('Покупатель сохранён. Оформить новую сделку ?', Markup.inlineKeyboard([
            [Markup.button.callback('✅Оформить', `${row.customer_id}`)],
            [Markup.button.callback('❌Отменить заказ', `menu`)]
          ]))
        })
      })
      await ctx.wizard.next()
    } else if (ctx.message.text == 'Отменить сделку') {
      await ctx.reply('Главное меню', constants.MAIN_MENU_BTNS)
      await ctx.scene.leave()
    } else {
      await ctx.reply('Ошибка. Отправьте фото или нажмите "без фото"', Markup.keyboard([['без фото', 'Отменить сделку']]).oneTime().resize())
    }
})

const productName = new Composer()
productName.on('callback_query', async (ctx) => {
  await ctx.answerCbQuery()
  if (ctx.callbackQuery.data == 'menu') {
    await ctx.editMessageText('Главное меню', constants.MAIN_MENU_BTNS )
    await ctx.scene.leave()
  } else {
      db.all(constants.GET_CUSTOMER_SQL, [], (err, rows) => {
        if (err) console.log(err.message)
        let customer = rows.find(row => row.customer_id == ctx.callbackQuery.data)
        ctx.session.data.customerFullName = customer.last_name + ' ' + customer.first_name
        ctx.session.data.address = customer.address
        ctx.session.data.phone = customer.phone
        ctx.session.data.customer_id = customer.customer_id
      })
      let tappedButtonText = ctx.callbackQuery.message.reply_markup.inline_keyboard.find(item => item[0].callback_data == ctx.callbackQuery.data)[0].text;
      await ctx.editMessageReplyMarkup(Markup.inlineKeyboard([[Markup.button.callback(`${tappedButtonText}`,"_")]]))
      await ctx.reply('Введите наименование продукта', constants.LEAVE_WIZARD_BTN)
      await ctx.wizard.next()
  }
})

/* 
Если предыдущее сбщ - это текст и он длиннее 3 символов, то
имя продукта = предыдущему сообщению и NEXT(), а иначе отправляем сбщ об ошибке 
*/
const cost = new Composer()
cost.on('message', async (ctx) => {
  if (ctx.message.text == 'Отменить сделку') {
    await ctx.reply('Главное меню',constants.MAIN_MENU_BTNS)
    await ctx.scene.leave()
  } else if (ctx.message.text.length > 3) {
    ctx.session.data.title = ctx.message.text
    await ctx.reply('Введите стоимость продукта (Вводите только цифры)', constants.LEAVE_WIZARD_BTN)
    await ctx.wizard.next()
  } else {
    await ctx.reply('Ошибка. Введите наименование продукта!', constants.LEAVE_WIZARD_BTN)
  }
})

/* 
Если предыдущее сбщ - это не текст или в нём есть что-то кроме цифр, то
отправляем сбщ об ошибке, а иначе 
    сохраняем в стоимость товара предыдущее сбщ и приводим его к числовому значению;
    Отправляем инлайн клавиатуру из 18 кнопок, и просим выбрать срок рассрочки. текст - эмоджи, колбэк - цифра
    NEXT()
*/
const period = new Composer()
period.on('message', async (ctx) => {
  if (ctx.message.text == 'Отменить сделку') {
    await ctx.reply('Главное меню', constants.MAIN_MENU_BTNS)
    await ctx.scene.leave()
  } else if (!ctx.message.text || ctx.message.text.match(/\D/) || +ctx.message.text.length < 4) {
    await ctx.reply('Введите стоимость продукта (только цифры)!', constants.LEAVE_WIZARD_BTN)
  } else {
    ctx.session.data.cost = +ctx.message.text
    await ctx.reply('Выберите срок рассрочки (месяцы)', constants.PERIOD_BUTTONS)
    await ctx.wizard.next()
  }
})



const margin = new Composer()
margin.on('callback_query', async (ctx) => {
  await ctx.answerCbQuery()
  if (ctx.callbackQuery.data == 'menu') {
    await ctx.editMessageText('Главное меню', constants.MAIN_MENU_BTNS )
    await ctx.scene.leave()
  } else {
    ctx.session.data.period = +ctx.callbackQuery.data
    await ctx.reply('Выберите наценку (в процентах)', Markup.inlineKeyboard(constants.MARGIN_BUTTONS))
    await ctx.wizard.next()
  }
})

const guarantorStep = new Composer()
guarantorStep.on('callback_query', async (ctx) => {
  await ctx.answerCbQuery()
  if (ctx.callbackQuery.data == 'menu') {
    await ctx.editMessageText('Главное меню',constants.MAIN_MENU_BTNS )
    await ctx.scene.leave()
  } else {
    ctx.session.data.margin = +ctx.callbackQuery.data
    await ctx.reply(constants.ASK_GUARANTOR_TEXT, constants.LEAVE_WIZARD_BTN)
    await ctx.wizard.next()
  }
})

const photoStep = new Composer()
photoStep.on('message', async (ctx) => {
  if (ctx.message.text == 'Отменить сделку') {
    await ctx.reply('Главное меню', constants.MAIN_MENU_BTNS)
    await ctx.scene.leave()
  } else {
    ctx.session.data.guarantorData = ctx.message.text
    await ctx.reply('Отправьте фото продукта или фото продукта с покупателем')
    await ctx.wizard.next()
  }
})

const checkInfoStep = new Composer()
checkInfoStep.on('message', async (ctx) => {    
  if (ctx.message.photo) {
    ctx.session.data.monthlyPay = (ctx.session.data.cost / 100 * (100 + ctx.session.data.margin) / ctx.session.data.period).toFixed(0)
    ctx.session.data.sum = ctx.session.data.cost / 100 * (100 + ctx.session.data.margin).toFixed(0)
    ctx.session.data.photo = ctx.message.photo[ctx.message.photo.length - 1].file_id
    await bot.telegram.sendPhoto(ctx.chat.id, `${ctx.session.data.photo}`, {caption: `
👤
└${ctx.session.data.customerFullName}
└📍${ctx.session.data.address}
└📞: ${ctx.session.data.phone}

<b><i>${ctx.session.data.title}</i></b>
  └Стоимость: <b>${ctx.session.data.cost} ₽</b>
  └Период: <b>${ctx.session.data.period} мес.</b>
  └Наценка: <b>${ctx.session.data.margin} %</b> 
  └Общая сумма: <b>${ctx.session.data.sum} ₽</b>
  └Eжемесячный платёж: <b>${ctx.session.data.monthlyPay} ₽</b>

Поручитель(и): ${ctx.session.data.guarantorData}`,
parse_mode: 'HTML',
reply_markup: {inline_keyboard: constants.CHOICE_BUTTONS} })
await ctx.wizard.next()
  } else if (ctx.message.text == 'Отменить сделку') {
    await ctx.reply('Главное меню',constants.MAIN_MENU_BTNS)
    await ctx.scene.leave()
  } else {
    await ctx.replyWithHTML('<b>Фото</b> не было принято. Попробуйте еще раз.')
  }
})

const updateDb = new Composer()
updateDb.on('callback_query', async (ctx) => {
  await ctx.answerCbQuery()
  if (ctx.callbackQuery.data == 'applyDeal') {
    let insertData = [
      ctx.session.data.title,
      ctx.session.data.cost,
      ctx.session.data.sum,
      ctx.session.data.customer_id,
      ctx.session.data.period,
      ctx.session.data.monthlyPay,
      ctx.session.data.photo,
      ctx.session.data.user_id,
      0,
      ctx.session.data.guarantorData
    ]
    db.run(constants.ORDER_INSERT_SQL, insertData, async (err) => {
      if (err) console.log(err.message)
      await ctx.editMessageReplyMarkup(Markup.inlineKeyboard([[Markup.button.callback('Сделка заключена✅', '__')]]))
      await ctx.reply(`✅ Сделка заключена\nОплата со следующего месяца?`, constants.CHOOSE_START_MON_BTNS)
      await ctx.wizard.next();  
    })
  } else if (ctx.callbackQuery.data == 'cancelDeal') {
      await ctx.editMessageReplyMarkup({ inline_keyboard: [[{text: "Сделка отменена", callback_data: "dealConfirmed"}]] })
      await ctx.reply('Главное меню', constants.MAIN_MENU_BTNS)
      await ctx.scene.leave()
    } else await ctx.answerCbQuery('Нажмите на кнопку!')
})

const addPaymentsStep = new Composer();
addPaymentsStep.on('message', async (ctx) => {
  if (ctx.message.text == '⏺ С этого') {
    db.get(constants.GET_ORDER_SQL, [ctx.session.data.title, ctx.session.data.monthlyPay], (err, row) => {
      if (err) console.log(err.message) 
      for (let i = 0; i < ctx.session.data.period; i++) {
          db.run(constants.INSERT_PAYMENTS_SQL, [row.id, ctx.session.data.monthlyPay, new Date(new Date().setMonth(new Date().getMonth() + i)).toISOString().slice(0, 10), 0], (err) => {
              err ? console.log(err.message) : console.log(this);
          })
      }
    })
    await ctx.replyWithHTML('<b>Платежи добавлены.. </b>✅')
    await ctx.scene.leave();
  } else if (ctx.message.text == 'Со следующего ⏭') {
      db.get(constants.GET_ORDER_SQL, [ctx.session.data.title, ctx.session.data.monthlyPay], (err, row) => {
        if (err)  console.log(err.message) 
        for (let i = 1; i < ctx.session.data.period+1; i++) {
          db.run(constants.INSERT_PAYMENTS_SQL, [row.id, ctx.session.data.monthlyPay, new Date(new Date().setMonth(new Date().getMonth() + i)).toISOString().slice(0, 10), 0], (err) => {
              err ? console.log(err.message) : console.log(this);
          })
        }
      })
    await ctx.replyWithHTML('<b>Платежи добавлены.. </b>✅')
    await ctx.scene.leave();
    } else {
      await ctx.reply('Ошибка. Выберите месяц начала платежей', constants.CHOOSE_START_MON_BTNS)
    }
})





const newDealNewDebtorScene = new Scenes.WizardScene('newDealNewDebtorScene', askFirstName, askLastName, askAddress, askPhone, askComment, askPhoto, someStep, productName, cost, period, margin, guarantorStep, photoStep, checkInfoStep, updateDb, addPaymentsStep)
module.exports = newDealNewDebtorScene

