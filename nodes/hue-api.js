const http2 = require('http2');

class HueAPI {
    constructor(hostname, apiKey) {
        this.hostname = hostname;
        this.apiKey = apiKey;
    }

    makeRequest(path, options = {}) {
        // Remove any existing protocol from hostname
        const cleanHostname = this.hostname.replace(/^https?:\/\//, '');
        const url = `https://${cleanHostname}/${path}`;
        console.log(`[Hue] Making request to ${url}`);

        return new Promise((resolve, reject) => {
            const client = http2.connect(`https://${cleanHostname}`, {
                rejectUnauthorized: false
            });

            client.on('error', (err) => {
                console.error('HTTP/2 connection error:', err);
                reject(err);
            });

            const req = client.request({
                ':path': `/${path}`,
                ':method': options.method || 'GET',
                'hue-application-key': this.apiKey,
                ...options.headers
            });

            req.on('response', (headers) => {
                const response = {
                    headers,
                    on: (event, callback) => {
                        if (event === 'data') {
                            req.on('data', callback);
                        } else if (event === 'end') {
                            req.on('end', callback);
                        } else if (event === 'error') {
                            req.on('error', callback);
                        } else if (event === 'close') {
                            req.on('close', callback);
                        }
                    }
                };
                resolve(response);
            });

            req.on('error', (err) => {
                console.error('HTTP/2 request error:', err);
                reject(err);
            });

            if (options.body) {
                req.write(options.body);
            }
            req.end();
        });
    }
}

module.exports = HueAPI; 