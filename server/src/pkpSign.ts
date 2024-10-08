import { LitNodeClient } from "@lit-protocol/lit-node-client";
import { LitContracts } from "@lit-protocol/contracts-sdk";
import { LitAbility } from "@lit-protocol/types";
import { LitNetwork } from "@lit-protocol/constants";
import {
    LitActionResource,
    createSiweMessageWithRecaps,
    generateAuthSig,
    LitPKPResource,
} from "@lit-protocol/auth-helpers";
import { ethers } from "ethers";

export async function testPkpSign(_wallet: ethers.Wallet, _network: LitNetwork) {
    const litNodeClient = new LitNodeClient({
        litNetwork: _network,
    });

    const pkp = await mintPKP(_wallet, _network);
    const sessionSigs = await sessionSigEOA(_wallet, _network);

    await litNodeClient.connect();

    const results = await litNodeClient.pkpSign({
        toSign: [
            84, 104, 105, 115, 32, 109, 101, 115, 115, 97, 103, 101, 32, 105,
            115, 32, 101, 120, 97, 99, 116, 108, 121, 32, 51, 50, 32, 98, 121,
            116, 101, 115,
        ],
        pubKey: pkp.publicKey,
        sessionSigs: sessionSigs,
    });

    await litNodeClient.disconnect()

    console.log("pkpSign results: ", results);
    return results;
}

export async function mintPKP(_signer: ethers.Wallet, _network: LitNetwork) {
    
    const litContracts = new LitContracts({
        signer: _signer,
        network: _network,
    });

    await litContracts.connect();

    const mintedPkp = await litContracts.pkpNftContractUtils.write.mint();

    return mintedPkp.pkp;
}

export async function sessionSigEOA(
    _signer: ethers.Wallet,
    _network: LitNetwork
) {
    const litNodeClient = new LitNodeClient({
        litNetwork: _network,
    });

    await litNodeClient.connect();

    const sessionSigs = await litNodeClient.getSessionSigs({
        chain: "ethereum",
        resourceAbilityRequests: [
            {
                resource: new LitPKPResource("*"),
                ability: LitAbility.PKPSigning,
            },
            {
                resource: new LitActionResource("*"),
                ability: LitAbility.LitActionExecution,
            },
        ],
        authNeededCallback: async (params: any) => {
            if (!params.uri) {
                throw new Error("Params uri is required");
            }

            if (!params.resourceAbilityRequests) {
                throw new Error("Params uri is required");
            }

            const toSign = await createSiweMessageWithRecaps({
                uri: params.uri,
                expiration: new Date(
                    Date.now() + 1000 * 60 * 60 * 24
                ).toISOString(), // 24 hours,
                resources: params.resourceAbilityRequests,
                walletAddress: await _signer.getAddress(),
                nonce: await litNodeClient.getLatestBlockhash(),
                litNodeClient: litNodeClient,
                domain: "localhost:3000",
            });

            return await generateAuthSig({
                signer: _signer,
                toSign,
            });
        },
    });

    await litNodeClient.disconnect()

    return sessionSigs;
}
