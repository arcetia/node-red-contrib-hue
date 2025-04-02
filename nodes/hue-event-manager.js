class HueEventManager {
    constructor() {
        this.streams = new Map();
        this.listeners = new Map();
        this.reconnectAttempts = new Map();
        this.maxReconnectAttempts = 5;
        this.initialReconnectDelay = 1000; // 1 second
    }

    addListener(streamKey, listener) {
        if (!this.listeners.has(streamKey)) {
            this.listeners.set(streamKey, new Set());
        }
        this.listeners.get(streamKey).add(listener);
    }

    removeListener(streamKey, node) {
        const listeners = this.listeners.get(streamKey);
        if (listeners) {
            listeners.delete(node);
            if (listeners.size === 0) {
                this.listeners.delete(streamKey);
                this.stopStream(streamKey);
            }
        }
    }

    async startStream(streamKey, config) {
        if (this.streams.has(streamKey)) {
            return;
        }

        const hueAPI = new (require('./hue-utils'))(config);
        const stream = await hueAPI.getEventStream();
        this.streams.set(streamKey, stream);

        let buffer = '';
        stream.on('data', chunk => {
            buffer += chunk;
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep the last incomplete line in the buffer
            // Skip if no listeners
            const listeners = this.listeners.get(streamKey);
            if (!listeners) {
                console.warn("No listeners for stream key:", streamKey);
                return;
            }

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    try {
                        const jsonStr = line.slice(6); // Remove 'data: ' prefix
                        const events = JSON.parse(jsonStr);
                        if (!events || !Array.isArray(events)) return;
                        for (const event of events) {
                            if (event.data && Array.isArray(event.data)) {
                                for (const data of event.data) {
                                    listeners.forEach(listener => listener(data));
                                }
                            }
                        }
                    } catch (error) {
                        console.error("Error parsing Hue event data:", error);
                    }
                }
            }
        });

        stream.on('error', error => {
            console.error("Hue event stream error:", error);
            this.handleStreamError(streamKey, error);
        });

        stream.on('end', () => {
            console.warn("Hue event stream ended");
            this.handleStreamError(streamKey, new Error("Stream ended"));
        });
    }

    stopStream(streamKey) {
        const stream = this.streams.get(streamKey);
        if (stream) {
            stream.destroy();
            this.streams.delete(streamKey);
        }
    }

    handleStreamError(streamKey, error) {
        const listeners = this.listeners.get(streamKey);
        if (!listeners) return;

        // Handle specific error cases
        if (error.message.includes('429')) {
            listeners.forEach(node => {
                node.error("Rate limit exceeded. The node will automatically retry with exponential backoff.");
            });
        } else if (error.code === 'ECONNREFUSED') {
            listeners.forEach(node => {
                node.error("Connection refused. Please check if the Hue bridge is running and the hostname is correct.");
            });
        } else if (error.code === 'ENOTFOUND') {
            listeners.forEach(node => {
                node.error("Hostname not found. Please check if the Hue bridge hostname is correct.");
            });
        } else if (error.code === 'CERT_HAS_EXPIRED' || error.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') {
            listeners.forEach(node => {
                node.error("SSL certificate error. The Hue bridge's certificate is invalid or expired.");
            });
        } else {
            listeners.forEach(node => {
                node.error("Failed to connect to Hue bridge: " + error.message);
            });
        }

        // Attempt to reconnect with exponential backoff
        this.attemptReconnect(streamKey);
    }

    async attemptReconnect(streamKey) {
        const attempts = this.reconnectAttempts.get(streamKey) || 0;
        if (attempts >= this.maxReconnectAttempts) {
            console.error(`Max reconnection attempts (${this.maxReconnectAttempts}) reached for stream key: ${streamKey}`);
            return;
        }

        const delay = this.initialReconnectDelay * Math.pow(2, attempts);
        console.log(`Attempting to reconnect in ${delay}ms (attempt ${attempts + 1}/${this.maxReconnectAttempts})`);
        
        this.reconnectAttempts.set(streamKey, attempts + 1);
        
        await new Promise(resolve => setTimeout(resolve, delay));
    }

}

// Create a singleton instance
const eventManager = new HueEventManager();
module.exports = eventManager; 