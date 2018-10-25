# Supported Servers

StatsD supports pluggable server modules that listen for incoming metrics.

StatsD includes the following built-in servers:

* UDP (`udp`): Listens for metrics on a UDP port. One UDP packet contains at
  least one StatsD metric. Multiple metrics can be received in a single packet
  if separated by the \n character.
* TCP implementation is yet to be migrated.

By default, the `udp` server will be loaded automatically. Currently only a
single server can be run at once. To select which server is loaded, set the
`server` configuration variable to the server module to load.

Servers are just npm modules which implement the interface described in section
[Server Interface](./server_interface.md). In order to be able to load the
server, add the module name into the `server` variable in your config. You can
load one of the provided servers by giving the name (e.g. `udp`).
