import TelegramBot from "node-telegram-bot-api";
import { contract } from "../services/blockchain"; // your ethers contract instance
import { getUser } from "../db/database";

export default function myAssetsCommand(bot: TelegramBot) {
  bot.onText(/\/myassets/, async (msg) => {
    if (!msg.chat) return;
    const chatId = msg.chat.id;
    const telegramId = msg.from?.id?.toString();
    if (!telegramId) return;

    const user = getUser(telegramId);
    if (!user) {
      return bot.sendMessage(chatId, "❌ Please /start first!");
    }

    try {
      const assetIds: bigint[] = await contract.getAssetsByOwner(user.wallet_address);
      if (assetIds.length === 0) {
        return bot.sendMessage(chatId, "ℹ️ You have no registered assets.");
      }

      for (const id of assetIds) {
        const asset = await contract.getAsset(id);
        const date = new Date(Number(asset.timestamp) * 1000).toLocaleString();
        const ipfsLink = `https://gateway.pinata.cloud/ipfs/${asset.ipfsHash}`;

        await bot.sendMessage(chatId,
          `🆔 ID: ${asset.id}\n` +
          `📦 Type: ${asset.assetType}\n` +
          `👤 Owner: ${asset.owner}\n` +
          `🕐 Registered: ${date}\n` +
          `🔗 IPFS: ${ipfsLink}`
        );
      }
    } catch (err: any) {
      console.error("Error fetching user assets:", err);
      bot.sendMessage(chatId, "⚠️ Failed to fetch your assets.");
    }
  });
}
