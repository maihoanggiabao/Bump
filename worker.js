const { parentPort, workerData } = require('worker_threads');
const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');

const { initData, proxy } = workerData;

const proxyAgent = new HttpsProxyAgent(proxy);

const loginUrl = 'https://api.mmbump.pro/v1/login';
const farmingStartUrl = 'https://api.mmbump.pro/v1/farming/start';
const farmingFinishUrl = 'https://api.mmbump.pro/v1/farming/finish';

const headers = {
    'Accept': 'application/json, text/plain, */*',
    'Accept-Encoding': 'gzip, deflate, br, zstd',
    'Accept-Language': 'zh-CN,zh;q=0.9',
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1'
};

const colors = {
    reset: '\x1b[0m',
    balance: '\x1b[38;5;226m',
    start: '\x1b[32m',
    finish: '\x1b[31m'
};

const Boost = 5;

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const loginAndGetToken = async (initData, proxyAgent) => {
    const payload = { initData };
    try {
        const response = await axios.post(loginUrl, payload, { headers, httpsAgent: proxyAgent });
        if (response.status === 200 && response.data.token) {
            parentPort.postMessage(`Xác thực thành công`);
            return response.data.token;
        } else {
            throw new Error('Không thể nhận được token');
        }
    } catch (error) {
        parentPort.postMessage(`Error in getting token: ${error.response ? error.response.data : error.message}`);
        throw error;
    }
};

const startFarming = async (token, proxyAgent) => {
    try {
        const farmingHeaders = { ...headers, 'Authorization': ` ${token}` };
        const startFarmingResponse = await axios.post(farmingStartUrl, { status: 'inProgress' }, { headers: farmingHeaders, httpsAgent: proxyAgent });
        if (startFarmingResponse.status === 200 && startFarmingResponse.data) {
            parentPort.postMessage(`${colors.balance}[ FARMING ]${colors.reset} ${colors.start}Start farming ....${colors.reset}`);
        } else {
            throw new Error('Failed to start farming');
        }
    } catch (error) {
        parentPort.postMessage(`Error starting farming: ${error.response ? error.response.data : error.message}`);
        throw error;
    }
};

const finishFarming = async (token, proxyAgent) => {
    try {
        const farmingHeaders = { ...headers, 'Authorization': ` ${token}` };
        const finishFarmingResponse = await axios.post(farmingFinishUrl, { tapCount: 0 }, { headers: farmingHeaders, httpsAgent: proxyAgent });
        if (finishFarmingResponse.status === 200) {
            parentPort.postMessage(`${colors.balance}[ BALANCE ] + ${(1 * Boost)}.000.000 $ ${colors.reset}`);
            await sleep(1000);
            parentPort.postMessage(`${colors.balance}[ FARMING ]${colors.reset} ${colors.finish}----Finish farming----${colors.reset}`);
        } else {
            throw new Error('Failed to finish farming');
        }
    } catch (error) {
        parentPort.postMessage(`Error finishing farming: ${error.response ? error.response.data : error.message}`);
        throw error;
    }
};

const tapFarmingContinuously = async (token) => {
    try {
        while (1) {
            await startFarming(token, proxyAgent);
            await sleep(25000);
            await finishFarming(token, proxyAgent);
        }
    } catch (error) {
        parentPort.postMessage(`Chưa kết thúc farming. Bắt đầu kết thúc ....`);
        await finishFarming(token, proxyAgent);
    }
};

const initialize = async () => {
    try {
        const token = await loginAndGetToken(initData, proxyAgent);
        await tapFarmingContinuously(token);
    } catch (error) {
        parentPort.postMessage(`Initialization error: ${error.message}`);
    }
};

initialize();
