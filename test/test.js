var expect = require('chai').expect;

var Connection = require('ssh2');
var ConnectionQueuer = require('../connectionqueuer.js');
var testLimit = 50;

describe("#exec", function() {
  it("should execute x times", function(done) {
    var c = new Connection();
    var queuer = new ConnectionQueuer(c);
    var testCount = 0;

    c.on('ready', function() {
      console.log('Connection :: ready');

      for (var i = testLimit; i > 0; i--) {
        queuer.exec('sleep 1; uptime;', function(err, stream) {
          if (err) throw err;
          stream.on('data', function(data, extended) {
            console.log((extended === 'stderr' ? 'STDERR: ' : 'STDOUT: ') + data);
          });
          stream.on('exit', function(code, signal) {
            console.log('Stream :: exit :: code: ' + code + ', signal: ' + signal);
            testCount++;
            if(testCount == testLimit) {
              expect(testCount).to.equal(testLimit);
              done();
            }
          });
        });
      }
    });

    c.connect({
      host: '127.0.0.1',
      port: 22,
      username: 'root',
      passphrase: 'passphrase',
      privateKey: require('fs').readFileSync(process.env.HOME + '/.ssh/id_rsa')
    });
  });
});
