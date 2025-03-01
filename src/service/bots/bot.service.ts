import { Injectable, OnModuleInit } from '@nestjs/common';
import {  Chat, Message } from 'node-telegram-bot-api';
import {
  STRATEGY_HEADER,
  GREETING,
  BOT_BRIEF_QUESTIONS,
  SUCCESS_MSG,
  ERROR_MSG,
  DESIGN_BRIEF_QUESTIONS,
  MOBILE_BRIEF_QUESTIONS,
  WEBSITE_BRIEF_QUESTIONS,
} from './content';
import { TelegramOperator } from './operator/telegram';
import * as process from 'process';

const waitSync = (timeout: number) =>
  new Promise((res) => setTimeout(res, timeout));

const dialogs = new Set();
const appointments = new Map();
@Injectable()
export class BotService implements OnModuleInit {
  public appointmentThreadId : string;
  public appointmentChatId : string;
  public botName : string;

  constructor(private readonly telegramOperator: TelegramOperator)  {}

  initialization() {
    this.appointmentThreadId = process.env.TELEGRAM_APPOINTMENTS_THREAD_ID;
    this.appointmentChatId = process.env.TELEGRAM_APPOINTMENTS_CHAT_ID;
    this.botName = process.env.BOT_NAME;

    this.telegramOperator.registerCommand('/start', (msg) => this.mainMenu(msg), {
      validations: false,
    });


    //this.registerCommand('/tariffs', (msg) => this.requestTariff(msg), {
    //  validations: false,
    //});
    //
    // CallBackCommands.addCommand('1', this.getPoplarTariff.bind(this));
    // CallBackCommands.addCommand('2', this.getMediaTariff.bind(this));

    this.telegramOperator.addCommand('bot_strategy', (msg) => this.botMakerBrief(msg));
    this.telegramOperator.addCommand('design_strategy', (msg) => this.designMakerBrief(msg));
    this.telegramOperator.addCommand('mobile_strategy', (msg) => this.mobileMakerBrief(msg));
    this.telegramOperator.addCommand('web_strategy', (msg) => this.webSuiteMakerBrief(msg));
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
    if (msg.text.match('leaveDialog')) return
    if (msg.text.match('startDialog')) {
      await this.startDialog(msg);
      return;
    }

    if (!!msg.text.match('@promizeStudioBot')) {
      await this.telegramOperator.bot.sendMessage(msg.chat.id, 'Соре тут эта команда не работает', {message_thread_id: msg.message_thread_id})
      return
    }
    await this.telegramOperator.bot.setChatMenuButton({
      chat_id: msg.chat.id,
      menu_button: {
        type: 'default'
      },
    });

    await this.telegramOperator.requestQuestion(msg, GREETING, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '🎨 Разработка дизайна', callback_data: 'design_strategy' },
            { text: '📱 Приложения', callback_data: 'mobile_strategy' },
          ],
          [

            { text: '🌐 Разработка сайтов', callback_data: 'web_strategy' },
            { text: '🤖 Чат-боты', callback_data: 'bot_strategy' }
          ]
        ]
      }
    })
  }

  async botMakerBrief(msg: Message) {
    try {
      if (appointments.has(`${msg.chat.id}-bots`)) {
        await this.telegramOperator.bot.sendMessage(msg.chat.id, 'Вы отставлялти заявку, пожалуйста подождите');
        return
      }
      await this.telegramOperator.bot.sendMessage(msg.chat.id, STRATEGY_HEADER, {
        parse_mode: 'HTML'
      })

      await waitSync(500)

      const {answers, chat} = await this.requestQuestionSteps(msg, BOT_BRIEF_QUESTIONS);

      appointments.set(`${msg.chat.id}-bots`, {answers, chat})
      this.sendBriefTo(answers, chat)
      await this.telegramOperator.bot.sendMessage(msg.chat.id, SUCCESS_MSG);

    } catch (e) {
      await this.telegramOperator.bot.sendMessage(msg.chat.id, ERROR_MSG)
    }
  }

  async designMakerBrief(msg: Message) {
    try {

      if(appointments.has(`${msg.chat.id}-design`)) {
        await this.telegramOperator.bot.sendMessage(msg.chat.id, 'Вы отставлялти заявку, пожалуйста подождите')
        return
      }

      await this.telegramOperator.bot.sendMessage(msg.chat.id, STRATEGY_HEADER, {
        parse_mode: 'HTML'
      })

      await waitSync(500)

      const {answers, chat} = await this.requestQuestionSteps(msg, DESIGN_BRIEF_QUESTIONS);

      appointments.set(`${msg.chat.id}-design`, {answers, chat})
      this.sendBriefTo(answers, chat)
      await this.telegramOperator.bot.sendMessage(msg.chat.id, SUCCESS_MSG);

    } catch (e) {
      await this.telegramOperator.bot.sendMessage(msg.chat.id, ERROR_MSG)
    }
  }
  async mobileMakerBrief(msg: Message) {
    try {

      if (appointments.has(`${msg.chat.id}-mobile`)) {
        await this.telegramOperator.bot.sendMessage(msg.chat.id, 'Вы отставлялти заявку, пожалуйста подождите');
        return
      }

      await this.telegramOperator.bot.sendMessage(msg.chat.id, STRATEGY_HEADER, {
        parse_mode: 'HTML'
      })

      await waitSync(500)

      const {answers, chat} = await this.requestQuestionSteps(msg, MOBILE_BRIEF_QUESTIONS);

      appointments.set(`${msg.chat.id}-mobile`, {answers, chat})
      this.sendBriefTo(answers, chat)
      await this.telegramOperator.bot.sendMessage(msg.chat.id, SUCCESS_MSG);

    } catch (e) {
      await this.telegramOperator.bot.sendMessage(msg.chat.id, ERROR_MSG)
    }
  }
  async webSuiteMakerBrief(msg: Message) {
    try {

      if (appointments.has(`${msg.chat.id}-web`)) {
        await this.telegramOperator.bot.sendMessage(msg.chat.id, 'Вы отставлялти заявку, пожалуйста подождите')
        return
      }
      await this.telegramOperator.bot.sendMessage(msg.chat.id, STRATEGY_HEADER, {
        parse_mode: 'HTML'
      })

      await waitSync(500)

      const {answers, chat} = await this.requestQuestionSteps(msg, WEBSITE_BRIEF_QUESTIONS);

      appointments.set(`${msg.chat.id}-web`, {answers, chat})
      this.sendBriefTo(answers, chat)
      await this.telegramOperator.bot.sendMessage(msg.chat.id, SUCCESS_MSG);

    } catch (e) {
      await this.telegramOperator.bot.sendMessage(msg.chat.id, ERROR_MSG)
    }
  }


  async requestQuestionSteps(msg: Message, questions: {title: string, description?: string}[]) {
    const answers = [];
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      const answer = (await this.telegramOperator.requestQuestion(msg, `<b>Шаг ${i+1}/${questions.length}:</b>\n<b>${question.title}</b> ${question.description}\n`, {
        parse_mode: 'HTML'
      })).text;

      answers.push({
        question: `${question.title ?? ''} ${question.description ?? ''}`.trim(),
        answer,
      })
    }

    return {
      answers,
      chat: msg.chat
    }
  }

  public sendBriefTo(answers: {question: string, answer: string}[], chat: Chat) {
    this.telegramOperator.bot.sendMessage(this.appointmentChatId, `
      <b>Новая заявка</b>
      \nОт: ${chat.username}
      ${answers.map((answer, index) => `${index !== 0 ? '\n\n' : '\n'}<b>${answer.question}</b>:\n${answer.answer}`).join('')}
      \n
   `, {
      message_thread_id: +this.appointmentThreadId,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{
            text: 'Чат с килентом',
            url: `https://t.me/${this.botName}?start=startDialog=${chat.id}`
          }]
        ]
      }
    })
  }

  onModuleInit(): any {
    this.initialization();
  }
}
