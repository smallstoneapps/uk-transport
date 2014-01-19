/* global http */
/* global Config */
/* exported Train */

var Train = (function () {
  "use strict";

  Pebble.addEventListener('ready', pebbleReady);

  function pebbleReady(e) {
    if (! e.ready) {
      return;
    }
    console.log('UK Transport // Train // Ready');
    Pebble.addEventListener('appmessage', pebbleAppMessage);
  }

  function pebbleAppMessage(e) {
    var payload = e.payload;
    var group = payload.group.toLowerCase();
    if (group !== 'train') {
      return;
    }
    if (Config.debug) {
      console.log('UK Transport // Train // Payload // ' + JSON.stringify(payload));
    }
    var operation = payload.operation.toLowerCase();
    switch (operation) {
    case 'stations':
      opTrainStations(e.payload.data);
      break;
    case 'departures':
      opTrainDepartures(e.payload.data);
      break;
    }
  }

  function opTrainStations() {

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
      http.get('http://transportapi.com/v3/uk/train/stations/near.json', requestData, requestCallback);
    }

    function requestCallback(err, data) {
      var stations = data.stations;
      var responseData = [];
      responseData.push(stations.length);
      stations.forEach(function (station) {
        /*jshint -W106*/
        responseData.push(station.station_code);
        /*jshint +W106*/
        responseData.push(station.name);
      });
      Pebble.sendAppMessage({ group: 'TRAIN', operation: 'STATIONS', data: responseData.join('|') },
        function ack(e) {
          console.log('ACK:' + JSON.stringify(e));
        },
        function nack(e) {
          console.log('NACK:' + JSON.stringify(e));
        }
      );
    }
  }

  function opTrainDepartures(data) {
    var code = data;
    var requestData = {
      /*jshint -W106*/
      api_key: Config.transportApi.apiKey,
      app_id: Config.transportApi.appId,
      /*jshint +W106*/
      limit: 10
    };
    http.get('http://transportapi.com/v3/uk/train/station/' + code + '/live.json', requestData, function (err, data) {
      var departures = data.departures.all;
      var responseData = [];
      responseData.push(departures.length);
      departures.forEach(function (departure) {
        /*jshint -W106*/
        responseData.push(departure.destination_name);
        responseData.push(departure.expected_departure_time);
        /*jshint +W106*/
      });
      Pebble.sendAppMessage({ group: 'TRAIN', operation: 'DEPARTURES', data: responseData.join('|') },
        function ack(e) {
          console.log('ACK:' + JSON.stringify(e));
        },
        function nack(e) {
          console.log('NACK:' + JSON.stringify(e));
        }
      );
    });
  }

}());
