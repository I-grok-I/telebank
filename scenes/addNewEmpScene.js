const {Telegraf, Markup, Composer, Scenes} = require('telegraf');
const constants = require('../constants');
const bot = new Telegraf('5917878557:AAFZK9yI3Qju7-UfpyM1J-K5wyI626vLmQ4');
const db = require('../db/db')

const askFullName = new Composer()
askFullName.on(`callback_query`, async (ctx) => {
    try {
        db.all(constants.GET_EMPLOYEES_SQL, [], async (err, rows) => {
            if (err) console.log(err.message);
            let userStatus = rows.find(employee => employee.tg_id == ctx.callbackQuery.from.id).status || 'Аноним'
            if (userStatus != '🔐 Администратор') {
                await ctx.reply(`Недостаточно прав для добавления сотрудников. \nВаш статус: ${userStatus}`, {show_alert: true})
                await ctx.scene.leave()
            } else {
                await ctx.answerCbQuery()
                ctx.session.data = {}
                await ctx.reply(`Напишите имя нового работника`)
                await ctx.wizard.next()
            }
        })
    } catch (e) {
      console.log(e.message);
    }
})

const askStatus = new Composer()
askStatus.on(`message`, async (ctx) => {
    try {
    if (ctx.message.text.length <3 || ctx.message.text.match(/\P{sc=Cyrillic}/giu)) {
        await ctx.reply('Имя должно содержать только кириллицу.\nДлина должна быть не меньше трёх символов.')
    } else {
        ctx.session.data.full_name = ctx.message.text
        await ctx.replyWithHTML(`
    Имя: ${ctx.session.data.full_name}
    
        <b>Выберите статус нового работника</b>`, Markup.keyboard(['🔐 Администратор', '✍️ Продавец']).oneTime().resize())
    await ctx.wizard.next()
    }
    } catch (e) {
      console.log(e.message);
    }
})

const askPhone = new Composer() 
askPhone.on(`message`, async (ctx) => {
try {
    ctx.session.data.status = ctx.message.text
    await ctx.replyWithHTML(`
Имя: ${ctx.session.data.full_name}
Статус: ${ctx.session.data.status}
  
<b>Отправьте номер телефона сотрудника в формате\n\t89003332211</b>`)
    await ctx.wizard.next()
} catch (e) {
    console.log(e.message);
}
})

const askTgId = new Composer()
askTgId.on(`message`, async (ctx) => {
try {
    if (ctx.message.text.match(/\D/gi) || ctx.message.text.length != 11) {
        await ctx.reply('Данные введены неверно.\nПовторите ввод номера.')
    } else {
        ctx.session.data.phone = ctx.message.text
        await bot.telegram.sendPhoto(ctx.chat.id, 'AgACAgIAAxkBAAIC22PyoxoWya6azsnT06ChwGWYvArpAAIQxDEbyGaYS8UgONCkrof0AQADAgADeQADLgQ', 
        {caption:`
Имя: ${ctx.session.data.full_name}
Статус: ${ctx.session.data.status}
Номер телефона: ${ctx.session.data.phone}
        
    <b>Отправьте Telegram ID <ins>СОТРУДНИКА</ins>.\n
Попросите сотрудника выполнить инструкции на картинке и введите цифры, которые он получил</b>`, parse_mode: 'HTML'})
        await ctx.wizard.next()
    }
} catch (e) {
      console.log(e.message);
    }
})

const askPhoto = new Composer()
askPhoto.on(`text`, async (ctx) => {
try {
if (ctx.message.text.match(/\D/gi) || ctx.message.text.length <8) {
    await ctx.reply('Данные введены неверно.\nПовторите ввод Telegram id. (9-11 цифр)')
} else {
    ctx.session.data.tg_id = ctx.message.text 
    await ctx.replyWithHTML(`
Имя: ${ctx.session.data.full_name}
Статус: ${ctx.session.data.status}
Номер телефона: ${ctx.session.data.phone}
Telegram id: ${ctx.session.data.tg_id}
    
    <b>Отправьте фотографию сотрудника</b>`)
    await ctx.wizard.next()
}
} catch (e) {
    console.log(e.message);
}
})  

const askComment = new Composer()
askComment.on(`message`, async (ctx) => {
    try {
    if (ctx.message.photo) {
        ctx.session.data.photo = ctx.message.photo[ctx.message.photo.length-1].file_id
        await ctx.replyWithHTML(`
    Имя: ${ctx.session.data.full_name}
    Статус: ${ctx.session.data.status}
    Номер телефона: ${ctx.session.data.phone}
    Telegram id: ${ctx.session.data.tg_id}
    Фото: есть✅
        
        <b>Напишите комментарий.
        Например:</b> <i>Принят на стажировку 10.02.2023</i>
        `)
        await ctx.wizard.next()
    } else {
        await ctx.reply('Фото не было принято. Попробуйте ещё раз.')
    }
    } catch (e) {
      console.log(e.message);
    }
})  

const decision = new Composer()
decision.on('message', async (ctx)=> {
    try {
        ctx.session.data.comment = ctx.message.text
    await bot.telegram.sendPhoto(ctx.chat.id, `${ctx.session.data.photo}`,
    {caption:`
Имя: ${ctx.session.data.full_name}
Статус: ${ctx.session.data.status}
Номер телефона: ${ctx.session.data.phone}
Telegram id: ${ctx.session.data.tg_id}
Комментарий: ${ctx.session.data.comment}
`, reply_markup:{
    inline_keyboard:[
        [{text:"Добавить сотрудника", callback_data:"addEmpToDB"}],
        [{text:"Отменить", callback_data:`cancelEmpAdding`}]
    ]}, parse_mode: 'HTML'})
    await ctx.wizard.next()
    } catch (e) {
        console.log(e.message);
    }
    
})

const final = new Composer()
final.on('callback_query', async (ctx)=> {
    try {
       await ctx.answerCbQuery()
    if (ctx.update.callback_query.data == 'addEmpToDB') {
        let wizardData = [
            ctx.session.data.full_name, 
            ctx.session.data.status, 
            ctx.session.data.photo,
            ctx.session.data.phone, 
            ctx.session.data.tg_id, 
            ctx.session.data.comment
        ];
        console.log(wizardData);
        let sql = `INSERT INTO employees(full_name, status, photo, phone, tg_id, comment) VALUES (?,?,?,?,?,?)` 
        db.run(sql, wizardData, async (err) => {
          if (err) await ctx.reply(err.message)
          await ctx.reply('Данные успешно добавлены');
        })
        await ctx.editMessageReplyMarkup({inline_keyboard:
            [
                [{text:"Сотрудник добавлен", callback_data:"userIsAdded"}],
            ]
        })
        await ctx.scene.leave();
    } else {
        await ctx.answerCbQuery()
        await ctx.scene.leave()
        await ctx.reply('Процесс добавления сотрудника отменён')
    }  
    } catch (e) {
        console.log(e.message);
    }
    
})

const addNewEmpScene = new Scenes.WizardScene('addNewEmpScene', askFullName, askStatus, askPhone,askTgId, askPhoto, askComment, decision, final ) // askTgId 

module.exports = addNewEmpScene