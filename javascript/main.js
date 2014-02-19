/* global Pebble */
/* global Config */
/* global http */
/* global PblAnalytics */
/* global Tube */
/* global Train */
/* global Bus */

(function () {

  var VERSION = '0.2.5';

  PblAnalytics.init({ uuid: '00e9deeb-16b4-4752-ae35-2cc088fc6ca9', version: VERSION });

  new Tube({
    pebble: Pebble,
    http: http,
    analytics: PblAnalytics,
    debug: true,
    version: VERSION
  });

  var train = new Train({
    pebble: Pebble,
    http: http,
    analytics: PblAnalytics,
    location: navigator.geolocation,
    debug: true,
    transportApi: Config.transportApi,
    version: VERSION
  });
  train.init();

  var bus = new Bus({
    pebble: Pebble,
    http: http,
    analytics: PblAnalytics,
    location: navigator.geolocation,
    debug: true,
    transportApi: Config.transportApi,
    version: VERSION
  });
  bus.init();

}());