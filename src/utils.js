function isNumber (str) {
	return Boolean(str && !isNaN(str));
}

function isPositive (str) {
	return isNumber(str) && str[0] != '-';
}

function isValidSampleRate (str) {
	if (str.length > 1 && str[0] === '@') {
		return isPositive(str.substring(1));
	}
	return false;
}

function isValidPacket (fields) {
	const [val, type, rate] = fields;
	// test for existing metrics type
	if (type === undefined) {
		return false;
	}

	// filter out malformed sample rates
	if (rate !== undefined) {
		if (!isValidSampleRate(rate)) {
			return false;
		}
	}

	// filter out invalid metrics values
	switch (type) {
	case 's':
		return true;
	case 'ms':
		return isPositive(val);
	case 'g':
	default:
		return isNumber(val);
	}
}

module.exports = {
	/**
	 * Test function to filter out malformed packets
	 * @param {String[]} fields Array of packet data (e.g. ['100', 'ms', '@0.1'])
	 * @return {Boolean} Returns true for a valid packet and false otherwise.
	 */
	isValidPacket
};
