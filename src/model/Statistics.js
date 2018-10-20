const config = require('../config');
const logger = require('../logger').get('model.Statistics');

const Gauges = require('./Gauges');
const Counters = require('./Counters');
const Timers = require('./Timers');
const Sets = require('./Sets');

const keyNameSanitize = config.get('keyNameSanitize');
const prefixStats = config.get('prefixStats');

/**
 * @class
 * The statistics collector.
 * Parses the input string, validate then insert to actual counters.
 */
class Statistics {
	/**
	 * @static
	 * Sanitise key.
	 * @param {String} key
	 * @return {String}
	 */
	static sanitizeKeyName (key) {
		return key
		.replace(/\s+/g, '_')
		.replace(/\//g, '-')
		.replace(/[^a-zA-Z_\-0-9.]/g, '');
	}

	/**
	 * @constructor
	 * Initialises the statistics
	 */
	constructor () {
		this.counters = new Counters();
		this.gauges = new Gauges();
		this.timers = new Timers();
		this.sets = new Sets();

		this.internal = {
			badLines: `${prefixStats}.bad_lines_seen`,
			packets: `${prefixStats}.packets_received`,
			metrics: `${prefixStats}.metrics_received`,
			tsLag: `${prefixStats}.timestamp_lag`
		};

		this.resetInternal();
	}

	/**
	 * Get raw data. For aggregate purpose.
	 */
	raw () {
		return {
			counters: this.counters.raw(),
			gauges: this.gauges.raw(),
			timers: this.timers.raw(),
			sets: this.sets.raw(),
			timerCounters: this.timers.getCounters().raw()
		};
	}

	/**
	 * Reset internal counters.
	 */
	resetInternal () {
		this.counters.reset(this.internal.badLines);
		this.counters.reset(this.internal.packets);
		this.counters.reset(this.internal.metrics);
	}

	/**
	 * Gauge timestamp lag.
	 * @param {Number} tsLag
	 */
	gaugeTsLag (tsLag) {
		this.gauges.gauge(this.internal.tsLag, tsLag);
	}

	/**
	 * Validate and insert.
	 * @param {String} item
	 * @return {Boolean} True if succeeded.
	 */
	_insert (item) {
		const result = item.match(Statistics.tokenRegex);
		if (!result) { return; } // Doesn't match, bail

		const [, k, val, type, r] = result;

		const rate = r === undefined ? [] : r.exec(Statistics.rateRegex);

		if (rate == null) { return; } // Doesn't match, bail

		const key = keyNameSanitize ? Statistics.sanitizeKeyName(k) : k;

		const sampleRate = rate[1] || 1;

		if (type === 'ms') {
			const value = Number(val);
			if (value < 0) {
				return;
			}
			this.timers.record(key, value, sampleRate);
		} else if (type === 'c') {
			this.counters.count(key, Number(val || 1) * (1 / sampleRate));
		} else if (type === 'h') {
			logger.error('Histogram is not supported yet!');
			return;
		} else if (type === 'g') {
			this.gauges.gauge(key, Number(val));
		} else if (type === 's') {
			this.sets.add(key, val);
		}

		return true;
	}

	/**
	 * Insert one item into statistics.
	 * @param {String} metric
	 * @return {Boolean} True if successfully inserted.
	 */
	insert (metric) {
		if (metric.length === 0) return; //Empty line, bail

		this.counters.increment(this.internal.metrics);

		logger.trace('Inserting: %s', metric);

		if (!this._insert(metric)) {
			this.counters.increment(this.internal.badLines);
			logger.warn('Bad line in msg: "%s"', metric);
		}
	}

	/**
	 * Insert into statistics in bulk.
	 * @param {String} metrics
	 */
	bulkInsert (metrics) {
		this.counters.increment(this.internal.packets);
		metrics.split('\n')
		.forEach(this.insert, this);
	}

	/**
	 * Reset statistics.
	 */
	reset () {
		// Clear the counters
		this.counters.clear(config.get('deleteCounters'));
		this.resetInternal();

		// Clear the timers
		this.timers.clear(config.get('deleteTimers'));

		// Clear the sets
		this.sets.clear(config.get('deleteSets'));

		// Clear the gauges
		this.gauges.clear(config.get('deleteGauges'));
	}
}

Statistics.tokenRegex = /^([^:]+):([+-]?\d+)\|(ms|c|h|g|s)(?:\|(.+))?$/;
Statistics.rateRegex = /^@(\d+.\d+)$/;

module.exports = Statistics;
