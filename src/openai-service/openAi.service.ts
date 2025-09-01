import OpenAI from 'openai';



class OpenAiService {
  constructor() {
  }

  async getAnswer(question: string){
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY, // This is the default and can be omitted
    });

    const response = await client.responses.create({
      model: 'gpt-4o',
      instructions: 'Ты опытная ведьма гадалка, отвечай в таком стиле.',
      input: question,
    });

    return response.output_text.toString()
  }
}
export default new OpenAiService();