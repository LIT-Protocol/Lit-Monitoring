import { LitNetwork } from "@lit-protocol/constants";
import { LitContracts } from "@lit-protocol/contracts-sdk";
import { ethers } from "ethers";

export async function pkpMint(_wallet: ethers.Wallet, _network: LitNetwork) {

    const litContracts = new LitContracts({
        signer: _wallet,
        network: _network,
    });

    await litContracts.connect();

    const mintedPkp = await litContracts.pkpNftContractUtils.write.mint();

    return mintedPkp.pkp;
}