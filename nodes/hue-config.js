const HueAPI = require("./hue-api");

function on_data(buffer, listeners) {
    for (const line of buffer.split('\n')) {
        if (!line.startsWith('data: ')) continue;
        try {
            const events = JSON.parse(line.slice(6));
            events.forEach(event => 
                event.data?.forEach(data => 
                    listeners.forEach(listener => listener(data))
                )
            );
        } catch (error) {
            console.error("Error parsing Hue event data:", error);
        }
    }
}

function setupEventStream(api, listeners) {
    const connect = () => {
        console.log(`Starting Hue event stream on: ${api.hostname}`);
        api.makeRequest('eventstream/clip/v2', {
            headers: { 'Accept': 'text/event-stream' }
        }).then(response => {
            const decoder = new TextDecoder();
            let buffer = '';

            response.on('data', chunk => {
                buffer += decoder.decode(chunk, { stream: true });
                on_data(buffer, listeners);
                buffer = '';
            });

            ['end', 'error', 'close'].forEach(event => 
                response.on(event, () => {
                    console.log(`Event stream ${event}, reconnecting...`);
                    setTimeout(connect, 30000);
                })
            );
        }).catch(e => {
            console.error('Failed to connect to event stream:', e);
            setTimeout(connect, 30000);
        });
    };

    connect();
}

module.exports = function(RED) {
    function HueConfigNode(config) {
        RED.nodes.createNode(this, config);
        this.listeners = [];
        this.addListener = cb => this.listeners.push(cb);
        this.removeListener = cb => this.listeners.splice(this.listeners.indexOf(cb), 1);
        const api = new HueAPI(config.hostname, config.apiKey);

        this.update = (deviceType, deviceId, payload) => 
            api.makeRequest(`clip/v2/resource/${deviceType}/${deviceId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            }).then(r => r.json());

        setupEventStream(api, this.listeners);
    }

    RED.nodes.registerType("hue-config", HueConfigNode, {
        credentials: {
            hostname: { type: "text" },
            apiKey: { type: "text" }
        }
    });
} 