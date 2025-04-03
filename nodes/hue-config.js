const HueAPI = require("./hue-utils");

function on_data(buffer, listeners) {
    for (const line of buffer.split('\n')) {
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
}

module.exports = function(RED) {
    function HueConfigNode(config) {
        RED.nodes.createNode(this, config);
        this.listeners = [];
        this.addListener = (cb) => this.listeners.push(cb);
        this.removeListener = (cb) => this.listeners.splice(this.listeners.indexOf(cb), 1);
        const api = new HueAPI(config.hostname, config.apiKey);

        this.request = (deviceType, deviceId, payload) => {
            api.makeRequest(`clip/v2/resource/${deviceType}/${deviceId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            response.then(r => r.json())
        }

        console.log(`Starting Hue event stream on: ${config.hostname}`);
        const response = api.makeRequest('eventstream/clip/v2', {
            headers: {
                'Accept': 'text/event-stream'
            }
        });
        response.then(r => {
            r.body.on('data', chunk => on_data('' + chunk, this.listeners));
        }).catch(e => console.error(e));
    }

    RED.nodes.registerType("hue-config", HueConfigNode, {
        credentials: {
            hostname: { type: "text" },
            apiKey: { type: "text" }
        }
    });
} 