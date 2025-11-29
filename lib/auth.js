const http = require('http');
const crypto = require('crypto');

// ============================================
// Crypto Functions
// ============================================

function sha256(val1, val2) {
    const hash = crypto.createHash('sha256');
    hash.update(`${val1}:${val2}`);
    return hash.digest('base64');
}

function sha256url(val1, val2) {
    return base64url_escape(sha256(val1, val2));
}

function sha256String(val) {
    const hash = crypto.createHash('sha256');
    hash.update(val);
    return hash.digest('hex');
}

function base64url_escape(b64) {
    let out = '';
    for (let i = 0; i < b64.length; i++) {
        const c = b64.charAt(i);
        if (c === '+') out += '-';
        else if (c === '/') out += '_';
        else if (c === '=') out += '.';
        else out += c;
    }
    return out;
}

// ============================================
// HTTP Helper
// ============================================

function getResult(options, result, resolve, reject) {
    let rawData = '';
    result.on('data', chunk => rawData += chunk);
    result.on('end', () => resolve(rawData));
    result.on('error', error => reject(error));
}

// ============================================
// Authentication Functions
// ============================================

function getNonce(hostname) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname,
            path: '/login_web_app.cgi?nonce',
            method: 'GET',
        };
        const req = http.request(options, result => getResult(options, result, resolve, reject));
        req.on('error', reject);
        req.end();
    });
}

function getSalt(hostname, username, nonceResponse) {
    return new Promise((resolve, reject) => {
        const nonceUrl = base64url_escape(nonceResponse.nonce);
        const userHash = sha256url(username, nonceResponse.nonce);
        const postBody = `userhash=${userHash}&nonce=${nonceUrl}`;
        const options = {
            hostname,
            path: '/login_web_app.cgi?salt',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(postBody),
            },
        };
        const req = http.request(options, result => getResult(options, result, resolve, reject));
        req.on('error', reject);
        req.write(postBody);
        req.end();
    });
}

function performLogin(hostname, username, password, nonceResponse, saltResponse) {
    return new Promise((resolve, reject) => {
        const nonceUrl = base64url_escape(nonceResponse.nonce);
        const userhash = sha256url(username, nonceResponse.nonce);
        const randomKeyHash = sha256url(nonceResponse.randomKey, nonceResponse.nonce);
        
        let hashedPassword = nonceResponse.iterations >= 1
            ? sha256String(saltResponse.alati + password)
            : saltResponse.alati + password;

        for (let i = 1; i < nonceResponse.iterations; i++) {
            hashedPassword = sha256String(hashedPassword);
        }

        const response = sha256url(sha256(username, hashedPassword.toLowerCase()), nonceResponse.nonce);
        
        // Generate random encryption key and IV
        const enckey = crypto.randomBytes(16).toString('base64');
        const enciv = crypto.randomBytes(16).toString('base64');
        
        let postBody = `userhash=${userhash}&RandomKeyhash=${randomKeyHash}&response=${response}&nonce=${nonceUrl}`;
        postBody += `&enckey=${base64url_escape(enckey)}&enciv=${base64url_escape(enciv)}`;

        const options = {
            hostname,
            path: '/login_web_app.cgi?salt',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(postBody),
            },
        };
        const req = http.request(options, result => getResult(options, result, resolve, reject));
        req.on('error', reject);
        req.write(postBody);
        req.end();
    });
}

async function authenticate(hostname, username, password) {
    const nonceData = await getNonce(hostname);
    const nonceResponse = JSON.parse(nonceData);
    
    const saltData = await getSalt(hostname, username, nonceResponse);
    const saltResponse = JSON.parse(saltData);
    
    const loginData = await performLogin(hostname, username, password, nonceResponse, saltResponse);
    const loginResponse = JSON.parse(loginData);
    
    return loginResponse;
}

module.exports = {
    getNonce,
    getSalt,
    performLogin,
    authenticate,
};
