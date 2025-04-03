const fetch = require('node-fetch-retry');
const https = require('https');

class HueAPI {
    httpsAgent = new https.Agent({
        rejectUnauthorized: false
    });
    constructor(hostname, apiKey) {
        this.hostname = hostname;
        this.apiKey = apiKey;
    }

    async makeRequest(path, options = {}) {
        const url = `https://${this.hostname}/${path}`;
        console.log(`[Hue] Making request to ${url}`);
        return await fetch(url, {
            ...options,
            agent: this.httpsAgent,
            headers: {
                'hue-application-key': this.apiKey,
                ...options.headers
            },
            retry: 3
        });
    }

}

module.exports = HueAPI; 