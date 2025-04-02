const HueAPI = require('./hue-utils');

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

        const hueAPI = new HueAPI(hueConfig);

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

            hueAPI.controlDevice(deviceType, deviceId, updateData)
                .then(() => {
                    done();
                })
                .catch(error => {
                    node.error("Failed to control Hue device: " + error.message);
                    done();
                });
        });
    }

    RED.nodes.registerType("hue-control", HueControlNode);
} 