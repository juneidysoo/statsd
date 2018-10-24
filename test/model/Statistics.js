const assert = require('assert');
const Statistics = require('../../src/model/Statistics');

describe(__filename, () => {
	const s = new Statistics();
	afterEach(() => s.reset());

	describe('Insert', () => {
		describe('Invalid', () => {
			it('No metrics field', () => {
				assert.ok(!s._insert('foo:bar'));
			});

			it('Wrong formatted metrics value', () => {
				assert.ok(!s._insert('foo:0,345345|ms'));
			});

			it('Wrong formatted sampling value', () => {
				assert.ok(!s._insert('foo:345345|ms|0,456456'));
			});

			it('Empty counter', () => {
				assert.ok(!s._insert('foo:|c'));
			});

			it('Negative timer', () => {
				assert.ok(!s._insert('foo:-1|ms'));
				assert.ok(!s._insert('foo:-1.0|ms'));
			});

			it('Empty gauge', () => {
				assert.ok(!s._insert('foo:|g'));
			});

			it('Invalid rate', () => {
				[
					'',
					'b',
					'blah',
					'@',
					'@blah',
					'@.',
					'@.1.',
					'@.1.2.2',
					'@-1.0'
				].forEach(rate => {
					assert.ok(!s._insert(`foo:345345|ms|${rate}`), rate);
				});
			});

			it('Increment bad lines', () => {
				s.insert('foo:bar');
				assert.equal(s.counters.get(s.internal.badLines), 1);
			});
		});

		describe('Valid', () => {
			it('Deltas & exponent count', () => {
				assert.ok(s._insert('foo:+10e1|c'));
				assert.equal(s.counters.get('foo'), 100);

				assert.ok(s._insert('foo:-10E1|c'));
				assert.equal(s.counters.get('foo'), 0);
			});

			it('Positive timer', () => {
				assert.ok(s._insert('foo:+1|ms'));
				assert.deepEqual(s.timers.get('foo'), [1]);

				assert.ok(s._insert('foo:1.0|ms'));
				assert.deepEqual(s.timers.get('foo'), [1, 1]);

				assert.ok(s._insert('foo:+1.0|ms'));
				assert.deepEqual(s.timers.get('foo'), [1, 1, 1]);
			});

			it('Zero timer', () => {
				assert.ok(s._insert('foo:+0.0|ms'));
				assert.deepEqual(s.timers.get('foo'), [0]);

				assert.ok(s._insert('foo:-0.0|ms'));
				assert.deepEqual(s.timers.get('foo'), [0, 0]);

				assert.ok(s._insert('foo:0.0|ms'));
				assert.deepEqual(s.timers.get('foo'), [0, 0, 0]);

				assert.ok(s._insert('foo:0|ms'));
				assert.deepEqual(s.timers.get('foo'), [0, 0, 0, 0]);
			});

			it('Deltas gauge', () => {
				assert.ok(s._insert('foo:10|g'));
				assert.equal(s.gauges.get('foo'), 10);

				assert.ok(s._insert('foo:+10|g'));
				assert.equal(s.gauges.get('foo'), 20);

				assert.ok(s._insert('foo:10.0|g'));
				assert.equal(s.gauges.get('foo'), 30);

				assert.ok(s._insert('foo:+10.0|g'));
				assert.equal(s.gauges.get('foo'), 40);

				assert.ok(s._insert('foo:-10|g'));
				assert.equal(s.gauges.get('foo'), 30);

				assert.ok(s._insert('foo:-10.0|g'));
				assert.equal(s.gauges.get('foo'), 20);
			});

			it('Sets', () => {
				['bar', '123456'].forEach(val => {
					assert.ok(s._insert(`foo:${val}|s`));
					assert.ok(s.sets.get('foo').has(val));
				});
			});

			it('Valid rate', () => {
				[
					'@2',
					'@.2',
					'@0.2',
					'@2e-1'
				].forEach(rate => {
					assert.ok(s._insert(`foo:345345|ms|${rate}`), rate);
				});
			});
		});
	});
});
