const EventEmitter = require('events');

const config = require('./config');

const Statistics = require('./model/Statistics');

const flushInterval = config.get('flushInterval');
const startupTime = config.get('startupTime');

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
		st.stats = new Statistics();
		st.events = new EventEmitter();
		st.oldTs = 0;
		setTimeout(st.flushMetrics, st.getFlushTimeout());
	},
	/**
	 * Get the incoming packet handler function.
	 */
	getPacketHandler () {
		return msg => st.stats.bulkInsert(msg.toString());
	},
	/**
	 * Get the event emitter.
	 */
	getEventEmitter () {
		return st.events;
	},
	/**
	 * Get next flush timeout.
	 * This was introduced due to time drift in setInterval.
	 * See https://github.com/etsy/statsd/pull/489 for more details.
	 * @return {Number}
	 */
	getFlushTimeout () {
		return flushInterval - (Date.now() - startupTime) % flushInterval;
	},
	/**
	 * Get aggregate metrics.
	 */
	aggregate () {
		const startT = Date.now();
		const counterRates = {};
		const timerData = {};
		const metrics = st.stats.raw();
		const { counters, timers, timerCounters } = metrics;

		for (const key in counters) {
			// calculate "per second" rate
			counterRates[key] = counters[key] / (flushInterval / 1000);
		}

		for (const key in timers) {
			const tData = {};
			const timer = timers[key];
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
						count: timerCounters[key],
						count_ps: timerCounters[key] / (flushInterval / 1000),
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

		return Object.assign(
			metrics,
			{
				counter_rates: counterRates,
				timer_data: timerData,
				statsd_metrics: { processing_time: Date.now() - startT }
			}
		);
	},
	/**
	 * Function handler for flush timeout.
	 * @fires flush
	 */
	flushMetrics () {
		const ts = Date.now();
		if (st.oldTs > 0) {
			st.stats.gaugeTsLag(ts - st.oldTs - flushInterval);
		}
		st.oldTs = ts;

		st.events.emit('flush', ts, st.aggregate());

		st.stats.reset();

		// Performing this setTimeout at the end of this method rather than the
		// beginning helps ensure we adapt to negative clock skew by letting the
		// method's latency introduce a short delay that should more than
		// compensate.
		// See
		// - https://github.com/etsy/statsd/pull/575
		// - https://github.com/etsy/statsd/issues/574
		// for more details.
		setTimeout(st.flushMetrics, st.getFlushTimeout());
	}
};

module.exports = {
	init: st.init,
	getPacketHandler: st.getPacketHandler,
	getEventEmitter: st.getEventEmitter
};
