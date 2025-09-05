import { Injectable, OnModuleInit } from '@nestjs/common';
import { Message } from 'node-telegram-bot-api';
import {
  GREETING, MAKE_SCHEDULE_TITLE,
} from './content';
import { TelegramOperator } from './operator/telegram';
import * as process from 'process';
import TaroService from './taro.service';
import OpenAiService from '../../openai-service/openAi.service';
import { QuestionResponseDto, requestQuestion } from '../../utils';
import { UserService } from '../user/user.service';
import * as dayjs from 'dayjs';
import { CartOfDayService } from '../cartOfDay/cartOfDay.service';
import { YandexMetrika } from '../metrica/metrica.service';
import { PaymentService } from '../payments/payment.service';
import { Currency, YooNotificationDto } from '../payments/payment.dto';
import { PaymentEventBus } from '../../main';
import { GA4Service } from '../firebase-analytics.service';
import { createHash } from 'crypto';



const firebaseConfig = {
  apiKey: "AIzaSyC2qx2TKBRBeFQROFoGX1bWSq3T_OohkIM",
  authDomain: "taro-bbc0f.firebaseapp.com",
  projectId: "taro-bbc0f",
  storageBucket: "taro-bbc0f.firebasestorage.app",
  messagingSenderId: "103200457959",
  appId: "1:103200457959:web:aad2f71a8c9856e9f88e42",
  measurementId: "G-KTYYN02N88"
};

const ga4 = new GA4Service(firebaseConfig.measurementId, "9E-o5Z8bTTGq0KpFTBAwOQ");

const dialogs = new Set();

const createSessionId = (telegramId: number) => {
  const date = dayjs().format('YYYY-MM-DD:hh')
  const data = `${telegramId}-${date}`;
  const hash = createHash("md5").update(data).digest("hex");
  return parseInt(hash.slice(0, 12), 16);
};

const getPage = (title: string, msg: Message, userId: string) => ({
  name: 'page_view',
  userId: userId,
  params: {
    page_location: `https://taro.vladbika.ru/${title}`,
    page_title: title,
    page_referrer: 'https://taro.vladbika.ru/',
    ga_session_id: createSessionId(msg.chat.id),
    user_id: userId,
    ga_session_number: 1,
    session_engaged: 1,
    engagement_time_msec: 1
  }
})
@Injectable()
export class BotService implements OnModuleInit {
  public appointmentThreadId : string;
  public appointmentChatId : string;
  public botName : string;

  constructor(private readonly telegramOperator: TelegramOperator, private readonly userService: UserService, private readonly cartOfDayService: CartOfDayService, private readonly paymentService: PaymentService)  {}

  initialization() {
    this.appointmentThreadId = process.env.TELEGRAM_APPOINTMENTS_THREAD_ID;
    this.appointmentChatId = process.env.TELEGRAM_APPOINTMENTS_CHAT_ID;
    this.botName = process.env.BOT_NAME;

    this.telegramOperator.registerCommand('/start', (msg) => this.mainMenu(msg), {
      validations: false,
    });

    this.telegramOperator.registerCommand('/getTariffs', (msg) => this.getTariffs(msg), {
      validations: false,
    });

    this.telegramOperator.registerCommand('/profile', (msg) => this.getProfile(msg), {
      validations: false,
    });

    this.telegramOperator.addCommand('make_schedule', (msg) => this.makeSchedule(msg));
    this.telegramOperator.addCommand('menu', (msg) => this.mainMenu(msg));
    this.telegramOperator.addCommand('relationship_magic', (msg) => this.relationshipMagic(msg));
    this.telegramOperator.addCommand('health_magic', (msg) => this.healthMagic(msg));
    this.telegramOperator.addCommand('finance_magic', (msg) => this.financeMagic(msg));
    this.telegramOperator.addCommand('common_magic', (msg) => this.commonMagic(msg));
    this.telegramOperator.addCommand('work_magic', (msg) => this.workMagic(msg));
    this.telegramOperator.addCommand('ask_question', (msg) => this.askQuestion(msg));
    this.telegramOperator.addCommand('cart_of_day', (msg) =>  this.cardOfDay(msg));
    this.telegramOperator.addCommand('payOne', (msg) =>  this.payOne(msg));
    this.telegramOperator.addCommand('payFew', (msg) =>  this.payFew(msg));
    this.telegramOperator.addCommand('paySubscription', (msg) =>  this.paySubscription(msg));
    this.telegramOperator.addCommand('profile', (msg) =>  this.getProfile(msg));

    this.telegramOperator.updateCallbackQueryCommands();
  }

  async startDialog(employMsg: Message) {

    try {
      const query = new URL(`https://t.me${employMsg.text.replace(' ', '?')}`).searchParams
      const chatId = query.get('startDialog');

      const administrators = await this.telegramOperator.bot.getChatAdministrators(this.appointmentChatId)

      const isHavePermission = !!administrators.find(admin => admin.user.id === employMsg.from.id);

      if (!isHavePermission) {
        return this.telegramOperator.bot.sendMessage(employMsg.chat.id, 'У вас нет прав для начала диалога');
      }

      if (dialogs.has(chatId)) {
        await this.telegramOperator.bot.sendMessage(employMsg.chat.id, 'Кто-то уже начал диалог с этим клиентом');
        return;
      }

      dialogs.add(chatId);
      if (employMsg.chat.id === +chatId) {
         await this.telegramOperator.bot.sendMessage(employMsg.chat.id, 'Вы не можете начать диалог с самим собой');
         return;
      }

      const leaveOptions = {reply_markup: {
          parse_mode: 'HTML',
          inline_keyboard: [
            [
              {text: 'Покинуть диалог', url: `https://t.me/${this.botName}?start=leaveDialog`}
            ]
          ]
        }}
      const leaveChat = () => {
        void this.telegramOperator.bot.sendMessage(employMsg.chat.id, 'Вы покинули диалог', {
          parse_mode: 'HTML'
        })
        void this.telegramOperator.bot.sendMessage(+chatId, '<b>Менеджер покинул диалог</b>', {
          parse_mode: 'HTML'
        })
        void this.telegramOperator.bot.off('message', dialogHandler);
        dialogs.delete(chatId);
      }

      const dialogHandler = (_msg: Message) => {

        if (_msg.text.match('startDialog') && _msg.chat.id === employMsg.chat.id) {
          return
        }

        if (_msg.text.match('leaveDialog') && _msg.chat.id === employMsg.chat.id) {
          leaveChat()
          return
        }


        if (_msg.chat.id === +chatId ) {
          this.telegramOperator.bot.sendMessage(employMsg.chat.id, _msg.text, leaveOptions)
        }

        if (_msg.chat.id === employMsg.chat.id) {
          this.telegramOperator.bot.sendMessage(+chatId, _msg.text)
        }
      }

      this.telegramOperator.bot.on('message', dialogHandler);

      const user = await this.telegramOperator.bot.getChat(+chatId)
      await this.telegramOperator.bot.sendMessage(employMsg.chat.id, `Вы начали диалог с ${user.first_name}`, leaveOptions)
      await this.telegramOperator.bot.sendMessage(chatId, '<b>Менеджер присоединился к диалогу</b>', {
        parse_mode: 'HTML'
      })

    } catch (e) {
      console.error(e)
      await this.telegramOperator.bot.sendMessage(employMsg.chat.id, 'Что-то пошло не так мы не можем начать диалог')
    }
  }


  async mainMenu(msg: Message) {
    try {
      const utm_find = msg.text.match("utm_")

      if (utm_find) {
         const utm_marker = msg.text.slice(utm_find.index, msg.text.length)?.replace('utm_', '');
         this.sendToAnalytics(msg, 'main_menu_utm', 'main_menu', `Пользователь пришел из ${utm_marker}`);
      }

      this.sendToAnalytics(msg, 'main_menu', 'main_menu', 'Пользователь в главном меню');

      await this.telegramOperator.requestQuestion(msg, GREETING, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🔮 Сделать расклад', callback_data: 'make_schedule' },
            ],
            [
              { text: '🧙🏻‍♀️ Задать вопрос', callback_data: 'ask_question' },
            ],
            [
              { text: '🃏 Карта дня', callback_data: 'cart_of_day' },
            ]
          ]
        }
      })

    } catch (e) {
      console.error(e)
    }
  }

  async getUser(msg: Message) {
    const chat = await this.telegramOperator.bot.getChat(msg.chat.id);
    let user = await this.userService.isUserExist(chat.id.toString());

    if (!user) {
      user = await this.userService.create({
        telegramId: chat.id.toString(),
        firstName: chat.first_name,
        lastName: chat.last_name,
        username: chat.username
      })
    }

    return user
  }

  public async makeSchedule(msg: Message) {
    try {
      this.sendToAnalytics(msg, 'make_schedule', 'make_schedule', 'Пользователь ввыберает расклад');
      await this.telegramOperator.requestQuestion(msg, MAKE_SCHEDULE_TITLE, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '💕 Отношения', callback_data: 'relationship_magic' },
            ],
            [
              { text: '💊 Здоровье', callback_data: 'health_magic' },
            ],
            [
              { text: '💰 Деньги', callback_data: 'finance_magic' },
            ],
            [
              { text: '💼 Работа', callback_data: 'work_magic' },
            ],
            [
              { text: '🔮 Общий', callback_data: 'common_magic' },
            ]
          ]
        }
      })
    } catch (e) {
      console.error(e)
    }
  }

  public async relationshipMagic(msg: Message) {
    this.sendToAnalytics(msg, 'relationship_magic', 'relationship_magic', 'Расклад на отношения');
    await this.getAnswer(msg, 'расскажи что ждет меня в плане отношений');
  }
  public async healthMagic(msg: Message) {
    this.sendToAnalytics(msg, 'health_magic', 'health_magic', 'Расклад на здоровье');
    await this.getAnswer(msg, 'расскажи что ждет меня в плане здоровье');
  }
  public async financeMagic(msg: Message) {
    this.sendToAnalytics(msg, 'finance_magic', 'finance_magic', 'Расклад на финансы');
    await this.getAnswer(msg, 'расскажи что ждет меня в плане денег и финансов');
  }
  public async workMagic(msg: Message) {
    this.sendToAnalytics(msg, 'work_magic', 'work_magic', 'Расклад на работу');
    await this.getAnswer(msg, 'расскажи что ждет меня в плане работы');
  }
  public async commonMagic(msg: Message) {
    this.sendToAnalytics(msg, 'common_magic', 'common_magic', 'Общий расклад');
    await this.getAnswer(msg, 'расскажи что ждет меня в общих чертах в жизни');
  }

  public async requestPaymentType(msg: Message) {
    this.sendToAnalytics(msg, 'request_payment', 'request_payment', 'Пользователь сделал запрос на оплату');
    await this.telegramOperator.bot.sendMessage(msg.chat.id, `<b>У вас не осталось попыток</b> \nЧтобы продолжить дальше выберете один из тарфов`, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '🪙 99р - 1 расклад', callback_data: 'payOne' },
          ],
          [
            { text: '🪙 299р - 5 раскладов', callback_data: 'payFew' },
          ],
          [
            { text: '❤️‍🔥 399р - Подписка', callback_data: 'paySubscription' },
          ]
        ]
      }
    });
  }

  public async payOne(msg: Message) {
     await this.paymentPoints(msg, 99, '1 Расклад');
  }

  public async paymentSubscription(msg: Message, amount: number, description: string = `Подписка на телеграм бота @${process.env.BOT_NAME}`) {
    const user = await this.getUser(msg);
    this.sendToAnalytics(msg, 'paymentSubscription', 'paymentSubscription', 'Пользователь сделал запрос на оплату Подписки');
    const data = await this.paymentService.createPayment({
      amount: {
        value: amount.toFixed(2),
        currency: Currency.RUB
      },
      description,
      confirmation: {
        type: "redirect",
        return_url: `https://t.me/${process.env.BOT_NAME}`
      },
      capture: true,
      metadata: {
        userId: user.id,
        type: description,
      }
    })
    const subscriptions = await this.userService.getUserSubscriptions(user.id);

    if (subscriptions.length > 0) {
      return this.telegramOperator.bot.sendMessage(msg.chat.id, `У вас уже есть подписка`);
    }

    const paymentMsg = await this.telegramOperator.bot.sendMessage(msg.chat.id, '<b>Выберите способ оплаты</b>', {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [
            { text: 'Юкасса', url: data.confirmation.confirmation_url, pay: true },
          ]
        ]
      }
    })

    const paymentHandler = async (_data: YooNotificationDto) => {
      if (_data.event === 'payment.succeeded') {
        try {
          await this.telegramOperator.bot.deleteMessage(msg.chat.id, paymentMsg.message_id);
        } catch (e) {
          console.error(e)
        }
        await this.userService.createSubscription(user.id);
        await this.telegramOperator.bot.sendMessage(msg.chat.id, 'Оплата прошла успешно', {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                { text: 'Главное меню', callback_data: 'menu' }
              ],
              [
                { text: '👤 Профиль', callback_data: 'profile' },
              ]
            ]
          }
        })
        this.sendPayment(
          msg,
          'paymentSubscription',
          _data.object.id,
          +_data.object.amount.value,
          'subscription',
          'Подписка',
          'purchase_failed'
        );
        PaymentEventBus.off(`payment_${data.id}`,paymentHandler);
      } else if (_data.event === 'payment.canceled') {
        try {
          this.sendPayment(
            msg,
            'paymentSubscription',
            _data.object.id,
            0,
            'subscription',
            'Подписка',
            'purchase_failed'
          );
          await this.telegramOperator.bot.deleteMessage(msg.chat.id, paymentMsg.message_id);
        } catch (e) {
          console.error(e)
        }
        await this.telegramOperator.bot.sendMessage(msg.chat.id, 'Оплата отменена', {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                { text: 'Главное меню', callback_data: 'menu' }
              ],
              [
                { text: '👤 Профиль', callback_data: 'profile' },
              ]
            ]
          }
        })
        PaymentEventBus.off(`payment_${data.id}`,paymentHandler);
      }
    }

    PaymentEventBus.on(`payment_${data.id}`,paymentHandler)
  }

  public async paymentPoints(msg: Message, amount: number, description: string, counter: number = 1) {
    const user = await this.getUser(msg);
    this.sendToAnalytics(msg, `payment-points-${amount}`, 'payment-points', 'Пользователь сделал запрос на оплату');
    const data = await this.paymentService.createPayment({
      amount: {
        value: amount.toFixed(2),
        currency: Currency.RUB
      },
      description,
      confirmation: {
        type: "redirect",
        return_url: `https://t.me/${process.env.BOT_NAME}`
      },
      capture: true,
      metadata: {
        userId: user.id,
        type: description,
      }
    })

    const paymentMsg = await this.telegramOperator.bot.sendMessage(msg.chat.id, '<b>Выберите способ оплаты</b>', {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [
            { text: 'Юкасса', url: data.confirmation.confirmation_url, pay: true },
          ]
        ]
      }
    })

    const MIN_10 = 600000;

    setTimeout(async () => {
      this.telegramOperator.bot.deleteMessage(msg.chat.id, paymentMsg.message_id);
      this.sendToAnalytics(msg, `payment-points-${amount}`, 'payment-points', 'Пользователь отменил оплату (timeout)');
      this.sendPayment(
        msg,
        'paymentSubscription',
        data.id,
        0,
        'subscription',
        'Подписка',
        'purchase_failed'
      );
      PaymentEventBus.off(`payment_${data.id}`,paymentHandler);
    }, MIN_10);
    const paymentHandler = async (_data: YooNotificationDto) => {
      if (_data.event === 'payment.succeeded') {
        const wallet = await this.userService.getUserBalance(user.telegramId);
        await this.telegramOperator.bot.deleteMessage(msg.chat.id, paymentMsg.message_id);
        await this.userService.updateBalance(user.id, wallet.balance + counter);
        await this.telegramOperator.bot.sendMessage(msg.chat.id, 'Оплата прошла успешно', {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                { text: 'Главное меню', callback_data: 'menu' }
              ],
              [
                { text: '👤 Профиль', callback_data: 'profile' },
              ]
            ]
          }
        })
        this.sendPayment(
          msg,
          'payment-points',
          _data.object.id,
          +_data.object.amount.value,
          'points',
          `${amount} Раксладов`,
          'purchase'
        );
        this.sendPayment(msg, 'payment-points', _data.object.id, +_data.object.amount.value, 'points', 'Покупка раклада');
        PaymentEventBus.off(`payment_${data.id}`,paymentHandler);
      } else if (_data.event === 'payment.canceled') {
        await this.telegramOperator.bot.deleteMessage(msg.chat.id, paymentMsg.message_id);
        this.sendPayment(
          msg,
          'payment-points',
          _data.object.id,
          0,
          'points',
          `${amount} Раксладов`,
          'purchase_failed'
        );
        await this.telegramOperator.bot.sendMessage(msg.chat.id, 'Оплата отменена', {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                { text: 'Главное меню', callback_data: 'menu' }
              ],
              [
                { text: '👤 Профиль', callback_data: 'profile' },
              ]
            ]
          }
        })
        PaymentEventBus.off(`payment_${data.id}`,paymentHandler);
      }
    }

    PaymentEventBus.on(`payment_${data.id}`,paymentHandler)
  }

  public async payFew(msg: Message) {
    await this.paymentPoints(msg, 299, '5 Раскладов', 5);
  }

  public async paySubscription(msg: Message) {
    await this.paymentSubscription(msg, 399);
  }

  public async getProfile(msg: Message) {
    const user = await this.getUser(msg);
    this.sendToAnalytics(msg, "profile", 'profile', 'Пользователь зашел в профиль');
    const wallet = await this.userService.getUserBalance(user.telegramId);
    const subscriptions = await this.userService.getUserSubscriptions(user.id)
    const subscription = subscriptions[0];
    const text = (subscription && subscription.isActive) ? `<b>У вас оформлена подписка до ${dayjs(subscription.endDate).format('DD.MM.YYYY')}</b>` : `<b>У вас осталось ${wallet.balance} попыток\nМожете выбрать один из тарифов</b>`;
    let inline_keyboard = [];

    if (subscriptions.length === 0) {
      inline_keyboard = [
        [
          { text: '🪙 99р - 1 расклад', callback_data: 'payOne' },
        ],
        [
          { text: '🪙 299р - 5 раскладов', callback_data: 'payFew' },
        ],
        [
          { text: '❤️‍🔥 399р - Подписка', callback_data: 'paySubscription' },
        ]
      ]
    }


    await this.telegramOperator.bot.sendMessage(msg.chat.id, `${text}`, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard,
      }
    });
  }

  public async getTariffs(msg: Message) {
    this.sendToAnalytics(msg, 'getTariffs', 'getTariffs', 'Пользователь запросил тарифы');

    await this.telegramOperator.bot.sendMessage(msg.chat.id, `<b>У вас не осталось попыток</b> \nЧтобы продолжить дальше выберете один из тарфов`, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '🪙 99р - 1 расклад', callback_data: 'payOne' },
          ],
          [
            { text: '🪙 299р - 5 раскладов', callback_data: 'payFew' },
          ],
          [
            { text: '❤️‍🔥 399р - Подписка', callback_data: 'paySubscription' },
          ]
        ]
      }
    });
  }
  public async cardOfDay(msg: Message) {
    try {
      const user = await this.getUser(msg);
      const cardOfDay = await this.cartOfDayService.getCardOfDay(user.id);
      this.sendToAnalytics(msg, 'cardOfDay', 'cardOfDay', 'Пользователь запросил карту дня');
      if (cardOfDay) {
        await this.telegramOperator.bot.sendMessage(msg.chat.id, cardOfDay.text, {parse_mode: 'HTML'});
      } else {
        const card = TaroService.getRandomCard();
        const userInfo = await this.telegramOperator.bot.getChat(msg.chat.id);
        //@ts-ignore
        const birthDay = userInfo?.birthdate ? JSON.stringify(userInfo.birthdate) : 'не указана'
        const description = `
    Меня зовут ${userInfo.first_name} информация обо мне ${userInfo.bio} 
    Моя дата рождения: ${birthDay}`;
        const cardsWaitMessage = await this.telegramOperator.bot.sendMessage(msg.chat.id, `🃏 ${card.name} (${card.type}) ${card.inverted ? '(Перевернута)' : ''}\n\n— <b>Описание карты</b> —\n${card.description}`, {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                { text: 'Главное меню', callback_data: 'menu' },
              ]
            ]
          }
        });
        const waitingText = await this.telegramOperator.bot.sendMessage(msg.chat.id, 'Подожди, сейчас подготовлю расшифровку..');

        try {
          const response = await OpenAiService.getAnswer(requestQuestion([card], 'Карта дня что жедт меня сегодня', description));
          await this.telegramOperator.bot.deleteMessage(waitingText.chat.id, waitingText.message_id);


          const jsonResponse = JSON.parse(response) as QuestionResponseDto;

          const cardsResponse = jsonResponse.cards.map(card => `🃏 <b>${card.name} (${card.type}) ${card.inverted ? '(Перевернута)' : ''}</b>\n\n— <b>Описание карты</b> —\n${card.description}\n\n— <b>Расшифровка</b>  —\n${card.answer}`).join('\n\n');
          const cardStringResponse = `<b>Карта дня ${dayjs().format('DD.MM.YYYY')}</b>\n\n${cardsResponse}\n\n<b>✨Общая расшифровка: </b>\n${jsonResponse.answer} \n\n🕊<b>Совет:</b> \n${jsonResponse.advice}`
          await this.telegramOperator.bot.editMessageText(cardStringResponse, {chat_id: cardsWaitMessage.chat.id, message_id: cardsWaitMessage.message_id, parse_mode: 'HTML',  reply_markup: {
              inline_keyboard: [
                [
                  { text: 'Главное меню', callback_data: 'menu' },
                ]
              ]
            }});
          await this.cartOfDayService.createCartOfDay(cardStringResponse, user.id);
        } catch (e) {
          console.error(e);
          await this.telegramOperator.bot.deleteMessage(waitingText.chat.id, waitingText.message_id);
          await this.telegramOperator.bot.sendMessage(msg.chat.id, 'Произошла ошибка, попробуйте ещё раз позже 😢');
        }
      }
    } catch (e) {
      console.error(e);
    }


  }

  public async askQuestion(msg: Message) {
    this.sendToAnalytics(msg, 'askQuestion', 'askQuestion', 'Пользователь задал свой вопрос');
    try {
      const question = await this.telegramOperator.requestQuestion(msg,
        '🌙  Сформулируй свой вопрос подробно… ведь судьба шепчет лишь тем, кто умеет слушать её внимательно.');
      await this.getAnswer(msg, question.text);
    } catch (e) {
      console.error(e)
    }
  }

  public sendToAnalytics(msg: Message, action: string, page: string, text: string) {
    (async () => {
      const user = await this.getUser(msg);
      try {
        await ga4.sendEvent([
          {
            name: action,
            user_id: user.id,
            params: {
              userId: user.id,
              telegramId: user.telegramId,
              title: text,
              page_location: `https://taro.vladbika.ru/${page}`,
              page_title: page,
              page_referrer: 'https://taro.vladbika.ru/',
              ga_session_id: createSessionId(msg.chat.id),
              source: process.env.BOT_NAME,
            },
          },
          getPage(page, msg, user.id)
        ]);
      } catch (e){
        console.log(e)
      }
    })()
  }

  public sendPayment(msg: Message, page: string, transaction_id: string, price: number, category: string, name: string, reason?: "purchase"  | "purchase_failed" | "purchase_refund" | "begin_checkout") {
    (async () => {
      const user = await this.getUser(msg);
      try {
        await ga4.sendEvent([
          {
              name: "purchase",
              user_id: user.id,
              client_id: user.id,
              params: {
                transaction_id: transaction_id,
                currency: "RUB",
                user_id: user.id,
                client_id: user.id,
                value: price,
                page_location: `https://taro.vladbika.ru/${page}`,
                page_title: page,
                page_referrer: 'https://taro.vladbika.ru/',
                ga_session_id: createSessionId(msg.chat.id),
                source: process.env.BOT_NAME,
                reason: reason ?? "purchase",// общая выручка (см. ниже про формулу)
                items: [
                  {
                    item_id: name + price + category,
                    item_name: name,
                    price: price,
                    quantity: 1,
                    item_category: category
                  }
                ]
              }
            },
          getPage(page, msg, user.id)
        ]);
      } catch (e){
        console.log(e)
      }
    })()
  }

  public async getAnswer(msg: Message, theme: string) {
    const user = await this.getUser(msg);
    const wallet = await this.userService.getUserBalance(user.telegramId);
    const subscriptions = await this.userService.getUserSubscriptions(user.id);

    if (wallet.balance + subscriptions.length === 0) {
      return await this.requestPaymentType(msg);
    }

    const cards = TaroService.getRandomCards();
    const userInfo = await this.telegramOperator.bot.getChat(msg.chat.id);

    const DEFAULT_MSG = `<b>Ваши карты:</b> \n\n${cards.map((card) => `🃏 ${card.name} (${card.type}) ${card.inverted ? '(Перевернута)' : ''}\n\n— <b>Описание карты</b> —\n${card.description}`).join('\n\n')}`;

    const cardsWaitMessage = await this.telegramOperator.bot.sendMessage(msg.chat.id, DEFAULT_MSG + `\n\n<b>Подожди, сейчас подготовлю расшифровку..</b>`, {
      parse_mode: 'HTML',
    });
    //@ts-ignore
    const birthDay = userInfo?.birthdate ? JSON.stringify(userInfo.birthdate) : 'не указана'
    const description = `
    Меня зовут ${userInfo.first_name} информация обо мне ${userInfo.bio} 
    Моя дата рождения: ${birthDay}`;

    try {
      const response = await OpenAiService.getAnswer(requestQuestion(cards, theme, description));

      const jsonResponse = JSON.parse(response) as QuestionResponseDto;

      const cardsResponse = jsonResponse.cards.map(card => `🃏 <b>${card.name} (${card.type}) ${card.inverted ? '(Перевернута)' : ''}</b>\n\n— <b>Описание карты</b> —\n${card.description}\n\n— <b>Расшифровка</b>  —\n${card.answer}`).join('\n\n');
      await this.telegramOperator.bot.editMessageText(`${cardsResponse}\n\n<b>✨Общая расшифровка: </b>\n${jsonResponse.answer} \n\n🕊<b>Совет:</b> \n${jsonResponse.advice}`, {chat_id: cardsWaitMessage.chat.id, message_id: cardsWaitMessage.message_id, parse_mode: 'HTML',  reply_markup: {
          inline_keyboard: [
            [
              { text: 'Главное меню', callback_data: 'menu' },
            ]
          ]
        }});
      if (subscriptions.length === 0) {
        await this.userService.updateBalance(user.id, wallet.balance - 1);
      }
    } catch (e) {
      console.error(e);
      await this.telegramOperator.bot.editMessageText(DEFAULT_MSG + `\n\nПри расшефровки произошла ошибка, попробуйте ещё раз позже 😢`, {
        parse_mode: 'HTML',
        chat_id: cardsWaitMessage.chat.id,
        message_id: cardsWaitMessage.message_id,
        reply_markup: {
          inline_keyboard: [
            [
              { text: 'Главное меню', callback_data: 'menu' },
            ]
          ]
        }
      })

    }
  }


  onModuleInit(): any {
    this.initialization();
  }
}
