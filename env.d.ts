declare global {
  namespace NodeJS {
    interface ProcessEnv {
      TELEGRAM_BOT_TOKEN: string;
      TELEGRAM_APPOINTMENTS_CHAT_ID: string;
      TELEGRAM_APPOINTMENTS_THREAD_ID: string;
    }
  }
}