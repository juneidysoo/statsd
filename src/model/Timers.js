const Counters = require('./Counters');
/**
 * @class model.Timers
 * Maintain timers.
 */
class Timers {
	constructor () {
		/**
		 * Key-value pair that stores the timer.
		 * @property {Object.<String, Number[]>} timers
		 */
		this.timers = {};
		/**
		 * Timer counters.
		 * @property {model.Counters} timers
		 */
		this.counters = new Counters();
	}
	/**
	 * @inheritdoc model.Gauges#reset
	 */
	reset (key) {
		this.timers[key].length = 0;
	}
	/**
	 * @inheritdoc model.Gauges#init
	 */
	init (key) {
		if (!Array.isArray(this.timers[key])) {
			this.timers[key] = [];
		}
	}
	/**
	 * Record a timer.
	 * @param {String} key
	 * @param {Number} value
	 * @param {Number} sampleRate
	 */
	record (key, value, sampleRate) {
		this.init(key);
		this.timers[key].push(value);
		this.counters.count(key, 1 / sampleRate);
	}
	/**
	 * Clear the timers.
	 * @param {Boolean} del Whether to delete the timers.
	 */
	clear (del) {
		if (del) {
			for (const key in this.timers) {
				delete this.timers[key];
			}
		} else {
			for (const key in this.timers) {
				this.reset(key);
			}
		}
		this.counters.clear(del);
	}
	/**
	 * Get the value of specified key.
	 * @param {String} key
	 * @return {Number[]}
	 */
	get (key) {
		return this.timers[key];
	}
	/**
	 * Get raw timer.
	 * @return {Object.<String, Number[]>}
	 */
	raw () {
		return this.timers;
	}
	/**
	 * Get counters.
	 * @return {model.Counters}
	 */
	getCounters () {
		return this.counters;
	}
}

module.exports = Timers;
