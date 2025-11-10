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


  it("should return a valid certificate for an asset", async function () {
    const tx = await ipRegistry.registerAsset("QmCertHash", "document");
    await tx.wait();

    const cert = await ipRegistry.getCertificate(1);
    
    const [owner] = await hre.ethers.getSigners();

    expect(cert.id).to.equal(1n);
    expect(cert.owner).to.equal(owner.address);
    expect(cert.ipfsHash).to.equal("QmCertHash");
    expect(cert.assetType).to.equal("document");
    expect(cert.timestamp).to.be.a("bigint");
    expect(cert.onChainLink).to.include("https://etherscan.io/address/");
  });
});
