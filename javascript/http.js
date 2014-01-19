/* exported http */

var http = (function () {
  "use strict";

  return {
    get: get
  };

  function get(url, query, callback) {
    var req = new XMLHttpRequest();
    url += '?' + serialize(query);
    req.open('GET', url, true);
    req.setRequestHeader('Connection', 'close');
    req.onload = function () {
      if (req.readyState === 4 && req.status === 200) {
        if (req.status === 200) {
          var response = JSON.parse(req.responseText);
          return callback(null, response);
        }
      }
      else {
        return callback(new Error(req.status));
      }
    };
    req.send();

    function serialize(obj) {
      var str = [];
      for(var p in obj) {
        if (obj.hasOwnProperty(p)) {
          str.push(encodeURIComponent(p) + '=' + encodeURIComponent(obj[p]));
        }
      }
      return str.join('&');
    }
  }

}());
