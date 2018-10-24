const assert = require('assert');
const statistics = require('../src/statistics');

describe(__filename, () => {
	statistics.init();
	const { stats } = statistics;
	const originalFlushInterval = statistics.flushInterval;
	before(() => {
		statistics.flushInterval = 100;
	});
	after(() => {
		statistics.flushInterval = originalFlushInterval;
	});
	afterEach(() => {
		stats.reset();
	});
	describe('Aggregate', () => {
		it('Counter', () => {
			stats._insert('foo:2|c');
			const m = statistics.aggregate();
			assert.equal(m.counters.foo, 2);
		});
		it('Counter rate', () => {
			stats._insert('foo:2|c');
			const m = statistics.aggregate();
			assert.equal(m.counter_rates.foo, 20);
		});
		it('Empty timers', () => {
			stats.timers.init('foo');
			const m = statistics.aggregate();
			assert.equal(m.counter_rates['foo'], void 0);
		});
		it('Single time', () => {
			stats._insert('foo:100|ms');
			const m = statistics.aggregate();
			assert.deepEqual(
				m.timer_data.foo,
				{
					std: 0,
					upper: 100,
					lower: 100,
					count: 1,
					count_ps: 10,
					sum: 100,
					sum_squares: Math.pow(100, 2),
					mean: 100,
					median: 100
				}
			);
		});
		it('Multiple times', () => {
			const values = [100, 200, 300];
			values.forEach(val => stats._insert(`foo:${val}|ms`));
			const m = statistics.aggregate();
			assert.deepEqual(
				m.timer_data.foo,
				{
					std: 81.64965809277261,
					upper: 300,
					lower: 100,
					count: 3,
					count_ps: 30,
					sum: 600,
					sum_squares: values.reduce(
						(acc, val) => acc + Math.pow(val, 2),
						0
					),
					mean: 200,
					median: 200
				}
			);
		});
	});
});
