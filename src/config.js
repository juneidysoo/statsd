const path = require('path');

const [,,configFile] = process.argv;

const conf = Object.assign(
	{
		server: 'udp',
		port: 8125,
		prefixStats: 'statsd',
		logger: {},
		flushInterval: 10000,
		backends: [],
		deleteIdleStats: false,
		keyNameSanitize: true
	},
	require(path.resolve(configFile)),
	{
		startupTime: Date.now()
	}
);

const assignDefault = (key, d) => {
	if (conf[key] === undefined) {
		conf[key] = d;
	}
};

['deleteCounters', 'deleteTimers', 'deleteSets', 'deleteGauges']
.forEach(key => {
	assignDefault(key, conf.deleteIdleStats);
});

/**
 * Config helpers.
 */
module.exports = {
	get (key) {
		return conf[key];
	}
};
