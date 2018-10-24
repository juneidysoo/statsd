const assert = require('assert');
const net = require('net');
const dgram = require('dgram');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync, spawn } = require('child_process');

const rimraf = require('rimraf');

describe(__filename, () => {
	let server, sock, statsd, tmpdir, finished;
	const port = 31337;
	const flushInterval = 200;

	const setup = config => {
		before(() => {
			finished = false;
			server = net.createServer();
			server.listen(port);

			sock = dgram.createSocket('udp4');

			tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), 'graphite-'));

			const cFile = path.join(tmpdir, 'test.config.json');

			fs.writeFileSync(cFile, JSON.stringify(config));

			statsd = spawn('node', ['src/main.js', cFile]);

			statsd.on('exit', code => {
				if (!finished) {
					console.error(
						'Node statsd unexpectedly quit with code: %d',
						code
					);
					process.exit(code);
				}
			});

			statsd.stderr.on('data', data => {
				console.error(data.toString().replace(/\n$/, ''));
			});
		});

		after(done => {
			finished = true;
			server.close();
			sock.close();
			rimraf.sync(tmpdir);
			statsd.kill();
			statsd.once('exit', () => done());
		});
	};

	const onceConnection = () => new Promise(resolve => {
		server.once('connection', c => resolve(c));
	});

	const send = data => new Promise((resolve, reject) => {
		sock.send(data, 8125, 'localhost', (err, res) => {
			if (err) reject(err);
			else resolve(res);
		});
	});

	const check = (e, key, val) => {
		assert.ok(
			e.some(e => e[0] === key && e[1] == val),
			`No key with name ${key} has value ${val}`
		);
	};

	const rate = val => val / (flushInterval / 1000);

	const defKey = 'testkey';

	describe('Text', () => {
		const receive = c => new Promise(resolve => {
			const body = [];
			c.on('data', d => body.push(d));
			c.on('end', () => {
				resolve(body.join('').split('\n').map(x => x.split(' ')));
			});
		});

		const collect = () => {
			const timeout = flushInterval * 2;
			const received = [];
			let timedOut = false;
			let inFlight = 0;

			return new Promise(resolve => {
				const collector = c => {
					inFlight++;
					receive(c)
					.then(e => {
						received.push(...e);
						inFlight--;
						if (inFlight < 1 && timedOut) {
							server.removeListener('request', collector);
							resolve(received);
						}
					});
				};

				setTimeout(
					() => {
						timedOut = true;
						if (inFlight < 1) {
							server.removeListener('connection', collector);
							resolve(received);
						}
					},
					timeout
				);

				server.on('connection', collector);
			});
		};

		describe('Default', () => {
			const config = {
				backends: ['graphite'],
				flushInterval,
				graphite: { port }
			};

			setup(config);

			it('Normal', () => {
				return onceConnection()
				.then(receive)
				.then(e=> {
					check(e, 'stats.statsd.numStats', 3);
				});
			});

			it('Malformed', () => {
				return onceConnection()
				.then(() => send('a_bad_test_value|z'))
				.then(collect)
				.then(e => {
					check(e, 'stats.statsd.numStats', 4);
					check(e, 'stats.counters.statsd.bad_lines_seen.count', 1);
				});
			});

			it('Timers', () => {
				const val = 100;
				return onceConnection()
				.then(() => send(`${defKey}:${val}|ms`))
				.then(collect)
				.then(e => {
					check(e, 'stats.statsd.numStats', 5);
					check(e, `stats.timers.${defKey}.count_ps`, 5);
					check(e, `stats.timers.${defKey}.count`, 1);
				});
			});

			it('Sampled timers', () => {
				const val = 100;
				return onceConnection()
				.then(() => send(`${defKey}:${val}|ms|@0.1`))
				.then(collect)
				.then(e => {
					check(e, `stats.timers.${defKey}.count_ps`, 50);
					check(e, `stats.timers.${defKey}.count`, 10);
				});
			});

			it('Counts', () => {
				const val = 100;
				return onceConnection()
				.then(() => send(`${defKey}:${val}|c`))
				.then(collect)
				.then(e => {
					check(e, 'stats.statsd.numStats', 5);
					check(e, `stats.counters.${defKey}.rate`, rate(val));
					check(e, `stats.counters.${defKey}.count`, val);
				});
			});

			it('Gauges', () => {
				const val = 70;
				return onceConnection()
				.then(() => send(`${defKey}:${val}|g`))
				.then(collect)
				.then(e => {
					check(e, `stats.gauges.${defKey}`, val);
				});
			});

			it('Gauges delta', () => {
				const val = 50;
				const d = -3;
				return onceConnection()
				.then(() => send(`${defKey}:${val}|g`))
				.then(() => send(`${defKey}:${d}|g`))
				.then(collect)
				.then(e => {
					check(e, `stats.gauges.${defKey}`, val + d);
				});
			});

			it('Name sanitised', () => {
				return onceConnection()
				.then(() => send('fo/o:250|c'))
				.then(() => send('b ar:250|c'))
				.then(() => send('foo+bar:250|c'))
				.then(collect)
				.then(e => {
					check(e, 'stats.counters.fo-o.count', 250);
					check(e, 'stats.counters.b_ar.count', 250);
					check(e, 'stats.counters.foobar.count', 250);
				});
			});
		});

		describe('Stats prefix', () => {
			const config = {
				backends: ['graphite'],
				flushInterval,
				prefixStats: 'statsprefix',
				graphite: {
					port
				}
			};

			setup(config);

			it('Normal', () => {
				return onceConnection()
				.then(receive)
				.then(e => {
					check(e, `stats.${config.prefixStats}.numStats`, 3);
				});
			});

			it('Timers', () => {
				const val = 100;
				return onceConnection()
				.then(() => send(`${defKey}:${val}|ms`))
				.then(collect)
				.then(e => {
					check(e, `stats.${config.prefixStats}.numStats`, 5);
					check(e, `stats.timers.${defKey}.mean`, val);
				});
			});

			it('Counters', () => {
				const val = 100;
				return onceConnection()
				.then(() => send(`${defKey}:${val}|c`))
				.then(collect)
				.then(e => {
					check(e, `stats.${config.prefixStats}.numStats`, 5);
					check(e, `stats.counters.${defKey}.rate`, rate(val));
					check(e, `stats.counters.${defKey}.count`, val);
				});
			});
		});

		describe('Stats suffix', () => {
			const globalSuffix = 'statssuffix';
			const config = {
				backends: ['graphite'],
				flushInterval,
				graphite: {
					port,
					globalSuffix
				}
			};

			setup(config);

			it('Normal', () => {
				return onceConnection()
				.then(receive)
				.then(e => {
					check(e, `stats.statsd.numStats.${globalSuffix}`, 3);
				});
			});

			it('Malformed', () => {
				return onceConnection()
				.then(() => send('a_bad_test_value|z'))
				.then(collect)
				.then(e => {
					check(e, `stats.statsd.numStats.${globalSuffix}`, 4);
					check(
						e,
						`stats.counters.statsd.bad_lines_seen.count.${globalSuffix}`,
						1
					);
				});
			});

			it('Timers', () => {
				const val = 100;
				return onceConnection()
				.then(() => send(`${defKey}:${val}|ms`))
				.then(collect)
				.then(e => {
					check(e, `stats.statsd.numStats.${globalSuffix}`, 5);
					check(e, `stats.timers.${defKey}.mean.${globalSuffix}`, val);
				});
			});

			it('Counters', () => {
				const val = 100;
				return onceConnection()
				.then(() => send(`${defKey}:${val}|c`))
				.then(collect)
				.then(e => {
					check(e, `stats.statsd.numStats.${globalSuffix}`, 5);
					check(
						e,
						`stats.counters.${defKey}.rate.${globalSuffix}`,
						rate(val)
					);
					check(e, `stats.counters.${defKey}.count.${globalSuffix}`, val);
				});
			});
		});
	});

	describe('Pickle', () => {
		const config = {
			backends: ['graphite'],
			flushInterval,
			graphite: {
				picklePort: port,
				protocol: 'pickle'
			}
		};

		setup(config);

		const collect = () => {
			const timeout = flushInterval * 2;
			const received = [];
			let timedOut = false;
			let inFlight = 0;

			return new Promise(resolve => {
				const collector = c => {
					inFlight++;

					c.on('data', d => received.push(d));
					c.on('end', () => {
						inFlight--;
						if (inFlight < 1 && timedOut) {
							server.removeListener('request', collector);
							resolve(Buffer.concat(received));
						}
					});
				};

				setTimeout(
					() => {
						timedOut = true;
						if (inFlight < 1) {
							server.removeListener('connection', collector);
							resolve(Buffer.concat(received));
						}
					},
					timeout
				);

				server.on('connection', collector);
			});
		};

		it('Timer', () => {
			const val = 100;
			return onceConnection()
			.then(() => send(`${defKey}:${val}|ms`))
			.then(collect)
			.then(buf => {
				assert.ok(buf.length > 0, 'Should receive some data');

				const pFile = path.join(tmpdir, 'pickle');
				const pyFile = path.join(__dirname, 'unpickle.py');
				fs.writeFileSync(pFile, buf);
				const entries = JSON.parse(execSync(`python ${pyFile} ${pFile}`));
				entries.forEach(e => { e[1] = e[1][1]; });
				return entries;
			})
			.then(e => {
				check(e, 'stats.statsd.numStats', 5);
				check(e, `stats.timers.${defKey}.count_ps`, 5);
				check(e, `stats.timers.${defKey}.count`, 1);
			});
		});
	});
});
