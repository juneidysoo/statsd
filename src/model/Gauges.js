/**
 * @class model.Gauges
 * Maintain gauges.
 */
class Gauges {
	constructor () {
		/**
		 * Key-value pair that stores the gauge.
		 * @property {Object.<String, Number>} gauges
		 */
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
	 * @param {String} key
	 */
	init (key) {
		if (typeof this.gauges[key] !== 'number') {
			this.reset(key);
		}
	}
	/**
	 * Update gauge.
	 * @param {String} key
	 * @param {Number} val
	 */
	gauge (key, val) {
		this.init(key);
		this.gauges[key] += val;
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
	 * @return {Number}
	 */
	get (key) {
		return this.gauges[key];
	}
}

module.exports = Gauges;
