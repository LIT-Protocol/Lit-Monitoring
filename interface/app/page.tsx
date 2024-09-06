"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import { Chart, Bar } from "react-chartjs-2";
import "chart.js/auto";

interface Log {
    name: string;
    network: string;
    timestamp: string;
    success: number;
    failure: number;
    totalDuration: number;
    successRate: number;
    failureRate: number;
}

interface NetworkStats {
    success: number;
    failure: number;
    totalDuration: number;
    successRate: number;
    failureRate: number;
    latestTimestamp: string;
}

export default function Home() {
    const [logs, setLogs] = useState<Log[]>([]);
    const [networkStats, setNetworkStats] = useState<
        Record<string, NetworkStats>
    >({});
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [totalPages, setTotalPages] = useState<number>(1);
    const [currentNetwork, setCurrentNetwork] = useState<string>("all");

    const baseUrl = `http://localhost:3080`;

    useEffect(() => {
        fetchLogs(1, "all");
        fetchNetworkStats();
    }, []);

    async function fetchLogs(page: number, network: string) {
        try {
            const res = await axios.get(`${baseUrl}/logs`, {
                params: { page, limit: 6, network },
            });
            const data = res.data;
            const logPromises = data.data.map(async (log: Log) => {
                const logDetails = await axios.get(
                    `${baseUrl}/logs/details/${log.name}`
                );
                return {
                    ...log,
                    success: logDetails.data.success,
                    failure: logDetails.data.failure,
                    totalDuration: logDetails.data.totalDuration,
                    successRate: logDetails.data.successRate,
                    failureRate: logDetails.data.failureRate,
                };
            });

            const logDetails = await Promise.all(logPromises);
            setLogs(logDetails);
            setCurrentPage(data.page);
            setTotalPages(data.totalPages);
        } catch (error) {
            console.error("Error fetching logs:", error);
        }
    }

    async function fetchNetworkStats() {
        try {
            const res = await axios.get(`${baseUrl}/network-stats`);
            const stats = res.data;
            setNetworkStats(stats);
        } catch (error) {
            console.error("Error fetching network stats:", error);
        }
    }

    const handleNetworkChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const network = e.target.value;
        setCurrentNetwork(network);
        fetchLogs(1, network);
    };

    const handlePageChange = (page: number) => {
        fetchLogs(page, currentNetwork);
    };

    const chartData = {
        labels: Object.keys(networkStats),
        datasets: [
            {
                label: "Success Rate (%)",
                data: Object.values(networkStats).map(
                    (stat: NetworkStats) => stat.successRate
                ),
                backgroundColor: "rgba(75, 192, 192, 0.6)",
                borderColor: "rgba(75, 192, 192, 1)",
                borderWidth: 1,
            },
            {
                label: "Failure Rate (%)",
                data: Object.values(networkStats).map(
                    (stat: NetworkStats) => stat.failureRate
                ),
                backgroundColor: "rgba(255, 99, 132, 0.6)",
                borderColor: "rgba(255, 99, 132, 1)",
                borderWidth: 1,
            },
        ],
    };

    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold mb-8">Log Files Analysis</h1>

            <label htmlFor="networkSelect" className="block mb-2">
                Select Network:
            </label>
            <select
                id="networkSelect"
                onChange={handleNetworkChange}
                className="p-2 border border-gray-300 rounded mb-4"
            >
                <option value="all">All Networks</option>
                {Object.keys(networkStats).map((network) => (
                    <option key={network} value={network}>
                        {network}
                    </option>
                ))}
            </select>

            <h2 className="text-xl font-semibold mt-8 mb-4">
                Individual Log Files
            </h2>
            <table className="w-full border-collapse border border-black">
                <thead>
                    <tr className="bg-gray-200">
                        <th className="border border-black p-2">File Name</th>
                        <th className="border border-black p-2">Network</th>
                        <th className="border border-black p-2">Timestamp</th>
                        <th className="border border-black p-2">Actions</th>
                        <th className="border border-black p-2">Success</th>
                        <th className="border border-black p-2">Failures</th>
                        <th className="border border-black p-2">
                            Total Duration (ms)
                        </th>
                        <th className="border border-black p-2">
                            Success Rate (%)
                        </th>
                        <th className="border border-black p-2">
                            Failure Rate (%)
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {logs.map((log) => (
                        <tr key={log.name} className="hover:bg-gray-50">
                            <td className="border border-black p-2">
                                {log.name}
                            </td>
                            <td className="border border-black p-2">
                                {log.network}
                            </td>
                            <td className="border border-black p-2">
                                {new Date(log.timestamp).toLocaleString()}
                            </td>
                            <td className="border border-black p-2">
                                <a
                                    href={`${baseUrl}/logs/${log.name}`}
                                    download
                                    className="text-blue-500 hover:underline"
                                >
                                    Download
                                </a>
                            </td>
                            <td className="border border-black p-2">
                                {log.success}
                            </td>
                            <td className="border border-black p-2">
                                {log.failure}
                            </td>
                            <td className="border border-black p-2">
                                {log.totalDuration}
                            </td>
                            <td className="border border-black p-2">
                                {log.successRate?.toFixed(2)}
                            </td>
                            <td className="border border-black p-2">
                                {log.failureRate?.toFixed(2)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div className="mt-4 flex items-center space-x-4">
                <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-4 py-2 bg-gray-300 rounded disabled:opacity-50"
                >
                    Previous
                </button>
                <span>
                    {currentPage} / {totalPages}
                </span>
                <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 bg-gray-300 rounded disabled:opacity-50"
                >
                    Next
                </button>
            </div>

            <h2 className="text-xl font-semibold mt-8 mb-4">
                Network Statistics
            </h2>
            <table className="w-full border-collapse border border-black">
                <thead>
                    <tr className="bg-gray-200">
                        <th className="border border-black p-2">Network</th>
                        <th className="border border-black p-2">
                            Latest Timestamp
                        </th>
                        <th className="border border-black p-2">Success</th>
                        <th className="border border-black p-2">Failures</th>
                        <th className="border border-black p-2">
                            Total Duration (ms)
                        </th>
                        <th className="border border-black p-2">
                            Success Rate (%)
                        </th>
                        <th className="border border-black p-2">
                            Failure Rate (%)
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {Object.entries(networkStats).map(([network, stats]) => (
                        <tr key={network} className="hover:bg-gray-50">
                            <td className="border border-black p-2">
                                {network}
                            </td>
                            <td className="border border-black p-2">
                                {stats.latestTimestamp}
                            </td>
                            <td className="border border-black p-2">
                                {stats.success}
                            </td>
                            <td className="border border-black p-2">
                                {stats.failure}
                            </td>
                            <td className="border border-black p-2">
                                {stats.totalDuration}
                            </td>
                            <td className="border border-black p-2">
                                {stats.successRate?.toFixed(2)}
                            </td>
                            <td className="border border-black p-2">
                                {stats.failureRate?.toFixed(2)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div className="chart-container mt-8">
                <Bar data={chartData} />
            </div>
        </div>
    );
}
