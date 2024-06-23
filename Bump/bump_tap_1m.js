const axios = require('axios');
const fs = require('fs');
const cliProgress = require('cli-progress');

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

// Function to read the query.txt file
function readQueryFile() {
    return new Promise((resolve, reject) => {
        fs.readFile('query.txt', 'utf8', (err, data) => {
            if (err) reject(err);
            resolve(data.split('\n').filter(line => line.trim() !== ''));
        });
    });
}

// Function to log status updates using CLI progress bars
function createProgressBar(index) {
    const bar = new cliProgress.SingleBar({
        format: `Thread ${index} | {bar} | {percentage}% | {status}`,
        barCompleteChar: '\u2588',
        barIncompleteChar: '\u2591',
        hideCursor: true
    });
    bar.start(100, 0, {
        status: 'Initializing...'
    });
    return bar;
}

// Function to login and get token
async function loginAndGetToken(initData, index, progressBar) {
    const payload = {
        initData: initData
    };
    try {
        const response = await axios.post(loginUrl, payload, { headers });
        if (response.data.token) {
            progressBar.update(0, { status: `Token for ${initData} received.` });
            return response.data.token;
        } else {
            throw new Error('Unable to retrieve token.');
        }
    } catch (error) {
        throw new Error(error.response ? error.response.data : error.message);
    }
}

// Function to start farming
async function startFarming(token, progressBar, index) {
    try {
        progressBar.update(10, { status: 'Farming started...' });
        await axios.post(farmingStartUrl, { status: 'inProgress' }, { headers: { ...headers, 'Authorization': ` ${token}` } });
    } catch (error) {
        console.error(`Error starting farming for Thread ${index}:`, error.response ? error.response.data : error.message);
    }
}

// Function to finish farming
async function finishFarming(token, tapCount, progressBar, index) {
    try {
        await axios.post(farmingFinishUrl, { tapCount: tapCount || 0 }, { headers: { ...headers, 'Authorization': ` ${token}` } });
        progressBar.update(100, { status: 'Farming finished.' });
    } catch (error) {
        console.error(`Error finishing farming for Thread ${index}:`, error.response ? error.response.data : error.message);
    }
}

// Function to perform continuous farming
async function tapFarmingContinuously(initData, index, progressBar) {
    const token = await loginAndGetToken(initData, index, progressBar);
    let tapCount = 0;
    while (true) {
        await startFarming(token, progressBar, index);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for 1 second
        tapCount++;
        if (tapCount > 100) tapCount = 0; // Reset after 100 taps
        await finishFarming(token, tapCount, progressBar, index);
    }
}

// Main function to coordinate the farming process
async function main() {
    try {
        const initDataArray = await readQueryFile();
        const progressBars = initDataArray.map((initData, index) => createProgressBar(index + 1));

        initDataArray.forEach((initData, index) => {
            tapFarmingContinuously(initData, index + 1, progressBars[index]).catch(error => {
                progressBars[index].stop();
                console.error(`${error.message}`);
            });
        });
    } catch (error) {
        console.error('Error reading query file:', error.message);
    }
}

// Execute the main function
main();
