/**
 * Sitespeed.io - How speedy is your site? (http://www.sitespeed.io)
 * Copyright (c) 2014, Peter Hedenskog, Tobias Lidskog
 * and other contributors
 * Released under the Apache 2.0 License
 */
'use strict';
var OpenTSDBSender = require('../opentsdb/opentsdbSender'),
OpenTSDBCollector = require('../opentsdb/opentsdbCollector');

exports.task = function(result, config, cb) {
  if (config.opentsdbHost) {

    var sender = new OpenTSDBSender(config.opentsdbHost, config.opentsdbPort, config);
    var collector = new OpenTSDBCollector(config);

    var statistics = collector.collect(result.aggregates, result.pages, result.domains);
    sender.send(statistics, cb);
  } else {
    cb();
  }

};
