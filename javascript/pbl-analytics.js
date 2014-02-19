/**
  PblAnaylyics
  0.1.0
  http://analytics.pblweb.com
**/

/* global Pebble */
/* exported PblAnalytics */

var PblAnalytics = (function () {

  var uuid = null;
  var version = null;
  var sessionId = null;
  var pebbleId = null;
  var API_SERVER = 'http://analytics.pblweb.com';
  var STORAGE_KEY = 'pblweb-install-id';

  return {
    init: init,
    trackEvent: trackEvent
  };

  function init(options) {
    uuid = options.uuid;
    version = options.version;
    Pebble.addEventListener('ready', pebbleReady);
  }

  function trackEvent(name, data) {
    var eventData = {
      uuid: uuid,
      version: version,
      time: new Date(),
      name: name,
      data: data,
      sessionId: sessionId
    };
    var token = Pebble.getAccountToken();
    if (token && token.length) {
      eventData.userToken = token;
    }
    if (pebbleId) {
      eventData.pebbleId = pebbleId;
    }
    var installId = localStorage.getItem(STORAGE_KEY);
    if (installId && installId.length) {
      eventData.installId = installId;
    }
    apiPost('event.json', eventData, function (err) {
      if (err) {
        console.log('PblAnalytics Error: ' + err);
      }
    });
  }

  function pebbleReady(e) {
    var data = {
      uuid: uuid,
      version: version,
      time: new Date()
    };
    var ready = JSON.parse(e.ready);
    if (ready.pebblesReady) {
      data.pebbleId = ready.pebblesReady[0];
      pebbleId = data.pebbleId;
    }
    var token = Pebble.getAccountToken();
    if (token && token.length) {
      data.userToken = token;
    }
    var installId = localStorage.getItem(STORAGE_KEY);
    if (installId && installId.length) {
      data.installId = installId;
    }
    apiPost('hit.json', data, function (err, data) {
      if (data.installId) {
        localStorage.setItem(STORAGE_KEY, data.installId);
      }
      sessionId = data.sessionId;
    });
    console.log('PblWeb Analytics Started');
  }

  function apiPost(path, data, callback) {
    var req = new XMLHttpRequest();
    var dataJson = JSON.stringify(data);
    req.open('POST', API_SERVER + '/api/v1/' + path, true);
    req.setRequestHeader('Content-type', 'application/json');
    req.setRequestHeader('Content-length', dataJson.length);
    req.setRequestHeader('Connection', 'close');
    req.onload = function () {
      if (req.readyState === 4 && req.status === 200) {
        if (req.status === 200) {
          var response = JSON.parse(req.responseText);
          return callback(null, response);
        }
      }
      else {
        return callback(new Error('HTTP Status ' + req.status));
      }
    };
    req.send(JSON.stringify(data));
  }

}());