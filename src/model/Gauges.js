/**
 * @class
 * Maintain gauges.
 */
class Gauges {
	/**
	 * Key-value pair that stores the gauge.
	 * @property {Object.<String, Number>} gauges
	 */
	/**
	 * @constructor
	 */
	constructor () {
		this.gauges = {};
	}
	/**
	 * Reset the gauge.
	 * @param {String} key
	 */
	reset (key) {
		this.gauges[key] = 0;
	}
	/**
	 * Initialise the key if not.
	 */
	init (key) {
		if (typeof this.gauges[key] !== 'number') {
			this.reset(key);
		}
	}
	/**
	 * Update gauge.
	 * @param {String} key
	 * @param {Number} count
	 */
	gauge (key, count) {
		this.init(key);
		this.gauges[key] += count;
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
	 * Clear the gauges.
	 * @param {Boolean} del Whether to delete the gauges.
	 */
	clear (del) {
		// Normally gauges are not reset.
		// So if we don't delete them, continue to persist previous value.
		if (del) {
			for (const key in this.gauges) {
				delete this.gauges[key];
			}
		}
	}
	/**
	 * Get raw gauge.
	 * @return {Object.<String, Number>}
	 */
	raw () {
		return this.gauges;
	}
	/**
	 * Get the value of specified key.
	 * @param {String} key
	 */
	get (key) {
		return this.gauges[key];
	}
}

module.exports = Gauges;
