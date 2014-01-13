var Bus = (function () {

  Pebble.addEventListener('ready', pebbleReady);

  function pebbleReady(e) {
    if (! e.ready) {
      return;
    }
    console.log('UK Transport // Bus // Ready');
    Pebble.addEventListener('appmessage', pebbleAppMessage);
  }

  function pebbleAppMessage(e) {
    var payload = e.payload;
    var group = payload.group.toLowerCase();
    if (group !== 'bus') {
      return;
    }
    console.log('UK Transport // Bus // Payload // ' + JSON.stringify(payload));
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

  function opBusStops(data) {

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
      superagent.get('http://transportapi.com/v3/uk/bus/stops/near.json', requestData).end(requestCallback);
    }

    function requestCallback(response) {
      var stopData = JSON.parse(response.text);
      var stops = stopData.stops;
      var responseData = [];
      responseData.push(stops.length);
      stops.forEach(function (stop) {
        responseData.push(stop.atcocode);
        responseData.push(stop.name);
        responseData.push(stop.indicator);
      });
      Pebble.sendAppMessage({ group: 'BUS', operation: 'STOPS', data: responseData.join('|') },
        function ack(e) {
          console.log('ACK:' + JSON.stringify(e));
        },
        function nack(e) {
          console.log('NACK:' + JSON.stringify(e));
        }
      );
    }
  }

  function opBusDepartures(data) {
    var code = data;
    var requestData = {
      api_key: Config.transportApi.api_key,
      app_id: Config.transportApi.app_id,
      group: 'no'
    };
    superagent.get('http://transportapi.com/v3/uk/bus/stop/' + code + '/live.json', requestData).end(requestCallback);

    function requestCallback(response) {
      var departureData = JSON.parse(response.text);
      var departures = departureData.departures.all;
      var responseData = [];
      responseData.push(departures.length);
      departures.forEach(function (departure) {
        responseData.push(departure.line);
        responseData.push(departure.direction);
        responseData.push(departure.best_departure_estimate);
      });
      Pebble.sendAppMessage({ group: 'BUS', operation: 'DEPARTURES', data: responseData.join('|') },
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
