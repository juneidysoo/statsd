/**
 * @class model.Sets
 * Maintain sets.
 */
class Sets {
	constructor () {
		/**
		 * Key-value pair that stores the set.
		 * @property {Object.<String, Set>} sets
		 */
		this.sets = {};
	}
	/**
	 * @inheritdoc model.Gauges#reset
	 */
	reset (key) {
		this.sets[key].clear();
	}
	/**
	 * @inheritdoc model.Gauges#init
	 */
	init (key) {
		if (!(this.sets[key] instanceof Set)) {
			this.sets[key] = new Set();
		}
	}
	/**
	 * Add item to set.
	 * @param {String} key
	 * @param {*} value
	 */
	add (key, val) {
		this.init(key);
		this.sets[key].add(val);
	}
	/**
	 * Clear the sets.
	 * @param {Boolean} del Whether to delete the sets.
	 */
	clear (del) {
		if (del) {
			for (const key in this.sets) {
				delete this.sets[key];
			}
		} else {
			for (const key in this.sets) {
				this.reset(key);
			}
		}
	}
	/**
	 * Get the value of specified key.
	 * @param {String} key
	 * @return {Set}
	 */
	get (key) {
		return this.sets[key];
	}
	/**
	 * Get raw sets.
	 * @return {Object.<String, Set>}
	 */
	raw () {
		return this.sets;
	}
}

module.exports = Sets;
