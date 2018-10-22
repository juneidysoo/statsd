const net = require('net');

const Stats = require('./Stats');

/**
 * Flush stats to [graphite](http://graphite.wikidot.com/).
 *
 * To enable this backend, include 'graphite' in the backends configuration
 * array:
 *
 *   backends: ['graphite']
 *
 * This backend supports the following config options:
 */
const conf = {
	/**
	 * @cfg {String} [host='localhost']
	 * Hostname of graphite server.
	 * If not specified, metrics are processed but discarded.
	 */
	host: 'localhost',
	/**
	 * @cfg {Number} [port=2003]
	 * Port for the graphite text collector.
	 */
	port: 2003,
	/**
	 * @cfg {Number} [picklePort=2004]
	 * Port for the graphite pickle collector.
	 */
	picklePort: 2004,
	/**
	 * @cfg {'text'|'pickle'} [protocol='text']
	 */
	protocol: 'text',
	/**
	 * @cfg {String} [globalPrefix='stats']
	 */
	globalPrefix: 'stats',
	/**
	 * @cfg {String} [prefixCounter='counters']
	 */
	prefixCounter: 'counters',
	/**
	 * @cfg {String} [prefixTimer='timers']
	 */
	prefixTimer: 'timers',
	/**
	 * @cfg {String} [prefixGauge='gauges']
	 */
	prefixGauge: 'gauges',
	/**
	 * @cfg {String} [prefixSet='sets']
	 */
	prefixSet: 'sets',
	/**
	 * @cfg {String} [globalSuffix='']
	 */
	globalSuffix: '',
	/**
	 * @cfg {Boolean} [legacyNamespace=true]
	 */
	legacyNamespace: true,
	/**
	 * @cfg {String} [prefixStats='statsd']
	 */
	prefixStats: 'statsd',
	/**
	 * @cfg {Boolean} [flushCounts=true]
	 */
	flushCounts: true
};

// this will be instantiated to the logger
let l;

const gstats = {};

const ns = {
	global: [],
	counter: [],
	timer: [],
	gauge: [],
	set: []
};

// Sanitize key for graphite if not done globally
const sk = key => (
	conf.keySanitized
		? key
		: key.replace(/\s+/g, '_')
		.replace(/\//g, '-')
		.replace(/[^a-zA-Z_\-0-9.]/g, '')
);

function postStats (stats) {
	if (conf.host) {
		try {
			const port = conf.protocol === 'pickle'
				? conf.picklePort 
				: conf.port;
			const conn = net.createConnection(port, conf.host);
			conn.addListener('error', err => {
				l.error(err, 'Graphite connection error');
			});
			conn.on('connect', function () {
				const ts = Date.now();
				const namespace = ns.global.concat(conf.prefixStats);
				Object.keys(gstats)
				.forEach(k => {
					stats.add(
						namespace.concat('graphiteStats', k),
						gstats[k] || 0,
						ts
					);
				});
				const payload = conf.protocol === 'pickle'
					? stats.toPickle()
					: stats.toText();

				const starttime = Date.now();
				l.trace('Payload %s', payload);
				this.write(payload);
				this.end();

				Object.assign(
					gstats,
					{
						flush_time: Date.now() - starttime,
						flush_length: payload.length,
						last_flush: Date.now()
					}
				);
			});
		} catch (e) {
			l.error(e);
			gstats.last_exception = Date.now();
		}
	}
}

function flushStats (ts, metrics) {
	const start = Date.now();
	const {
		counters,
		counter_rates,
		timer_data,
		gauges,
		sets,
		statsd_metrics
	} = metrics;

	let numStats = 0;

	// Flatten all the different types of metrics into a single
	// collection so we can allow serialization to either the graphite
	// text and pickle formats.
	const stats = new Stats(ts, conf.globalSuffix);

	for (const key in counters) {
		const namespace = ns.counter.concat(sk(key));

		stats.add(namespace.concat('rate'), counter_rates[key]);
		if (conf.flushCounts) {
			stats.add(namespace.concat('count'), counters[key]);
		}

		numStats++;
	}

	for (const key in timer_data) {
		const namespace = ns.timer.concat(sk(key));
		const data = timer_data[key];

		for (const tdKey in data) {
			const value = data[tdKey];
			if (typeof value === 'number') {
				stats.add(namespace.concat(tdKey), value);
			} else {
				for (const subKey in value) {
					const subV = value[subKey];
					l.trace(subV);
					stats.add(namespace.concat(tdKey, subKey), subV);
				}
			}
		}
		numStats++;
	}

	for (const key in gauges) {
		stats.add(ns.gauge.concat(sk(key)), gauges[key]);
		numStats++;
	}

	for (const key in sets) {
		stats.add(ns.set.concat(sk(key), 'count'), sets[key].size());
		numStats++;
	}

	const namespace = ns.global.concat(conf.prefixStats);
	stats.add(namespace.concat('numStats'), numStats);
	stats.add(
		namespace.concat('graphiteStats.calculationtime'),
		Date.now() - start
	);
	for (const key in statsd_metrics) {
		stats.add(namespace.concat(key), statsd_metrics[key]);
	}

	postStats(stats);

	l.trace('Num stats: %d', numStats);
}

module.exports = {
	init (config, logger, events) {
		l = logger;

		const startupTime = config.get('startupTime');

		Object.assign(conf, config.get('graphite'));

		// In order to unconditionally add this string, it either needs to be an
		// empty string if it was unset, OR prefixed by a . if it was set.
		conf.globalSuffix = conf.globalSuffix && (`.${conf.globalSuffix}`);

		if (conf.globalPrefix) {
			Object.values(ns)
			.forEach(v => v.push(conf.globalPrefix));
		}

		['counter', 'timer', 'gauge', 'set']
		.forEach(type => {
			const prefix = conf[`prefix${type[0].toUpperCase()}${type.slice(1)}`];
			prefix && ns[type].push(prefix);
		});

		Object.assign(
			gstats,
			{
				last_flush: startupTime,
				last_exception: startupTime,
				flush_time: 0,
				flush_length: 0
			}
		);

		Object.assign(
			conf,
			{
				keySanitized: config.get('keyNameSanitize'),
				flushInterval: config.get('flushInterval')
			}
		);

		events.on('flush', flushStats);

		return true;
	}
};
