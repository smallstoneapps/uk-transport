var Train = (function () {

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
    console.log('UK Transport // Train // Payload // ' + JSON.stringify(payload));
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

  function opTrainStations(data) {

    navigator.geolocation.getCurrentPosition(locationCallback);

    function locationCallback(position) {
      var requestData = {
        lon: position.coords.longitude,
        lat: position.coords.latitude,
        page: 1,
        rpp: 10,
        api_key: Config.transportApi.api_key,
        app_id: Config.transportApi.app_id
      };
      superagent.get('http://transportapi.com/v3/uk/train/stations/near.json', requestData).end(requestCallback);
    }

    function requestCallback(response) {
      var stationData = JSON.parse(response.text);
      var stations = stationData.stations;
      var responseData = [];
      responseData.push(stations.length);
      stations.forEach(function (station) {
        responseData.push(station.station_code);
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
      api_key: Config.transportApi.api_key,
      app_id: Config.transportApi.app_id,
      limit: 10
    };
    superagent.get('http://transportapi.com/v3/uk/train/station/' + code + '/live.json', requestData).end(requestCallback);

    function requestCallback(response) {
      var departureData = JSON.parse(response.text);
      var departures = departureData.departures.all;
      var responseData = [];
      responseData.push(departures.length);
      departures.forEach(function (departure) {
        responseData.push(departure.destination_name);
        responseData.push(departure.expected_departure_time);
      });
      Pebble.sendAppMessage({ group: 'TRAIN', operation: 'DEPARTURES', data: responseData.join('|') },
        function ack(e) {
          console.log('ACK:' + JSON.stringify(e));
        },
        function nack(e) {
          console.log('NACK:' + JSON.stringify(e));
        }
      );
    }
  }

}());
