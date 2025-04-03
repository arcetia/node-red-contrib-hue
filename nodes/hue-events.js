const eventManager = require('./hue-event-manager');

module.exports = function (RED) {
    function HueEventsNode(config) {
        RED.nodes.createNode(this, config);
        const node = this;
        const hueConfig = RED.nodes.getNode(config.hueConfig);

        if (!hueConfig) {
            node.error("Missing Hue configuration");
            return;
        }

        const streamKey = hueConfig.credentials.hostname;
        const deviceTypes = config.deviceType || [];

        // Create a wrapper function that filters events based on deviceType
        const eventHandler = (data) => {
            if (deviceTypes.length === 0 || deviceTypes.includes(data.type)) {
                node.send({payload: data[data.type] ?? data, topic: data.id, type: data.type});
            }
        };

        // Register the event handler with the event manager
        eventManager.addListener(streamKey, eventHandler);
        eventManager.startStream(streamKey, hueConfig);

        node.on('input', function (msg, send, done) {
            // This node doesn't process input messages
            done();
        });

        node.on('close', function (done) {
            eventManager.removeListener(streamKey, eventHandler);
            done();
        });
    }

    RED.nodes.registerType("hue-events", HueEventsNode);
} 