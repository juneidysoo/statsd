const dgram = require('dgram');
const assert = require('assert');
const server = require('../src/server');

const msg = 'This is a test\r\n';

describe(__filename, () => {
	it('udp', done => {
		const s = server.start((data, rinfo) => {
			assert.equal(msg, data.toString());
			assert.equal(msg.length, rinfo.size);
			s.close();
			done();
		});

		const sock = dgram.createSocket('udp4');
		const buf = Buffer.from(msg);
		sock.send(
			buf,
			0,
			buf.length,
			8125,
			'127.0.0.1',
			() => sock.close()
		);
	});
});
