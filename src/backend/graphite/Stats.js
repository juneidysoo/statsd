const op = require('./opcode');
const Metric = require('./Metric');
/**
 * @class
 * Stores flattened metrics.
 */
class Stats {
	/**
	 * Initialise the stats.
	 * @param {Number} ts The timestamp.
	 * @param {String} globalSuffix
	 */
	constructor (ts, globalSuffix) {
		this.metrics = [];
		this.ts = ts;
		this.globalSuffix = globalSuffix;
	}

	/**
	 * Adds a metric entry.
	 * @param {String[]} key The array of directory level.
	 * @param {any} val
	 * @param {Number} [ts] Optional timestamp override.
	 */
	add (key, val, ts) {
		this.metrics.push(
			new Metric(
				key.join('.') + (this.globalSuffix ? `.${this.globalSuffix}` : ''),
				val,
				ts || this.ts
			)
		);
	}

	/**
	 * Serialise to text.
	 * @return {String}
	 */
	toText () {
		return this.metrics
		.map(m => m.toText())
		.join('\n') + '\n';
	}

	/**
	 * Serialise to pickle.
	 * @return {Buffer}
	 */
	toPickle () {
		const body = (
			op.MARK +
			op.LIST +
			this.metrics.map(v => v.toPickle()).join('') +
			op.STOP
		);

		// The first four bytes of the graphite pickle format
		// contain the length of the rest of the payload.
		// We use Buffer because this is binary data.
		const buf = Buffer.alloc(4 + body.length);

		buf.writeUInt32BE(body.length, 0);
		buf.write(body, 4);

		return buf;
	}
}

module.exports = Stats;
