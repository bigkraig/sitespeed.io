/**
 * Sitespeed.io - How speedy is your site? (http://www.sitespeed.io)
 * Copyright (c) 2014, Peter Hedenskog, Tobias Lidskog
 * and other contributors
 * Released under the Apache 2.0 License
 */
'use strict';
var util = require('../util/util'),
  winston = require('winston'),
  net = require('net');

function OpenTSDBSender(host, port, config) {
  this.host = host;
  this.port = port;
  this.config = config;
  this.log = winston.loggers.get('sitespeed.io');
}

OpenTSDBSender.prototype.send = function(data, cb) {

  var self = this;

  this.log.verbose('Send the following keys to OpenTSDB:', data);

  var server = net.createConnection(this.port, this.host);
  server.addListener('error', function(connectionException) {
    self.log.log('error', 'Couldn\'t send data to OpenTSDB:' + connectionException + ' for host:' + self.host +
      ' port:' +
      self.port);
      cb();
  });

  server.on('connect', function() {
    self.log.log('info', 'Sending data to OpenTSDB host:' + self.host + ' port:' + self.port);
    this.write(data);
    this.write('\n\n');
    this.end();
    cb();
  });

};


module.exports = OpenTSDBSender;
