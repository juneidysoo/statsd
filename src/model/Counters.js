const Gauges = require('./Gauges');
/**
 * @class
 * @extends Gauges
 * Maintain counts.
 */
class Counters extends Gauges {
	/**
	 * @constructor
	 */
	constructor () {
		super();
		this.count = this.gauge;
	}
	/**
	 * Increment count by 1.
	 * @param {String} key
	 */
	increment (key) {
		this.init(key);
		this.gauges[key]++;
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
