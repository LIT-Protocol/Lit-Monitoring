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

export async function executeJs(_privateKey: string, _network: LitNetwork) {
    const litNodeClient = new LitNodeClient({
        litNetwork: _network,
    });

    const signer = await getWallet(_privateKey);
    const pkp = await mintPKP(signer, _network);
    const sessionSigs = await sessionSigEOA(signer, _network);

    await litNodeClient.connect();

    const litAction = 
    `(async () => {
        const sigShare = await LitActions.signEcdsa({
            toSign: dataToSign,
            publicKey,
            sigName: "sig",
        });
    })();`;

    const results = await litNodeClient.executeJs({
        code: litAction,
        sessionSigs: sessionSigs,
        jsParams: {
            publicKey: pkp.publicKey,
            dataToSign: [
                84, 104, 105, 115, 32, 109, 101, 115, 115, 97, 103, 101, 32, 105,
                115, 32, 101, 120, 97, 99, 116, 108, 121, 32, 51, 50, 32, 98, 121,
                116, 101, 115,
            ],
        },
    });

    console.log("executeJs results: ", results);
    return results;
}

async function getWallet(_privateKey: string) {
    const provider = new ethers.providers.JsonRpcProvider(
        `https://yellowstone-rpc.litprotocol.com/`
    );

    const wallet = new ethers.Wallet(_privateKey, provider);

    return wallet;
}

export async function mintPKP(_signer: ethers.Wallet, _network: LitNetwork) {
    const litContracts = new LitContracts({
        signer: _signer,
        network: _network,
        debug: false,
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

    return sessionSigs;
}
