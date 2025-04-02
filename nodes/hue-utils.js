class HueAPI {
    constructor(config) {
        this.hostname = config.credentials.hostname;
        this.apiKey = config.credentials.apiKey;
        this.httpsAgent = new (require('https').Agent)({
            rejectUnauthorized: false
        });
        this.retryDelay = 1000; // Initial retry delay in ms
        this.maxRetries = 5;     // Maximum number of retries
    }

    getHeaders(contentType = 'application/json') {
        return {
            'hue-application-key': this.apiKey,
            'Accept': contentType
        };
    }

    async makeRequest(url, options = {}) {
        let retries = 0;
        while (retries < this.maxRetries) {
            try {
                return new Promise((resolve, reject) => {
                    const requestOptions = {
                        agent: this.httpsAgent,
                        headers: {
                            ...this.getHeaders(options.headers?.['Content-Type']),
                            ...options.headers
                        },
                        method: options.method || 'GET'
                    };

                    if (options.body) {
                        requestOptions.headers['Content-Length'] = Buffer.byteLength(options.body);
                    }

                    const req = require('https').request(url, requestOptions, (res) => {
                        if (res.statusCode === 429) {
                            const retryAfter = parseInt(res.headers['retry-after'] || '1');
                            const delay = retryAfter * 1000 || this.retryDelay * Math.pow(2, retries);
                            console.log(`Rate limited. Waiting ${delay}ms before retry ${retries + 1}/${this.maxRetries}`);
                            setTimeout(() => {
                                retries++;
                                this.makeRequest(url, options).then(resolve).catch(reject);
                            }, delay);
                            return;
                        }

                        if (res.statusCode < 200 || res.statusCode >= 300) {
                            reject(new Error(`HTTP error! status: ${res.statusCode}`));
                            return;
                        }

                        // For streaming responses (like event-stream), return the response directly
                        if (options.headers?.['Accept'] === 'text/event-stream') {
                            resolve({
                                ok: true,
                                status: res.statusCode,
                                headers: res.headers,
                                body: res
                            });
                            return;
                        }

                        // For non-streaming responses, buffer the data
                        const chunks = [];
                        res.on('data', chunk => chunks.push(chunk));
                        res.on('end', () => {
                            const body = Buffer.concat(chunks);
                            resolve({
                                ok: true,
                                status: res.statusCode,
                                headers: res.headers,
                                json: async () => JSON.parse(body.toString()),
                                text: async () => body.toString(),
                                body: {
                                    getReader: () => ({
                                        read: async () => ({
                                            value: body,
                                            done: true
                                        })
                                    })
                                }
                            });
                        });
                    });

                    req.on('error', (error) => {
                        console.error("Error making request:", error);
                        if (retries === this.maxRetries - 1) {
                            reject(error);
                        } else {
                            const delay = this.retryDelay * Math.pow(2, retries);
                            setTimeout(() => {
                                retries++;
                                this.makeRequest(url, options).then(resolve).catch(reject);
                            }, delay);
                        }
                    });

                    if (options.body) {
                        req.write(options.body);
                    }
                    req.end();
                });
            } catch (error) {
                console.error("Error making request:", error);
                if (retries === this.maxRetries - 1) {
                    throw error;
                }
                const delay = this.retryDelay * Math.pow(2, retries);
                await new Promise(resolve => setTimeout(resolve, delay));
                retries++;
            }
        }
        throw new Error(`Max retries (${this.maxRetries}) exceeded`);
    }

    async getEventStream() {
        const url = `https://${this.hostname}/eventstream/clip/v2`;
        const response = await this.makeRequest(url, {
            headers: {
                'Accept': 'text/event-stream'
            }
        });
        return response.body;
    }

    async controlDevice(deviceType, deviceId, payload) {
        const url = `https://${this.hostname}/clip/v2/resource/${deviceType}/${deviceId}`;
        const response = await this.makeRequest(url, {
            method: 'PUT',
            body: JSON.stringify(payload)
        });
        return response.json();
    }
}

module.exports = HueAPI; 