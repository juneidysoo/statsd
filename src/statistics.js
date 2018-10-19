const EventEmitter = require('events');

const config = require('./config');
const logger = require('./logger').get('statistics');

const Gauges = require('./model/Gauges');
const Counters = require('./model/Counters');
const Timers = require('./model/Timers');
const Sets = require('./model/Sets');

const keyNameSanitize = config.get('keyNameSanitize');
const flushInterval = config.get('flushInterval');
const startupTime = config.get('startupTime');

const tokenRegex = /^([^:]+):([+-]?\d+)\|(ms|c|h|g|s)(?:\|(.+))?/;
const rateRegex = /^@(\d+.\d+)$/;

/**
 * @event flush
 * @param {Number} ts The timestamp when flushing started.
 * @param {Object} metrics All the raw metrics plus aggregated data.
 */

const st = {
	/**
	 * Initialise the statistics.
	 */
	init () {
		st.counters = new Counters();
		st.gauges = new Gauges();
		st.timers = new Timers();
		st.sets = new Sets();

		const prefixStats = config.get('prefixStats');

		st.internal = {
			badLines: `${prefixStats}.bad_lines_seen`,
			packets: `${prefixStats}.packets_received`,
			metrics: `${prefixStats}.metrics_received`,
			tsLag: `${prefixStats}.timestamp_lag`
		};

		st.resetCounters();

		st.events = new EventEmitter();

		st.oldTs = 0;

		setTimeout(st.flushMetrics, st.getFlushTimeout());
	},
	/**
	 * Get the incoming packet handler function.
	 */
	getPacketHandler () {
		return st.handlePacket;
	},
	/**
	 * Get the event emitter.
	 */
	getEventEmitter () {
		return st.events;
	},
	/**
	 * Reset internal counters.
	 */
	resetCounters () {
		st.counters.reset(st.internal.badLines);
		st.counters.reset(st.internal.packets);
		st.counters.reset(st.internal.metrics);
	},
	/**
	 * Sanitise key.
	 * @param {String} key
	 * @return {String}
	 */
	sanitizeKeyName (key) {
		return key
		.replace(/\s+/g, '_')
		.replace(/\//g, '-')
		.replace(/[^a-zA-Z_\-0-9.]/g, '');
	},
	/**
	 * Record an item.
	 * @param {String} item
	 * @return {Boolean} True if success.
	 */
	record (item) {
		const result = item.match(tokenRegex);
		if (!result) { return; } // Doesn't match, bail

		const [, k, val, type, r] = result;

		const rate = r === undefined ? [] : r.exec(rateRegex);

		if (rate == null) { return; } // Doesn't match, bail

		const key = keyNameSanitize ? st.sanitizeKeyName(k) : k;

		const sampleRate = rate[1] || 1;

		if (type === 'ms') {
			const value = Number(val);
			if (value < 0) {
				return;
			}
			st.timers.record(key, value, sampleRate);
		} else if (type === 'c') {
			st.counters.count(key, Number(val || 1) * (1 / sampleRate));
		} else if (type === 'h') {
			logger.error('Histogram is not supported yet!');
			return;
		} else if (type === 'g') {
			st.gauges.gauge(key, Number(val));
		} else if (type === 's') {
			st.sets.add(key, val);
		}

		return true;
	},
	/**
	 * Handler for consuming incoming message.
	 * @param {Buffer} msg
	 */
	handlePacket (msg) {
		st.counters.increment(st.internal.packets);

		msg.toString()
		.split('\n')
		.forEach(metric => {
			if (metric.length === 0) {
				return;
			}
			st.counters.increment(st.internal.metrics);
			logger.trace('Metric: %s', metric);
			if (!st.record(metric)) {
				st.counters.increment(st.internal.badLines);
				logger.warn('Bad line in msg: "%s"', metric);
			}
		});
	},
	/**
	 * Get next flush timeout.
	 * @return {Number}
	 */
	getFlushTimeout () {
		return flushInterval - (Date.now() - startupTime) % flushInterval;
	},
	/**
	 * Calculate aggregate metrics.
	 * @param {Number} ts Timestamp when flushing started.
	 * @fires flush
	 */
	processMetrics (ts) {
		var startT = Date.now();
		var counterRates = {};
		var timerData = {};
		var timerCounters = st.timers.getCounters();

		for (const key in st.counters.raw()) {
			// calculate "per second" rate
			counterRates[key] = st.counters.get(key) / (flushInterval / 1000);
		}

		for (const key in st.timers.raw()) {
			const tData = {};
			const timer = st.timers.get(key);
			if (timer.length > 0) {
				const values = timer.sort((a, b) => a - b);
				const count = values.length;
				const min = values[0];
				const max = values[count - 1];

				const cumulativeValues = [min];
				const cumulSumSquaresValues = [min * min];
				for (let i = 1; i < count; i++) {
					cumulativeValues.push(
						values[i] + cumulativeValues[i - 1]
					);
					cumulSumSquaresValues.push(
						(values[i] * values[i]) + cumulSumSquaresValues[i - 1]
					);
				}
				const sum = cumulativeValues[count - 1];
				const sumSquares = cumulSumSquaresValues[count - 1];
				const mean = sum / count;

				let sumOfDiffs = 0;
				for (let i = 0; i < count; i++) {
					sumOfDiffs += (values[i] - mean) * (values[i] - mean);
				}

				const mid = Math.floor(count / 2);
				const median = (count % 2)
					? values[mid]
					: (values[mid - 1] + values[mid]) / 2;

				Object.assign(
					tData,
					{
						std: Math.sqrt(sumOfDiffs / count),
						upper: max,
						lower: min,
						count: timerCounters.get(key),
						count_ps: timerCounters.get(key) / (flushInterval / 1000),
						sum,
						sum_squares: sumSquares,
						mean,
						median
					}
				);
			} else {
				tData.count = tData.count_ps = 0;
			}
			timerData[key] = tData;
		}

		st.events.emit(
			'flush',
			ts, 
			{
				counters: st.counters.raw(),
				gauges: st.gauges.raw(),
				timers: st.timers.raw(),
				timer_counters: timerCounters.raw(),
				sets: st.sets.raw(),
				counter_rates: counterRates,
				timer_data: timerData,
				statsd_metrics: {
					processing_time: Date.now() - startT
				}
			}
		);
	},
	/**
	 * Function handler for flush timeout.
	 */
	flushMetrics () {
		const ts = Date.now();
		if (st.oldTs > 0) {
			st.gauges.gauge(st.internal.tsLag, ts - st.oldTs - flushInterval);
		}
		st.oldTs = ts;

		// After all listeners, reset the stats
		st.events.once('flush', function clearMetrics () {
			// Clear the counters
			st.counters.clear(config.get('deleteCounters'));
			st.resetCounters();

			// Clear the timers
			st.timers.clear(config.get('deleteTimers'));

			// Clear the sets
			st.sets.clear(config.get('deleteSets'));

			// Clear the gauges
			st.gauges.clear(config.get('deleteGauges'));
		});

		st.processMetrics(ts);

		// Performing this setTimeout at the end of this method rather than the
		// beginning helps ensure we adapt to negative clock skew by letting the
		// method's latency introduce a short delay that should more than
		// compensate.
		setTimeout(st.flushMetrics, st.getFlushTimeout());
	}
};

module.exports = {
	init: st.init,
	getPacketHandler: st.getPacketHandler,
	getEventEmitter: st.getEventEmitter
};
