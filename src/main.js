require('./config'); // record startup time and load config
const statistics = require('./statistics');
const server = require('./server');
const backend = require('./backend');

// Initialise statistics and timer
statistics.init();
// Start server
server.start(statistics.getPacketHandler());
// Load backend
backend.load(statistics.getEventEmitter());
statistics.start();
