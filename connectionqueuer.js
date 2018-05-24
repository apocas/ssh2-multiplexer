var  util = require('util'),
  events = require('events'),
  debug = require('debug')('queuer');

var ConnectionQueuer = function (connection) {
  this.connection = connection;
  this.queue = [];
  this.counter = process.env.SSH_CHANNELS || 8;

  this.running = false;
};

util.inherits(ConnectionQueuer, events.EventEmitter);

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
          self.counter--;
          self.connection.exec(saux.cmd, saux.options, function (err, stream) {
            //var closed = false;
            if (err) {
              if(!closed) self.counter++;
              closed = true;
              console.log("cq exec/err counter recovered to", self.counter);
            } else {
              /*
              stream.on('close', ()=>{
                if(!closed) self.counter++;
                closed = true;
                console.log("cq exec/close");
              });
              */
              stream.on('exit', function (code, signal) {
                self.counter++;
                //closed = true;
                console.log("cq exec/exit", code, signal,"counter recovered to", self.counter);
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

ConnectionQueuer.prototype.end = function () {
  this.stop();
  this.connection.end();
    
  //inform exec()s in queue that the connection is terminated.
  this.queue.forEach(function (saux) {
    if(saux.callback !== undefined) {
      saux.callback('connection closed');
    }
  });
};

ConnectionQueuer.prototype.exec = function (cmd, options, callback) {
  if (typeof options == 'function') {
    callback = options;
    options = {};
  }

  this.queue.push({cmd, options, callback});

  if (!this.running) {
    this.start();
  }
};

module.exports = ConnectionQueuer;
