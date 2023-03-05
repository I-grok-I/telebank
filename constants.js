const {Telegraf, Markup, Composer, Scenes} = require('telegraf');


const PERIOD_BUTTONS = Markup.inlineKeyboard([
  [Markup.button.callback('1', '1'),Markup.button.callback('7', '7'),Markup.button.callback('13', '13')],
  [Markup.button.callback('2', '2'),Markup.button.callback('8', '8'),Markup.button.callback('14', '14')],
  [Markup.button.callback('3', '3'),Markup.button.callback('9', '9'),Markup.button.callback('15', '15')],
  [Markup.button.callback('4', '4'),Markup.button.callback('10', '10'),Markup.button.callback('16', '16')],
  [Markup.button.callback('5', '5'),Markup.button.callback('11', '11'),Markup.button.callback('17', '17')],
  [Markup.button.callback('6', '6'),Markup.button.callback('12', '12'),Markup.button.callback('18', '18')],
  [Markup.button.callback('Отменить сделку', 'menu')]
])

const STATS_BTNS = [
  [Markup.button.callback('Сумма в обороте', 'circulation')],
  [Markup.button.callback('Чистая прибыль', 'netProfit')],
  [Markup.button.callback('Продажи сотрудников', 'empSales')],
  [Markup.button.callback('Архив продаж', 'archive')],
  [Markup.button.callback('🔙Назад', 'menu')]
]

const MARGIN_BUTTONS = [
  [Markup.button.callback('10', '10'), Markup.button.callback('20', '20'), Markup.button.callback('30', '30')],
  [Markup.button.callback('40', '40'), Markup.button.callback('50', '50'), Markup.button.callback('60', '60')],
  [Markup.button.callback('70', '70'), Markup.button.callback('80', '80'), Markup.button.callback('90', '90')],
  [Markup.button.callback('Отменить сделку', 'menu')]
]
const MAIN_MENU_BTNS = Markup.inlineKeyboard([
  [Markup.button.callback('Новая продажа', 'newDeal')],
  [Markup.button.callback('Список заказов', 'orderList')],
  [Markup.button.callback('Сотрудники', 'employees')],
  [Markup.button.callback('Статистика', 'stats')],
])

const NEW_DEAL_BUTTONS = [
  [{text:"Новый покупатель", callback_data:"newDealNewDebtor"}],
  [{text:"Выбрать из списка", callback_data:"newDealOldDebtor"}],
  [{text:"🔙Назад", callback_data:"menu"}],
] 

  const CHOICE_BUTTONS = [
      [{ text: "Заключить сделку", callback_data: "applyDeal" }],
      [{ text: "Отменить сделку", callback_data: "cancelDeal" }],
  ]



const LEAVE_WIZARD_BTN = Markup.keyboard([['Отменить сделку']]).oneTime().resize()

const ASK_GUARANTOR_TEXT = `Введите данные поручителя(ей) одним сообщением:
Имя,
Фамилия,
Номер телефона,
Адрес`

const GET_ALL_ORDERS = `SELECT  * FROM orders
JOIN
employees
	ON orders.emp_id = employees.id
WHERE is_complete = 1`

const GET_EMPS_AND_ORDERS_SQL = `SELECT  emp_id, full_name, tg_id, title, orders.id 
FROM orders
JOIN
employees
	ON orders.emp_id = employees.id
WHERE orders.id = (?)`

const GET_CUSTOMER_SQL = `SELECT * FROM customers`

const GET_EMPLOYEES_SQL = 'SELECT * FROM employees'

const GET_ORDER_SQL = 'SELECT * FROM orders WHERE title = (?) AND monthly_pay = (?)'

const INSERT_PAYMENTS_SQL = 'INSERT INTO payments (order_id, payment_sum, payment_date, is_paid) VALUES (?,?,?,?)'

const ORDER_INSERT_SQL = `INSERT INTO orders(title, cost, order_sum, customer_id, period, monthly_pay, photo_id, emp_id, is_complete, guarantor_info) VALUES (?,?,?,?,?,?,?,?,?,?)`

const CUSTOMER_INSERT_SQL = `INSERT INTO customers (last_name, first_name, address, phone, comment, is_bad, customer_photo) VALUES (?,?,?,?,?,?,?)`

const GET_ORDER_INFO_SQL = `SELECT * FROM 
orders
JOIN 
customers
  USING (customer_id)
JOIN
payments
  ON payments.order_id = orders.id
WHERE order_id = (?) 
ORDER BY payment_date`

const GET_UNPAID_PAYMENTS_SQL = `SELECT * FROM payments WHERE order_id = (?) AND is_paid = 0 ORDER BY payment_date`

const GET_CIRCULAR_SQL = `SELECT SUM(payment_sum) as circular FROM payments WHERE is_paid = 0`

const GET_NET_PROFIT_SQL = `SELECT SUM(payment_sum) as net_profit FROM payments WHERE is_paid = 1`

const UPDATE_PAYMENTS_SQL = `UPDATE payments SET is_paid = 1 WHERE payment_id = (?)`

const UPDATE_ORDER_IS_PAYED_SQL = `UPDATE orders SET is_complete = 1 WHERE id = (?)`

const UPDATE_COMMENT_SQL = `UPDATE orders SET order_comment = (?) WHERE id = (?)`

const GET_EMPLOYEES_SALES_SQL = `SELECT  full_name, phone, sum(payment_sum) as sum FROM
orders
JOIN
payments 
	ON orders.id = payments.order_id
JOIN 
employees 
	ON employees.id = orders.emp_id
WHERE is_paid=1
GROUP BY phone`

const GET_ALL_ORDERS_AND_PAYMENTS = `SELECT * FROM 
orders
JOIN 
customers
    USING (customer_id)
JOIN 
payments
    ON orders.id = payments.order_id
WHERE is_paid = 0 AND is_complete = 0
ORDER BY payment_date`

module.exports = {
  PERIOD_BUTTONS,
  STATS_BTNS,
  MARGIN_BUTTONS,
  MAIN_MENU_BTNS,
  NEW_DEAL_BUTTONS,
  ASK_GUARANTOR_TEXT,
  CHOICE_BUTTONS,
  GET_ALL_ORDERS, 
  GET_CUSTOMER_SQL, 
  GET_EMPS_AND_ORDERS_SQL, 
  GET_EMPLOYEES_SQL,
  GET_ORDER_SQL,
  INSERT_PAYMENTS_SQL,
  ORDER_INSERT_SQL,
  CUSTOMER_INSERT_SQL,
  GET_ORDER_INFO_SQL,
  GET_UNPAID_PAYMENTS_SQL,
  GET_CIRCULAR_SQL,
  GET_NET_PROFIT_SQL,
  UPDATE_PAYMENTS_SQL,
  LEAVE_WIZARD_BTN,
  UPDATE_ORDER_IS_PAYED_SQL,
  UPDATE_COMMENT_SQL,
  GET_EMPLOYEES_SALES_SQL,
  GET_ALL_ORDERS_AND_PAYMENTS,

  }

