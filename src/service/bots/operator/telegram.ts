import { Injectable, OnModuleInit } from '@nestjs/common';
import * as TelegramBot from 'node-telegram-bot-api';
import { CallbackQuery, Message } from 'node-telegram-bot-api';
import * as process from 'process';



const waitSync = (timeout: number) =>
  new Promise((res) => setTimeout(res, timeout));

@Injectable()
export class TelegramOperator implements OnModuleInit {

  public bot: TelegramBot;

  callbackQueryCommands: Record<string, (msg: Message) => Promise<void>> = {};

  constructor() {
    const token =  process.env.TELEGRAM_BOT_TOKEN;
    const bot = new TelegramBot(token, {
      polling: true,
    });

    this.bot = bot;
    this.callbackQueryCommands = {};

  }

  registerCommand(
    command: string,
    callBack: (msg: Message) => void,
    options?: { validations?: boolean },
  ) {
    const regex = new RegExp(command, 'ig');
    const validation = options?.validations ;

    this.bot.on('message',  async (msg) => {
      if (msg.text && msg.text.match(regex)) {
        if (!validation) {
          callBack(msg);
        }

        if (validation) {
        } else if (validation) {
          callBack(msg);
        }
      }
    });
  }


  addCommand(name: string, callback: (msg: Message) => Promise<void>) {
    this.callbackQueryCommands[name] = callback;
  }

  updateCallbackQueryCommands() {
    this.bot.removeListener('callback_query', this.callBackQueryAction);
    this.bot.on('callback_query', (ctx) => this.callBackQueryAction(ctx));
  }

  callBackQueryAction(ctx: TelegramBot.CallbackQuery) {
    if (this.callbackQueryCommands[ctx.data]) {
      this.bot.answerCallbackQuery(ctx.id);
      this.callbackQueryCommands[ctx.data](ctx.message);
    } else {
      this.bot.sendMessage(ctx.message.chat.id, 'Команда не найдена');
    }
  }

  async botThinking(
    msg: TelegramBot.Message,
    callback: () => Promise<any>,
    action: (msg: Message) => void,
  ) {
    const handler = (userMsg: Message) => {
      if (userMsg.from.id === msg.from.id) {
        if (userMsg.text.match(/^\/\w+/)) {
          action(userMsg);
          throw new Error('Введена команда');
        }
        action(userMsg);
      }
    };
    try {
      this.bot.on('message', handler);
      await callback();
      this.bot.removeListener('message', handler);
    } catch (e) {

      this.bot.removeListener('message', handler);
    }
  }

  async requestQuestion(
    msg: Message,
    text: string,
    options?: TelegramBot.SendMessageOptions,
  ): Promise<Message> {
    return new Promise(async (res, rej) => {
      //@ts-ignore
      const lineKeyboard = options?.reply_markup?.inline_keyboard;

      const buttons =
        lineKeyboard && lineKeyboard[0].map((button) => button.callback_data);



      const handler = (userMsg: Message) => {70
        if (userMsg.from.id === msg.chat.id) {
          if (userMsg.text.match(/^\/\w+/)) {
            rej(userMsg);
            this.bot.removeListener('message', handler);
          } else {
            res(userMsg);
            this.bot.removeListener('message', handler);
          }
        } else {
          this.bot.removeListener('message', handler);
        }
      };

      const buttonHandler = (callbackQuery: CallbackQuery) => {

        if (callbackQuery.message.chat.id === msg.from.id && buttons.length > 0) {
          const isCommand = Object.keys(
            this.callbackQueryCommands.callbackQueryCommands,
          ).find((command) => callbackQuery.data === command);

          if (!isCommand) {
            res({ ...callbackQuery.message, ...{ text: callbackQuery.data } });
            this.bot.answerCallbackQuery(callbackQuery.id);
            this.bot.removeListener('callback_query', buttonHandler);
          }
        } else {
          this.bot.removeListener('callback_query', buttonHandler);
          this.bot.removeListener('message', handler);
        }
      };


      await this.bot.sendMessage(msg.chat.id, text, {
        ...options,
        reply_markup: { remove_keyboard: true, ...options?.reply_markup },
      });

      this.bot.on('callback_query', buttonHandler);
      this.bot.on('message', handler);
    });
  }

  async requestQuestionPhoto(
    msg: Message,
    photo: string,
    options?: TelegramBot.SendMessageOptions,
  ): Promise<Message> {
    return new Promise(async (res, rej) => {
      //@ts-ignore
      const lineKeyboard = options?.reply_markup?.inline_keyboard;

      const buttons =
        lineKeyboard && lineKeyboard[0].map((button) => button.callback_data);

      const buttonHandler = (callbackQuery: CallbackQuery) => {
        if (callbackQuery.message.chat.id === msg.from.id) {
          res({ ...callbackQuery.message, ...{ text: callbackQuery.data } });
        }
      };

      const handler = (userMsg: Message) => {
        if (userMsg.from.id === msg.from.id) {
          if (userMsg.text.match(/^\/\w+/)) {
            rej(userMsg);
          } else {
            res(userMsg);
            this.bot.removeListener('photo', handler);
          }
        }
      };

      if (buttons && buttons.length > 0) {
        this.bot.on('callback_query', buttonHandler);
      }

      await this.bot.sendPhoto(msg.chat.id, photo, {
        ...options,
        reply_markup: { remove_keyboard: true, ...options?.reply_markup },
      });
      this.bot.on('photo', handler);
    });
  }

  onModuleInit(): any {}

}
