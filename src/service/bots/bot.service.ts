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



const dialogs = new Set();

@Injectable()
export class BotService implements OnModuleInit {
  public appointmentThreadId : string;
  public appointmentChatId : string;
  public botName : string;

  constructor(private readonly telegramOperator: TelegramOperator, private readonly userService: UserService, private readonly cartOfDayService: CartOfDayService)  {}

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
      void this.getUser(msg);
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
    await this.getAnswer(msg, 'расскажи что ждет меня в плане отношений');
  }
  public async healthMagic(msg: Message) {
    await this.getAnswer(msg, 'расскажи что ждет меня в плане здоровье');
  }
  public async financeMagic(msg: Message) {
    await this.getAnswer(msg, 'расскажи что ждет меня в плане денег и финансов');
  }
  public async workMagic(msg: Message) {
    await this.getAnswer(msg, 'расскажи что ждет меня в плане работы');
  }
  public async commonMagic(msg: Message) {
    await this.getAnswer(msg, 'расскажи что ждет меня в общих чертах в жизни');
  }

  public async requestPaymentType(msg: Message) {
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

  public async getProfile(msg: Message) {
    const user = await this.getUser(msg);
    const wallet = await this.userService.getUserBalance(user.telegramId);
    const subscriptions = await this.userService.getUserSubscriptions(user.id)
    const subscription = subscriptions[0];
    const text = (subscription && subscription.isActive) ? `<b>У вас оформлена подписка до ${dayjs(subscription.endDate).format('DD.MM.YYYY')}</b>` : `<b>У вас осталось ${wallet.balance} попыток</b>`;

    await this.telegramOperator.bot.sendMessage(msg.chat.id, `${text} \nМожете выбрать один из тарифов`, {
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

  public async getTariffs(msg: Message) {
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
    try {
      const question = await this.telegramOperator.requestQuestion(msg,
        '🌙  Сформулируй свой вопрос подробно… ведь судьба шепчет лишь тем, кто умеет слушать её внимательно.');
      await this.getAnswer(msg, question.text);
    } catch (e) {
      console.error(e)
    }
  }

  public async getAnswer(msg: Message, theme: string) {
    const user = await this.getUser(msg);
    const wallet = await this.userService.getUserBalance(user.telegramId);

    if (wallet.balance < 1) {
      return await this.requestPaymentType(msg);
    }

    const cards = TaroService.getRandomCards();
    const userInfo = await this.telegramOperator.bot.getChat(msg.chat.id);

    const cardsWaitMessage = await this.telegramOperator.bot.sendMessage(msg.chat.id, `<b>Ваши карты:</b> \n\n${cards.map((card) => `🃏 ${card.name} (${card.type}) ${card.inverted ? '(Перевернута)' : ''}\n\n— <b>Описание карты</b> —\n${card.description}`).join('\n\n')}`, {
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
    //@ts-ignore
    const birthDay = userInfo?.birthdate ? JSON.stringify(userInfo.birthdate) : 'не указана'
    const description = `
    Меня зовут ${userInfo.first_name} информация обо мне ${userInfo.bio} 
    Моя дата рождения: ${birthDay}`;

    try {
      const response = await OpenAiService.getAnswer(requestQuestion(cards, theme, description));
      await this.telegramOperator.bot.deleteMessage(waitingText.chat.id, waitingText.message_id);
      // await this.telegramOperator.bot.deleteMessage(cardsWaitMessage.chat.id, cardsWaitMessage.message_id);

      const jsonResponse = JSON.parse(response) as QuestionResponseDto;

      const cardsResponse = jsonResponse.cards.map(card => `🃏 <b>${card.name} (${card.type}) ${card.inverted ? '(Перевернута)' : ''}</b>\n\n— <b>Описание карты</b> —\n${card.description}\n\n— <b>Расшифровка</b>  —\n${card.answer}`).join('\n\n');
      await this.telegramOperator.bot.editMessageText(`${cardsResponse}\n\n<b>✨Общая расшифровка: </b>\n${jsonResponse.answer} \n\n🕊<b>Совет:</b> \n${jsonResponse.advice}`, {chat_id: cardsWaitMessage.chat.id, message_id: cardsWaitMessage.message_id, parse_mode: 'HTML',  reply_markup: {
          inline_keyboard: [
            [
              { text: 'Главное меню', callback_data: 'menu' },
            ]
          ]
        }});
      await this.userService.updateBalance(user.id, wallet.balance - 1);
    } catch (e) {
      console.error(e);
      await this.telegramOperator.bot.deleteMessage(waitingText.chat.id, waitingText.message_id);
      await this.telegramOperator.bot.sendMessage(msg.chat.id, 'Произошла ошибка, попробуйте ещё раз позже 😢');
    }
  }


  onModuleInit(): any {
    this.initialization();
  }
}
