var level = require('level');
var timestamp = require('monotonic-timestamp');
var JSONStream = require('JSONStream');
var db = level('./msgHistory');
var amqp = require('amqplib');

require('http').createServer(function(req, res) {
  res.writeHead(200);
  db.createValueStream()
    .pipe(JSONStream.stringify())
    .pipe(res);
}).listen(8090);

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
    return channel.assertQueue('chat_history');
  })
  .then(function(q) {
    queue = q.queue;
    return channel.bindQueue(queue, 'chat');
  })
  .then(function() {
    return channel.consume(queue, function(msg) {
      var content = msg.content.toString(); 
      console.log('Saving message: ' + content); 
      db.put(timestamp(), content, function(err) {
        if(!err) channel.ack(msg);
      });
    });
  })
  .catch(function(err) {
    console.log(err);
  });
  


// const level = require('level');
// const timestamp = require('monotonic-timestamp');
// const JSONStream = require('JSONStream');
// const amqp = require('amqplib');
// const db = level('./msgHistory');

// require('http').createServer((req, res) => {
// 	res.writeHead(200);
// 	db.createValueStream()
// 		.pipe(JSONStream.stringify())
// 		.pipe(res);
// }).listen(8090);


// let channel, queue;

// amqp
// 	.connect('amqp://localhost') // [1]
// 	.then(conn => conn.createChannel())
// 	.then(ch => {
// 		channel = ch;
// 		return channel.assertExchange('chat', 'fanout'); // [2]
// 	})
// 	.then(() => channel.assertQueue('chat_history')) // [3]
// 	.then((q) => {
// 		queue = q.queue;
// 		return channel.bindQueue(queue, 'chat'); // [4]
// 	})
// 	.then(() => {
// 		return channel.consume(queue, msg => { // [5]
// 		const content = msg.content.toString();
// 		console.log(`Saving message: ${content}`);
// 		db.put(timestamp(), content, err => {
// 			if (!err) channel.ack(msg);
// 		});
// 	});
// })
// .catch(err => console.log(err));