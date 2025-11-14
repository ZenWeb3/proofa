import TelegramBot, { Message } from "node-telegram-bot-api";
import { createWalletForUser } from "../services/wallet";
import { getUser } from "../db/database";

export default function startCommand(bot: TelegramBot) {
  bot.onText(/\/start/, (msg: Message) => {
    if (!msg.chat) return;
    const chatId = String(msg.chat.id);

    // Create a new wallet or fetch existing
    const user = getUser(chatId) || createWalletForUser(chatId);

    bot.sendMessage(
      chatId,
      `👋 Welcome!\n\nYour wallet address:\n${user.wallet_address}\n\n` +
      `Private key is stored securely encrypted on our server.`
    );
  });
}
