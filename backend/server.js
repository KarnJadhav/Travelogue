
// Basic Express server setup
const app = require('./app');
const http = require('http');
const setupSocket = require('./socket/chat');

const PORT = process.env.PORT || 3001;
const server = http.createServer(app);
setupSocket(server);
server.listen(PORT, () => {
  console.log(`Server running with Socket.IO on port ${PORT}`);
});