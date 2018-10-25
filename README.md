# StatsD [![Build Status][travisci-status]][travisci]
This is a fork of [Etsy's StatsD][base-statsd].

A network daemon that runs on the [Node.js][node] platform and
listens for statistics, like counters and timers, sent over [UDP][udp]
([TCP][tcp] coming soon!) and sends aggregates to one or more pluggable backend
services (e.g., [Graphite][graphite]

[Etsy][etsy] [blogged][blog post] about how it works and why they created it.

## Inspiration
StatsD was inspired (heavily) by the project (of the same name) at Flickr.
Here's a post where Cal Henderson described it in depth:
[Counting and timing][counting-timing]
Cal re-released the code: [Perl StatsD][Flicker-StatsD]

## Key Concepts
* *buckets*
  Each stat is in its own "bucket". They are not predefined anywhere. Buckets
can be named anything that will translate to Graphite (periods make folders,
etc)

* *values*
  Each stat will have a value. How it is interpreted depends on modifiers. In
general values should be integer.

* *flush*
  After the flush interval timeout (defined by `config.flushInterval`, default
  10 seconds), stats are aggregated and sent to an upstream backend service.


## Installation and Configuration
* Install node.js
* Clone the project
* Create a config file that conforms to the schema described in
	`schema/config.json`. Example config can be seen in `config.json`
* Start the Daemon:  
	`node stats.js /path/to/config.json`

## Usage
The basic line protocol expects metrics to be sent in the format:

    <metricname>:<value>|<type>[|@<rate>]

So the simplest way to send in metrics from your command line if you have
StatsD running with the default UDP server on localhost would be:

    echo "foo:1|c" | nc -u -w0 127.0.0.1 8125

## More Specific Topics
* [Metric Types][docs_metric_types]
* [Graphite Integration][docs_graphite]
* [Supported Servers][docs_server]
* [Supported Backends][docs_backend]
* [Server Interface][docs_server_interface]
* [Backend Interface][docs_backend_interface]

## Debugging
The only way to debug StatsD is through logs.

You can set different log levels as required through config file.

## Tests

This project uses [Mocha][mocha] as its test framework. Please add tests under
`test/` for any new features or bug fixes encountered. Testing a live server
can be tricky, attempts were made to eliminate race conditions but it may be
possible to encounter a stuck state.

Tests can be executed with `npm test`.

[travisci-status]: https://api.travis-ci.org/juneidysoo/statsd.svg?branch=master
[travisci]: https://travis-ci.org/juneidysoo/statsd
[base-statsd]: https://github.com/etsy/statsd/
[node]: http://nodejs.org
[udp]: http://en.wikipedia.org/wiki/User_Datagram_Protocol
[tcp]: http://en.wikipedia.org/wiki/Transmission_Control_Protocol
[graphite]: http://graphite.readthedocs.org/
[etsy]: http://www.etsy.com
[blog post]: http://codeascraft.etsy.com/2011/02/15/measure-anything-measure-everything/

[counting-timing]: http://code.flickr.com/blog/2008/10/27/counting-timing/
[Flicker-StatsD]: https://github.com/iamcal/Flickr-StatsD

[docs_metric_types]: ./docs/metric_types.md
[docs_graphite]: ./docs/graphite.md
[docs_server]: ./docs/server.md
[docs_backend]: ./docs/backend.md
[docs_server_interface]: ./docs/server_interface.md
[docs_backend_interface]: ./docs/backend_interface.md

[mocha]: https://mochajs.org/
