import { JsonRpcProvider, Wallet, Contract } from "ethers";
import { STORY_RPC_URL, CONTRACT_ADDRESS } from "../config";
import IPRegistryABI from "../../../smart-contract/artifacts/contracts/IPRegistry.sol/IPRegistry.json";

const provider = new JsonRpcProvider(STORY_RPC_URL);
export const contract = new Contract(CONTRACT_ADDRESS, IPRegistryABI.abi, provider);

/**
 * Register asset on chain using USER'S wallet (not bot wallet)
 */
export async function registerAssetOnChain(
  userPrivateKey: string, 
  ipfsHash: string, 
  assetType: string
): Promise<number> {
  try {
    // Create signer from user's private key
    const userSigner = new Wallet(userPrivateKey, provider);
    const contract = new Contract(CONTRACT_ADDRESS, IPRegistryABI.abi, userSigner);
    
    console.log(`Registering asset for user: ${userSigner.address}`);
    
    const tx = await contract.registerAsset(ipfsHash, assetType);
    console.log("Transaction sent:", tx.hash);

    const receipt = await tx.wait();
    console.log("Transaction mined in block:", receipt.blockNumber);

    const totalAssets = await contract.totalAssets();
    return Number(totalAssets);
  } catch (err: any) {
    console.error("Blockchain registration failed:", err);
    
    // Check if user has no gas
    if (err.message?.includes("insufficient funds")) {
      throw new Error("INSUFFICIENT_FUNDS");
    }
    
    throw err;
  }
}

/**
 * Get asset certificate from chain
 */
export async function getCertificateOnChain(assetId: number) {
  try {
    const contract = new Contract(CONTRACT_ADDRESS, IPRegistryABI.abi, provider);
    const asset = await contract.getAsset(assetId);
    
    return {
      id: assetId,
      ipfsHash: asset.ipfsHash,
      owner: asset.owner,
      assetType: asset.assetType,
      timestamp: Number(asset.timestamp),
      explorerUrl: `https://aeneid.storyscan.io/address/${CONTRACT_ADDRESS}`,
    };
  } catch (err) {
    console.error("Failed to fetch certificate:", err);
    throw new Error("Failed to get certificate from chain");
  }
}

/**
 * Verify asset by IPFS hash
 */
export async function verifyAssetByHash(ipfsHash: string) {
  try {
    const contract = new Contract(CONTRACT_ADDRESS, IPRegistryABI.abi, provider);
    const result = await contract.verifyAsset(ipfsHash);
    
    return {
      exists: result[0],
      assetId: Number(result[1]),
      owner: result[2],
      timestamp: Number(result[3]),
      assetType: result[4],
    };
  } catch (err) {
    console.error("Failed to verify asset:", err);
    return { exists: false, assetId: 0, owner: "", timestamp: 0, assetType: "" };
  }
}

/**
 * Check if wallet has enough balance for gas
 */
export async function checkWalletBalance(address: string): Promise<string> {
  try {
    const balance = await provider.getBalance(address);
    return balance.toString();
  } catch (err) {
    console.error("Failed to check balance:", err);
    return "0";
  }
}

/**
 * Fund user wallet from bot's wallet (for free tier)
 */
export async function fundUserWallet(userAddress: string, amount: string): Promise<boolean> {
  try {
    const botPrivateKey = process.env.BOT_WALLET_PRIVATE_KEY!;
    const botWallet = new Wallet(botPrivateKey, provider);
    
    const tx = await botWallet.sendTransaction({
      to: userAddress,
      value: amount, // in wei
    });
    
    await tx.wait();
    console.log(`Funded ${userAddress} with ${amount} wei`);
    return true;
  } catch (err) {
    console.error("Failed to fund wallet:", err);
    return false;
  }
}