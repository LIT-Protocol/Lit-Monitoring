import express from "express";
import fs from "fs";
import path from "path";
import cors from "cors";

const app = express();
app.use(cors());
const port = 3080;
const logDirectory = path.join("./", "logs");

app.use(express.static("public"));

interface LogEntry {
    type: string;
    status: string;
    duration?: number;
    timestamp: string;
}

interface NetworkStats {
    success: number;
    failure: number;
    totalDuration: number;
    totalRuns: number;
    successRate: number;
    failureRate: number;
    latestTimestamp: string;
}

interface LogFile {
    name: string;
    path: string;
    network: string;
    timestamp: string;
}

function categorizeNetwork(filename: string): string {
    if (filename.startsWith("datil-dev")) return "datil-dev";
    if (filename.startsWith("datil-test")) return "datil-test";
    return "datil";
}

function parseLogContent(content: string): NetworkStats {
    const entries: LogEntry[] = content
        .split("\n")
        .filter((line) => line.trim())
        .map((line) => JSON.parse(line));
    const results: NetworkStats = {
        success: 0,
        failure: 0,
        totalDuration: 0,
        totalRuns: 0,
        successRate: 0,
        failureRate: 0,
        latestTimestamp: "",
    };

    entries.forEach((entry) => {
        if (entry.type === "test_result") {
            if (entry.status === "success") {
                results.success += 1;
                results.totalDuration += entry.duration || 0;
            } else if (entry.status === "error") {
                results.failure += 1;
            }
            results.totalRuns += 1;
            if (entry.timestamp > results.latestTimestamp) {
                results.latestTimestamp = entry.timestamp;
            }
        }
    });

    results.successRate = results.totalRuns
        ? (results.success / results.totalRuns) * 100
        : 0;
    results.failureRate = results.totalRuns
        ? (results.failure / results.totalRuns) * 100
        : 0;

    return results;
}

app.get("/logs", (req, res) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 7;
    const network = (req.query.network as string) || "all";

    fs.readdir(logDirectory, (err, files) => {
        if (err) {
            return res.status(500).send("Unable to read log directory.");
        }

        let logFiles: LogFile[] = files
            .filter((file) => file.endsWith(".log"))
            .map((file) => {
                const filePath = path.join(logDirectory, file);
                const stats = fs.statSync(filePath);
                return {
                    name: file,
                    path: filePath,
                    network: categorizeNetwork(file),
                    timestamp: stats.mtime.toISOString(),
                };
            });

        // Filter by network if specified
        if (network !== "all") {
            logFiles = logFiles.filter((file) => file.network === network);
        }

        // Sort by timestamp (latest first)
        logFiles.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

        const totalItems = logFiles.length;
        const totalPages = Math.ceil(totalItems / limit);
        const offset = (page - 1) * limit;

        // Apply pagination
        const paginatedFiles = logFiles.slice(offset, offset + limit);

        res.json({
            data: paginatedFiles,
            page,
            limit,
            totalItems,
            totalPages,
        });
    });
});

app.get("/logs/:filename", (req, res) => {
    const filePath = path.join(logDirectory, req.params.filename);
    res.download(filePath);
});

app.get("/logs/details/:filename", (req, res) => {
    const filePath = path.join(logDirectory, req.params.filename);
    fs.readFile(filePath, "utf8", (err, data) => {
        if (err) {
            return res.status(500).send("Unable to read log file.");
        }

        const stats = parseLogContent(data);
        res.json(stats);
    });
});

app.get("/network-stats", (req, res) => {
    fs.readdir(logDirectory, (err, files) => {
        if (err) {
            return res.status(500).send("Unable to read log directory.");
        }

        const networkStats: { [key: string]: NetworkStats } = {};

        files
            .filter((file) => file.endsWith(".log"))
            .forEach((file) => {
                const network = categorizeNetwork(file);
                const filePath = path.join(logDirectory, file);
                const content = fs.readFileSync(filePath, "utf8");
                const stats = parseLogContent(content);

                if (!networkStats[network]) {
                    networkStats[network] = { ...stats };
                } else {
                    networkStats[network].success += stats.success;
                    networkStats[network].failure += stats.failure;
                    networkStats[network].totalDuration += stats.totalDuration;
                    networkStats[network].totalRuns += stats.totalRuns;
                    if (
                        stats.latestTimestamp >
                        networkStats[network].latestTimestamp
                    ) {
                        networkStats[network].latestTimestamp =
                            stats.latestTimestamp;
                    }
                }
            });

        // Calculate success and failure rates for each network
        Object.keys(networkStats).forEach((network) => {
            const stats = networkStats[network];
            stats.successRate = stats.totalRuns
                ? (stats.success / stats.totalRuns) * 100
                : 0;
            stats.failureRate = stats.totalRuns
                ? (stats.failure / stats.totalRuns) * 100
                : 0;
        });

        res.json(networkStats);
    });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
