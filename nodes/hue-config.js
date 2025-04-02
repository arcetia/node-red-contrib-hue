module.exports = function(RED) {
    function HueConfigNode(config) {
        RED.nodes.createNode(this, config);
        this.hostname = config.hostname;
        this.apiKey = config.apiKey;
    }

    RED.nodes.registerType("hue-config", HueConfigNode, {
        credentials: {
            hostname: { type: "text" },
            apiKey: { type: "text" }
        }
    });
} 