/* global Pebble */
/* global Config */
/* global AppInfo */
/* global http */
/* global Analytics */
/* global Tube */
/* global Train */
/* global Bus */

(function () {

  var ga;

  Pebble.addEventListener('ready', function () {
    ga = new Analytics('UA-48246810-1', 'UK Transport', AppInfo.versionLabel);
    train.init();
    tube.init();
    bus.init();
  });

  /*Pebble.addEventListener('appmessage', function (event) {
    var payload = event.payload;
    var group = payload.group.toLowerCase();
  });*/

  var tube = new Tube({
    pebble: Pebble,
    http: http,
    ga: ga,
    debug: true,
    version: AppInfo.versionLabel
  });

  var train = new Train({
    pebble: Pebble,
    http: http,
    ga: ga,
    location: navigator.geolocation,
    debug: true,
    transportApi: Config.transportApi,
    version: AppInfo.versionLabel
  });

  var bus = new Bus({
    pebble: Pebble,
    http: http,
    ga: ga,
    location: navigator.geolocation,
    debug: true,
    transportApi: Config.transportApi,
    version: AppInfo.versionLabel
  });

}());