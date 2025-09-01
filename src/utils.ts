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