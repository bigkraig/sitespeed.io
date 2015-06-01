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

function OpenTSDBCollector(config) {
  this.config = config;
  this.namespace = this.config.opentsdbNamespace;
  this.log = winston.loggers.get('sitespeed.io');
  this.timeStamp = Math.round(new Date().getTime() / 1000);
}

OpenTSDBCollector.prototype.collect = function(aggregates, pages, domains) {

  var config = this.config;
  var self = this;
  var statistics = '';
  pages.forEach(function(page) {
    statistics += self._getPageStats(page);
  });

  if (this.config.opentsdbData.indexOf('summary') > -1 || this.config.opentsdbData.indexOf(
      'all') > -1) {
    statistics += this._getSummaryStats(aggregates, config.urlObject.hostname, pages.length);
  }

  statistics += self._getDomainStats(domains, config.urlObject.hostname);

  return statistics;

};

OpenTSDBCollector.prototype._getPageStats = function(page) {

  var statistics = '';

  var urlKey = decodeURIComponent(page.url).replace(':', '');

  // lets collect the specific data per
  statistics += this._getRuleStats(page, urlKey);
  statistics += this._getBrowserTimeStats(page, urlKey);
  statistics += this._getPageMetricsStats(page, urlKey);
  // statistics += this._getGPSIStats(page, urlKey); untested
  // statistics += this._getWPTStats(page, urlKey); untested
  // statistics += this._getAssetsStats(page, urlKey); // this one doesnt make good metric data right now

  return statistics;

};

OpenTSDBCollector.prototype._getRuleStats = function(page, urlKey) {

  var statistics = '';
  var self = this;
  if (page.yslow && (this.config.opentsdbData.indexOf('rules') > -1 || this.config.opentsdbData.indexOf(
      'all') > -1)) {
    Object.keys(page.rules).forEach(function(rule) {
      statistics += util.opentsdbMetric(self.namespace + '.rules', self.timeStamp, page.rules[rule].v, 
        'rule=' + rule + ' ' +
        'url=' + urlKey);
    });
  }

  return statistics;
};

OpenTSDBCollector.prototype._getBrowserTimeStats = function(page, urlKey) {

  var statistics = '';
  var statsWeWillPush = ['min', 'median', 'p90', 'max'];
  var self = this;

  // the timings that are not browser specific
  if (this.config.opentsdbData.indexOf('timings') > -1 || this.config.opentsdbData.indexOf(
      'all') > -1) {

    // the types we have in our page object
    var types = ['timings', 'custom', 'extras'];

    types.forEach(function(type) {

      // check that we actually collect browser data
      if (page[type]) {
        Object.keys(page[type]).forEach(function(timing) {
          statsWeWillPush.forEach(function(val) {
            // is it a browser?
            if (self.config.supportedBrowsers.indexOf(timing) < 0) {
              statistics += util.opentsdbMetric(self.namespace + '.' + type, self.timeStamp, page[type][timing][val].v,
                'timing=' + timing + ' ' +
                'type=' + val + ' ' +
                'url=' + urlKey);
            }
          });
        });

        // and the browsers
        Object.keys(page[type]).forEach(function(browser) {
          if (self.config.supportedBrowsers.indexOf(browser) > -1) {
            Object.keys(page[type][browser]).forEach(function(timing) {
              statsWeWillPush.forEach(function(val) {
              statistics += util.opentsdbMetric(self.namespace + '.' + type, self.timeStamp, page[type][browser][timing][val].v,
                'timing=' + timing + ' ' +
                'browser=' + browser + ' ' +
                'type=' + val + ' ' +
                'url=' + urlKey);
              });
            });
          }
        });
      }
    });
  }


  return statistics;
};

OpenTSDBCollector.prototype._getPageMetricsStats = function(page, urlKey) {

  var statistics = '';
  var self = this;

  if (this.config.opentsdbData.indexOf('pagemetrics') > -1 || this.config.opentsdbData.indexOf(
      'all') > -1) {
    // and all the assets
    if (page.yslow) {
      Object.keys(page.yslow.assets).forEach(function(asset) {
        statistics += util.opentsdbMetric(self.namespace + '.assets', self.timeStamp, page.yslow.assets[asset].v,
          'asset=' + asset + ' ' + 
          'url=' + urlKey);
      });

      // and page specific
      statistics += util.opentsdbMetric(self.namespace + '.score', self.timeStamp, page.score, 'url=' + urlKey);
      statistics += util.opentsdbMetric(self.namespace + '.noRequests', self.timeStamp, page.yslow.requests.v, 'url=' + urlKey);
      statistics += util.opentsdbMetric(self.namespace + '.requestsMissingExpire', self.timeStamp, page.yslow.requestsMissingExpire.v, 'url=' + urlKey);
      statistics += util.opentsdbMetric(self.namespace + '.timeSinceLastModification', self.timeStamp, page.yslow.timeSinceLastModification.v, 'url=' + urlKey);
      statistics += util.opentsdbMetric(self.namespace + '.cacheTime', self.timeStamp, page.yslow.cacheTime.v, 'url=' + urlKey);
      statistics += util.opentsdbMetric(self.namespace + '.pageWeight', self.timeStamp, page.yslow.pageWeight.v, 'url=' + urlKey);
    }
  }

  return statistics;
};

OpenTSDBCollector.prototype._getGPSIStats = function(page, urlKey) {
  // add gspi score
  if (page.gpsi) {
    return this.namespace + '.' + urlKey + '.gpsi' + ' ' + page.gpsi.gscore.v + this.timeStamp;
  } else {
    return '';
  }
};

OpenTSDBCollector.prototype._getWPTStats = function(page, urlKey) {

  var statistics = '';
  var self = this;
  // add wpt data
  if (page.wpt) {
    Object.keys(page.wpt).forEach(function(location) {
      Object.keys(page.wpt[location]).forEach(function(browser) {
        Object.keys(page.wpt[location][browser]).forEach(function(connectivity) {
          Object.keys(page.wpt[location][browser][connectivity]).forEach(function(view) {
            Object.keys(page.wpt[location][browser][connectivity][view]).forEach(function(metric) {
              statistics += self.namespace + '.' + urlKey + '.wpt.' + location + '.' +
                connectivity + '.' + browser + '.' + view + '.' + metric + '.median ' +
                page.wpt[location][browser][connectivity][view][metric].v +
                self.timeStamp;
            });
          });
        });
      });
    });
  }

  return statistics;
};


OpenTSDBCollector.prototype._getAssetsStats = function(page, urlKey) {

  var stats = '';

  if (this.config.opentsdbData.indexOf('requests') > -1 || this.config.opentsdbData.indexOf(
      'all') > -1) {
    if (page.har) {

      var self = this;
      var timings = ['blocked', 'dns', 'connect', 'ssl', 'send', 'wait', 'receive'];
      page.har.forEach(function(har) {

        har.log.entries.forEach(function(entry) {

          var url = entry.request.url;

          try {
            url = decodeURIComponent(entry.request.url);
          } catch (error) {
            self.log.info('Couldn\'t decode URI:' + entry.request.url);
          }

          var assetURL = util.getGraphiteURLKey(url, '_');

          // remove the last ., we need to rewrite the logic for the
          // keys
          if(assetURL.substr(-1) === '.') {
            assetURL = assetURL.slice(0, -1);
          }

          // TODO when we get the HAR from WPT we should include the browser, location
          // & connectivity in the key

          // get the timestamp from the HAR when the action happend
          var timeStamp = Math.round(new Date(entry.startedDateTime).getTime() / 1000);
          var total = 0;
          if (entry.timings) {
            timings.forEach(function(timing) {
              total += entry.timings[timing];
              stats += util.opentsdbMetric(self.namespace + '.requests.timing', timeStamp, entry.timings[timing],
                'assetUrl=' + url + ' ' +
                'url=' + urlKey);
            });

            stats += util.opentsdbMetric(self.namespace + '.requests.timing.total', timeStamp, total,
              'assetUrl=' + url + ' ' +
              'url=' + urlKey);
          }
          // lets also add the size & type when we are here
          // we use the timestamp for the whole run to make sure
          // we only get one entry, this can and should be cleaned up later
          stats += util.opentsdbMetric(self.namespace + '.requests.type.' + util.getContentType(entry.response.content.mimeType) + '.size', self.timeStamp,
            entry.response.content.size,
            'assetUrl=' + url + ' ' +
            'url=' + urlKey);
        });

      });
    }
  }
  return stats;
};

OpenTSDBCollector.prototype._getDomainStats = function(domains, hostname) {

  var stats = '';
  if (domains) {

    var self = this;
    var timings = ['blocked', 'dns', 'connect', 'ssl', 'send', 'wait', 'receive', 'total'];
    var values = ['min', 'median', 'max'];


    domains.forEach(function(domain) {
      timings.forEach(function(timing) {
        values.forEach(function(value) {
          // TODO we should use the protovol also in the key right
          stats += util.opentsdbMetric(self.namespace + '.summary.domain.timing', self.timeStamp, util.getStatisticsObject(domain[timing].stats, 0)[value],
            'domain=' + domain.domain + ' ' +
            'host=' + hostname + ' ' +
            'type=' + timing + ' ' +
            'subtype=' + value);
        });
      });
      // and total time spent downloading
      stats += util.opentsdbMetric(self.namespace + '.summary.domain.accumulatedTime', self.timeStamp, domain.accumulatedTime,
        'domain=' + domain.domain + ' ' + 
        'host=' + hostname);

      // the number of requests
      stats += util.opentsdbMetric(self.namespace + '.summary.domain.requests', self.timeStamp, domain.count,
        'domain=' + domain.domain + ' ' + 
        'host=' + hostname);

      // and the size, we only have the size for requests in the first HAR right now
      if (domain.size) {
        Object.keys(domain.size).forEach(function(size) {
        stats += util.opentsdbMetric(self.namespace + '.summary.domain.size', self.timeStamp, domain.size[size],
          'domain=' + domain.domain + ' ' + 
          'host=' + hostname + ' ' + 
          'type=' + size);
        });
      }
    });
  }

  return stats;
};


OpenTSDBCollector.prototype._getSummaryStats = function(aggregates, hostname, noOfPages) {
  var statistics = '';
  var self = this;
  var values = ['min', 'p10', 'median', 'mean', 'p90', 'p99', 'max'];

  aggregates.forEach(function(aggregate) {
    values.forEach(function(value) {
      // special handling for WPT values for now
      if (aggregate.id.indexOf('WPT') > -1) {
        // FIXME: I don't know what WPT is, so I can't test if this is working
        statistics += util.opentsdbMetric(self.namespace + '.summary.' + aggregate.type, self.timeStamp, aggregate.stats[value],
          'host=' + hostname + ' ' + 
          'metric=' + 'wpt.' + aggregate.key + ' ' +
          'type=' + value);
      } else {
        statistics += util.opentsdbMetric(self.namespace + '.summary.' + aggregate.type, self.timeStamp, aggregate.stats[value],
          'host=' + hostname + ' ' + 
          'metric=' + aggregate.id + ' ' +
          'type=' + value);
      }
    });
  });

  // and add the number of runs
  statistics += util.opentsdbMetric(self.namespace + '.summary.runsPerBrowser', this.timeStamp, this.config.no,
    'host=' + hostname);

  // and number of tested pages per
  statistics += util.opentsdbMetric(this.namespace + '.summary.testPages', this.timeStamp, noOfPages,
    'host=' + hostname);

  return statistics;
};

module.exports = OpenTSDBCollector;
