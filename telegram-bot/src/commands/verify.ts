import TelegramBot from "node-telegram-bot-api";
import axios from "axios";
import { STORY_RPC_URL, CONTRACT_ADDRESS } from "../config";
import IPRegistryABI from "../../../smart-contract/artifacts/contracts/IPRegistry.sol/IPRegistry.json";
import { Interface } from "ethers";
import { getLicenseOnChain } from "../utils/blockchain-simple";

const iface = new Interface(IPRegistryABI.abi);

// Track verification state per user
const verifyState = new Map<
  string,
  "await_method" | "await_hash" | "await_id"
>();

// Add retry logic
async function rpcCallWithRetry(
  method: string,
  params: any[] = [],
  retries = 3
): Promise<any> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await axios.post(
        STORY_RPC_URL,
        {
          jsonrpc: "2.0",
          id: Date.now(),
          method,
          params,
        },
        {
          timeout: 30000,
          headers: { "Content-Type": "application/json" },
        }
      );

      if (response.data.error) {
        throw new Error(response.data.error.message);
      }

      return response.data.result;
    } catch (err: any) {
      console.error(
        `RPC call attempt ${i + 1}/${retries} failed:`,
        err.message
      );

      if (i === retries - 1) {
        throw err; // Last attempt failed
      }

      // Wait before retry (exponential backoff)
      await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}

async function callContract(method: string, params: any[] = []): Promise<any> {
  const data = iface.encodeFunctionData(method, params);

  const result = await rpcCallWithRetry("eth_call", [
    {
      to: CONTRACT_ADDRESS,
      data,
    },
    "latest",
  ]);

  return iface.decodeFunctionResult(method, result);
}

async function verifyAssetByHash(ipfsHash: string) {
  try {
    const result = await callContract("verifyAsset", [ipfsHash]);

    return {
      exists: result[0],
      assetId: Number(result[1]),
      owner: result[2],
      timestamp: Number(result[3]),
      assetType: result[4],
    };
  } catch (err) {
    console.error("Verify failed:", err);
    return null;
  }
}

async function getAssetById(assetId: number) {
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
    console.error("Get asset failed:", err);
    return null;
  }
}

export default function verifyCommand(bot: TelegramBot) {
  // Step 1: /verify command
  bot.onText(/\/verify/, async (msg) => {
    if (!msg?.chat) return;
    const chatId = String(msg.chat.id);

    await bot.sendMessage(
      chatId,
      "🔍 *Verify Asset Ownership*\n\nHow would you like to verify?\n\n" +
        "1️⃣ Type `hash` - Verify by IPFS hash\n" +
        "2️⃣ Type `id` - Verify by Asset ID\n\n" +
        "Or send /cancel to exit",
      { parse_mode: "Markdown" }
    );

    verifyState.set(chatId, "await_method");
  });

  // Step 2: Handle user input
  bot.on("message", async (msg) => {
    if (!msg?.chat || !msg.text) return;
    const chatId = String(msg.chat.id);
    const text = msg.text.trim().toLowerCase();

    const state = verifyState.get(chatId);
    if (!state) return;

    // Handle method selection
    if (state === "await_method") {
      if (text === "hash") {
        await bot.sendMessage(
          chatId,
          "📝 Please send the IPFS hash (e.g., QmXXX...):"
        );
        verifyState.set(chatId, "await_hash");
      } else if (text === "id") {
        await bot.sendMessage(
          chatId,
          "📝 Please send the Asset ID (e.g., 13):"
        );
        verifyState.set(chatId, "await_id");
      } else if (text === "/cancel") {
        verifyState.delete(chatId);
        await bot.sendMessage(chatId, "✅ Verification cancelled.");
      } else {
        await bot.sendMessage(
          chatId,
          "❌ Please type `hash`, `id`, or /cancel"
        );
      }
      return;
    }

    // Handle IPFS hash verification
    if (state === "await_hash") {
      const hash = msg.text.trim();

      if (!/^Qm[1-9A-HJ-NP-Za-km-z]{44,}$/.test(hash)) {
        await bot.sendMessage(
          chatId,
          "❌ Invalid IPFS hash format. Should start with 'Qm'.\n\nTry again or send /cancel"
        );
        return;
      }

      try {
        await bot.sendMessage(
          chatId,
          "🔍 Checking blockchain... (this may take a moment)"
        );

        const result = await verifyAssetByHash(hash);

        if (!result || !result.exists) {
          await bot.sendMessage(
            chatId,
            "❌ *Asset Not Found*\n\n" +
              "This IPFS hash has not been registered on Story Protocol.\n\n" +
              "🎨 Want to register it? Use /register",
            { parse_mode: "Markdown" }
          );
        } else {
          const date = new Date(result.timestamp * 1000).toLocaleString();
          const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${hash}`;

          const caption = `
✅ *Asset Found & Verified!*

🆔 *Asset ID:* ${result.assetId}
👤 *Owner:* \`${result.owner}\`
📦 *Type:* ${result.assetType}
🕐 *Registered:* ${date}

🔗 [View Certificate](https://aeneid.storyscan.xyz/address/${CONTRACT_ADDRESS})

⚠️ This work is protected on the blockchain!
          `;

          // Send with media preview based on type
          try {
            if (result.assetType === "image") {
              await bot.sendPhoto(chatId, ipfsUrl, {
                caption,
                parse_mode: "Markdown",
              });
            } else if (result.assetType === "video") {
              await bot.sendVideo(chatId, ipfsUrl, {
                caption,
                parse_mode: "Markdown",
              });
            } else if (result.assetType === "audio") {
              await bot.sendAudio(chatId, ipfsUrl, {
                caption,
                parse_mode: "Markdown",
              });
            } else {
              // For documents, send message with link
              await bot.sendMessage(
                chatId,
                caption + `\n\n🔗 [View on IPFS](${ipfsUrl})`,
                {
                  parse_mode: "Markdown",
                  disable_web_page_preview: false,
                }
              );
            }
          } catch (mediaErr) {
            // Fallback if media send fails
            console.error("Failed to send media:", mediaErr);
            await bot.sendMessage(
              chatId,
              caption + `\n\n🔗 [View on IPFS](${ipfsUrl})`,
              {
                parse_mode: "Markdown",
                disable_web_page_preview: false,
              }
            );
          }
        }
      } catch (err: any) {
        console.error("Verification error:", err);
        await bot.sendMessage(
          chatId,
          "❌ *Network Timeout*\n\n" +
            "Could not connect to blockchain. This usually means:\n" +
            "• Your internet connection is unstable\n" +
            "• The RPC node is slow\n\n" +
            "💡 *Try again in a few seconds* or use a different network.",
          { parse_mode: "Markdown" }
        );
      } finally {
        verifyState.delete(chatId);
      }
      return;
    }

    // Handle Asset ID verification
    if (state === "await_id") {
      const assetId = parseInt(msg.text.trim());

      if (isNaN(assetId) || assetId < 1) {
        await bot.sendMessage(
          chatId,
          "❌ Please send a valid Asset ID (positive number).\n\nTry again or send /cancel"
        );
        return;
      }

      try {
        await bot.sendMessage(
          chatId,
          "🔍 Checking blockchain... (retrying if needed)"
        );

        const asset = await getAssetById(assetId);

        if (!asset) {
          await bot.sendMessage(
            chatId,
            `❌ *Asset ID ${assetId} Not Found*\n\n` +
              "This Asset ID doesn't exist on Story Protocol.",
            { parse_mode: "Markdown" }
          );
        } else {
          const date = new Date(asset.timestamp * 1000).toLocaleString();
          const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${asset.ipfsHash}`;

          const caption = `
✅ *Asset Found & Verified!*

🆔 *Asset ID:* ${asset.id}
👤 *Owner:* \`${asset.owner}\`
📦 *Type:* ${asset.assetType}
🕐 *Registered:* ${date}
🌐 *IPFS:* \`${asset.ipfsHash}\`

🔗 [View Certificate](https://aeneid.storyscan.xyz/address/${CONTRACT_ADDRESS})

⚠️ This work is protected on the blockchain!
          `;

          // Send with media preview based on type
          try {
            if (asset.assetType === "image") {
              await bot.sendPhoto(chatId, ipfsUrl, {
                caption,
                parse_mode: "Markdown",
              });
            } else if (asset.assetType === "video") {
              await bot.sendVideo(chatId, ipfsUrl, {
                caption,
                parse_mode: "Markdown",
              });
            } else if (asset.assetType === "audio") {
              await bot.sendAudio(chatId, ipfsUrl, {
                caption,
                parse_mode: "Markdown",
              });
            } else {
              // For documents, send message with link
              await bot.sendMessage(
                chatId,
                caption + `\n\n🔗 [View on IPFS](${ipfsUrl})`,
                {
                  parse_mode: "Markdown",
                  disable_web_page_preview: false,
                }
              );
            }
          } catch (mediaErr) {
            // Fallback if media send fails
            console.error("Failed to send media:", mediaErr);
            await bot.sendMessage(
              chatId,
              caption + `\n\n🔗 [View on IPFS](${ipfsUrl})`,
              {
                parse_mode: "Markdown",
                disable_web_page_preview: false,
              }
            );
          }
        }
      } catch (err: any) {
        console.error("Verification error:", err);
        await bot.sendMessage(
          chatId,
          "❌ *Network Timeout*\n\n" +
            "Could not connect to blockchain after 3 retries.\n\n" +
            "💡 *Tips:*\n" +
            "• Check your internet connection\n" +
            "• Try again in a few moments\n" +
            "• Switch to a different WiFi/mobile network",
          { parse_mode: "Markdown" }
        );
      } finally {
        verifyState.delete(chatId);
      }
      return;
    }
  });

  bot.onText(/\/cancel/, (msg) => {
    if (!msg?.chat) return;
    const chatId = String(msg.chat.id);

    if (verifyState.has(chatId)) {
      verifyState.delete(chatId);
      bot.sendMessage(chatId, "✅ Verification cancelled.");
    }
  });
}
