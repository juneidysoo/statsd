const op = require('./opcode');

class Metric {
	constructor (key, val, ts) {
		this.key = key;
		this.value = val;
		this.ts = Math.round(ts / 1000);
	}

	toText () {
		return `${this.key} ${this.value} ${this.ts}`;
	}

	toPickle () {
		return [
			op.MARK + op.STRING + '\'' + this.key + '\'',
			op.MARK + op.LONG + this.ts + op.LONG,
			op.STRING + '\'' + this.value + '\'',
			op.TUPLE + op.TUPLE + op.APPEND
		].join('\n');
	}
}

module.exports = Metric;
