/*

UK Transport v1.6

http://matthewtole.com/pebble/uk-transport/

----------------------

The MIT License (MIT)

Copyright © 2013 - 2014 Matthew Tole

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

--------------------

src/js/src/bus.js

*/

/* global Pebble */
/* global MessageQueue */
/* global http */
/* exported Bus */

var Bus = function (options) {
  this.pebble = options.pebble || Pebble;
  this.messageQueue = options.messageQueue || MessageQueue;
  this.http = options.http || http;
  this.location = options.location || navigator.geolocation;

  this.debug = options.debug;
  this.keen = options.keen;
  this.version = options.version;
  this.api = options.api;

  this.pebbleAppMessage = function(event) {
    var payload = event.payload;
    var group = payload.group.toLowerCase();
    if (group !== 'bus') {
      return;
    }
    this.log('Payload', JSON.stringify(payload));
    var operation = payload.operation.toLowerCase();
    switch (operation) {
    case 'stops':
      opBusStops.call(this, payload.data);
      break;
    case 'departures':
      opBusDepartures.call(this, payload.data);
      break;
    }
  };

  function opBusStops() {

    var timeLocation = new Date();
    var timeLookup = null;

    this.location.getCurrentPosition(locationCallback.bind(this), locationError.bind(this));

    function locationCallback(position) {
      trackTimeTaken.call(this, timeLocation, 'bus.location');
      logTimeElapsed.call(this, timeLocation, 'Getting location took %TIME%.');
      var requestData = {
        lon: position.coords.longitude,
        lat: position.coords.latitude
      };
      timeLookup = new Date();
      this.http.get(this.api.stops, requestData, requestCallback.bind(this));
    }

    function locationError(err) {
      console.log(err);
      trackTimeTaken.call(this, timeLocation, 'bus.location.error');
      logTimeElapsed.call(this, timeLocation, 'Failing to get location took %TIME%.');
    }

    function requestCallback(err, data) {
      if (err) {
        // TODO
        return console.log(err);
      }
      trackTimeTaken.call(this, timeLookup, 'bus.stops');
      logTimeElapsed.call(this, timeLookup, 'Finding nearest stops took %TIME%.');
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
      this.messageQueue.sendAppMessage({ group: 'BUS', operation: 'STOPS', data: responseData.join('|') });
    }
  }

  function opBusDepartures(data) {
    var code = data;
    var requestData = {
      stop: code
    };
    this.http.get(this.api.departures, requestData, requestCallback.bind(this));

    function requestCallback(err, data) {
      if (err) {
        return console.log(err);
      }
      if (!data) {
        return console.log(new Error("Lack of data!"));
      }
      var departures = data.departures.all;
      var responseData = [];
      responseData.push(departures.length);
      departures.forEach(function (departure) {
        responseData.push(departure.line);
        responseData.push(departure.direction);
        /*jshint -W106*/
        var hasEstimate = departure.best_departure_estimate && departure.best_departure_estimate.length;
        responseData.push(hasEstimate ? departure.best_departure_estimate : departure.aimed_departure_time);
        /*jshint +W106*/
      });
      this.messageQueue.sendAppMessage({ group: 'BUS', operation: 'DEPARTURES', data: responseData.join('|') });
    }
  }

  function logTimeElapsed(start, message) {
    var now = new Date();
    var totalMs = now.getTime() - start.getTime();
    this.log(message.replace('%TIME%', totalMs + 'ms'));
  }

  function trackTimeTaken(start, event) {
    var now = new Date();
    if (this.keen) {
      this.keen.sendEvent('time.taken', { event: event, msTaken: now.getTime() - start.getTime() });
    }
  }

};

Bus.prototype.log = function () {
  if (! this.debug) {
    return;
  }
  var pieces = [ 'UK Transport', this.version, 'Bus' ];
  pieces = pieces.concat(Array.prototype.slice.call(arguments));
  console.log(pieces.join(' // '));
};

Bus.prototype.init = function() {
  this.pebble.addEventListener('appmessage', this.pebbleAppMessage.bind(this));
  this.log('Ready');
};
