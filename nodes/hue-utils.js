const fetch = require('node-fetch').default;
const https = require('https');

class HueAPI {
    constructor(config) {
        this.hostname = config.credentials.hostname;
        this.apiKey = config.credentials.apiKey;
        this.httpsAgent = new https.Agent({
            rejectUnauthorized: false
        });
    }

    getHeaders(contentType = 'application/json') {
        return {
            'hue-application-key': this.apiKey,
            'Accept': contentType
        };
    }

    async makeRequest(path, options = {}) {
        const url = `https://${this.hostname}/${path}`;
        const response = await fetch(url, {
            ...options,
            agent: this.httpsAgent,
            retry: {
                retries: 5,
                factor: 2,
                minTimeout: 1000,
                maxTimeout: 10000,
                onRetry: (error, retryCount) => {
                    console.log(`Retry ${retryCount}/5: ${error.message}`);
                }
            },
            headers: {
                ...this.getHeaders(options.headers?.['Content-Type']),
                ...options.headers
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return response;
    }

    async controlDevice(deviceType, deviceId, payload) {
        const response = await this
    }
}

module.exports = HueAPI; 