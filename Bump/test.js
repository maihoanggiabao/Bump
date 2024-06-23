//credit；DwanDev

const axios = require('axios');

const loginUrl = 'https://api.mmbump.pro/v1/login';
const farmingUrl = 'https://api.mmbump.pro/v1/farming';
const farmingStartUrl = 'https://api.mmbump.pro/v1/farming/start';
const farmingFinishUrl = 'https://api.mmbump.pro/v1/farming/finish';

// Headers
const headers = {
    'Accept': 'application/json, text/plain, */*',
    'Accept-Encoding': 'gzip, deflate, br, zstd',
    'Accept-Language': 'zh-CN,zh;q=0.9',
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1'
};

// Payload data
const payload = {
    initData: 'query_id=AAGakHImAwAAAJqQciZwunTJ&user=%7B%22id%22%3A7087493274%2C%22first_name%22%3A%22Diep%20Pham%22%2C%22last_name%22%3A%22%22%2C%22language_code%22%3A%22en%22%2C%22allows_write_to_pm%22%3Atrue%7D&auth_date=1719174031&hash=3986ef46e1cfcbba84fcbc1a2fc81165ad99d9c9eb22a8966cb0ed2b12be5798'
};

// Hàm đăng nhập và lấy token
async function loginAndGetToken() {
    try {
        const response = await axios.post(loginUrl, payload, { headers });
        if (response.data.token) {
            console.log('Token:', response.data.token);
            return response.data.token;
        } else {
            console.error('Không thể lấy token.');
            return null;
        }
    } catch (error) {
        console.error('Lỗi khi gọi API đăng nhập:', error.response ? error.response.data : error.message);
        return null;
    }
}

// Hàm lấy dữ liệu từ API farming
async function getFarmingData(token) {
    try {
        const farmingHeaders = {
            ...headers,
            'Authorization': ` ${token}`
        };
        const response = await axios.get(farmingUrl, { headers: farmingHeaders });
        console.log('Farming data:', response.data);
    } catch (error) {
        console.error('Lỗi khi gọi API farming:', error.response ? error.response.data : error.message);
    }
}

// Hàm bắt đầu farming
async function startFarming(token) {
    try {
        const farmingHeaders = {
            ...headers,
            'Authorization': ` ${token}`
        };
        const response = await axios.post(farmingStartUrl, { status: 'inProgress' }, { headers: farmingHeaders });
        console.log('Farming started:', response.data);
    } catch (error) {
        console.error('Lỗi khi bắt đầu farming:', error.response ? error.response.data : error.message);
    }
}

// Hàm hoàn thành farming
async function finishFarming(token, tapCount) {
    try {
        const farmingHeaders = {
            ...headers,
            'Authorization': ` ${token}`
        };
        const response = await axios.post(farmingFinishUrl, { tapCount: tapCount || 0 }, { headers: farmingHeaders });
        console.log('Farming finished:', response.data);
    } catch (error) {
        console.error('Lỗi khi hoàn thành farming:', error.response ? error.response.data : error.message);
    }
}

// Hàm thực hiện tap liên tục
async function tapFarmingContinuously(token) {
    while (true) {
        await startFarming(token);
        await new Promise(resolve => setTimeout(resolve, 3000)); // Đợi 10 giây trước khi tiếp tục
        await finishFarming(token, 999999999999); // Hoàn thành farming với số lượng tap mong muốn
    }
}

// Gọi hàm để đăng nhập và lấy dữ liệu farming
loginAndGetToken().then(token => {
    if (token) {
        getFarmingData(token).then(() => {
            tapFarmingContinuously(token);
        });
    }
});
