import { expect } from "chai";
import hre from "hardhat";

describe("IPRegistry", function () {
  let ipRegistry: any;
  let owner: any;
  let user1: any;
  let user2: any;

  beforeEach(async () => {
    [owner, user1, user2] = await hre.ethers.getSigners();
    const IPRegistry = await hre.ethers.getContractFactory("IPRegistry");
    ipRegistry = await IPRegistry.deploy();
    await ipRegistry.waitForDeployment();
  });

  describe("Basic Tests", function () {
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

  describe("✅ Core Registration Features", function () {
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
      expect(parsedEvent.args.owner).to.equal(owner.address);
      expect(parsedEvent.args.ipfsHash).to.equal("QmFakeHash");
    });

    it("should reject invalid asset types", async function () {
      await expect(
        ipRegistry.registerAsset("QmHash", "invalid")
      ).to.be.revertedWith("Invalid asset type");
    });

    it("should accept all valid asset types", async function () {
      await ipRegistry.registerAsset("QmHash1", "image");
      await ipRegistry.registerAsset("QmHash2", "audio");
      await ipRegistry.registerAsset("QmHash3", "video");
      await ipRegistry.registerAsset("QmHash4", "text");
      await ipRegistry.registerAsset("QmHash5", "document");

      expect(await ipRegistry.totalAssets()).to.equal(5n);
    });

    it("should prevent duplicate IPFS hash registration", async function () {
      await ipRegistry.registerAsset("QmDuplicate", "image");

      await expect(
        ipRegistry.registerAsset("QmDuplicate", "audio")
      ).to.be.revertedWith("Asset already registered");
    });

    it("should reject empty IPFS hash", async function () {
      await expect(ipRegistry.registerAsset("", "image")).to.be.revertedWith(
        "Invalid IPFS hash"
      );
    });
  });

  describe("📊 Query Features", function () {
    beforeEach(async () => {
      await ipRegistry.connect(user1).registerAsset("QmHash1", "image");
      await ipRegistry.connect(user1).registerAsset("QmHash2", "audio");
      await ipRegistry.connect(user2).registerAsset("QmHash3", "video");
    });

    it("should get asset by ID", async function () {
      const asset = await ipRegistry.getAsset(1);
      expect(asset.ipfsHash).to.equal("QmHash1");
      expect(asset.owner).to.equal(user1.address);
      expect(asset.assetType).to.equal("image");
    });

    it("should get all assets by owner", async function () {
      const assetIds = await ipRegistry.getAssetsByOwner(user1.address);
      expect(assetIds.map((id: bigint) => Number(id))).to.deep.equal([1, 2]);
    });

    it("should return total assets count", async function () {
      expect(await ipRegistry.totalAssets()).to.equal(3n);
    });

    it("should get full certificate for an asset", async function () {
      const [id, ownerAddr, ipfsHash, assetType, timestamp, onChainLink] =
        await ipRegistry.getCertificate(1);

      expect(id).to.equal(1n);
      expect(ownerAddr).to.equal(user1.address);
      expect(ipfsHash).to.equal("QmHash1");
      expect(assetType).to.equal("image");
      expect(timestamp).to.be.greaterThan(0n);
      expect(onChainLink).to.include("etherscan.io");
    });

    it("should revert when getting non-existent asset", async function () {
      await expect(ipRegistry.getAsset(999)).to.be.revertedWith(
        "Asset not found"
      );
    });
  });

  describe("💰 Feature 1: Licensing & Monetization", function () {
    beforeEach(async () => {
      await ipRegistry.connect(user1).registerAsset("QmHash1", "image");
    });

    it("should allow owner to set license terms", async function () {
      const price = hre.ethers.parseEther("0.1");
      const tx = await ipRegistry.connect(user1).setLicense(1, price, true, 10);
      const receipt = await tx.wait();

      const event = receipt.logs.find((log: any) => {
        try {
          const parsed = ipRegistry.interface.parseLog(log);
          return parsed?.name === "LicenseSet";
        } catch {
          return false;
        }
      });

      const parsedEvent = ipRegistry.interface.parseLog(event);
      expect(parsedEvent.args.assetId).to.equal(1n);
      expect(parsedEvent.args.price).to.equal(price);
      expect(parsedEvent.args.isCommercial).to.equal(true);
      expect(parsedEvent.args.royaltyPercent).to.equal(10n);
    });

    it("should get license information", async function () {
      const price = hre.ethers.parseEther("0.5");
      await ipRegistry.connect(user1).setLicense(1, price, false, 15);

      const [licensePrice, isCommercial, royalty] = await ipRegistry.getLicense(
        1
      );
      expect(licensePrice).to.equal(price);
      expect(isCommercial).to.equal(false);
      expect(royalty).to.equal(15n);
    });

    it("should prevent non-owner from setting license", async function () {
      const price = hre.ethers.parseEther("0.1");
      await expect(
        ipRegistry.connect(user2).setLicense(1, price, true, 10)
      ).to.be.revertedWith("Not the owner");
    });

    it("should reject royalty over 100%", async function () {
      await expect(
        ipRegistry.connect(user1).setLicense(1, 0, true, 101)
      ).to.be.revertedWith("Royalty must be 0-100");
    });

    it("should allow updating license terms", async function () {
      await ipRegistry.connect(user1).setLicense(1, 100, true, 5);
      await ipRegistry.connect(user1).setLicense(1, 200, false, 10);

      const [price, isCommercial, royalty] = await ipRegistry.getLicense(1);
      expect(price).to.equal(200n);
      expect(isCommercial).to.equal(false);
      expect(royalty).to.equal(10n);
    });
  });

  describe("🎁 Feature 2: Transfer/Gift Assets", function () {
    beforeEach(async () => {
      await ipRegistry.connect(user1).registerAsset("QmHash1", "image");
      await ipRegistry.connect(user1).registerAsset("QmHash2", "audio");
    });

    it("should transfer asset to new owner", async function () {
      const tx = await ipRegistry
        .connect(user1)
        .transferAsset(1, user2.address);
      const receipt = await tx.wait();

      const event = receipt.logs.find((log: any) => {
        try {
          const parsed = ipRegistry.interface.parseLog(log);
          return parsed?.name === "AssetTransferred";
        } catch {
          return false;
        }
      });

      const parsedEvent = ipRegistry.interface.parseLog(event);
      expect(parsedEvent.args.assetId).to.equal(1n);
      expect(parsedEvent.args.from).to.equal(user1.address);
      expect(parsedEvent.args.to).to.equal(user2.address);

      // Verify ownership changed
      const asset = await ipRegistry.getAsset(1);
      expect(asset.owner).to.equal(user2.address);
    });

    it("should update ownership lists correctly", async function () {
      await ipRegistry.connect(user1).transferAsset(1, user2.address);

      const user1Assets = await ipRegistry.getAssetsByOwner(user1.address);
      const user2Assets = await ipRegistry.getAssetsByOwner(user2.address);

      expect(user1Assets.map((id: bigint) => Number(id))).to.deep.equal([2]);
      expect(user2Assets.map((id: bigint) => Number(id))).to.deep.equal([1]);
    });

    it("should prevent non-owner from transferring", async function () {
      await expect(
        ipRegistry.connect(user2).transferAsset(1, user2.address)
      ).to.be.revertedWith("Not the owner");
    });

    it("should prevent transfer to zero address", async function () {
      await expect(
        ipRegistry.connect(user1).transferAsset(1, hre.ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid address");
    });

    it("should prevent transfer to self", async function () {
      await expect(
        ipRegistry.connect(user1).transferAsset(1, user1.address)
      ).to.be.revertedWith("Cannot transfer to yourself");
    });

    it("should allow new owner to transfer again", async function () {
      await ipRegistry.connect(user1).transferAsset(1, user2.address);
      await ipRegistry.connect(user2).transferAsset(1, owner.address);

      const asset = await ipRegistry.getAsset(1);
      expect(asset.owner).to.equal(owner.address);
    });
  });

  describe("🔍 Feature 3: Verification & Proof of Existence", function () {
    beforeEach(async () => {
      await ipRegistry.connect(user1).registerAsset("QmExisting", "image");
    });

    it("should verify existing asset", async function () {
      const [exists, assetId, ownerAddr, timestamp, assetType] =
        await ipRegistry.verifyAsset("QmExisting");

      expect(exists).to.equal(true);
      expect(assetId).to.equal(1n);
      expect(ownerAddr).to.equal(user1.address);
      expect(timestamp).to.be.greaterThan(0n);
      expect(assetType).to.equal("image");
    });

    it("should return false for non-existent asset", async function () {
      const [exists, assetId, ownerAddr, timestamp, assetType] =
        await ipRegistry.verifyAsset("QmNotRegistered");

      expect(exists).to.equal(false);
      expect(assetId).to.equal(0n);
      expect(ownerAddr).to.equal(hre.ethers.ZeroAddress);
      expect(timestamp).to.equal(0n);
      expect(assetType).to.equal("");
    });

    it("should still verify after transfer", async function () {
      await ipRegistry.connect(user1).transferAsset(1, user2.address);

      const [exists, assetId, ownerAddr, ,] = await ipRegistry.verifyAsset(
        "QmExisting"
      );

      expect(exists).to.equal(true);
      expect(assetId).to.equal(1n);
      expect(ownerAddr).to.equal(user2.address); // New owner
    });
    it("should return the correct asset ID by IPFS hash", async () => {
      const tx = await ipRegistry.registerAsset("QmHashLookup", "image");
      const receipt = await tx.wait();

      // Grab the asset ID from the emitted event
      const event = receipt.logs.find((log: any) => {
        try {
          const parsed = ipRegistry.interface.parseLog(log);
          return parsed?.name === "AssetRegistered";
        } catch {
          return false;
        }
      });

      const parsedEvent = ipRegistry.interface.parseLog(event);
      const newAssetId = parsedEvent.args.id;

      const hashKey = hre.ethers.keccak256(
        hre.ethers.toUtf8Bytes("QmHashLookup")
      );
      const assetId = await ipRegistry.getAssetIdByHash(hashKey);

      expect(assetId).to.equal(newAssetId);
    });

    it("should return 0 for a non-existent hash", async () => {
      const hashKey = hre.ethers.keccak256(
        hre.ethers.toUtf8Bytes("QmNonExistent")
      );
      const assetId = await ipRegistry.getAssetIdByHash(hashKey);

      expect(assetId).to.equal(0n);
    });
  });

  describe("🔗 Integration Tests", function () {
    it("should handle complete workflow: register → license → transfer", async function () {
      // Register
      await ipRegistry.connect(user1).registerAsset("QmWorkflow", "image");

      // Set license
      const price = hre.ethers.parseEther("1.0");
      await ipRegistry.connect(user1).setLicense(1, price, true, 20);

      // Verify license
      const [licensePrice, , royalty] = await ipRegistry.getLicense(1);
      expect(licensePrice).to.equal(price);
      expect(royalty).to.equal(20n);

      // Transfer
      await ipRegistry.connect(user1).transferAsset(1, user2.address);

      // Verify new owner
      const asset = await ipRegistry.getAsset(1);
      expect(asset.owner).to.equal(user2.address);

      // Verify asset still exists
      const [exists, , ownerAddr] = await ipRegistry.verifyAsset("QmWorkflow");
      expect(exists).to.equal(true);
      expect(ownerAddr).to.equal(user2.address);
    });

    it("should handle multiple users registering different assets", async function () {
      await ipRegistry.connect(user1).registerAsset("QmUser1Asset1", "image");
      await ipRegistry.connect(user1).registerAsset("QmUser1Asset2", "audio");
      await ipRegistry.connect(user2).registerAsset("QmUser2Asset1", "video");

      expect(await ipRegistry.totalAssets()).to.equal(3n);

      const user1Assets = await ipRegistry.getAssetsByOwner(user1.address);
      const user2Assets = await ipRegistry.getAssetsByOwner(user2.address);

      expect(user1Assets.length).to.equal(2);
      expect(user2Assets.length).to.equal(1);
    });
  });
});
