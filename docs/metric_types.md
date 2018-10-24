# StatsD Metric Types

## Counting

    gorets:1|c

This is a simple counter. Add 1 to the "gorets" bucket.
At each flush the current count is sent and reset to 0.
If the count at flush is 0 then you can opt to send no metric at all for
this counter, by setting `config.deleteCounters`.
StatsD will send both the rate as well as the count at each flush.

### Sampling

    gorets:1|c|@0.1

Tells StatsD that this counter is being sent sampled every 1/10th of the time.

## Timing

    glork:320|ms|@0.1

The glork took 320ms to complete this time. StatsD figures out percentiles,
average (mean), standard deviation, sum, lower and upper bounds for the flush
interval.

If the count at flush is 0 then you can opt to send no metric at all for this
timer, by setting `config.deleteTimers`.

### To be migrated: Percentile threshold
The original [StatsD][base-statsd] have percentile threshold feature that is yet
to be migrated to this project.

### To be migrated: Histogram
The original [StatsD][base-statsd] have histogram feature that is yet to be
migrated to this project.

StatsD also maintains a counter for each timer metric. The 3rd field
specifies the sample rate for this counter (in this example @0.1). The field
is optional and defaults to 1.

## Gauges
StatsD now also supports gauges, arbitrary values, which can be recorded.

    gaugor:333|g

If the gauge is not updated at the next flush, it will send the previous value.
You can opt to send no metric at all for this gauge, by setting
`config.deleteGauges`.

Adding a sign to the gauge value will change the value, rather than setting it.

    gaugor:-10|g
    gaugor:+4|g

So if `gaugor` was `333`, those commands would set it to `333 - 10 + 4`, or
`327`.

Note:

This implies you can't explicitly set a gauge to a negative number
without first setting it to zero.

## Sets
StatsD supports counting unique occurences of events between flushes, using a
`Set` to store all occuring events.

    uniques:765|s

If the count at flush is 0 then you can opt to send no metric at all for this
set, by setting `config.deleteSets`.

## Multi-Metric Packets
StatsD supports receiving multiple metrics in a single packet by separating them
with a newline.

    gorets:1|c\nglork:320|ms\ngaugor:333|g\nuniques:765|s

Be careful to keep the total length of the payload within your network's MTU.
There is no single good value to use, but here are some guidelines for common
network scenarios:

* Fast Ethernet (1432) - This is most likely for Intranets.
* Gigabit Ethernet (8932) - Jumbo frames can make use of this feature much more
  efficient.
* Commodity Internet (512) - If you are routing over the internet a value in this
  range will be reasonable. You might be able to go higher, but you are at the
  mercy of all the hops in your route.

*(These payload numbers take into account the maximum IP + UDP header sizes)*

[base-statsd]: https://github.com/etsy/statsd/
