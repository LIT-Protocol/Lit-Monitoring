import { testPkpSign } from "../pkpSign";
import { LitNetwork } from "@lit-protocol/constants";

// const timestamp = new Date().toISOString().replace(/:/g, "-");

const LIT_NETWORK = LitNetwork.DatilDev;
const ETHEREUM_PRIVATE_KEY = process.env.ETHEREUM_PRIVATE_KEY as string;

const TOTAL_RUNS = 3;
const PARALLEL_RUNS = 1;
const DELAY_BETWEEN_TESTS = 1500; // 1.5 seconds in milliseconds
// const LOG_FILE_PATH = `./logs/${LIT_NETWORK}-pkp-sign-test-log-${timestamp}.log`;

test('pkpSign batch testing', async () => {
    const results = [];

    for (let i = 0; i < TOTAL_RUNS; i += PARALLEL_RUNS) {
        console.log({
            type: "batch_start",
            batch: Math.floor(i / PARALLEL_RUNS) + 1,
            totalBatches: Math.ceil(TOTAL_RUNS / PARALLEL_RUNS),
            message: "New batch started",
        });

        const batch = Array(Math.min(PARALLEL_RUNS, TOTAL_RUNS - i))
            .fill(null)
            .map((_, index) => {
                return new Promise((resolve) => {
                    setTimeout(async () => {
                        const result = testPkpSign(ETHEREUM_PRIVATE_KEY, LIT_NETWORK);
                        resolve(result);
                    }, index * DELAY_BETWEEN_TESTS);
                });
            });

        const batchResults = await Promise.all(batch);
        results.push(...batchResults);
    }

    results.forEach(result => {
        expect(result).toMatchObject({
            r: expect.any(String),
            s: expect.any(String),
            recid: expect.any(Number),
            signature: expect.any(String),
            publicKey: expect.any(String),
            dataSigned: expect.any(String),
        });
    });

    console.log(results)
}, 200000);