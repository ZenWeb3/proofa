import axios from "axios";
import { Wallet, Contract, Interface } from "ethers";
import { STORY_RPC_URL, CONTRACT_ADDRESS, PRIVATE_KEY } from "../config";
import IPRegistryABI from "../../../smart-contract/artifacts/contracts/IPRegistry.sol/IPRegistry.json";

const iface = new Interface(IPRegistryABI.abi);

// Simple RPC call with axios
async function rpcCall(method: string, params: any[] = []): Promise<any> {
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
}

// Send transaction
async function sendTransaction(userPrivateKey: string, data: string): Promise<string> {
  const wallet = new Wallet(userPrivateKey);
  
  // Get nonce
  const nonce = await rpcCall("eth_getTransactionCount", [wallet.address, "latest"]);
  
  // Get gas price
  const gasPrice = await rpcCall("eth_gasPrice", []);
  
  // Estimate gas
  const gasEstimate = await rpcCall("eth_estimateGas", [
    {
      from: wallet.address,
      to: CONTRACT_ADDRESS,
      data,
    },
  ]);

  // Build transaction
  const tx = {
    to: CONTRACT_ADDRESS,
    data,
    nonce: parseInt(nonce, 16),
    gasLimit: parseInt(gasEstimate, 16) * 2, // 2x for safety
    gasPrice: parseInt(gasPrice, 16),
    chainId: 1315, // Story Iliad testnet
  };

  // Sign transaction
  const signedTx = await wallet.signTransaction(tx);

  // Send raw transaction
  const txHash = await rpcCall("eth_sendRawTransaction", [signedTx]);
  
  return txHash;
}

// Wait for transaction
async function waitForTransaction(txHash: string, maxAttempts = 60): Promise<any> {
  for (let i = 0; i < maxAttempts; i++) {
    const receipt = await rpcCall("eth_getTransactionReceipt", [txHash]);
    
    if (receipt) {
      console.log(`Transaction mined in block: ${parseInt(receipt.blockNumber, 16)}`);
      return receipt;
    }
    
    await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2s
  }
  
  throw new Error("Transaction timeout");
}

// Call contract (read-only)
async function callContract(method: string, params: any[] = []): Promise<any> {
  const data = iface.encodeFunctionData(method, params);
  
  const result = await rpcCall("eth_call", [
    {
      to: CONTRACT_ADDRESS,
      data,
    },
    "latest",
  ]);

  return iface.decodeFunctionResult(method, result);
}

// Register asset
export async function registerAssetOnChain(
  userPrivateKey: string,
  ipfsHash: string,
  assetType: string
): Promise<number> {
  try {
    const wallet = new Wallet(userPrivateKey);
    console.log(`Registering asset for: ${wallet.address}`);

    // Encode function call
    const data = iface.encodeFunctionData("registerAsset", [ipfsHash, assetType]);

    // Send transaction
    const txHash = await sendTransaction(userPrivateKey, data);
    console.log("Transaction sent:", txHash);

    // Wait for confirmation
    await waitForTransaction(txHash);

    // Get total assets
    const [totalAssets] = await callContract("totalAssets");
    return Number(totalAssets);
  } catch (err: any) {
    console.error("Registration failed:", err.message);
    
    if (err.message?.includes("insufficient funds")) {
      throw new Error("INSUFFICIENT_FUNDS");
    }
    
    throw err;
  }
}

// Get asset certificate
export async function getCertificateOnChain(assetId: number) {
  try {
    const result = await callContract("getAsset", [assetId]);
    const asset = result[0]; // First element of tuple

    return {
      id: assetId,
      ipfsHash: asset.ipfsHash,
      owner: asset.owner,
      assetType: asset.assetType,
      timestamp: Number(asset.timestamp),
      explorerUrl: `https://aeneid.storyscan.xyz/address/${CONTRACT_ADDRESS}`,
    };
  } catch (err) {
    console.error("Failed to fetch certificate:", err);
    throw new Error("Failed to get certificate");
  }
}

// Verify asset by hash
export async function verifyAssetByHash(ipfsHash: string) {
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
    return { exists: false, assetId: 0, owner: "", timestamp: 0, assetType: "" };
  }
}

// Check wallet balance
export async function checkWalletBalance(address: string): Promise<string> {
  try {
    const balance = await rpcCall("eth_getBalance", [address, "latest"]);
    return BigInt(balance).toString();
  } catch (err) {
    console.error("Balance check failed:", err);
    return "0";
  }
}

// Fund user wallet
export async function fundUserWallet(userAddress: string, amount: string): Promise<boolean> {
  try {
    const data = "0x"; // Empty data for simple transfer
    const txHash = await sendTransaction(PRIVATE_KEY, data);
    await waitForTransaction(txHash);
    return true;
  } catch (err) {
    console.error("Funding failed:", err);
    return false;
  }
}