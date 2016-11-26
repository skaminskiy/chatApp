
var WebSocketServer = require('ws').Server;
var amqp = require('amqplib');
var JSONStream = require('JSONStream');
var httpPort = process.argv[2] || 8080;
var request = require('request');

//static file server 
var server = require('http').createServer( 
  require('ecstatic')({root: __dirname + '/www'}) 
);

var channel, queue;
amqp
  .connect('amqp://localhost')
  .then(function(conn) {
    return conn.createChannel();
  })
  .then(function(ch) {
    channel = ch;
    return channel.assertExchange('chat', 'fanout');
  })
  .then(function() {
    return channel.assertQueue('chat_srv_'+httpPort, {exclusive: true});
  })
  .then(function(q) {
    queue = q.queue;
    return channel.bindQueue(queue, 'chat');
  })
  .then(function() {
    return channel.consume(queue, function(msg) {
      msg = msg.content.toString();
      console.log('From queue: ' + msg);
      broadcast(msg);
    }, {noAck: true});
  })
  .catch(function(err) {
    console.log(err);
  });

var wss = new WebSocketServer({server: server}); 
wss.on('connection', function(ws) { 
  console.log('Client connected');
  //query the history service
  request('http://localhost:8090')
    .on('error', function(err) {
      console.log(err);
    })
    .pipe(JSONStream.parse('*'))
    .on('data', function(msg) {
      ws.send(msg);
    });
    
  ws.on('message', function(msg) { 
    console.log('Message: ' + msg);
    channel.publish('chat', '', new Buffer(msg));
  }); 
}); 

function broadcast(msg) {
  wss.clients.forEach(function(client) { 
    client.send(msg); 
  }); 
}

server.listen(httpPort);

// const WebSocketServer = require('ws').Server;

// const args = require('minimist')(process.argv.slice(2)); 
// const zmq = require('zmq');

// //static file server
// const server = require('http').createServer(
// 	require('ecstatic')({root: `${__dirname}/www`})
// );

// const wss = new WebSocketServer({server: server});


// const pubSocket = zmq.socket('pub'); //[2]
// pubSocket.bind(`tcp://127.0.0.1:${args['pub']}`);
// const subSocket = zmq.socket('sub'); //[3]
// const subPorts = [].concat(args['sub']);
// subPorts.forEach(p => {
// 	console.log(`Subscribing to ${p}`);
// 	subSocket.connect(`tcp://127.0.0.1:${p}`);
// });
// subSocket.subscribe('chat');

// wss.on('connection', ws => {
// 	console.log('Client connected');
// 	ws.on('message', msg => { //[4]
// 		console.log(`Message: ${msg}`);
// 		broadcast(msg);
// 		pubSocket.send(`chat ${msg}`);
// 	});
// });

// subSocket.on('message', msg => { //[5]
// 	console.log(`From other server: ${msg}`);
// 	broadcast(msg.toString().split(' ')[1]);
// });

// function broadcast(msg) { //[4]
// 	wss.clients.forEach(client => {
// 		client.send(msg);
// 	});
// }

// server.listen(args['http'] || 8080);

