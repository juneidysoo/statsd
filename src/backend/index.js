const config = require('../config');
const logger = require('../logger').get('backend');
const code = require('../code');

const notFound = { init () {} };
/**
 * Try to load backend.
 */
function load (name) {
	let backend;
	try { backend = require(`./${name}`); } catch (e) {/*noop*/}
	if (!backend) {
		try { backend = require(name); } catch (e) {/*noop*/}
	}
	return backend || notFound;
}

module.exports = {
	/**
	 * Helper to load backend.
	 * @param {EventEmitter} events
	 */
	load: function startBackend (events) {
		const backends = config.get('backends');

		const results = backends.map(backend => {
			logger.trace('Loading %s backend', backend);
			const b = load(backend).init(config, logger, events);
			if (b) {
				logger.trace('Started %s backend', backend);
			} else {
				logger.error('Failed to load %s backend', backend);
			}
			return b;
		});

		if (results.every(b => !b)) {
			logger.fatal('Failed to load all backends');
			process.exit(code.BACKEND_LOAD_FAILED);
		}
	}
};
