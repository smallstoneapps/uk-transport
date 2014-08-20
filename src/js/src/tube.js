/*

UK Transport v1.1

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

src/js/src/tube.js

*/

/* global Pebble */
/* global MessageQueue */
/* global http */
/* global Config */
/* exported Tube */

// The tests for this module can be found in [/src/js/tests/tube.js](test/tube.html)

var Tube = function (options) {
  this.pebble = options.pebble || Pebble;
  this.messageQueue = options.messageQueue || MessageQueue;
  this.http = options.http || http;

  this.debug = options.debug;
  this.version = options.version;
};

Tube.prototype._onPebbleAppMessage = function(event) {

  // Event handler for any messages coming from the watch.
  var payload = event.payload;
  var group = payload.group.toLowerCase();
  // Only handle events that are for the Tube.
  if (group !== 'tube') {
    return;
  }
  if (this.debug) {
    this.log('Payload', JSON.stringify(payload));
  }
  // Work out what operating is coming in, and handle it appropriately.
  var operation = payload.operation.toLowerCase();
  switch (operation) {
    case 'update':
      opLineStatus.call(this, payload.data);
      break;
    case 'details':
      opLineDetails.call(this, payload.data);
      break;
  }

  function opLineStatus(data) {

    this.http.get(Config.api.tube.status, data, function (err, data) {
      // If there was an error, send an error code to the Pebble.
      if (err) {
        switch (err.message) {
        case 'NOT_CONNECTED':
          this.messageQueue.sendAppMessage({ group: 'TUBE', operation: 'ERROR', data: 'OFFLINE' });
          return;
        default:
          this.messageQueue.sendAppMessage({ group: 'TUBE', operation: 'ERROR', data: 'HTTP_UNKNOWN' });
          return;
        }
      }
      // Ensure that the response is valid.
      if (! data || ! data.response || ! data.response.lines) {
        if (this.debug) {
          this.log('Response from tube update API was invalid.');
        }
        this.messageQueue.sendAppMessage({ group: 'TUBE', operation: 'ERROR', data: 'API_INVALID' });
        return;
      }
      // Take all the lines that are coming from the response, tidy them up,
      // filter out the duplicates and sort the statuses in order of severity.
      var lines = data.response.lines;
      lines = lines.map(function (line) {
        var betterLine = {
          name: line.name.replace('&amp;', '&'),
          statuses: line.status.split(',')
        };
        // A line is OK if the status is "Good Service";
        betterLine.ok = (betterLine.statuses[0] === 'good service');
        betterLine.statuses = betterLine.statuses.map(function (str) {
          return titleize(str.trim());
        });
        // Use the Tube.StatusOrdering array to order each line's statuses
        // into priority order, because on the Pebble's small screen,
        // only the first few will display.
        betterLine.statuses.sort(function (statusA, statusB) {
          var orderA = Tube.StatusOrdering.indexOf(statusA);
          var orderB = Tube.StatusOrdering.indexOf(statusB);
          return orderA < orderB ? -1 : (orderA > orderB ? 1 : 0);
        });
        return betterLine;
      });

      // Sort all the lines by severity, using the same ordering as above.
      lines.sort(function (lineA, lineB) {
        var weightA = statusWeight(lineA);
        var weightB = statusWeight(lineB);
        return weightA < weightB ? 1 : (weightA > weightB ? -1 : (lineA.name.localeCompare(lineB.name)));
      });

      lines = dedupeLines(lines);

      // Take the array of lines and build it into a single string, delimited
      // by the pipe (|) character. The first entry is the number of lines,
      // followed by line name and line status.
      var updateData = [ lines.length ];
      lines.forEach(function (line) {
        updateData.push(line.name);
        updateData.push(line.statuses.join(', '));
      });
      this.messageQueue.sendAppMessage({
        group: 'TUBE',
        operation: 'UPDATE',
        data: updateData.join('|')
      });

    }.bind(this));

  }

  function opLineDetails(data) {

    this.http.get(Config.api.tube.details, { line: data }, function (err, data) {
      // If there was an error, send an error code to the Pebble.
      if (err) {
        switch (err.message) {
        case 'NOT_CONNECTED':
          this.messageQueue.sendAppMessage({ group: 'TUBE', operation: 'ERROR', data: 'OFFLINE' });
          return;
        default:
          this.messageQueue.sendAppMessage({ group: 'TUBE', operation: 'ERROR', data: 'HTTP_UNKNOWN' });
          return;
        }
      }
      // Ensure that the response is valid.
      if (! data || ! data.response) {
        if (this.debug) {
          this.log('Response from tube update API was invalid.');
        }
        this.messageQueue.sendAppMessage({ group: 'TUBE', operation: 'ERROR', data: 'API_INVALID' });
        return;
      }
      this.messageQueue.sendAppMessage({
        group: 'TUBE',
        operation: 'DETAILS',
        data: data.response
      });
    }.bind(this));
  }

  // Calculate the weight of a line using the status and the StatusOrdering.
  // It uses a sum of power-of-two algorithm, sort of like using bitwise
  // calculations but lazier.
  function statusWeight(line) {
    return line.statuses.reduce(function (weight, status) {
      return weight + Math.pow(2, -1 * Tube.StatusOrdering.indexOf(status));
    }, 0);
  }

  // Takes a list of lines and returns a deduplicated copy of the list.
  // It assumes that two lines are the same if they have the same name.
  // It does nothing to combine or compare the rest of the properties of
  // duplicated lines.
  function dedupeLines(lines) {
    var dedupedLines = [];
    lines.forEach(function (line) {
      var existingLine = find(dedupedLines, function (innerLine) {
        return line.name === innerLine.name;
      });
      if (! existingLine) {
        dedupedLines.push(line);
      }
    });
    return dedupedLines;
  }

  // This function is ripped from underscore.string:
  // https://github.com/epeli/underscore.string
  function titleize(str) {
    if (str === null) {
      return '';
    }
    str  = String(str).toLowerCase();
    return str.replace(/(?:^|\s|-)\S/g, function (c) {
      return c.toUpperCase();
    });
  }

  function find(array, callback) {
    for (var i = 0; i < array.length; i += 1) {
      if (callback(array[i])) {
        return array[i];
      }
    }
    return undefined;
  }

};

Tube.prototype.log = function () {
  if (! this.debug) {
    return;
  }
  var pieces = [ 'UK Transport', this.version, 'Tube' ];
  pieces = pieces.concat(Array.prototype.slice.call(arguments));
  console.log(pieces.join(' // '));
};

Tube.prototype.init = function() {
  this.pebble.addEventListener('appmessage', this._onPebbleAppMessage.bind(this));
  this.log('Ready');
};

// The order in which we display lines, and the status of those lines is
// determined by this array. The worse a status is, the lower the array index
// it has.
// The ordering of the items in the array was taken from TfL's guidelines.
Tube.StatusOrdering = [ 'Suspended', 'Part Suspended', 'Planned Closure',
  'Part Closure', 'Severe Delays', 'Reduced Service', 'Bus Service',
  'Minor Delays', 'Good Service' ];

