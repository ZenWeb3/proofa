// src/commands/balance.ts
import TelegramBot from "node-telegram-bot-api";
import { getUser } from "../db/database";
import { checkWalletBalance } from "../utils/blockchain-simple";

export default function balanceCommand(bot: TelegramBot) {
  bot.onText(/\/balance/, async (msg) => {
    if (!msg?.chat) return;
    const chatId = String(msg.chat.id);
    const telegramId = String(msg.from?.id);

    const user = getUser(telegramId);
    if (!user) {
      await bot.sendMessage(
        chatId,
        "❌ Please send /start first to create your wallet!"
      );
      return;
    }

    try {
      await bot.sendMessage(chatId, "🔍 Checking your balance...");

      const balance = await checkWalletBalance(user.wallet_address);
      const balanceInIP = (Number(balance) / 1e18).toFixed(4);

      let statusEmoji = "✅";
      let statusText = "Ready to register!";

      if (Number(balanceInIP) < 0.01) {
        statusEmoji = "⚠️";
        statusText = "Low balance - please fund your wallet";
      } else if (Number(balanceInIP) === 0) {
        statusEmoji = "❌";
        statusText = "No funds - use /fund for instructions";
      }

      const message = `
${statusEmoji} *Wallet Balance*

💼 *Address:* \`${user.wallet_address}\`

💰 *Balance:* ${balanceInIP} IP

📊 *Status:* ${statusText}

━━━━━━━━━━━━━━━━━━━━━━━━

💡 Each registration costs ~0.001 IP
📈 Estimated registrations: ${Math.floor(Number(balanceInIP) / 0.001)}

${Number(balanceInIP) < 0.01 ? "\n⚡ Use /fund to get more IP tokens" : ""}
      `;

      await bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
    } catch (err) {
      console.error("Balance check error:", err);
      await bot.sendMessage(
        chatId,
        "❌ Failed to check balance. Network issue - try again."
      );
    }
  });
}
