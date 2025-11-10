import { expect } from "chai";
import hre from "hardhat";

describe("IPRegistry", function () {
  let ipRegistry: any;

  beforeEach(async () => {
    const IPRegistry = await hre.ethers.getContractFactory("IPRegistry");
    ipRegistry = await IPRegistry.deploy();
    await ipRegistry.waitForDeployment();
  });

  it("should register an asset and return its ID", async function () {
    const tx = await ipRegistry.registerAsset("QmFakeHash", "image");
    const receipt = await tx.wait();

    // Ethers v6 way to get events
    const event = receipt.logs.find((log: any) => {
      try {
        const parsed = ipRegistry.interface.parseLog(log);
        return parsed?.name === "AssetRegistered";
      } catch {
        return false;
      }
    });

    const parsedEvent = ipRegistry.interface.parseLog(event);
    expect(parsedEvent.args.id).to.equal(1n);
  });

  it("should get asset by ID", async function () {
    await ipRegistry.registerAsset("QmFakeHash", "image");
    const asset = await ipRegistry.getAsset(1);
    expect(asset.ipfsHash).to.equal("QmFakeHash");
  });

  it("should get all assets by owner", async function () {
    await ipRegistry.registerAsset("QmHash1", "image");
    await ipRegistry.registerAsset("QmHash2", "audio");

    const [owner] = await hre.ethers.getSigners();
    const assetIds = await ipRegistry.getAssetsByOwner(owner.address);
    expect(assetIds.map((id: bigint) => Number(id))).to.deep.equal([1, 2]);
  });

  it("should allow registering a document", async function () {
    const tx = await ipRegistry.registerAsset("QmDocHash", "document");
    const receipt = await tx.wait();

    const event = receipt.logs.find((log: any) => {
      try {
        const parsed = ipRegistry.interface.parseLog(log);
        return parsed?.name === "AssetRegistered";
      } catch {
        return false;
      }
    });

    const parsedEvent = ipRegistry.interface.parseLog(event);
    expect(parsedEvent.args.assetType).to.equal("document");
  });
});
