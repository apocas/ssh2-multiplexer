ssh2-multiplexer
================

* Uses ssh2 module's connections.

* Allows to enqueue/backpressure/multiplex'ish the available SSH channels in order to send a larger number of commands.

* Check the examples.

* More about ssh channels limit: http://pedromadias.wordpress.com/2013/06/03/ssh-connections-channel-limit-and-node-js/


### Example

``` js
var Connection = require('ssh2'),
  ConnectionQueuer = require('ssh2-multiplexer'),

var conn = new Connection();
//...
var queuer = new ConnectionQueuer(conn);
queuer.exec('uptime', function(err, stream) {
  if (err) throw err;
  stream.on('data', function(data, extended) {
    console.log((extended === 'stderr' ? 'STDERR: ' : 'STDOUT: ') + data);
  });
  stream.on('end', function() {
    console.log('Stream :: EOF');
  });
  stream.on('close', function() {
    console.log('Stream :: close');
  });
  stream.on('exit', function(code, signal) {
    console.log('Stream :: exit :: code: ' + code + ', signal: ' + signal);
  });
});
```

### Complete example

``` js
var Connection = require('ssh2');
var ConnectionQueuer = require('ssh2-multiplexer');

var c = new Connection();
var queuer = new ConnectionQueuer(c);

c.on('ready', function() {
  console.log('Connection :: ready');

  for (var i = 50; i >= 0; i--) {
    //if you use 'c' instead of 'queuer' in this exec, it will crash due to channel limit. Openssh allows 8 channels by default.
    queuer.exec('uptime', function(err, stream) {
      if (err) throw err;
      stream.on('data', function(data, extended) {
        console.log((extended === 'stderr' ? 'STDERR: ' : 'STDOUT: ') + data);
      });
      stream.on('end', function() {
        console.log('Stream :: EOF');
      });
      stream.on('close', function() {
        console.log('Stream :: close');
      });
      stream.on('exit', function(code, signal) {
        console.log('Stream :: exit :: code: ' + code + ', signal: ' + signal);
      });
    });
  }
});

c.on('error', function(err) {
  console.log('Connection :: error :: ' + err);
});
c.on('end', function() {
  console.log('Connection :: end');
});
c.on('close', function(had_error) {
  console.log('Connection :: close');
});

c.connect({
  host: '127.0.0.1',
  port: 22,
  username: 'root',
  passphrase: 'passphrase',
  privateKey: require('fs').readFileSync(process.env.HOME + '/.ssh/id_rsa')
});
```

