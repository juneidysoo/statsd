const net = require('net');

function parseRinfo (tcpStream, data) {
	return {
		address: tcpStream.remoteAddress,
		port: tcpStream.remotePort,
		family: tcpStream.address() ? tcpStream.address().family : 'IPv4',
		size: data.length
	};
}

module.exports = {
	start (config, logger, callback) {
		const server = net.createServer(stream => {
			stream.setEncoding('ascii');

			let buffer = '';
			stream.on('data', data => {
				buffer += data;
				const offset = buffer.lastIndexOf('\n');
				if (offset > -1) {
					const packet = buffer.slice(0, offset + 1);
					buffer = buffer.slice(offset + 1);
					callback(packet, parseRinfo(stream, packet));
				}
			});
		});

		server.listen(
			config.get('socket') || config.get('port'),
			config.get('address')
		);

		return server;
	}
};
