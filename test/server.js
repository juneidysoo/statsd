const dgram = require('dgram');
const fs = require('fs');
const assert = require('assert');
const net = require('net');
const udp = require('../src/server/udp');
const tcp = require('../src/server/tcp');

const msg = 'This is a test\r\n';

describe(__filename, () => {
	const createConfig = config => ({ get: key => config[key] });

	const c = {
		port: 8125,
		address: '127.0.0.1'
	};

	it('udp', done => {
		const s = udp.start(createConfig(c), null, (data, rinfo) => {
			assert.equal(msg, data.toString());
			assert.equal(msg.length, rinfo.size);
			s.close(done);
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

	describe('tcp', () => {
		it('data received', done => {
			const s = tcp.start(createConfig(c), null, (data, rinfo) => {
				assert.equal(msg, data.toString());
				assert.equal(msg.length, rinfo.size);
				s.close(done);
			});

			const client = net.connect(c.port, c.address, () => {
				client.write(msg);
				client.end();
			});
		});

		it('data buffered', done => {
			const s = tcp.start(createConfig(c), null, (data, rinfo) => {
				assert.equal(msg, data.toString());
				assert.equal(msg.length, rinfo.size);
				s.close(done);
			});

			const client = net.connect(c.port, c.address, () => {
				client.setNoDelay(true);
				msg.split(' ').forEach(part => {
					client.write(part);
					client.write(' ');
				});
				client.end();
			});
		});

		it('socket', done => {
			const conf = Object.assign({ socket: '/tmp/statsd.socket' }, c);
			const s = tcp.start(createConfig(conf), null, (data, rinfo) => {
				assert.equal(msg, data.toString());
				assert.equal(msg.length, rinfo.size);
				fs.unlinkSync(conf.socket);
				s.close(done);
			});

			var client = net.connect(conf.socket, function () {
				client.write(msg);
				client.end();
			});
		});
	});
});
