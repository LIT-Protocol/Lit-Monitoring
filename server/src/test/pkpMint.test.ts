import { pkpMint } from "../pkpMint";
import { LitNetwork, LIT_RPC } from "@lit-protocol/constants";
import { v4 as uuidv4 } from 'uuid';
import * as fs from "fs";
import * as path from "path";
import { ethers } from "ethers";

const timestamp = new Date().toISOString().replace(/:/g, "-");

const LIT_NETWORK = LitNetwork.DatilDev;
const ETHEREUM_PRIVATE_KEY = process.env.ETHEREUM_PRIVATE_KEY as string;
const TOTAL_RUNS = 3;
const PARALLEL_RUNS = 3;
const DELAY_BETWEEN_TESTS = 0; // in ms
const LOG_FILE_PATH = `./logs/${LIT_NETWORK}-pkp-mint-test-log-${timestamp}.log`;
const FUNDING_AMOUNT = 6000000000000000;

test("pkpMint batch testing", async () => {
    const dir = path.dirname(LOG_FILE_PATH);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(LOG_FILE_PATH, "");

    const uuid = uuidv4();

    const log = (entry: any) => {
        const logEntry = JSON.stringify({
            timestamp: new Date().toISOString(),
            ...entry,
        });
        fs.appendFileSync(LOG_FILE_PATH, logEntry + "\n");
        console.log(logEntry);
    };

    // -------FUNDING WALLETS-------
    const provider = new ethers.providers.JsonRpcProvider(LIT_RPC.CHRONICLE_YELLOWSTONE);
    const mainWallet = new ethers.Wallet(ETHEREUM_PRIVATE_KEY, provider);

    const testWallets: ethers.Wallet[] = [];

    for (let i = 0; i < TOTAL_RUNS; i++) {
        const newWallet = ethers.Wallet.createRandom().connect(provider);
        testWallets.push(newWallet);

        try {
            const tx = await mainWallet.sendTransaction({
                to: newWallet.address,
                value: FUNDING_AMOUNT,
            });
            await tx.wait();
    
            log({
                type: "wallet_funded",
                index: i + 1,
                address: newWallet.address,
                txHash: tx.hash,
            });
        } catch (error) {
            log({
                type: "error_wallet_funded",
                index: i + 1,
                address: newWallet.address,
                error: error,
            });
        }

        await new Promise((resolve) => setTimeout(resolve, 50));
    }

    log({
        type: "test_start",
        uuid: `${uuid}`,
        test_function: "pkpMint",
        lit_network: `${LIT_NETWORK}`,
        total_runs: `${TOTAL_RUNS}`,
        parallel_runs: `${PARALLEL_RUNS}`,
        delay_between_tests: `${DELAY_BETWEEN_TESTS}`,
        log_file_path: `${LOG_FILE_PATH}`
    });

    // -------START TESTS-------
    const startTimeTotal = Date.now();

    const runTest = async (index: number, wallet: ethers.Wallet) => {
        try {

            const startTime = Date.now();
            
            const pkpMintRes = await pkpMint(
                wallet,
                LIT_NETWORK
            );

            // -- assertions
            if (!pkpMintRes.publicKey) {
                throw new Error(
                    "Public key not found, expecting public key in response"
                );
            }
            
            const endTime = Date.now();
            const duration = endTime - startTime;

            const result = {
                type: "test_result",
                status: "success",
                index: index + 1,
                totalRuns: TOTAL_RUNS,
                startTime: `${startTime}`,
                endTime: `${endTime}`,
                duration,
                response: pkpMintRes,
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
                        resolve(runTest(i + index, testWallets[i + index]));
                    }, index * DELAY_BETWEEN_TESTS);
                });
            });

        const batchResults = await Promise.all(batch);
        results.push(...batchResults);
    }

    const successfulRuns = results.filter((r) => r.status === "success");
    const failedRuns = results.filter((r) => r.status === "error");

    const endTimeTotal = Date.now();

    const summary = {
        type: "test_summary",
        uuid: `${uuid}`,
        status: "test_completed",
        LIT_NETWORK,
        totalRuns: TOTAL_RUNS,
        successfulRuns: successfulRuns.length,
        failedRuns: failedRuns.length,
        startTimeTotal: `${startTimeTotal}`,
        endTimeTotal: `${endTimeTotal}`,
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
}, 3600000); // 1 hour timeout
