# Supported Backends

StatsD supports pluggable backend modules that can publish statistics from the
local StatsD daemon to a backend service or data store. Backend services can
retain statistics in a time series data store, visualize statistics in graphs or
tables, or generate alerts based on defined thresholds. A backend can also
correlate statistics sent from StatsD daemons running across multiple hosts in
an infrastructure.

StatsD includes the following built-in backends:

* [Graphite][graphite] (`graphite`): An open-source
  time-series data store that provides visualization through a web-browser.

By default, the `graphite` backend will be loaded automatically. Multiple
backends can be run at once. To select which backends are loaded, set
the `backends` configuration variable to the list of backend modules to load.

Backends are just npm modules which implement the interface described in
section [Backend Interface](./backend_interface.md). In order to be able to load
the backend, add the module name into the `backends` variable in your config.
You can load one of the provided backends by giving the backend name
(e.g. `graphite`).

[graphite]: https://graphite.readthedocs.io/en/latest/
