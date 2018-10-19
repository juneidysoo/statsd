const EventEmitter = require('events');

const config = require('./config');
const utils = require('./utils');
const logger = require('./logger').get('stats');
const server = require('./server');
const backend = require('./backend');
const Gauges = require('./model/Gauges');
const Counters = require('./model/Counters');

// Initialise internal stats name
const internal = (function initInternal () {
	const prefixStats = config.get('prefixStats');
	return {
		badLines: `${prefixStats}.bad_lines_seen`,
		packets: `${prefixStats}.packets_received`,
		metrics: `${prefixStats}.metrics_received`,
		tsLag: `${prefixStats}.timestamp_lag`
	};
})();

const flushInterval = config.get('flushInterval');
const keyNameSanitize = config.get('keyNameSanitize');
const startupTime = config.get('startupTime');
const counters = new Counters();
const gauges = new Gauges();
const timers = {};
const sets = {};
const timerCounters = new Counters();
const backendEvents = new EventEmitter();

let oldTs = 0;

function getFlushTimeout () {
	return flushInterval - (Date.now() - startupTime) % flushInterval;
}

function initCounter () {
	counters.reset(internal.badLines);
	counters.reset(internal.packets);
	counters.reset(internal.metrics);
}

function sanitizeKeyName (key) {
	if (keyNameSanitize) {
		return key
		.replace(/\s+/g, '_')
		.replace(/\//g, '-')
		.replace(/[^a-zA-Z_\-0-9.]/g, '');
	} else {
		return key;
	}
}

function handlePacket (msg, rinfo) {
	backendEvents.emit('packet', msg, rinfo);
	counters.increment(internal.packets);

	msg.toString().split('\n')
	.forEach(metric => {
		if (metric.length === 0) {
			return;
		}
		counters.increment(internal.metrics);
		logger.trace('Metric: %s', metric);
		const bits = metric.split(':');
		const key = sanitizeKeyName(bits.shift());

		if (bits.length === 0) {
			bits.push('1');
		}

		bits.forEach(bit => {
			const fields = bit.split('|');

			if (!utils.isValidPacket(fields)) {
				logger.warn('Bad line: %s in msg "%s"', fields, metric);
				counters.increment(internal.badLines);
				return;
			}

			const [val, type, rate] = fields;

			const sampleRate = rate ? Number(rate.match(/^@([\d.]+)/)[1]) : 1;

			switch (type) {
			case 'ms':
				if (!timers[key]) {
					timers[key] = [];
				}
				timers[key].push(Number(val));
				timerCounters.count(key, 1 / sampleRate);
				break;
			case 'g':
				gauges.gauge(key, Number(val));
				break;
			case 's':
				if (!sets[key]) {
					sets[key] = new Set();
				}
				sets[key].add(val);
				break;
			default:
				counters.count(key, Number(val || 1) * (1 / sampleRate));
				break;
			}
		});
	});
}

function processMetrics (ts) {
	var startT = Date.now();
	var counterRates = {};
	var timerData = {};

	for (const key in counters.raw()) {
		// calculate "per second" rate
		counterRates[key] = counters.get(key) / (flushInterval / 1000);
	}

	for (const key in timers) {
		const tData = {};
		if (timers[key].length > 0) {
			const values = timers[key].sort((a, b) => a - b);
			const count = values.length;
			const min = values[0];
			const max = values[count - 1];

			const cumulativeValues = [min];
			const cumulSumSquaresValues = [min * min];
			for (let i = 1; i < count; i++) {
				cumulativeValues.push(values[i] + cumulativeValues[i - 1]);
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

	backendEvents.emit(
		'flush',
		ts, 
		{
			counters: counters.raw(),
			gauges: gauges.raw(),
			timers,
			timer_counters: timerCounters.raw(),
			sets,
			counter_rates: counterRates,
			timer_data: timerData,
			statsd_metrics: {
				processing_time: Date.now() - startT
			}
		}
	);
}

// Flush metrics to each backend.
function flushMetrics () {
	const ts = Date.now();
	if (oldTs > 0) {
		gauges.gauge(internal.tsLag, ts - oldTs - flushInterval);
	}
	oldTs = ts;

	// After all listeners, reset the stats
	backendEvents.once('flush', function clearMetrics () {
		// Clear the counters
		counters.clear(config.get('deleteCounters'));
		initCounter();

		// Clear the timers
		if (config.get('deleteTimers')) {
			for (const key in timers) {
				delete timers[key];
			}
		} else {
			for (const key in timers) {
				timers[key] = [];
			}
		}
		timerCounters.clear(config.get('deleteTimers'));

		// Clear the sets
		if (config.get('deleteSets')) {
			for (const key in sets) {
				delete sets[key];
			}
		} else {
			for (const key in sets) {
				sets[key].clear();
			}
		}

		// Clear the gauges
		gauges.clear(config.deleteGauges);
	});

	processMetrics(ts);

	// Performing this setTimeout at the end of this method rather than the
	// beginning helps ensure we adapt to negative clock skew by letting the
	// method's latency introduce a short delay that should more than compensate.
	setTimeout(flushMetrics, getFlushTimeout());
}

server.start(handlePacket);
backend.load(backendEvents);
initCounter();

setTimeout(flushMetrics, getFlushTimeout());
