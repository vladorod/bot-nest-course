import { Message } from 'node-telegram-bot-api';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { HALF_HOUR_MS } from './constants';
import { TelegramOperator } from './bot/operator/telegram';
import { UserService } from './user/user.service';
import { PaymentService } from './payments/payment.service';
import process from 'process';

export const requestQuestion = (cards: any[], theme: string, description: string = "нет") => {
  return `
    Представь что ты гадалка-ведьма и расшифруй расклад тебе выпали карты: 
    ${JSON.stringify(cards)} 
    
    Вопрос: ${theme}. 
    
    дополнительная информация: ${description}
    
    Ответ дай в формате JSON:
    {
      "answer": "Общий сформированный ответ",
      "advice": "Совет который ты от себя можешь дать",
      "theme": "${theme}",
      "cards": ${JSON.stringify(cards.map((cards) => ({...cards, answer: "Расшифровка конкретной карты ( > 150 символов)" })))}
    }
    
    без "\`\`\`json", в ответе только json
  `
}

export const getUserFormMsg = (msg: Message): {
  id: string,
  last_name: string,
  first_name: string,
  username: string
} => ({
  id: msg.chat.id.toString(),
  last_name: msg.chat.last_name,
  first_name: msg.chat.first_name,
  username: msg.chat.username
})

export const getGaSession = (userCreatedAt: number, now = Date.now()) => {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const msSinceDayStart = now - today.getTime();

  const bucketIndex = Math.floor(msSinceDayStart / HALF_HOUR_MS);
  const ga_session_id = today.getTime() + bucketIndex * HALF_HOUR_MS;
  const ga_session_number = 1 + bucketIndex; // сбрасывается каждый день

  return { ga_session_id, ga_session_number };
}

export const getPage = (title: string, msg: Message, userId: string) => {
  const session = getGaSession(msg.chat.id);
  return ({
    name: 'page_view',
    params: {
      page_location: `https://taro.vladbika.ru/${title}`,
      page_title: title,
      page_referrer: 'https://taro.vladbika.ru/',
      ga_session_id: session.ga_session_id,
      ga_session_number: session.ga_session_number,
      session_engaged: 1,
      engagement_time_msec: 1
    }
  })
}

export interface Card {
  "id": string,
  "name": string,
  "answer": string,
  "type": string,
  "description": string,
  "inverted": boolean
}
export interface QuestionResponseDto {
  "answer": string,
  "advice": string,
  "theme": string,
  "cards": Card[]
}