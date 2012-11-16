/**
 * donkey notify server entry
 */
var express = require('express'), sio = require('socket.io');
var noticeHandler = require('./notice_handlers');
var http = require('http');

var app = express();
app.use(express.bodyParser());

var server = http.createServer(app);

var io = sio.listen(server);

io.set('log level', 1);

server.listen(80, "192.168.1.110");

var rootPath = '/donkey_notify';

/**
 * detect if server is alive
 */
app.get(rootPath + '/alive', function(request, response) {
    response.send('ok');
});

/**
 * notify by post
 */
app.post(rootPath + '/notify', function(request, response) {
	console.log('-------------------------------------------');
	console.log("## post notify");
	noticeHandler.onPostNotify(request, response);
});

/**
 * socket io operations
 */
io.sockets.on('connection', function(socket) {

	socket.on('subscribe', function(data, fn) {
		// do subscribe
		console.log('-------------------------------------------');
		console.log("## subscribe");
		noticeHandler.onSubscribe(socket, data, fn);
		
	});

	socket.on('notify', function(data, fn) {
		// do notify
		console.log('-------------------------------------------');
		console.log("## socket notify");
		
		noticeHandler.onSocketNotify(socket, data, fn);
		
	});
	
	socket.on('getall', function(data, fn) {
		// do getall
		console.log('-------------------------------------------');
		console.log("## getall");
		noticeHandler.onGetAll(socket, data, fn);
	});

	socket.on('disconnect', function() {
		console.log('-------------------------------------------');
		console.log("## disconnect");
		noticeHandler.onDisconnect(socket);
		
	});

});
