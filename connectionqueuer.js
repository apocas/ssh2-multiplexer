var  sys = require('sys'),
  events = require('events'),
  debug = require('debug')('queuer');

var ConnectionQueuer = function (connection) {
  this.connection = connection;
  this.queue = [];
  this.counter = process.env.SSH_CHANNELS || 8;

  this.running = false;
};

sys.inherits(ConnectionQueuer, events.EventEmitter);

ConnectionQueuer.prototype.start = function () {
  var self = this;
  if (!this.running) {
    this.running = true;
    this.interval = setInterval(function () {
      if(self.counter > 0) {
        var saux = self.queue.shift();
        if (self.queue.length < 1) {
          self.stop();
        }
        if (saux !== undefined) {

          var opts = saux.options;
          if (typeof opts == 'function') {
            saux.callback = opts;
            opts = {};
          }

          self.counter--;
          self.connection.exec(saux.cmd, opts, function (err, stream) {
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
      } else {
        debug('Queueing...'.yellow);
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

ConnectionQueuer.prototype.exec = function (cmd, opts, callback) {
  this.queue.push({'cmd': cmd, 'options': opts, 'callback': callback});

  if (!this.running) {
    this.start();
  }
};

module.exports = ConnectionQueuer;
