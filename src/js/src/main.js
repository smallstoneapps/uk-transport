/*

UK Transport v1.7

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

src/js/src/main.js

*/

/* global Pebble */
/* global Config */
/* global AppInfo */
/* global Tube */
/* global Train */
/* global Bus */
/* global Keen */
/* global http */
/* global MessageQueue */

var Config = require('./config');
var Bus = require('./bus');
var Train = require('./train');
var Tube = require('./tube');
var Keen = require('./libs/keen');
var http = require('./libs/http');
var AppInfo = require('../../../appinfo.json');

(function () {

  Pebble.addEventListener('ready', function () {
    try {
      train.init();
      tube.init();
      bus.init();
      Keen.init(http, Pebble, Config.keen, AppInfo, Config.debug);
      Pebble.addEventListener('appmessage', analyticsMessageHandler);
      MessageQueue.sendAppMessage({ group: 'SYS', operation: 'INIT', data: 'HELLO!' });
    }
    catch (ex) {
    }
  });

  var tube = new Tube({
    keen: Keen,
    debug: Config.debug,
    api: Config.api.tube,
    version: AppInfo.versionLabel
  });

  var train = new Train({
    keen: Keen,
    debug: Config.debug,
    transportApi: Config.transportApi,
    api: Config.api.train,
    version: AppInfo.versionLabel
  });

  var bus = new Bus({
    keen: Keen,
    debug: Config.debug,
    transportApi: Config.transportApi,
    api: Config.api.bus,
    version: AppInfo.versionLabel
  });

  function analyticsMessageHandler(event) {
    if ('ANALYTICS' !== event.payload.group) {
      return;
    }
    var data = {};
    try {
      event.payload.data.split('|').forEach(function (sub) {
        if (! sub || ! sub.length) {
          return;
        }
        var splitSub = sub.split('`');
        if (splitSub.length !== 2) {
          return;
        }
        data[splitSub[0]] = splitSub[1];
      });
    }
    catch (ex) {
      console.log(ex);
    }
    Keen.sendEvent(event.payload.operation, data);
  }

}());
