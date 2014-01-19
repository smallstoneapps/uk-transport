/* global http */
/* exported Tube */

var Tube = (function () {
  "use strict";

  var StatusOrdering = [ 'Suspended', 'Part Suspended', 'Planned Closure',
    'Part Closure', 'Severe Delays', 'Reduced Service', 'Bus Service',
    'Minor Delays', 'Good Service' ];

  Pebble.addEventListener('ready', pebbleReady);

  function pebbleReady(e) {
    if (! e.ready) {
      return;
    }
    console.log('UK Transport // Tube // Ready');
    Pebble.addEventListener('appmessage', pebbleAppMessage);
  }

  function pebbleAppMessage(e) {
    var payload = e.payload;
    var group = payload.group.toLowerCase();
    if (group !== 'tube') {
      return;
    }
    console.log('UK Transport // Tube // Payload // ' + JSON.stringify(payload));
    var operation = payload.operation.toLowerCase();
    switch (operation) {
    case 'update':
      opLineStatus(e.payload.data);
      break;
    }
  }

  function opLineStatus(data) {
    http.get('http://api.tubeupdates.com/?method=get.status&format=json', data, function (err, data) {
      if (! data || ! data.response || ! data.response.lines) {
        console.log('Response from tube update API was invalid.');
        return;
      }
      var updateData = [];
      var lines = data.response.lines;
      lines = lines.map(function (line) {
        var betterLine = {
          name: line.name.replace('&amp;', '&'),
          statuses: line.status.split(',')
        };
        betterLine.ok = (betterLine.statuses[0] === 'good service') ? true : false;
        betterLine.statuses = betterLine.statuses.map(function (str) {
          return titleize(str.trim());
        });
        betterLine.statuses.sort(function (statusA, statusB) {
          var orderA = StatusOrdering.indexOf(statusA);
          var orderB = StatusOrdering.indexOf(statusB);
          return orderA < orderB ? -1 : (orderA > orderB ? 1 : 0);
        });
        return betterLine;
      });

      lines.sort(function (lineA, lineB) {
        var weightA = statusWeight(lineA);
        var weightB = statusWeight(lineB);
        return weightA < weightB ? 1 : (weightA > weightB ? -1 : 0);
      });

      updateData.push(lines.length);
      lines.forEach(function (line) {
        updateData.push(line.name);
        updateData.push(line.statuses.join(', '));
      });

      Pebble.sendAppMessage({ group: 'TUBE', operation: 'UPDATE', data: updateData.join('|') },
        function ack(e) {
          console.log('ACK:' + JSON.stringify(e));
        },
        function nack(e) {
          console.log('NACK:' + JSON.stringify(e));
        }
      );
    });
  }

  function statusWeight(line) {
    return line.statuses.reduce(function (weight, status) {
      return status + Math.pow(2, 8 - StatusOrdering.indexOf(status));
    }, 0);
  }

  function titleize(str) {
    if (str === null) {
      return '';
    }
    str  = String(str).toLowerCase();
    return str.replace(/(?:^|\s|-)\S/g, function (c) { return c.toUpperCase(); });
  }


}());
