var http = function() {
    return {
        get: get,
        post: post
    };
    function get(url, query, callback) {
        var req = new XMLHttpRequest();
        url += "?" + serialize(query);
        req.open("GET", url, true);
        req.setRequestHeader("Connection", "close");
        req.setRequestHeader("X-Pebble-ID", Pebble.getAccountToken());
        req.onload = function() {
            if (req.readyState === 4 && req.status === 200) {
                if (req.status === 200) {
                    var response = JSON.parse(req.responseText);
                    return callback(null, response);
                }
            } else {
                return callback(new Error(req.status));
            }
        };
        req.onerror = function() {
            switch (req.status) {
              case 0:
                return callback(new Error("NOT_CONNECTED"));

              case 404:
                return callback(new Error("NOT_FOUND"));

              default:
                return callback(new Error("UNKNOWN_ERROR_" + req.status));
            }
        };
        req.send();
        function serialize(obj) {
            var str = [];
            for (var p in obj) {
                if (obj.hasOwnProperty(p)) {
                    str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
                }
            }
            return str.join("&");
        }
    }
    function post(url, body, callback) {
        var req = new XMLHttpRequest();
        req.open("POST", url, true);
        req.setRequestHeader("Connection", "close");
        req.setRequestHeader("Content-Type", "application/json");
        req.setRequestHeader("X-Pebble-ID", Pebble.getAccountToken());
        req.onload = function() {
            if ([ 200, 201 ].indexOf(req.status) !== -1) {
                var response = JSON.parse(req.responseText);
                return callback(null, response);
            } else {
                return callback(new Error(req.status), req.responseText);
            }
        };
        req.onerror = function() {
            switch (req.status) {
              case 0:
                return callback(new Error("NOT_CONNECTED"));

              case 404:
                return callback(new Error("NOT_FOUND"));

              default:
                return callback(new Error("UNKNOWN_ERROR_" + req.status));
            }
        };
        req.send(body);
    }
}();

var Keen = function() {
    var _http = null;
    var _pebble = null;
    var _config = null;
    var _appinfo = null;
    return {
        init: init,
        sendEvent: sendEvent
    };
    function init(http, Pebble, config, appinfo) {
        _http = http;
        _pebble = Pebble;
        _config = config;
        _appinfo = appinfo;
    }
    function sendEvent(name, data) {
        data.app = {
            name: _appinfo.shortName,
            version: _appinfo.versionLabel,
            uuid: _appinfo.uuid
        };
        data.user = {
            accountToken: _pebble.getAccountToken()
        };
        var url = "https://api.keen.io/3.0/projects/" + _config.projectId + "/events/" + name + "?api_key=" + _config.writeKey;
        _http.post(url, JSON.stringify(data), function(err, response) {
            if (err) {}
            if (!response.created) {}
        });
    }
}();

var Analytics = function(analyticsId, appName, appVersion) {
    this.analyticsId = analyticsId;
    this.appName = appName;
    this.appVersion = appVersion;
    this.analyticsUserId = Pebble.getAccountToken();
};

Analytics.prototype._trackGA = function(type, params) {
    var req = new XMLHttpRequest();
    var url = "http://www.google-analytics.com/collect";
    var trackingParams = "v=1";
    trackingParams += "&tid=" + this.analyticsId;
    trackingParams += "&cid=" + this.analyticsUserId;
    trackingParams += "&t=" + type;
    trackingParams += "&an=" + this.appName;
    trackingParams += "&av=" + this.appVersion;
    for (var parameterKey in params) {
        if (params.hasOwnProperty(parameterKey)) {
            trackingParams += "&" + parameterKey + "=" + params[parameterKey];
        }
    }
    req.open("POST", url, true);
    req.setRequestHeader("Content-length", trackingParams.length);
    req.send(trackingParams);
};

Analytics.prototype.trackScreen = function(screenName) {
    this._trackGA("appview", {
        cd: screenName
    });
};

Analytics.prototype.trackEvent = function(category, action) {
    this._trackGA("event", {
        ec: category,
        ea: action
    });
};

var MessageQueue = function() {
    var RETRY_MAX = 5;
    var queue = [];
    var sending = false;
    var timer = null;
    return {
        reset: reset,
        sendAppMessage: sendAppMessage,
        size: size
    };
    function reset() {
        queue = [];
        sending = false;
    }
    function sendAppMessage(message, ack, nack) {
        if (!isValidMessage(message)) {
            return false;
        }
        queue.push({
            message: message,
            ack: ack || null,
            nack: nack || null,
            attempts: 0
        });
        setTimeout(function() {
            sendNextMessage();
        }, 1);
        return true;
    }
    function size() {
        return queue.length;
    }
    function isValidMessage(message) {
        if (message !== Object(message)) {
            return false;
        }
        var keys = Object.keys(message);
        if (!keys.length) {
            return false;
        }
        for (var k = 0; k < keys.length; k += 1) {
            var validKey = /^[0-9a-zA-Z-_]*$/.test(keys[k]);
            if (!validKey) {
                return false;
            }
            var value = message[keys[k]];
            if (!validValue(value)) {
                return false;
            }
        }
        return true;
        function validValue(value) {
            switch (typeof value) {
              case "string":
                return true;

              case "number":
                return true;

              case "object":
                if (toString.call(value) == "[object Array]") {
                    return true;
                }
            }
            return false;
        }
    }
    function sendNextMessage() {
        if (sending) {
            return;
        }
        var message = queue.shift();
        if (!message) {
            return;
        }
        message.attempts += 1;
        sending = true;
        Pebble.sendAppMessage(message.message, ack, nack);
        timer = setTimeout(function() {
            timeout();
        }, 1e3);
        function ack() {
            clearTimeout(timer);
            setTimeout(function() {
                sending = false;
                sendNextMessage();
            }, 200);
            if (message.ack) {
                message.ack.apply(null, arguments);
            }
        }
        function nack() {
            clearTimeout(timer);
            if (message.attempts < RETRY_MAX) {
                queue.unshift(message);
                setTimeout(function() {
                    sending = false;
                    sendNextMessage();
                }, 200 * message.attempts);
            } else {
                if (message.nack) {
                    message.nack.apply(null, arguments);
                }
            }
        }
        function timeout() {
            setTimeout(function() {
                sending = false;
                sendNextMessage();
            }, 1e3);
            if (message.ack) {
                message.ack.apply(null, arguments);
            }
        }
    }
}();

var AppInfo = {
    uuid: "00e9deeb-16b4-4752-ae35-2cc088fc6ca9",
    shortName: "UK Transport",
    longName: "UK Transport",
    companyName: "Matthew Tole",
    versionCode: 10,
    versionLabel: "0.3.0",
    watchapp: {
        watchface: false
    },
    appKeys: {
        group: 0,
        operation: 1,
        data: 2
    },
    capabilities: [ "location" ],
    resources: {
        media: [ {
            menuIcon: true,
            type: "png",
            name: "MENU_ICON",
            file: "images/menu.png"
        }, {
            type: "png",
            name: "MENU_RAIL",
            file: "images/menu_rail.png"
        }, {
            type: "png",
            name: "MENU_TFL",
            file: "images/menu_tfl.png"
        }, {
            type: "png",
            name: "MENU_BUS",
            file: "images/menu_bus.png"
        }, {
            type: "png",
            name: "MENU_REFRESH",
            file: "images/menu_refresh.png"
        }, {
            type: "png",
            name: "MENU_SETTINGS",
            file: "images/menu_settings.png"
        }, {
            type: "png",
            name: "MENU_ABOUT",
            file: "images/menu_about.png"
        }, {
            type: "png",
            name: "ICON_FAVOURITE",
            file: "images/icon_favourite.png"
        }, {
            type: "font",
            name: "FONT_ICON_8",
            file: "fonts/icomoon.ttf",
            characterRegex: "ab"
        } ]
    }
};

var Config = {
    keen: {
        projectId: "53a48cb6bcb79c3f5e000000",
        writeKey: "bcfbf33780ecb04cf8c1f8285688dd0d10018f4041908d209b812326e07f5c3a4e4004452cbbfe051d98d589829f48cf1c1d5e81839d2ac7f40f5c8354ef0617b7b15e85a341c7f424e2b5aac844ba86f3ff22287231120699a428c4db7b149d0376577e5260ad7e54aefd9ec026ff7b"
    },
    api: {
        tube: {
            status: "http://pebble.matthewtole.com/uk-transport/tube/status.json",
            details: "http://pebble.matthewtole.com/uk-transport/tube/details.json"
        },
        train: {
            stations: "http://pebble.matthewtole.com/uk-transport/2/train/stations.json",
            departures: "http://pebble.matthewtole.com/uk-transport/train/departures.json"
        },
        bus: {
            stops: "http://pebble.matthewtole.com/uk-transport/bus/stops.json",
            departures: "http://pebble.matthewtole.com/uk-transport/bus/departures.json"
        }
    },
    debug: true
};

var Bus = function(options) {
    this.pebble = options.pebble || Pebble;
    this.messageQueue = options.messageQueue || MessageQueue;
    this.http = options.http || http;
    this.location = options.location || navigator.geolocation;
    this.debug = options.debug;
    this.analytics = options.ga;
    this.keen = options.keen;
    this.version = options.version;
    this.api = options.api;
    this.pebbleAppMessage = function(event) {
        var payload = event.payload;
        var group = payload.group.toLowerCase();
        if (group !== "bus") {
            return;
        }
        this.log("Payload", JSON.stringify(payload));
        var operation = payload.operation.toLowerCase();
        switch (operation) {
          case "stops":
            opBusStops.call(this, payload.data);
            break;

          case "departures":
            opBusDepartures.call(this, payload.data);
            break;
        }
    };
    function opBusStops() {
        if (this.analytics) {
            this.analytics.trackEvent("bus", "stops");
        }
        this.location.getCurrentPosition(locationCallback.bind(this), locationError.bind(this));
        function locationCallback(position) {
            var requestData = {
                lon: position.coords.longitude,
                lat: position.coords.latitude
            };
            this.http.get(this.api.stops, requestData, requestCallback.bind(this));
        }
        function locationError(err) {
            console.log(err);
        }
        function requestCallback(err, data) {
            if (err) {
                return console.log(err);
            }
            if (!data) {
                return console.log(new Error("Lack of data!"));
            }
            var stops = data.stops;
            var responseData = [];
            responseData.push(stops.length);
            stops.forEach(function(stop) {
                responseData.push(stop.atcocode);
                responseData.push(stop.name);
                responseData.push(stop.indicator);
            });
            this.messageQueue.sendAppMessage({
                group: "BUS",
                operation: "STOPS",
                data: responseData.join("|")
            });
        }
    }
    function opBusDepartures(data) {
        if (this.analytics) {
            this.analytics.trackEvent("bus", "depatures-" + data);
        }
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
            departures.forEach(function(departure) {
                responseData.push(departure.line);
                responseData.push(departure.direction);
                var hasEstimate = departure.best_departure_estimate && departure.best_departure_estimate.length;
                responseData.push(hasEstimate ? departure.best_departure_estimate : departure.aimed_departure_time);
            });
            this.messageQueue.sendAppMessage({
                group: "BUS",
                operation: "DEPARTURES",
                data: responseData.join("|")
            });
        }
    }
};

Bus.prototype.log = function() {
    if (!this.debug) {
        return;
    }
    var pieces = [ "UK Transport", this.version, "Bus" ];
    pieces = pieces.concat(Array.prototype.slice.call(arguments));
    console.log(pieces.join(" // "));
};

Bus.prototype.init = function() {
    this.pebble.addEventListener("appmessage", this.pebbleAppMessage.bind(this));
    this.log("Ready");
};

var Tube = function(options) {
    this.pebble = options.pebble || Pebble;
    this.messageQueue = options.messageQueue || MessageQueue;
    this.http = options.http || http;
    this.debug = options.debug;
    this.analytics = options.ga;
    this.version = options.version;
};

Tube.prototype._onPebbleAppMessage = function(event) {
    var payload = event.payload;
    var group = payload.group.toLowerCase();
    if (group !== "tube") {
        return;
    }
    if (this.debug) {
        this.log("Payload", JSON.stringify(payload));
    }
    var operation = payload.operation.toLowerCase();
    switch (operation) {
      case "update":
        opLineStatus.call(this, payload.data);
        break;

      case "details":
        opLineDetails.call(this, payload.data);
        break;
    }
    function opLineStatus(data) {
        if (this.analytics) {
            this.analytics.trackEvent("tube", "update");
        }
        this.http.get(Config.api.tube.status, data, function(err, data) {
            if (err) {
                switch (err.message) {
                  case "NOT_CONNECTED":
                    this.messageQueue.sendAppMessage({
                        group: "TUBE",
                        operation: "ERROR",
                        data: "OFFLINE"
                    });
                    return;

                  default:
                    this.messageQueue.sendAppMessage({
                        group: "TUBE",
                        operation: "ERROR",
                        data: "HTTP_UNKNOWN"
                    });
                    return;
                }
            }
            if (!data || !data.response || !data.response.lines) {
                if (this.debug) {
                    this.log("Response from tube update API was invalid.");
                }
                this.messageQueue.sendAppMessage({
                    group: "TUBE",
                    operation: "ERROR",
                    data: "API_INVALID"
                });
                return;
            }
            var lines = data.response.lines;
            lines = lines.map(function(line) {
                var betterLine = {
                    name: line.name.replace("&amp;", "&"),
                    statuses: line.status.split(",")
                };
                betterLine.ok = betterLine.statuses[0] === "good service";
                betterLine.statuses = betterLine.statuses.map(function(str) {
                    return titleize(str.trim());
                });
                betterLine.statuses.sort(function(statusA, statusB) {
                    var orderA = Tube.StatusOrdering.indexOf(statusA);
                    var orderB = Tube.StatusOrdering.indexOf(statusB);
                    return orderA < orderB ? -1 : orderA > orderB ? 1 : 0;
                });
                return betterLine;
            });
            lines.sort(function(lineA, lineB) {
                var weightA = statusWeight(lineA);
                var weightB = statusWeight(lineB);
                return weightA < weightB ? 1 : weightA > weightB ? -1 : lineA.name.localeCompare(lineB.name);
            });
            lines = dedupeLines(lines);
            var updateData = [ lines.length ];
            lines.forEach(function(line) {
                updateData.push(line.name);
                updateData.push(line.statuses.join(", "));
            });
            this.messageQueue.sendAppMessage({
                group: "TUBE",
                operation: "UPDATE",
                data: updateData.join("|")
            });
        }.bind(this));
    }
    function opLineDetails(data) {
        if (this.analytics) {
            this.analytics.trackEvent("tube", "details:" + data);
        }
        this.http.get(Config.api.tube.details, {
            line: data
        }, function(err, data) {
            if (err) {
                switch (err.message) {
                  case "NOT_CONNECTED":
                    this.messageQueue.sendAppMessage({
                        group: "TUBE",
                        operation: "ERROR",
                        data: "OFFLINE"
                    });
                    return;

                  default:
                    this.messageQueue.sendAppMessage({
                        group: "TUBE",
                        operation: "ERROR",
                        data: "HTTP_UNKNOWN"
                    });
                    return;
                }
            }
            if (!data || !data.response) {
                if (this.debug) {
                    this.log("Response from tube update API was invalid.");
                }
                this.messageQueue.sendAppMessage({
                    group: "TUBE",
                    operation: "ERROR",
                    data: "API_INVALID"
                });
                return;
            }
            this.messageQueue.sendAppMessage({
                group: "TUBE",
                operation: "DETAILS",
                data: data.response
            });
        }.bind(this));
    }
    function statusWeight(line) {
        return line.statuses.reduce(function(weight, status) {
            return weight + Math.pow(2, -1 * Tube.StatusOrdering.indexOf(status));
        }, 0);
    }
    function dedupeLines(lines) {
        var dedupedLines = [];
        lines.forEach(function(line) {
            var existingLine = find(dedupedLines, function(innerLine) {
                return line.name === innerLine.name;
            });
            if (!existingLine) {
                dedupedLines.push(line);
            }
        });
        return dedupedLines;
    }
    function titleize(str) {
        if (str === null) {
            return "";
        }
        str = String(str).toLowerCase();
        return str.replace(/(?:^|\s|-)\S/g, function(c) {
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

Tube.prototype.log = function() {
    if (!this.debug) {
        return;
    }
    var pieces = [ "UK Transport", this.version, "Tube" ];
    pieces = pieces.concat(Array.prototype.slice.call(arguments));
    console.log(pieces.join(" // "));
};

Tube.prototype.init = function() {
    this.pebble.addEventListener("appmessage", this._onPebbleAppMessage.bind(this));
    this.log("Ready");
};

Tube.StatusOrdering = [ "Suspended", "Part Suspended", "Planned Closure", "Part Closure", "Severe Delays", "Reduced Service", "Bus Service", "Minor Delays", "Good Service" ];

var Train = function(options) {
    this.pebble = options.pebble || Pebble;
    this.messageQueue = options.messageQueue || MessageQueue;
    this.http = options.http || http;
    this.location = options.location || navigator.geolocation;
    this.debug = options.debug;
    this.analytics = options.ga;
    this.keen = options.keen;
    this.version = options.version;
    this.api = options.api;
    this.onPebbleAppMessage = function(event) {
        var payload = event.payload;
        var group = payload.group.toLowerCase();
        if (group !== "train") {
            return;
        }
        this.log("Payload", JSON.stringify(payload));
        var operation = payload.operation.toLowerCase();
        switch (operation) {
          case "stations":
            try {
                opTrainStations.call(this, payload.data);
            } catch (ex) {
                this.log("Error", JSON.stringify(ex));
            }
            break;

          case "departures":
            try {
                opTrainDepartures.call(this, payload.data);
            } catch (ex) {
                this.log("Error", JSON.stringify(ex));
            }
            break;
        }
    };
    function opTrainStations() {
        if (this.analytics) {
            this.analytics.trackEvent("train", "stations");
        }
        var timeLocation = new Date();
        var timeLookup = null;
        var locationOptions = {
            enableHighAccuracy: false,
            timeout: 5 * 1e3,
            maximumAge: 60 * 1e3
        };
        this.location.getCurrentPosition(locationCallback.bind(this), locationError.bind(this), locationOptions);
        function locationCallback(position) {
            trackTimeTaken.call(this, timeLocation, "train.location");
            logTimeElapsed.call(this, timeLocation, "Getting location took %TIME%.");
            var requestData = {
                lon: position.coords.longitude,
                lat: position.coords.latitude
            };
            timeLookup = new Date();
            this.http.get(this.api.stations, requestData, requestCallback.bind(this));
        }
        function locationError() {
            trackTimeTaken.call(this, timeLocation, "train.locationError");
            logTimeElapsed.call(this, timeLocation, "Failing to get location took %TIME%.");
            this.messageQueue.sendAppMessage({
                group: "TRAIN",
                operation: "ERROR",
                data: "Location access failed."
            });
        }
        function requestCallback(err, data) {
            trackTimeTaken.call(this, timeLookup, "train.stations");
            logTimeElapsed.call(this, timeLookup, "Finding nearest stations took %TIME%.");
            var stations = data;
            var responseData = [];
            responseData.push(stations.length);
            stations.forEach(function(station) {
                responseData.push(station.code);
                responseData.push(station.name);
            });
            this.messageQueue.sendAppMessage({
                group: "TRAIN",
                operation: "STATIONS",
                data: responseData.join("|")
            });
        }
    }
    function opTrainDepartures(data) {
        if (this.analytics) {
            this.analytics.trackEvent("train", "departures-" + data);
        }
        var code = data;
        var requestData = {
            station: code
        };
        this.http.get(this.api.departures, requestData, function(err, data) {
            if (err) {
                switch (err.message) {
                  case "NOT_CONNECTED":
                    this.messageQueue.sendAppMessage({
                        group: "TRAIN",
                        operation: "ERROR",
                        data: "Not online."
                    });
                    return;

                  default:
                    this.messageQueue.sendAppMessage({
                        group: "TRAIN",
                        operation: "ERROR",
                        data: "Unknown HTTP error."
                    });
                    return;
                }
            }
            var departures = data.departures.all;
            var responseData = [];
            responseData.push(departures.length);
            departures.forEach(function(departure) {
                responseData.push(departure.destination_name);
                responseData.push(departure.expected_departure_time);
                responseData.push(departure.status);
                responseData.push(departure.platform);
            });
            this.messageQueue.sendAppMessage({
                group: "TRAIN",
                operation: "DEPARTURES",
                data: responseData.join("|")
            });
        }.bind(this));
    }
    function logTimeElapsed(start, message) {
        var now = new Date();
        var totalMs = now.getTime() - start.getTime();
        this.log(message.replace("%TIME%", totalMs + "ms"));
    }
    function trackTimeTaken(start, event) {
        var now = new Date();
        this.keen.sendEvent("time-taken", {
            event: event,
            msTaken: now.getTime() - start.getTime()
        });
    }
};

Train.prototype.log = function() {
    if (!this.debug) {
        return;
    }
    var pieces = [ "UK Transport", this.version, "Train" ];
    pieces = pieces.concat(Array.prototype.slice.call(arguments));
    console.log(pieces.join(" // "));
};

Train.prototype.init = function() {
    this.pebble.addEventListener("appmessage", this.onPebbleAppMessage.bind(this));
    this.log("Ready");
};

(function() {
    var ga;
    Pebble.addEventListener("ready", function() {
        try {
            ga = new Analytics("UA-48246810-1", "UK Transport", AppInfo.versionLabel);
            train.init();
            tube.init();
            bus.init();
            Keen.init(http, Pebble, Config.keen, AppInfo);
            var lastVersion = parseInt(localStorage.getItem("lastVersion"), 10);
            if (AppInfo.versionCode > lastVersion) {
                showUpdateMessage(lastVersion || 0);
                localStorage.setItem("lastVersion", AppInfo.versionCode);
            }
        } catch (ex) {
            console.log(ex);
        }
    });
    var tube = new Tube({
        ga: ga,
        keen: Keen,
        debug: Config.debug,
        api: Config.api.tube,
        version: AppInfo.versionLabel
    });
    var train = new Train({
        ga: ga,
        keen: Keen,
        debug: Config.debug,
        transportApi: Config.transportApi,
        api: Config.api.train,
        version: AppInfo.versionLabel
    });
    var bus = new Bus({
        ga: ga,
        keen: Keen,
        debug: Config.debug,
        transportApi: Config.transportApi,
        api: Config.api.bus,
        version: AppInfo.versionLabel
    });
    function showUpdateMessage(lastVersion) {
        var message = "";
        switch (lastVersion) {
          case 0:
            message = "Welcome to UK Transport.";
            break;

          default:
            message = "You have updated to the latest version of UK Transport!";
            break;
        }
        Pebble.showSimpleNotificationOnPebble("UK Transport v" + AppInfo.versionLabel, message);
    }
})();