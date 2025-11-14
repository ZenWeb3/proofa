import fs from "fs";
import axios from "axios";
import FormData from "form-data";
import { PINATA_API_KEY, PINATA_SECRET_API_KEY } from "../config";

/**
 * Upload a file to Pinata (IPFS) and return IPFS hash (without ipfs:// prefix)
 */
export async function uploadFileToIPFS(filePath: string): Promise<string> {
  const url = "https://api.pinata.cloud/pinning/pinFileToIPFS";

  const data = new FormData();
  data.append("file", fs.createReadStream(filePath));

  try {
    const res = await axios.post(url, data, {
      maxBodyLength: Infinity,
      headers: {
        ...data.getHeaders(),
        pinata_api_key: PINATA_API_KEY,
        pinata_secret_api_key: PINATA_SECRET_API_KEY,
      },
    });

    // Return just the hash (your contract stores hash without ipfs:// prefix)
    return res.data.IpfsHash;
  } catch (err: any) {
    console.error("Pinata upload failed:", err.response?.data || err.message);
    throw new Error("Failed to upload to IPFS");
  }
}