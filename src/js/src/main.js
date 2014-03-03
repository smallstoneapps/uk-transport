/* global Pebble */
/* global Config */
/* global http */
/* global Analytics */
/* global Tube */
/* global Train */
/* global Bus */

(function () {

  var VERSION = '0.2.6';

  var ga = new Analytics('UA-48246810-1', 'UK Transport', VERSION);

  new Tube({
    pebble: Pebble,
    http: http,
    ga: ga,
    debug: true,
    version: VERSION
  });

  var train = new Train({
    pebble: Pebble,
    http: http,
    ga: ga,
    location: navigator.geolocation,
    debug: true,
    transportApi: Config.transportApi,
    version: VERSION
  });
  train.init();

  var bus = new Bus({
    pebble: Pebble,
    http: http,
    ga: ga,
    location: navigator.geolocation,
    debug: true,
    transportApi: Config.transportApi,
    version: VERSION
  });
  bus.init();

}());