import { toNano } from "@ton/core";
import { compile, NetworkProvider } from "@ton/blueprint";
import { JettonMinter } from "../wrappers/JettonMinter";
import { jettonWalletCodeFromLibrary, promptAmount, promptUrl, promptUserFriendlyAddress } from "../wrappers/ui-utils";

export async function run(provider: NetworkProvider) {
  const ui = provider.ui();
  const isTestnet = provider.network() !== "mainnet";

  const adminAddress = await promptUserFriendlyAddress("Enter admin wallet address:", ui, isTestnet);
  const metadataUri = await promptUrl("Enter jetton metadata uri (https://.../jetton.json):", ui);

  let decimals = 9;
  try {
    const meta = await (await fetch(metadataUri)).json();
    if (typeof meta.decimals === "number") {
      decimals = meta.decimals;
    }
    if (!meta.name || !meta.symbol) {
      ui.write("Warning: metadata is missing name or symbol fields");
    } else {
      ui.write(`Token: ${meta.name} (${meta.symbol})`);
    }
  } catch (e: any) {
    ui.write("Failed to fetch metadata: " + e.message);
  }

  const totalSupply = await promptAmount("Enter total supply to mint", decimals, ui);

  const jettonWalletCodeRaw = await compile("JettonWallet");
  const jettonWalletCode = jettonWalletCodeFromLibrary(jettonWalletCodeRaw);

  const minter = provider.open(
    JettonMinter.createFromConfig(
      {
        admin: adminAddress.address,
        wallet_code: jettonWalletCode,
        jetton_content: { uri: metadataUri },
      },
      await compile("JettonMinter")
    )
  );

  ui.write("Deploying Jetton Minter...");
  await minter.sendDeploy(provider.sender(), toNano("1.5"));

  ui.write("Minting initial supply to admin...");
  await minter.sendMint(provider.sender(), adminAddress.address, totalSupply);

  ui.write("Done. Jetton Minter deployed at " + minter.address.toString());
}
