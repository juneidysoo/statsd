const config = require('../config');
const logger = require('../logger').get('server');
const code = require('../code');

const notFound = { start () {} };
/**
 * Try to load server.
 */
function load (name) {
	let server;
	try { server = require(`./${name}`); } catch (e) {/*noop*/}
	if (!server) {
		try { server = require(name); } catch (e) {/*noop*/}
	}
	return server || notFound;
}

module.exports = {
	/**
	 * Helper to start server.
	 * @param {Function} callback
	 */
	start (callback) {
		const server = config.get('server');
		logger.trace('Loading %s server', server);
		const s = load(server).start(config, logger, callback);
		if (!s) {
			logger.fatal('Failed to load %s server', server);
			process.exit(code.SERVER_START_FAILED);
		}
		logger.trace('Started %s server', server);
		return s;
	}
};
