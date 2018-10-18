const Bunyan = require('bunyan');

const config = require('./config').get('logger');

const cache = {};

module.exports = {
	get: function getLogger (name) {
		if (!cache[name]) {
			cache[name] = Bunyan.createLogger({
				name,
				streams: config.streams,
				level: config.level
			});
		}
		return cache[name];
	}
};
