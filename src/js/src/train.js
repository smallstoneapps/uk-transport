/* exported Train */

var Train = function (options) {
  this.pebble = options.pebble;
  this.http = options.http;
  this.debug = options.debug;
  this.location = options.location;
  this.analytics = options.ga;
  this.transportApi = options.transportApi;
  this.version = options.version;

  this.onPebbleAppMessage = function (event) {
    var payload = event.payload;
    var group = payload.group.toLowerCase();
    if (group !== 'train') {
      return;
    }
    if (this.debug) {
      console.log('UK Transport // Train // Payload // ' + JSON.stringify(payload));
    }
    var operation = payload.operation.toLowerCase();
    switch (operation) {
      case 'stations':
        opTrainStations.call(this, payload.data);
        break;
      case 'departures':
        opTrainDepartures.call(this, payload.data);
        break;
    }
  };

  function opTrainStations() {

    if (this.analytics) {
      this.analytics.trackEvent('train', 'stations');
    }

    var timeLocation = new Date();
    var timeLookup = null;

    var locationOptions = {
      enableHighAccuracy: false,
      timeout: 5 * 1000,
      maximumAge: 60 * 1000
    };
    this.location.getCurrentPosition(locationCallback.bind(this), locationError.bind(this), locationOptions);

    function locationCallback(position) {
      logTimeElapsed.call(this, timeLocation, 'Getting location took %TIME%.');
      var requestData = {
        lon: position.coords.longitude,
        lat: position.coords.latitude,
        page: 1,
        rpp: 10,
        /*jshint -W106*/
        api_key: this.transportApi.apiKey,
        app_id: this.transportApi.appId
        /*jshint +W106*/
      };
      timeLookup = new Date();
      this.http.get('http://transportapi.com/v3/uk/train/stations/near.json', requestData, requestCallback.bind(this));
    }

    function locationError() {
      logTimeElapsed.call(this, timeLocation, 'Failing to get location took %TIME%.');
      this.pebble.sendAppMessage({ group: 'ERROR', operation: 'LOCATION', data: 'Location access disabled.' });
    }

    function requestCallback(err, data) {
      logTimeElapsed.call(this, timeLookup, 'Finding nearest stations took %TIME%.');
      var stations = data.stations;
      var responseData = [];
      responseData.push(stations.length);
      stations.forEach(function (station) {
        /*jshint -W106*/
        responseData.push(station.station_code);
        /*jshint +W106*/
        responseData.push(station.name);
      });
      this.pebble.sendAppMessage({ group: 'TRAIN', operation: 'STATIONS', data: responseData.join('|') });
    }
  }

  function opTrainDepartures(data) {
    if (this.analytics) {
      this.analytics.trackEvent('train', 'departures-' + data);
    }
    var code = data;
    var requestData = {
      /*jshint -W106*/
      api_key: this.transportApi.apiKey,
      app_id: this.transportApi.appId,
      /*jshint +W106*/
      limit: 10
    };
    this.http.get('http://transportapi.com/v3/uk/train/station/' + code + '/live.json', requestData, function (err, data) {
      if (err) {
        switch (err.message) {
        case 'NOT_CONNECTED':
          this.pebble.sendAppMessage({ group: 'ERROR', operation: 'HTTP', data: 'Not online.' });
          return;
        default:
          this.pebble.sendAppMessage({ group: 'ERROR', operation: 'HTTP', data: 'Unknown error.' });
          return;
        }
      }
      var departures = data.departures.all;
      var responseData = [];
      responseData.push(departures.length);
      departures.forEach(function (departure) {
        /*jshint -W106*/
        responseData.push(departure.destination_name);
        responseData.push(departure.expected_departure_time);
        /*jshint +W106*/
      });
      this.pebble.sendAppMessage({ group: 'TRAIN', operation: 'DEPARTURES', data: responseData.join('|') });
    }.bind(this));
  }

  function logTimeElapsed(start, message) {
    var now = new Date();
    var totalMs = now.getTime() - start.getTime();
    if (this.debug) {
      console.log(message.replace('%TIME%', totalMs + 'ms'));
    }
  }

};

Train.prototype.init = function() {
  this.pebble.addEventListener('appmessage', this.onPebbleAppMessage.bind(this));
};
