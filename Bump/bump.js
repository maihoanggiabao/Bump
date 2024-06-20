const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { HttpsProxyAgent } = require('https-proxy-agent');

const idsFilePath = path.join(__dirname, 'id.txt');
const telegramIds = fs.readFileSync(idsFilePath, 'utf8').trim().split('\n');
const proxyFilePath = path.join(__dirname, 'proxy.txt');
const proxies = fs.readFileSync(proxyFilePath, 'utf8').trim().split('\n');

const authUrl = 'https://api.mmbump.pro/v1/auth';
const authHeaders = {
    'Accept': 'application/json, text/plain, */*',
    'Accept-Encoding': 'gzip, deflate, br, zstd',
    'Accept-Language': 'vi-VN,vi;q=0.9,fr-FR;q=0.8,fr;q=0.7,en-US;q=0.6,en;q=0.5',
    'Content-Type': 'application/x-www-form-urlencoded',
    'Origin': 'https://mmbump.pro',
    'Referer': 'https://mmbump.pro/',
    'Sec-Ch-Ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
    'Sec-Ch-Ua-Mobile': '?1',
    'Sec-Ch-Ua-Platform': '"Android"',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-site',
    'User-Agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36'
};

const checkProxyIP = async (proxy) => {
    try {
        const proxyAgent = new HttpsProxyAgent(proxy);
        const response = await axios.get('https://api.ipify.org?format=json', {
            httpsAgent: proxyAgent
        });
        if (response.status === 200) {
            console.log('\nĐịa chỉ IP của proxy là:', response.data.ip);
        } else {
            console.error('Không thể kiểm tra IP của proxy. Status code:', response.status);
        }
    } catch (error) {
        console.error('Error khi kiểm tra IP của proxy:', error);
    }
};

const finishFarmingIfNeeded = async (farmingData, farmingHeaders, proxyAgent, progress) => {
    const currentTime = Math.floor(Date.now() / 1000);
    if (farmingData.session.status === 'inProgress' && currentTime > farmingData.session.moon_time) {
        try {
            const finishUrl = 'https://api.mmbump.pro/v1/farming/finish';
            const finishPayload = { tapCount: 0 };
            await axios.post(finishUrl, finishPayload, { headers: farmingHeaders, httpsAgent: proxyAgent });
            console.log('Đã hoàn thành farming');

            const farmingStartUrl = 'https://api.mmbump.pro/v1/farming/start';
            const farmingStartPayload = { status: 'inProgress' };
            await axios.post(farmingStartUrl, farmingStartPayload, { headers: farmingHeaders, httpsAgent: proxyAgent });
            console.log('Bắt đầu farming...');
        } catch (error) {
            console.error('Lỗi khi hoàn thành farming:', error.message);
        }
    } else {
        console.log('Đang trong trạng thái farming');
    }
};

const xuly = async (telegramId, proxy) => {
    const proxyAgent = new HttpsProxyAgent(proxy);
    const authPayload = `telegram_id=${telegramId}`;

    try {
        const authResponse = await axios.post(authUrl, authPayload, { headers: authHeaders, httpsAgent: proxyAgent });
        if (authResponse.status === 200) {
            const hash = authResponse.data.hash;

            const farmingUrl = 'https://api.mmbump.pro/v1/farming';
            const farmingHeaders = {
                ...authHeaders,
                'Authorization': hash
            };

            const farmingResponse = await axios.get(farmingUrl, { headers: farmingHeaders, httpsAgent: proxyAgent });
            if (farmingResponse.status === 200) {
                const farmingData = farmingResponse.data;
                console.log('===================================');
                console.log('ID:', farmingData.telegram_id);
                console.log('Balance:', farmingData.balance);
                console.log('===================================');
                const currentTime = Math.floor(Date.now() / 1000);
                if (farmingData.day_grant_first === null || (currentTime - farmingData.day_grant_first) >= 86400) {
                    const grantDayClaimUrl = 'https://api.mmbump.pro/v1/grant-day/claim';
                    await axios.post(grantDayClaimUrl, {}, { headers: farmingHeaders, httpsAgent: proxyAgent });
                    console.log('Điểm danh hàng ngày');
                } else {
                    console.log('Đã điểm danh hàng ngày');
                }

                if (farmingData.session.status === 'await') {
                    const farmingStartUrl = 'https://api.mmbump.pro/v1/farming/start';
                    const farmingStartPayload = { status: 'inProgress' };
                    await axios.post(farmingStartUrl, farmingStartPayload, { headers: farmingHeaders, httpsAgent: proxyAgent });
                    console.log('Bắt đầu farming...');
                } else if (farmingData.session.status === 'inProgress' && farmingData.session.moon_time > currentTime) {
                    console.log('Đang trong trạng thái farming');
                } else {
                    await finishFarmingIfNeeded(farmingData, farmingHeaders, proxyAgent, progress);
                }
            } else {
                console.error('Không thể lấy dữ liệu farming');
            }
        } else {
            throw new Error('Không thể xác thực');
        }
    } catch (error) {
        console.error('Lỗi rồi:', error.message);
    }
};

const main = async () => {
    while (true) {
        for (let i = 0; i < telegramIds.length; i++) {
            const telegramId = telegramIds[i].trim();
            const proxy = proxies[i].trim();
            await checkProxyIP(proxy);
            await xuly(telegramId, proxy);
        }
        console.log('Đã hoàn thành tất cả các ID, nghỉ 6 giờ trước khi tiếp tục vòng lặp...');
        await new Promise(resolve => setTimeout(resolve, 6 * 60 * 60 * 1000 + 10 * 60 * 1000));
    }
};

main();
