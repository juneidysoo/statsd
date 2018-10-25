# Server Interface

Server modules are Node.js modules that receive metrics for StatsD.
Each server module should export the following initialization function:

* `start(config, logger, callback)`: This method is invoked from StatsD to
  initialize and start the server module listening for metrics. It accepts three
  parameters:
  * `config` is the parsed config file hash
  * `logger` is StatsD's configured logger for backends to use.
  * `callback` is a function to call with metrics data when it's available

  The callback function accepts two parameters: `packet` contains one or more
  metrics separated by the `\n` character, and `rinfo` contains remote address
  information.

  The server module should return `true` from start() to indicate success.
  A return of `false` indicates a failure to load the module
  (missing configuration?) and will cause StatsD to exit.
