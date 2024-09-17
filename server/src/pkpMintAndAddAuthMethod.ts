import { LitContracts } from "@lit-protocol/contracts-sdk";
import {
    LitNetwork,
    AuthMethodType,
    AuthMethodScope,
} from "@lit-protocol/constants";
import { ethers } from "ethers";
import bs58 from "bs58";

export async function pkpMintAndAddAuthMethod(
    _wallet: ethers.Wallet,
    _network: LitNetwork
) {
    const litContracts = new LitContracts({
        signer: _wallet,
        network: _network,
    });

    await litContracts.connect();

    const pkpMintCost = await litContracts.pkpNftContract.read.mintCost();

    let authMethodType1 = AuthMethodType.LitAction;
    let authMethodType2 =
        "0xf8d39b7f3ec30f4bd2e45e0d545c83f64f8364a2c53765ca42ccf9bf7cde3482";
    let accessToken1 = "QmSEFrmdpB8oeGDDa44wjyWzYEUdWPTGBoZBXsgkQZpQjs";
    let accessToken2 =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1dWlkIjoiMGIyNDIwYTctYzBmNy00YTlmLWFlN2UtMGMyODA5NDU3M2FjIiwiZW1haWwiOiJkNzRwMmIyNHpsQHNteWt3Yi5jb20iLCJpYXQiOjE3MjU3MTAxMDgsImV4cCI6MTcyNjMxNDkwOH0.k7oWdFfpVzvDS-psFXBYZGTIbJdbCUt-KuFOGFx_yr8";

    const tx =
        await litContracts.pkpHelperContract.write.mintNextAndAddAuthMethods(
            2, // keyType
            [authMethodType1, authMethodType2], // permittedAuthMethodTypes
            [
                `0x${Buffer.from(bs58.decode(accessToken1)).toString("hex")}`,
                accessToken2,
            ], // permittedAuthMethodIds
            ["0x", "0x"], // permittedAuthMethodPubkeys
            [[AuthMethodScope.SignAnything, AuthMethodScope.SignAnything]], // permittedAuthMethodScopes
            false, // addPkpEthAddressAsPermittedAddress
            true, // sendPkpToItself
            {
                value: pkpMintCost,
            }
        );

    const receipt = await tx.wait();

    const pkpInfo = await getPkpInfoFromMintReceipt(receipt, litContracts);

    return pkpInfo;
}

const getPkpInfoFromMintReceipt = async (
    txReceipt: any,
    litContractsClient: LitContracts
) => {
    const pkpMintedEvent = txReceipt.events.find(
        (event: any) =>
            event.topics[0] ===
            "0x3b2cc0657d0387a736293d66389f78e4c8025e413c7a1ee67b7707d4418c46b8"
    );

    const publicKey = "0x" + pkpMintedEvent.data.slice(130, 260);
    const tokenId = ethers.utils.keccak256(publicKey);
    const ethAddress =
        await litContractsClient.pkpNftContract.read.getEthAddress(tokenId);

    return {
        tokenId: ethers.BigNumber.from(tokenId).toString(),
        publicKey,
        ethAddress,
    };
};
