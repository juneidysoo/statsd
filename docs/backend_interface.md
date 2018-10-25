# Backend Interface

Backend modules are Node.js modules that listen for a number of events emitted
from StatsD. Each backend module should export the following initialization
function:

* `init(config, logger, events)`: This method is invoked from StatsD to
  initialize the backend module. It accepts three parameters:
  * `config` is the parsed config file hash
  * `logger` is StatsD's configured logger for backends to use.
  * `events` is the event emitter that backends can use to listen for events

  The backend module should return `true` from `init()` to indicate success.
  A return of `false` indicates a failure to load the module
  (missing configuration?) and will cause StatsD to exit if all backends failed
  to start.

Backends can listen for the following events emitted by StatsD from the `events`
object:

* Event: **'flush'**

  Parameters: `(ts, metrics)`

  Emitted on each flush interval so that backends can push aggregate metrics to
  their respective backend services. The event is passed two parameters:
  * `ts` is the current timestamp in milliseconds
  * `metrics` is a hash representing the StatsD statistics:

  ```
metrics: {
    counters: counters,
    gauges: gauges,
    timers: timers,
    sets: sets,
    counter_rates: counter_rates,
    timer_data: timer_data,
    statsd_metrics: statsd_metrics,
}
  ```

  The counter_rates and timer_data are precalculated statistics to simplify
  the creation of backends, the statsd_metrics hash contains metrics generated
  by statsd itself. Each backend module is passed the same set of statistics,
  so a backend module should treat the metrics as immutable structures. StatsD
  will reset timers and counters after each listener has handled the event.
