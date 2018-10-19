const dgram = require('dgram');

module.exports = {
	start (config, logger, callback) {
		const server = dgram.createSocket('udp4', callback);
		server.bind(config.get('port'), config.get('address'));
		return server;
	}
};
