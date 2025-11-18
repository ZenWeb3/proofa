// src/commands/myassets.ts
import TelegramBot from "node-telegram-bot-api";
import { getUser } from "../db/database";
import axios from "axios";
import { STORY_RPC_URL, CONTRACT_ADDRESS } from "../config";
import IPRegistryABI from "../../../smart-contract/artifacts/contracts/IPRegistry.sol/IPRegistry.json";
import { Interface } from "ethers";
import { getLicenseOnChain } from "../utils/blockchain-simple";

const iface = new Interface(IPRegistryABI.abi);

async function rpcCall(method: string, params: any[] = []): Promise<any> {
  try {
    const response = await axios.post(
      STORY_RPC_URL,
      { jsonrpc: "2.0", id: Date.now(), method, params },
      { timeout: 30000, headers: { "Content-Type": "application/json" } }
    );
    if (response.data.error) throw new Error(response.data.error.message);
    return response.data.result;
  } catch (err: any) {
    console.error("RPC call failed:", err.message);
    throw err;
  }
}

async function getAssetsByOwner(ownerAddress: string): Promise<number[]> {
  try {
    const data = iface.encodeFunctionData("getAssetsByOwner", [ownerAddress]);
    const result = await rpcCall("eth_call", [
      { to: CONTRACT_ADDRESS, data },
      "latest",
    ]);
    const decoded = iface.decodeFunctionResult("getAssetsByOwner", result);
    return decoded[0].map((id: bigint) => Number(id));
  } catch (err) {
    console.error("Failed to get assets by owner:", err);
    return [];
  }
}

async function getAssetDetails(assetId: number) {
  try {
    const data = iface.encodeFunctionData("getAsset", [assetId]);
    const result = await rpcCall("eth_call", [
      { to: CONTRACT_ADDRESS, data },
      "latest",
    ]);
    const decoded = iface.decodeFunctionResult("getAsset", result);
    return {
      id: assetId,
      ipfsHash: decoded[0].ipfsHash,
      owner: decoded[0].owner,
      assetType: decoded[0].assetType,
      timestamp: Number(decoded[0].timestamp),
    };
  } catch (err) {
    return null;
  }
}

export default function myAssetsCommand(bot: TelegramBot) {
  bot.onText(/\/myassets/, async (msg) => {
    if (!msg?.chat) return;
    const chatId = String(msg.chat.id);
    const telegramId = String(msg.from?.id);

    try {
      const user = getUser(telegramId);
      if (!user) {
        await bot.sendMessage(chatId, "❌ Please send /start first!");
        return;
      }

      await bot.sendMessage(chatId, "🔍 Fetching your assets...");

      const assetIds = await getAssetsByOwner(user.wallet_address);

      if (assetIds.length === 0) {
        await bot.sendMessage(
          chatId,
          "📭 You don't have any registered assets yet.\n\nUse /register to protect your first creation!"
        );
        return;
      }

      let message = `📦 *Your Registered Assets*\n\nYou own ${assetIds.length} asset(s):\n\n`;

      for (const id of assetIds) {
        const asset = await getAssetDetails(id);
        if (!asset) continue;

        const date = new Date(asset.timestamp * 1000).toLocaleDateString();

        // Check license
        let licenseStatus = "📋 No license";
        try {
          const license = await getLicenseOnChain(id);
          if (license.price > 0n) {
            const priceIP = (Number(license.price) / 1e18).toFixed(4);
            licenseStatus = `💰 ${priceIP} IP ${
              license.isCommercial ? "💼" : "👤"
            } | ${license.royaltyPercent}%`;
          }
        } catch (err) {
          // No license set
        }
        const ipfsLink = `https://gateway.pinata.cloud/ipfs/${asset.ipfsHash}`;

        await bot.sendMessage(
          chatId,
          `🆔 ID: ${asset.id}\n` + +
            `📦 Type: ${asset.assetType}\n` +
            `👤 Owner: ${asset.owner}\n` +
            `🕐 Registered: ${date}\n` +
            `🔗 IPFS: ${ipfsLink}\n` +
            `License: ${licenseStatus}`
        );
      }

      message += `\n💡 *Commands:*\n`;
      message += `• /verify <id> - View details\n`;
      message += `• /license - Set pricing\n`;
      message += `• /transfer - Gift to someone`;

      await bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
    } catch (err) {
      console.error("Error fetching user assets:", err);
      await bot.sendMessage(chatId, "❌ Failed to fetch assets. Try again.");
    }
  });
}
