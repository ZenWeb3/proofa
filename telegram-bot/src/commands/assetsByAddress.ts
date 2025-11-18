// src/commands/assetsByAddress.ts (replace entire file)
import TelegramBot from "node-telegram-bot-api";
import axios from "axios";
import { STORY_RPC_URL, CONTRACT_ADDRESS } from "../config";
import IPRegistryABI from "../../../smart-contract/artifacts/contracts/IPRegistry.sol/IPRegistry.json";
import { Interface } from "ethers";
import { getLicenseOnChain } from "../utils/blockchain-simple";

const iface = new Interface(IPRegistryABI.abi);
const pendingAddressUsers = new Set<string>();

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

async function callContract(method: string, params: any[] = []): Promise<any> {
  const data = iface.encodeFunctionData(method, params);
  const result = await rpcCall("eth_call", [
    { to: CONTRACT_ADDRESS, data },
    "latest",
  ]);
  return iface.decodeFunctionResult(method, result);
}

async function getAssetsByOwner(ownerAddress: string): Promise<number[]> {
  try {
    const decoded = await callContract("getAssetsByOwner", [ownerAddress]);
    return decoded[0].map((id: bigint) => Number(id));
  } catch (err) {
    console.error("Failed to get assets by owner:", err);
    return [];
  }
}

async function getAssetDetails(assetId: number) {
  try {
    const result = await callContract("getAsset", [assetId]);
    const asset = result[0];
    return {
      id: assetId,
      ipfsHash: asset.ipfsHash,
      owner: asset.owner,
      assetType: asset.assetType,
      timestamp: Number(asset.timestamp),
    };
  } catch (err) {
    console.error(`Failed to get asset ${assetId}:`, err);
    return null;
  }
}

export default function assetsByAddressCommand(bot: TelegramBot) {
  bot.onText(/\/assetsbyaddress/, async (msg) => {
    if (!msg?.chat) return;
    const chatId = String(msg.chat.id);

    await bot.sendMessage(
      chatId,
      "🔍 *Query Assets by Address*\n\nPlease send the wallet address you want to check:",
      { parse_mode: "Markdown" }
    );

    pendingAddressUsers.add(chatId);
  });

  bot.on("message", async (msg) => {
    if (!msg?.chat || !msg.text) return;
    const chatId = String(msg.chat.id);

    if (!pendingAddressUsers.has(chatId)) return;

    const userAddress = msg.text.trim();

    if (!/^0x[a-fA-F0-9]{40}$/.test(userAddress)) {
      await bot.sendMessage(
        chatId,
        "❌ Invalid address format. Must be 42 characters starting with 0x.\n\nTry again or send /cancel"
      );
      return;
    }

    try {
      await bot.sendMessage(chatId, "🔍 Fetching assets...");

      const assetIds = await getAssetsByOwner(userAddress);

      if (assetIds.length === 0) {
        await bot.sendMessage(
          chatId,
          `📭 No assets found for address:\n\`${userAddress}\``,
          { parse_mode: "Markdown" }
        );
        pendingAddressUsers.delete(chatId);
        return;
      }

      const assets = await Promise.all(
        assetIds.map((id) => getAssetDetails(id))
      );

      let response = `🖼 *Assets for Address*\n\`${userAddress}\`\n\n`;
      response += `Found ${assetIds.length} asset(s):\n\n`;

      for (const asset of assets) {
        if (!asset) continue;

        const date = new Date(asset.timestamp * 1000).toLocaleString();

        // Fetch license
        let licenseInfo = "";
        try {
          const license = await getLicenseOnChain(asset.id);
          if (license.price > 0n) {
            const priceIP = (Number(license.price) / 1e18).toFixed(4);
            licenseInfo = `\n💰 License: ${priceIP} IP ${
              license.isCommercial ? "💼" : "👤"
            } | ${license.royaltyPercent}% royalty`;
          }
        } catch (err) {
          // No license
        }

        response += `━━━━━━━━━━━━━━━━━━\n`;
        response += `🆔 *Asset ID:* ${asset.id}\n`;
        response += `📦 *Type:* ${asset.assetType}\n`;
        response += `🕐 *Registered:* ${date}${licenseInfo}\n`;
        response += `🔗 [View on IPFS](https://gateway.pinata.cloud/ipfs/${asset.ipfsHash})\n\n`;
      }

      response += `🔗 [View on Explorer](https://aeneid.storyscan.xyz/address/${userAddress})`;

      await bot.sendMessage(chatId, response, {
        parse_mode: "Markdown",
        disable_web_page_preview: true,
      });
    } catch (err: any) {
      console.error("Error fetching assets by address:", err);
      await bot.sendMessage(
        chatId,
        "❌ Failed to fetch assets. Network issue - please try again."
      );
    } finally {
      pendingAddressUsers.delete(chatId);
    }
  });

  bot.onText(/\/cancel/, (msg) => {
    if (!msg?.chat) return;
    const chatId = String(msg.chat.id);

    if (pendingAddressUsers.has(chatId)) {
      pendingAddressUsers.delete(chatId);
      bot.sendMessage(chatId, "✅ Cancelled.");
    }
  });
}
