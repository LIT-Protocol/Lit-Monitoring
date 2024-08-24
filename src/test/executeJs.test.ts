import { executeJs } from "../executeJs";
import { LitNetwork } from "@lit-protocol/constants";
import * as fs from "fs";
import * as path from "path";

const timestamp = new Date().toISOString().replace(/:/g, "-");

const LIT_NETWORK = LitNetwork.DatilDev;
const ETHEREUM_PRIVATE_KEY = process.env.ETHEREUM_PRIVATE_KEY as string;
const TOTAL_RUNS = 3;
const PARALLEL_RUNS = 10;
const DELAY_BETWEEN_TESTS = 1000; // 1 second
const LOG_FILE_PATH = `./logs/${LIT_NETWORK}-pkp-sign-test-log-${timestamp}.log`;

test("pkpSign batch testing", async () => {
    const dir = path.dirname(LOG_FILE_PATH);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(LOG_FILE_PATH, "");

    const log = (entry: any) => {
        const logEntry = JSON.stringify({
            timestamp: new Date().toISOString(),
            ...entry,
        });
        fs.appendFileSync(LOG_FILE_PATH, logEntry + "\n");
        console.log(logEntry);
    };

    log({
        message: `Starting testPkpSign on network ${LIT_NETWORK} with ${TOTAL_RUNS} total runs, ${PARALLEL_RUNS} in parallel, ${DELAY_BETWEEN_TESTS}ms delay between tests`,
    });

    log({ message: `Logging to file: ${LOG_FILE_PATH}` });

    const runTest = async (index: number) => {
        try {
            const startTime = Date.now();

            const runPkpSign = await executeJs(
                ETHEREUM_PRIVATE_KEY,
                LIT_NETWORK
            );

            // -- assertions
            if (!runPkpSign.signatures) {
                throw new Error(
                    "Signatures not found, expecting signature in response"
                );
            }
            const sig = runPkpSign.signatures.sig;
            console.log("signature returned as a response", sig);
            if (!sig.r) {
                throw new Error("invalid signature returned from lit action");
            }
            if (!sig.s) {
                throw new Error("invalid signature returned from lit action");
            }
            if (sig.recid === undefined) {
                throw new Error("invalid signature returned from lit action");
            }

            const endTime = Date.now();
            const duration = endTime - startTime;

            const result = {
                type: "test_result",
                index: index + 1,
                totalRuns: TOTAL_RUNS,
                status: "success",
                duration,
                ...runPkpSign,
            };

            log(result);

            return result;
        } catch (error) {
            const errorResult = {
                type: "test_result",
                index: index + 1,
                totalRuns: TOTAL_RUNS,
                status: "error",
                error: (error as Error).message,
                stack: (error as Error).stack,
                fullError: JSON.stringify(error),
            };
            log(errorResult);
            return errorResult;
        }
    };

    const results: any[] = [];

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
                        resolve(runTest(i + index));
                    }, index * DELAY_BETWEEN_TESTS);
                });
            });

        const batchResults = await Promise.all(batch);
        results.push(...batchResults);
    }

    const successfulRuns = results.filter((r) => r.status === "success");
    const failedRuns = results.filter((r) => r.status === "error");

    const summary = {
        type: "test_summary",
        status: "test_completed",
        LIT_NETWORK,
        totalRuns: TOTAL_RUNS,
        successfulRuns: successfulRuns.length,
        failedRuns: failedRuns.length,
        averageDuration:
            successfulRuns.length > 0
                ? successfulRuns.reduce((sum, r) => sum + r.duration, 0) /
                  successfulRuns.length
                : 0,
    };

    log(summary);

    if (failedRuns.length > 0) {
        log({
            type: "test_failure_summary",
            message: `${failedRuns.length} tests failed. Check the log file for details.`,
        });
    }

    console.log(`ran ${results.length} tests`);
}, 200000);
