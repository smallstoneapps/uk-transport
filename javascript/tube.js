/* exported Tube */

// The tests for this module can be found in [/javascript/test/tube.js](test/tube.html)

var Tube = function (options) {

  // These things are abstracted to make it easier to test.
  this.pebble = options.pebble;
  this.http = options.http;
  this.debug = options.debug;
  this.analytics = options.ga;
  this.version = options.version;

  this.pebble.addEventListener('ready', onPebbleReady.bind(this));

  function onPebbleReady(event) {
    if (! event.ready) {
      return;
    }
    if (this.debug) {
      console.log('UK Transport // ' + this.version + ' // Tube // Ready');
    }
    this.pebble.addEventListener('appmessage', onPebbleAppMessage.bind(this));
  }

  // Event handler for any messages coming from the watch.
  function onPebbleAppMessage(event) {
    var payload = event.payload;
    var group = payload.group.toLowerCase();
    // Only handle events that are for the Tube.
    if (group !== 'tube') {
      return;
    }
    if (this.debug) {
      console.log('UK Transport // Tube // Payload // ' + JSON.stringify(payload));
    }
    // Work out what operating is coming in, and handle it appropriately.
    var operation = payload.operation.toLowerCase();
    switch (operation) {
    // Right now we just have the one operation, so that's pretty simple.
    case 'update':
      opLineStatus.call(this, payload.data);
      break;
    }
  }

  function opLineStatus(data) {

    if (this.analytics) {
      this.analytics.trackEvent('tube', 'update');
    }

    // Query the wonderful tubeupdates.com API for the current status of
    // the London Underground.
    // var url = 'http://api.tubeupdates.com/?method=get.status&format=json';
    // var url = 'http://localhost:3000/pebble/tube/';
    var url = 'http://matthewtole.com/pebble/tube/';
    this.http.get(url, data, function (err, data) {

      // If there was an error, send an error code to the Pebble.
      if (err) {
        switch (err.message) {
        case 'NOT_CONNECTED':
          return this.pebble.sendAppMessage({
            group: 'ERROR',
            operation: 'HTTP',
            data: 'OFFLINE'
          });
        default:
          return this.pebble.sendAppMessage({
            group: 'ERROR',
            operation: 'HTTP',
            data: 'UNKNOWN'
          });
        }
      }

      // Ensure that the response is valid.
      if (! data || ! data.response || ! data.response.lines) {
        if (this.debug) {
          console.log('Response from tube update API was invalid.');
        }
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
      this.pebble.sendAppMessage({
        group: 'TUBE',
        operation: 'UPDATE',
        data: updateData.join('|')
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

// The order in which we display lines, and the status of those lines is
// determined by this array. The worse a status is, the lower the array index
// it has.
// The ordering of the items in the array was taken from TfL's guidelines.
Tube.StatusOrdering = [ 'Suspended', 'Part Suspended', 'Planned Closure',
  'Part Closure', 'Severe Delays', 'Reduced Service', 'Bus Service',
  'Minor Delays', 'Good Service' ];
