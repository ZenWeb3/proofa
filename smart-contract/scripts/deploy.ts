import hre from "hardhat";

async function main() {
  console.log("🚀 Starting deployment to Story Protocol...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("📍 Deploying from address:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", hre.ethers.formatEther(balance), "IP\n");

  if (balance === 0n) {
    console.error(
      "❌ No IP tokens! Get test IP from: https://faucet.story.foundation/"
    );
    process.exit(1);
  }

  console.log("📦 Deploying IPRegistry contract...");
  const IPRegistry = await hre.ethers.getContractFactory("IPRegistry");
  const ipRegistry = await IPRegistry.deploy();

  await ipRegistry.waitForDeployment();
  const contractAddress = await ipRegistry.getAddress();

  console.log("✅ IPRegistry deployed to:", contractAddress);
  console.log(
    "🔗 View on Story Explorer:",
    `https://testnet.storyscan.xyz/address/${contractAddress}\n`
  );

  console.log("⏳ Waiting for block confirmations...");
  await ipRegistry.deploymentTransaction()?.wait(3);

  console.log("\n🧪 Testing deployment...");
  const totalAssets = await ipRegistry.totalAssets();
  console.log("📊 Total assets:", totalAssets.toString());

  console.log("\n🎉 Deployment complete!");
  console.log("\n📋 Contract Details:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Contract Address:", contractAddress);
  console.log("Network: Story Protocol Iliad Testnet");
  console.log("Chain ID: 1315");
  console.log("Deployer:", deployer.address);
  console.log("Block:", await hre.ethers.provider.getBlockNumber());
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("\n💡 Save this address for your Telegram bot!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
