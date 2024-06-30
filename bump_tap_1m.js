const { Worker } = require('worker_threads');
const fs = require('fs');
const readline = require('readline');
const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');

const workerLines = [];

// Function to read the query.txt file
function readQueryFile() {
    return new Promise((resolve, reject) => {
        fs.readFile('query.txt', 'utf8', (err, data) => {
            if (err) reject(err);
            resolve(data.split('\n').filter(line => line.trim() !== ''));
        });
    });
}

// Function to read the proxy.txt file
function readProxyFile() {
    return new Promise((resolve, reject) => {
        fs.readFile('proxy.txt', 'utf8', (err, data) => {
            if (err) reject(err);
            resolve(data.split('\n').filter(line => line.trim() !== ''));
        });
    });
}

// Function to check the proxy IP
const checkProxyIP = async (proxy, workerIndex) => {
    try {
        const proxyAgent = new HttpsProxyAgent(proxy);
        const response = await axios.get('https://api.ipify.org?format=json', {
            httpsAgent: proxyAgent
        });
        if (response.status === 200) {
            logging(workerIndex, `Địa chỉ IP của proxy: ${response.data.ip}`);
        } else {
            logging(workerIndex, `Không thể kiểm tra IP của proxy. Status code: ${response.status}`);
            throw new Error(`Proxy IP check failed with status code: ${response.status}`);
        }
    } catch (error) {
        logging(workerIndex, `Error khi kiểm tra IP của proxy: ${error.message}`);
        throw error;
    }
};

// Function to create workers
const startWorker = async (initData, proxy, workerIndex) => {
    try {
        const worker = new Worker('./worker.js', {
            workerData: { initData, proxy }
        });

        worker.on('message', (message) => {
            logging(workerIndex, `${message}`);
        });

        worker.on('error', (error) => {
            logging(workerIndex, `error: ${error.message}`);
            worker.terminate();
            restartWorker(initData, proxy, workerIndex);
        });

        worker.on('exit', (code) => {
            if (code !== 0) {
                logging(workerIndex, `stopped with exit code ${code}`);
            }
            restartWorker(initData, proxy, workerIndex);
        });

        // Save worker reference for termination
        workers[workerIndex] = worker;
    } catch (error) {
        logging(workerIndex, `Error starting: ${error.message}`);
        restartWorker(initData, proxy, workerIndex);
    }
};

const logging = (workerIndex, text) => {
    readline.cursorTo(process.stdout, 0, workerLines[workerIndex]);
    readline.clearLine(process.stdout, 0);
    process.stdout.write(`ACC ${workerIndex + 1} | ${text}\n`);
};

const restartWorker = (initData, proxy, workerIndex) => {
    if (workers[workerIndex]) {
        workers[workerIndex].terminate();
    }
    startWorker(initData, proxy, workerIndex);
};

// Keep track of worker instances
const workers = [];

// Main function to coordinate the farming process
async function main() {
    try {
        const initDataArray = await readQueryFile();
        const proxies = await readProxyFile();

        for (let index = 0; index < initDataArray.length; index++) {
            workerLines[index] = index + 2;
            const proxy = proxies[index % proxies.length];
            await checkProxyIP(proxy, index);
            await startWorker(initDataArray[index], proxy, index);
        }
    } catch (error) {
        console.error('Error reading files:', error.message);
    }
}

// Execute the main function
main();
