import { testPkpSign } from "../pkpSign";
import { LitNetwork } from "@lit-protocol/constants";

// const timestamp = new Date().toISOString().replace(/:/g, "-");

const LIT_NETWORK = LitNetwork.DatilDev;
const ETHEREUM_PRIVATE_KEY = process.env.ETHEREUM_PRIVATE_KEY as string;

// const TOTAL_RUNS = 10000;
// const PARALLEL_RUNS = 20;
// const DELAY_BETWEEN_TESTS = 1500; // 1.5 seconds in milliseconds
// const LOG_FILE_PATH = `./logs/${LIT_NETWORK}-pkp-sign-test-log-${timestamp}.log`;

test("running pkpSign 1 times", async () => {
    const result = await testPkpSign(ETHEREUM_PRIVATE_KEY, LIT_NETWORK);

    expect(result).toMatchObject({
        r: expect.any(String),
        s: expect.any(String),
        recid: expect.any(Number),
        signature: expect.any(String),
        publicKey: expect.any(String),
        dataSigned: expect.any(String),
    });
}, 200000);

