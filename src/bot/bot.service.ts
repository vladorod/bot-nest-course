import { Injectable, OnModuleInit } from '@nestjs/common';
import TelegramBot, { Message } from 'node-telegram-bot-api';
import { GREETING, LEARN_THEMES_TEXT, MAKE_SCHEDULE_TITLE, PASS_AN_INTERVIEW_TEXT } from './content';
import { TelegramOperator } from './operator/telegram';
import * as process from 'process';
import OpenAiService from '../openai/openAi.service';
import { UserService } from '../user/user.service';
import * as dayjs from 'dayjs';
import { PaymentService } from '../payments/payment.service';
import { Currency, PaymentMode, PaymentSubject, VatCode, YooNotificationDto } from '../payments/payment.dto';
import { PaymentEventBus } from '../main';
import { GA4Service } from '../firebase-analytics.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { User } from '@prisma/client';
import { getGaSession, getPage, getUserFormMsg } from '../utils';
import { ProgramsService } from '../programs/programs.service';
import { CategoryService } from '../category/category.service';
import { QuestionService } from '../question/question.service';

const ga4 = new GA4Service(process.env.GOOGLE_MEASUREMENT_ID, process.env.GA4_API_KEY);


const dialogs = new Set();


@Injectable()
export class BotService implements OnModuleInit {
  public appointmentThreadId : string;
  public appointmentChatId : string;
  public botName : string;

  constructor(private readonly telegramOperator: TelegramOperator, private readonly userService: UserService, private readonly paymentService: PaymentService, private readonly programServices: ProgramsService, private readonly categoryService: CategoryService, private readonly questionService: QuestionService)  {}

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
    this.telegramOperator.addCommand('pass_an_interview', (msg) => this.passAnInterview(msg));
    this.telegramOperator.addCommand('learn_teams', (msg) => this.learnTeams(msg));
    this.telegramOperator.addCommand('menu', (msg) => this.mainMenu(msg));
    this.telegramOperator.addCommand('relationship_magic', (msg) => this.relationshipMagic(msg));
    this.telegramOperator.addCommand('health_magic', (msg) => this.healthMagic(msg));
    this.telegramOperator.addCommand('finance_magic', (msg) => this.financeMagic(msg));
    this.telegramOperator.addCommand('common_magic', (msg) => this.commonMagic(msg));
    this.telegramOperator.addCommand('work_magic', (msg) => this.workMagic(msg));
    this.telegramOperator.addCommand('ask_question', (msg) => this.askQuestion(msg));
    this.telegramOperator.addCommand('payOne', (msg) =>  this.payOne(msg));
    this.telegramOperator.addCommand('payFew', (msg) =>  this.payFew(msg));
    this.telegramOperator.addCommand('paySubscription', (msg) =>  this.paySubscription(msg));
    this.telegramOperator.addCommand('profile', (msg) =>  this.getProfile(msg));

    this.programServices.getPrograms().then(programs => {
      programs.forEach((program) =>  {
        this.telegramOperator.addCommand(program.callback_data, (msg) => this.getCategories(msg, program.id));
      })
    })

    this.categoryService.getCategories().then(categories => {
      categories.forEach((category) =>  {
        this.telegramOperator.addCommand(category.callback_data, (msg) => this.getSubcategories(msg, category.id));
      })
    })

    this.categoryService.getSubCategorises().then(categories => {
      categories.forEach((category) =>  {
        this.telegramOperator.addCommand(category.callback_data, (msg) => this.getCategories(msg, category.id));
      })
    })



    this.telegramOperator.updateCallbackQueryCommands();


  }

  async startAskingQuestion(msg: Message, categoryId: string) {
    const questions = await this.questionService.getMany({categoryId, isActive: true});
    let questionIndex = 0;
    let rightAnswersCounter = 0;

    for (const question of questions) {
      questionIndex++;
      const questions = JSON.parse(question.options) as string[];
      const answer = await this.telegramOperator.requestQuestion(msg, `Вопрос: ${questionIndex}\n\n${question.question}`, {
        reply_markup: {
          inline_keyboard: questions.map((question, index) => ([{
            text: question,
            callback_data: index.toString(),
          }]))
        }
      })

      if (+answer?.text === +question.correctAnswer) {
        rightAnswersCounter++;
        await this.telegramOperator.requestQuestion(answer, `✅Правильно!\n\n${question.explanation}`, {
          reply_markup: {
            inline_keyboard: [
              [{
                text: 'Далее', callback_data: 'next'
              }]
            ]
          }
        })
      } else {
        await this.telegramOperator.requestQuestion(answer, `❌ Неверно!\n\n${question.explanation}`, {
          reply_markup: {
            inline_keyboard: [
              [{
                text: 'Далее', callback_data: 'next'
              }]
            ]
          }
        })
      }
    }

    await this.telegramOperator.bot.sendMessage(msg.chat.id, `<b>Правильных ответов</b>  ${rightAnswersCounter} из ${questions.length}`, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [[{
          text: 'Главное меню', callback_data: 'menu'
        }]]
      }})
    }

  async getSubcategories(msg: Message, categoryId: string) {
    const categories = await this.categoryService.getSubCategoryByCatId(categoryId);

    if (categories.length === 0) {
      this.startAskingQuestion(msg, categoryId)

      return
    }


    await this.telegramOperator.requestQuestion(msg, "Выберете направление", {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: categories.map((category) => ([{
          callback_data: category.callback_data,
          text: category.name,
        }]))
      }
    })
  }

  async getCategories(msg: Message, programId: string) {
    const categories = await this.categoryService.getCategoryByProgramId(programId);

    await this.telegramOperator.requestQuestion(msg, "Выберете категорию", {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: categories.map((category) => ([{
          callback_data: category.callback_data,
          text: category.name,
        }]))
      }
    })

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
      const programs = await this.programServices.getPrograms();

      await this.telegramOperator.requestQuestion(msg, GREETING(msg.from.username), {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: programs.map((program) => ([{
            callback_data: program.callback_data,
            text: program.name.toLowerCase(),
          }]))
        }
      })

    } catch (e) {
      console.error(e)
    }
  }

  public async passAnInterview(msg: TelegramBot.Message) {
    await this.telegramOperator.bot.sendMessage(msg.chat.id,PASS_AN_INTERVIEW_TEXT)
  }
  public async learnTeams(msg: TelegramBot.Message) {
    await this.telegramOperator.bot.sendMessage(msg.chat.id,LEARN_THEMES_TEXT, {parse_mode: "HTML"});
  }

  async getUser(options: {
    id: string,
    first_name: string,
    last_name: string,
    username: string,
  }): Promise<User> {
    const chat = await this.telegramOperator.getChat(+options.id);
    if (!chat) throw new Error(`Пользователь удалил чат ${options.id}`);

    let user = await this.userService.isUserExist(options.id);
    if (!user) {
      user = await this.userService.create({
        telegramId: options.id,
        firstName: options.first_name,
        lastName: options.last_name,
        username: options.username
      })
    }

    return user as User
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
            ],
            [
              { text: '🧙🏻‍♀️ Задать свой вопрос', callback_data: 'ask_question' },
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
     // await this.paymentPoints(msg, 99, '1 Расклад');
  }

  async sendAll(callback: (chat: TelegramBot.Chat, user: User) => Promise<void>) {
    const users = await this.userService.findAll();
    let counter = 0;

    for (const user of users) {
      const chat = await this.telegramOperator.getChat(+user.telegramId);
      if (!chat) continue;
      await callback(chat, user);
      counter++;
    }

    return counter;
  }



  public async paymentSubscription(msg: Message, amount: number, description: string = `Подписка на телеграм бота @${process.env.BOT_NAME}`) {
    const user = await this.getUser(getUserFormMsg(msg));
    const subscription = await this.userService.getUserSubscriptions(user.id);

    if (subscription.length > 0) {
      await this.getProfile(msg);
      return
    }

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
      },
      receipt: {
        customer: {
          email: process.env.RECEIPT_EMAIL,
        },
        items: [
          {
            description: description,
            quantity: 1.00,
            amount: {
              value: amount.toFixed(2),
              currency: Currency.RUB
            },
            vat_code: VatCode.WITHOUT_VAT,
            payment_subject: PaymentSubject.Service,
            payment_mode: PaymentMode.FullPayment
          }
        ],
      }
    })

    if (!data) return this.telegramOperator.bot.sendMessage(msg.chat.id, 'Произошла ошибка');

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


  public async payFew(msg: Message) {
  }

  public async paySubscription(msg: Message) {
    await this.paymentSubscription(msg, 399);
  }

  public async getProfile(msg: Message) {
    const user = await this.getUser(getUserFormMsg(msg));
    this.sendToAnalytics(msg, "profile", 'profile', 'Пользователь зашел в профиль');
    const subscriptions = await this.userService.getUserSubscriptions(user.id)
    const subscription = subscriptions[0];
    const text = (subscription && subscription.isActive) ? `<b>У вас оформлена подписка до ${dayjs(subscription.endDate).format('DD.MM.YYYY')}</b>` : `<b>Выбрать один из тарифов</b>`;
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

  public async askQuestion(msg: Message) {
    this.sendToAnalytics(msg, 'askQuestion', 'askQuestion', 'Пользователь задал свой вопрос');

  }

  public sendToAnalytics(msg: Message, action: string, page: string, text: string) {
    (async () => {
      const user = await this.getUser(getUserFormMsg(msg));
      try {
        const session = getGaSession(msg.chat.id);
        await ga4.sendEvent([
          {
            name: action,
            params: {
              telegramId: user.telegramId,
              title: text,
              page_location: `https://taro.vladbika.ru/${page}`,
              page_title: page,
              page_referrer: 'https://taro.vladbika.ru/',
              ga_session_id: session.ga_session_id,
              ga_session_number: session.ga_session_number,
              source: process.env.BOT_NAME,
            },
          },
          getPage(page, msg, user.id)
        ], {
          clientId: user.id.toString(),
          userId: user.id.toString(),
          timeZone: 'Europe/Moscow',
          debug: false
        });
      } catch (e){
        console.log(e)
      }
    })()
  }

  public sendPayment(msg: Message, page: string, transaction_id: string, price: number, category: string, name: string, reason?: "purchase"  | "purchase_failed" | "purchase_refund" | "begin_checkout") {
    (async () => {
      const user = await this.getUser(getUserFormMsg(msg));
      const session = getGaSession(msg.chat.id);
      try {
        console.log('payment', transaction_id, price, category, name)
        await ga4.sendEvent([
          {
            name: "purchase",
            params: {
              transaction_id: String(transaction_id),  // строка
              currency: "RUB",
              value: Number(price),                    // число
              page_location: `https://taro.vladbika.ru/${page}`,
              page_title: page,
              page_referrer: "https://taro.vladbika.ru/",
              ga_session_id: session.ga_session_id,
              ga_session_number: session.ga_session_number,
              session_engaged: 1,
              engagement_time_msec: 1,
              source: process.env.BOT_NAME,
              reason: reason ?? "purchase",
              items: [
                {
                  item_id: String(name + price + category),
                  item_name: String(name),
                  item_category: String(category),
                  price: Number(price),                // число
                  quantity: 1                          // число
                }
              ]
            }
          },
          getPage(page, msg, user.id)
        ],{
          clientId: String(user.id),  // или msg.chat.id, но стабильно
          userId: String(user.id),
          timeZone: "Europe/Moscow",
          // включи debug на тесте, чтобы увидеть валидацию
          debug: false
        });

      } catch (e){
        console.log(e)
      }
    })()
  }

  public async getAnswer(msg: Message, theme: string) {

  }


  @Cron(CronExpression.EVERY_DAY_AT_9AM, { timeZone: 'Europe/Moscow' })
  public sendCardOfDay() {

    try {
        this.sendAll(async (chat, user) => {
           await this.telegramOperator.bot.sendPhoto(chat.id, 'https://s3.admin.bazzza.ru/api/v1/buckets/open/objects/download?preview=true&prefix=Frame%2072%20(4).png&version_id=672d531a-c0ec-4fef-9b12-759a5c6208e7', {
             caption: '✨ Сегодня карта дня ждёт только тебя. Завтра будет уже другая история.',
             parse_mode: 'HTML',
             reply_markup: {
               inline_keyboard: [
                 [
                   { text: 'Вытащить карту дня 🃏', callback_data: 'cart_of_day' },
                 ]
               ]
             }
           })
        })

    } catch (e) {
      console.error(e);
    }
  }


  @Cron('0 0 19 */5 * *', { timeZone: 'Europe/Moscow' })
  public sendEveryWeek() {
    try {
      this.sendAll(async (chat, user) => {

        await this.telegramOperator.bot.sendVideo(
          chat.id,
          'https://s3.admin.bazzza.ru/api/v1/buckets/open/objects/download?preview=true&prefix=Композиция%201_7.mp4&version_id=44afffd5-92f8-41fd-8c67-84c29c47f1cc',
          {
            caption: "🔮 Карты могут ответить на любую тему — любовь, деньги или будущее.\nСделай расклад и узнай, что они скажут тебе.",
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [
                  { text: 'Сделать расклад ✨', callback_data: 'make_schedule' },
                ]
              ]
            }
          }
        )
      })
    } catch (e) {
      console.error(e);
    }

  }

  onModuleInit(): any {
    this.initialization();
  }
}
