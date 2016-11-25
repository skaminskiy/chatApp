
const WebSocketServer = require('ws').Server;
// const redis = require("redis"); // [1]
// const redisSub = redis.createClient();
// const redisPub = redis.createClient();

const args = require('minimist')(process.argv.slice(2)); 
const zmq = require('zmq');

//static file server
const server = require('http').createServer(
	require('ecstatic')({root: `${__dirname}/www`})
);

const wss = new WebSocketServer({server: server});


const pubSocket = zmq.socket('pub'); //[2]
pubSocket.bind(`tcp://127.0.0.1:${args['pub']}`);
const subSocket = zmq.socket('sub'); //[3]
const subPorts = [].concat(args['sub']);
subPorts.forEach(p => {
	console.log(`Subscribing to ${p}`);
	subSocket.connect(`tcp://127.0.0.1:${p}`);
});
subSocket.subscribe('chat');

wss.on('connection', ws => {
	console.log('Client connected');
	ws.on('message', msg => { //[4]
		console.log(`Message: ${msg}`);
		broadcast(msg);
		pubSocket.send(`chat ${msg}`);
	});
});



subSocket.on('message', msg => { //[5]
	console.log(`From other server: ${msg}`);
	broadcast(msg.toString().split(' ')[1]);
});

// wss.on('connection', ws => {
// 	console.log('Client connected');
// 	ws.on('message', msg => {
// 		console.log(`Message: ${msg}`);
// 		redisPub.publish('chat_messages', msg); // [2]
// 	});
// });

// redisSub.subscribe('chat_messages'); // [3]
// redisSub.on('message', (channel, msg) => {
// 	wss.clients.forEach((client) => {
// 		client.send(msg);
// 	});
// });

// server.listen(process.argv[2] || 8080);

function broadcast(msg) { //[4]
	wss.clients.forEach(client => {
		client.send(msg);
	});
}

server.listen(args['http'] || 8080);

