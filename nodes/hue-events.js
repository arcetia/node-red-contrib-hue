module.exports = function (RED) {
    function HueEventsNode(config) {
        RED.nodes.createNode(this, config);
        const node = this;
        const hueConfig = RED.nodes.getNode(config.hueConfig);

        if (!hueConfig) {
            node.error("Missing Hue configuration");
            return;
        }

        const cb = (data) => {
            if (!config.deviceType?.length || config.deviceType.includes(data.type))
                node.send({payload: data[data.type] ?? data, topic: data.id, type: data.type})
        }

        hueConfig.addListener(cb)

        node.on('input', function (msg, send, done) {
            // This node doesn't process input messages
            done();
        });

        node.on('close', function (done) {
            hueConfig.removeListener(cb);
            done()
        });
    }

    RED.nodes.registerType("hue-events", HueEventsNode);
} 