const VALID_DEVICE_TYPES = ['device', 'light', 'room', 'button', 'grouped_light', 'scene', 'relative_rotary'];

module.exports = function(RED) {
    function HueControlNode(config) {
        RED.nodes.createNode(this, config);
        const node = this;
        const hueConfig = RED.nodes.getNode(config.hueConfig);
        
        if (!hueConfig) {
            node.error("Missing Hue configuration");
            return;
        }

        node.on('input', function(msg, send, done) {
            const deviceId = msg.deviceId || config.deviceId;
            const deviceType = msg.deviceType || config.deviceType || 'light';
            
            if (!deviceId) {
                node.error("No device ID provided");
                done();
                return;
            }

            if (!VALID_DEVICE_TYPES.includes(deviceType)) {
                node.error(`Invalid device type: ${deviceType}. Must be one of: ${VALID_DEVICE_TYPES.join(', ')}`);
                done();
                return;
            }

            // Use the payload directly from the message
            const updateData = msg.payload;
            
            if (!updateData || typeof updateData !== 'object') {
                node.error("Invalid payload: must be an object");
                done();
                return;
            }
            try {
                hueConfig.update(deviceType, deviceId, updateData).finally(() => done())
            } catch (e) {
                node.error(e);
                done(e);
            }
        });
    }

    RED.nodes.registerType("hue-control", HueControlNode);
} 