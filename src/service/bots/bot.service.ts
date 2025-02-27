import { Injectable, OnModuleInit } from '@nestjs/common';
import * as TelegramBot from 'node-telegram-bot-api';
import { CallbackQuery, Chat, Message } from 'node-telegram-bot-api';
import {
  STRATEGY_HEADER,
  END_TARIFF,
  GENIUS_TARIFF,
  GREETING,
  GREETING_2,
  LESSON_1_CHAPTER_1,
  LESSON_2_CHAPTER_1,
  LESSON_2_CHAPTER_2,
  LESSON_3_CHAPTER_1,
  LESSON_3_CHAPTER_2,
  MEDIA_TARIFF,
  POPULAR_TARIFF,
  QUESTION_CASE,
  SUCCESS_CASE,
  BOT_BRIEF_QUESTIONS,
  SUCCESS_MSG,
  ERROR_MSG,
  DESIGN_BRIEF_QUESTIONS,
  MOBILE_BRIEF_QUESTIONS,
  WEBSITE_BRIEF_QUESTIONS,
} from './content';
import { TelegramOperator } from './operator/telegram';


const waitSync = (timeout: number) =>
  new Promise((res) => setTimeout(res, timeout));

@Injectable()
export class BotService implements OnModuleInit {
  constructor(private readonly telegramOperator: TelegramOperator)  {}


  initialization() {


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

  async mainMenu(msg: Message) {
    await this.telegramOperator.bot.setChatMenuButton({
      chat_id: msg.chat.id,
      menu_button: {
        type: 'default'
      },
    })
    await this.telegramOperator.requestQuestion(msg, GREETING, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '🎨 Дизайн проектов (логотипы, иллюстрации, сайты)', callback_data: 'design_strategy' },

          ],
          [

            { text: '🌐 Создание веб-сайтов (лендинги, интернет-магазины, LMS)', callback_data: 'web_strategy' }
          ],
          [
            { text: '🤖 Разработка чат-ботов и автоматизация', callback_data: 'bot_strategy' },
            { text: '📱 Разработка мобильных приложений', callback_data: 'mobile_strategy' },
          ]
        ]
      }
    })
  }

  async botMakerBrief(msg: Message) {
    try {
      await this.telegramOperator.bot.sendMessage(msg.chat.id, STRATEGY_HEADER, {
        parse_mode: 'HTML'
      })

      await waitSync(500)

      const {answers, chat} = await this.requestQuestionSteps(msg, BOT_BRIEF_QUESTIONS);

      this.sendBriefTo(answers, chat)
      await this.telegramOperator.bot.sendMessage(msg.chat.id, SUCCESS_MSG);

    } catch (e) {
      await this.telegramOperator.bot.sendMessage(msg.chat.id, ERROR_MSG)
    }
  }

  async designMakerBrief(msg: Message) {
    try {
      await this.telegramOperator.bot.sendMessage(msg.chat.id, STRATEGY_HEADER, {
        parse_mode: 'HTML'
      })

      await waitSync(500)

      const {answers, chat} = await this.requestQuestionSteps(msg, DESIGN_BRIEF_QUESTIONS);

      this.sendBriefTo(answers, chat)
      await this.telegramOperator.bot.sendMessage(msg.chat.id, SUCCESS_MSG);

    } catch (e) {
      await this.telegramOperator.bot.sendMessage(msg.chat.id, ERROR_MSG)
    }
  }
  async mobileMakerBrief(msg: Message) {
    try {
      await this.telegramOperator.bot.sendMessage(msg.chat.id, STRATEGY_HEADER, {
        parse_mode: 'HTML'
      })

      await waitSync(500)

      const {answers, chat} = await this.requestQuestionSteps(msg, MOBILE_BRIEF_QUESTIONS);

      this.sendBriefTo(answers, chat)
      await this.telegramOperator.bot.sendMessage(msg.chat.id, SUCCESS_MSG);

    } catch (e) {
      await this.telegramOperator.bot.sendMessage(msg.chat.id, ERROR_MSG)
    }
  }
  async webSuiteMakerBrief(msg: Message) {
    try {
      await this.telegramOperator.bot.sendMessage(msg.chat.id, STRATEGY_HEADER, {
        parse_mode: 'HTML'
      })

      await waitSync(500)

      const {answers, chat} = await this.requestQuestionSteps(msg, WEBSITE_BRIEF_QUESTIONS);

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
    // console.log(answers, chat)
  }

  onModuleInit(): any {
    this.initialization();
  }
}
