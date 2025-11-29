const http = require('http');

function fetchData(hostname, path, cookie = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname,
            path,
            method: 'GET',
            timeout: 5000,
            headers: {}
        };

        if (cookie) {
            options.headers['Cookie'] = cookie;
        }

        const req = http.request(options, res => {
            let data = '';

            res.on('data', chunk => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve(json);
                } catch (err) {
                    reject(new Error(`Failed to parse response: ${err.message}`));
                }
            });
        });

        req.on('error', err => {
            reject(new Error(`Request failed: ${err.message}`));
        });

        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });

        req.end();
    });
}

function fetchDetailedStatus(hostname, cookie = null) {
    return fetchData(hostname, '/status_get_web_app.cgi', cookie);
}

function modifyAPN(hostname, loginResponse, enableInternet, apnName = 'internet') {
    return new Promise((resolve, reject) => {
        const apnPayload = JSON.stringify({
            version: 1,
            csrf_token: loginResponse.token,
            id: 1,
            interface: "Nokia.GenericService",
            service: "OAM",
            function: "ModifyAPN",
            paralist: [{
                WorkMode: "RouteMode",
                AccessPointName: apnName,
                Services: "TR069,INTERNET",
                VOIP: null,
                INTERNET: true,
                IPTV: false,
                UserName: "",
                Password: "",
                confirmPwd: null,
                AuthenticationMode: "None",
                IPv4: true,
                IPv6: enableInternet,
                IPv4NetMask: "",
                MTUSize: "",
                APNInstanceID: 1,
                ipMode: 3,
                mtuMode: "Automatic",
                EthernetInterface: "",
                VLANID: 0
            }]
        });

        const options = {
            hostname,
            path: '/service_function_web_app.cgi',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(apnPayload),
                Cookie: `sid=${loginResponse.sid}`,
            },
        };

        const req = http.request(options, result => {
            let rawData = '';
            result.on('data', chunk => rawData += chunk);
            result.on('end', () => resolve(rawData));
            result.on('error', error => reject(error));
        });
        req.on('error', reject);
        req.write(apnPayload);
        req.end();
    });
}

function rebootGateway(hostname, loginResponse) {
    return new Promise((resolve, reject) => {
        const rebootPayload = JSON.stringify({
            version: 1,
            csrf_token: loginResponse.token,
            id: 1,
            interface: "Nokia.GenericService",
            service: "OAM",
            function: "Reboot",
            paralist: []
        });
        
        const options = {
            hostname,
            path: '/reboot_web_app.cgi',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(rebootPayload),
                Cookie: `sid=${loginResponse.sid}`,
            },
        };

        const req = http.request(options, result => {
            let rawData = '';
            result.on('data', chunk => rawData += chunk);
            result.on('end', () => resolve(rawData));
            result.on('error', error => reject(error));
        });
        req.on('error', reject);
        req.write(rebootPayload);
        req.end();
    });
}

module.exports = {
    fetchData,
    fetchDetailedStatus,
    modifyAPN,
    rebootGateway,
};
