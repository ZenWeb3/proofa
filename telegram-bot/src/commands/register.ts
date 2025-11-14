
import TelegramBot from "node-telegram-bot-api";
import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import { parseEther } from "ethers";

import { TEMP_DIR } from "../config";
import { uploadFileToIPFS } from "../services/ipfs";
import { 
  registerAssetOnChain, 
  getCertificateOnChain, 
  verifyAssetByHash,
  checkWalletBalance,
  fundUserWallet 
} from "../utils/blockchain-simple";
import { getUser } from "../db/database";
import { getUserDecryptedPrivateKey } from "../services/wallet";

const pendingRegisterUsers = new Set<string>();

export default function registerCommand(bot: TelegramBot) {
  bot.onText(/\/register/, async (msg) => {
    if (!msg?.chat) return;
    const chatId = String(msg.chat.id);
    const telegramId = String(msg.from?.id);

    const user = getUser(telegramId);
    if (!user) {
      await bot.sendMessage(chatId, "❌ Please send /start first to create your wallet!");
      return;
    }

    const balance = await checkWalletBalance(user.wallet_address);
    const balanceInIP = Number(balance) / 1e18;

    if (balanceInIP < 0.001) {
      await bot.sendMessage(
        chatId,
        `⚠️ Your wallet has no IP tokens for gas fees.\n\n` +
        `💡 Funding your wallet with 0.01 IP tokens...`,
        { parse_mode: "Markdown" }
      );
      
      const funded = await fundUserWallet(user.wallet_address, parseEther("0.01").toString());
      
      if (!funded) {
        await bot.sendMessage(chatId, "❌ Failed to fund wallet. Please try again later.");
        return;
      }
      
      await bot.sendMessage(chatId, "✅ Wallet funded! Now you can register assets.");
    }

    await bot.sendMessage(chatId, "📤 Send me a file to register (image, video, audio, or document)...");
    pendingRegisterUsers.add(chatId);
  });

  bot.on("message", async (msg) => {
    if (!msg?.chat) return;
    const chatId = String(msg.chat.id);
    const telegramId = String(msg.from?.id);

    if (!pendingRegisterUsers.has(chatId)) return;

    let fileId: string;
    let assetType: string;

    if (msg.document) {
      fileId = msg.document.file_id;
      assetType = "document";
    } else if (msg.photo) {
      fileId = msg.photo[msg.photo.length - 1].file_id;
      assetType = "image";
    } else if (msg.audio) {
      fileId = msg.audio.file_id;
      assetType = "audio";
    } else if (msg.video) {
      fileId = msg.video.file_id;
      assetType = "video";
    } else {
      return;
    }

    try {
      const userPrivateKey = getUserDecryptedPrivateKey(telegramId);
      if (!userPrivateKey) {
        await bot.sendMessage(chatId, "❌ Could not decrypt your wallet. Please contact support.");
        return;
      }

      await bot.sendMessage(chatId, "📥 Downloading your file...");
      const fileLink = await bot.getFileLink(fileId);
      const filePath = path.join(TEMP_DIR, `${Date.now()}_${fileId}`);
      const res = await fetch(fileLink);
      const buffer = Buffer.from(await res.arrayBuffer());
      fs.writeFileSync(filePath, buffer);

      await bot.sendMessage(chatId, "🌐 Uploading to IPFS...");
      const ipfsHash = await uploadFileToIPFS(filePath);
      fs.unlinkSync(filePath);

      await bot.sendMessage(chatId, "⛓️ Registering on Story Protocol...");
      let assetId: number;
      
      try {
        assetId = await registerAssetOnChain(userPrivateKey, ipfsHash, assetType);
      } catch (err: any) {
        if (err.message === "INSUFFICIENT_FUNDS") {
          await bot.sendMessage(
            chatId, 
            "❌ Not enough IP tokens for gas. Send some IP to your wallet:\n" +
            `\`${getUser(telegramId)?.wallet_address}\``
          );
          return;
        }
        
        if (err.message?.includes("Asset already registered")) {
          const verified = await verifyAssetByHash(ipfsHash);
          if (verified.exists) {
            assetId = verified.assetId;
            await bot.sendMessage(chatId, "ℹ️ This asset was already registered. Showing certificate...");
          } else {
            throw err;
          }
        } else {
          throw err;
        }
      }

      const cert = await getCertificateOnChain(assetId);
      const timestamp = new Date(cert.timestamp * 1000).toLocaleString();
      const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${cert.ipfsHash}`;

      const caption = `
✅ *Asset Registered Successfully!*

🆔 *Asset ID:* ${cert.id}
🌐 *IPFS Hash:* \`${cert.ipfsHash}\`
📦 *Type:* ${cert.assetType}
👤 *Owner:* \`${cert.owner}\` ✨ (You!)
🕐 *Registered:* ${timestamp}

🔗 [View on IPFS](${ipfsUrl})
🔗 [View Certificate](${cert.explorerUrl})

Your work is now permanently protected on the blockchain! 🎉
      `;

      // Send with media preview based on type
      if (assetType === "image") {
        await bot.sendPhoto(chatId, ipfsUrl, { 
          caption,
          parse_mode: "Markdown" 
        });
      } else if (assetType === "video") {
        await bot.sendVideo(chatId, ipfsUrl, { 
          caption,
          parse_mode: "Markdown" 
        });
      } else if (assetType === "audio") {
        await bot.sendAudio(chatId, ipfsUrl, { 
          caption,
          parse_mode: "Markdown" 
        });
      } else {
        // For documents, send text with link
        await bot.sendMessage(chatId, caption, { 
          parse_mode: "Markdown",
          disable_web_page_preview: false 
        });
      }

    } catch (err: any) {
      console.error("Register command error:", err);
      await bot.sendMessage(chatId, `❌ Error: ${err.message || "Something went wrong. Please try again."}`);
    } finally {
      pendingRegisterUsers.delete(chatId);
    }
  });
}