/* exported Bus */

var Bus = function (options) {
  this.pebble = options.pebble;
  this.http = options.http;
  this.debug = options.debug;
  this.location = options.location;
  this.analytics = options.analytics || null;
  this.transportApi = options.transportApi;

  this.onPebbleReady = function (event) {
    if (! event.ready) {
      return;
    }
    if (this.debug) {
      console.log('UK Transport // ' + this.version + ' // Bus // Ready');
    }
    this.pebble.addEventListener('appmessage', pebbleAppMessage.bind(this));
  };

  function pebbleAppMessage(event) {
    var payload = event.payload;
    var group = payload.group.toLowerCase();
    if (group !== 'bus') {
      return;
    }
    if (this.debug) {
      console.log('UK Transport // Bus // Payload // ' + JSON.stringify(payload));
    }
    var operation = payload.operation.toLowerCase();
    switch (operation) {
    case 'stops':
      opBusStops.call(this, payload.data);
      break;
    case 'departures':
      opBusDepartures.call(this, payload.data);
      break;
    }
  }

  function opBusStops() {

    if (this.analytics) {
      this.analytics.trackEvent('bus-stops');
    }

    this.location.getCurrentPosition(locationCallback.bind(this), locationError.bind(this));

    function locationCallback(position) {
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
      this.http.get('http://transportapi.com/v3/uk/bus/stops/near.json', requestData, requestCallback.bind(this));
    }

    function locationError(err) {
      console.log(err);
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
      this.pebble.sendAppMessage({ group: 'BUS', operation: 'STOPS', data: responseData.join('|') });
    }
  }

  function opBusDepartures(data) {
    if (this.analytics) {
      this.analytics.trackEvent('bus-depatures', { stop: data });
    }

    var code = data;
    var requestData = {
      /*jshint -W106*/
      api_key: this.transportApi.apiKey,
      app_id: this.transportApi.appId,
      /*jshint +W106*/
      group: 'no'
    };
    this.http.get('http://transportapi.com/v3/uk/bus/stop/' + code + '/live.json', requestData, requestCallback.bind(this));

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
      this.pebble.sendAppMessage({ group: 'BUS', operation: 'DEPARTURES', data: responseData.join('|') });
    }
  }

};

Bus.prototype.init = function() {
  this.pebble.addEventListener('ready', this.onPebbleReady.bind(this));
};
