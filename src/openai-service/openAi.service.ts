import OpenAI, { toFile } from 'openai';


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

  async transcription(fileUrl: string){
    const res = await fetch(fileUrl);
    const buffer = Buffer.from(await res.arrayBuffer());
    const upload = await toFile(buffer, "voice.ogg", { type: "audio/ogg" });

    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY, // This is the default and can be omitted
    });

    return await client.audio.transcriptions.create({
      file: upload,
      model: "whisper-1",
    })
  }
}
export default new OpenAiService();