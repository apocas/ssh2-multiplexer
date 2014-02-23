var  sys = require('sys'),
  events = require('events');

var ConnectionQueuer = function (connection) {
  this.connection = connection;
  this.queue = [];
  this.counter = 0;

  this.running = false;
};

sys.inherits(ConnectionQueuer, events.EventEmitter);

ConnectionQueuer.prototype.start = function () {
  var self = this;
  if (!this.running) {
    this.running = true;
    this.interval = setInterval(function () {
      if(self.counter < (process.env.SSH_CHANNELS || 8)) {
        var saux = self.queue.shift();
        if (self.queue.length < 1) {
          self.stop();
        }
        if (saux !== undefined) {
          self.counter--;
          self.connection.exec(saux.cmd, function (err, stream) {
            if (err) {
              self.counter++;
            } else {
              stream.on('exit', function (code, signal) {
                stream.destroy();
                self.counter++;
              });
            }
            if (saux.callback !== undefined) {
              saux.callback(err, stream);
            }
          });
        }
      }
    }, 100);
  }
};

ConnectionQueuer.prototype.flush = function () {
  this.queue.length = 0;
};

ConnectionQueuer.prototype.stop = function () {
  this.running = false;
  clearInterval(this.interval);
};

ConnectionQueuer.prototype.exec = function (cmd, callback) {
  this.queue.push({'cmd': cmd, 'callback': callback});

  if (!this.running) {
    this.start();
  }
};

module.exports = ConnectionQueuer;