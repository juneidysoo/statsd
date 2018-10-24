const Gauges = require('./Gauges');
/**
 * @class model.Counters
 * @extends model.Gauges
 * Maintain counts.
 */
class Counters extends Gauges {
	/**
	 * Count with sample rate.
	 * @param {String} key
	 * @param {Number} count
	 * @param {Number} rate
	 */
	count (key, count, rate = 1) {
		this.gauge(key, count / rate);
	}
	/**
	 * Increment count by 1.
	 * @param {String} key
	 */
	increment (key) {
		this.count(key, 1);
	}
	/**
	 * Clear the counters.
	 * @param {Boolean} del Whether to delete the counters.
	 */
	clear (del) {
		if (del) {
			for (const key in this.gauges) {
				delete this.gauges[key];
			}
		} else {
			for (const key in this.gauges) {
				this.reset(key);
			}
		}
	}
}

module.exports = Counters;
