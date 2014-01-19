/* global http */
/* global Config */
/* global PblAnalytics */
/* exported Bus */

var Bus = (function () {
  "use strict";

  Pebble.addEventListener('ready', pebbleReady);

  function pebbleReady(e) {
    if (! e.ready) {
      return;
    }
    if (Config.debug) {
      console.log('UK Transport // Bus // Ready');
    }
    Pebble.addEventListener('appmessage', pebbleAppMessage);
  }

  function pebbleAppMessage(e) {
    var payload = e.payload;
    var group = payload.group.toLowerCase();
    if (group !== 'bus') {
      return;
    }
    if (Config.debug) {
      console.log('UK Transport // Bus // Payload // ' + JSON.stringify(payload));
    }
    var operation = payload.operation.toLowerCase();
    switch (operation) {
      case 'stops':
        opBusStops(e.payload.data);
        break;
      case 'departures':
        opBusDepartures(e.payload.data);
        break;
    }
  }

  function opBusStops() {

    PblAnalytics.trackEvent('bus-stops');

    navigator.geolocation.getCurrentPosition(locationCallback);

    function locationCallback(position) {
      var requestData = {
        lon: position.coords.longitude,
        lat: position.coords.latitude,
        page: 1,
        rpp: 10,
        /*jshint -W106*/
        api_key: Config.transportApi.apiKey,
        app_id: Config.transportApi.appId
        /*jshint +W106*/
      };
      http.get('http://transportapi.com/v3/uk/bus/stops/near.json', requestData, requestCallback);
    }

    function requestCallback(err, data) {
      if (err) {
        return console.log(err);
      }
      if (! data) {
        return console.log(new Error('Lack of data!'));
      }
      var stops = data.stops;
      var responseData = [];
      responseData.push(stops.length);
      stops.forEach(function (stop) {
        responseData.push(stop.atcocode);
        responseData.push(stop.name);
        responseData.push(stop.indicator);
      });
      Pebble.sendAppMessage({ group: 'BUS', operation: 'STOPS', data: responseData.join('|') });
    }
  }

  function opBusDepartures(data) {
    PblAnalytics.trackEvent('bus-depatures', { stop: data });

    var code = data;
    var requestData = {
      /*jshint -W106*/
      api_key: Config.transportApi.apiKey,
      app_id: Config.transportApi.appId,
      /*jshint +W106*/
      group: 'no'
    };
    http.get('http://transportapi.com/v3/uk/bus/stop/' + code + '/live.json', requestData, requestCallback);

    function requestCallback(err, data) {
      var departures = data.departures.all;
      var responseData = [];
      responseData.push(departures.length);
      departures.forEach(function (departure) {
        responseData.push(departure.line);
        responseData.push(departure.direction);
        /*jshint -W106*/
        responseData.push(departure.best_departure_estimate);
        /*jshint +W106*/
      });
      Pebble.sendAppMessage({ group: 'BUS', operation: 'DEPARTURES', data: responseData.join('|') });
    }
  }


}());
