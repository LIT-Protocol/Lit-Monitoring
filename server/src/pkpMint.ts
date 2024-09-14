import { LitNetwork } from "@lit-protocol/constants";
import { LitContracts } from "@lit-protocol/contracts-sdk";
import { ethers } from "ethers";

export async function pkpMint(_privateKey: string, _network: LitNetwork) {

    const signer = await getWallet(_privateKey);

    const litContracts = new LitContracts({
        signer: signer,
        network: _network,
        debug: false,
    });

    await litContracts.connect();

    const mintedPkp = await litContracts.pkpNftContractUtils.write.mint();

    return mintedPkp.pkp;
}


async function getWallet(_privateKey: string) {
    const provider = new ethers.providers.JsonRpcProvider(
        `https://yellowstone-rpc.litprotocol.com/`
    );

    const wallet = new ethers.Wallet(_privateKey, provider);

    return wallet;
}