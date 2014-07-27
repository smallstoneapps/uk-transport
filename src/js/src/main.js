/*

UK Transport v0.3.0

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
/* global Analytics */
/* global Tube */
/* global Train */
/* global Bus */
/* global Keen */
/* global http */

(function () {

  var ga;

  Pebble.addEventListener('ready', function () {
    try {
      ga = new Analytics('UA-48246810-1', 'UK Transport', AppInfo.versionLabel);
      train.init();
      tube.init();
      bus.init();
      Keen.init(http, Pebble, Config.keen, AppInfo);

      var lastVersion = parseInt(localStorage.getItem('lastVersion'), 10);
      if (AppInfo.versionCode > lastVersion) {
        showUpdateMessage(lastVersion || 0);
        localStorage.setItem('lastVersion', AppInfo.versionCode);
      }
    }
    catch (ex) {
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
    var message = '';
    switch (lastVersion) {
      case 0:
        message = 'Welcome to UK Transport.';
        break;
      default:
        message = 'You have updated to the latest version of UK Transport!';
        break;
    }
    Pebble.showSimpleNotificationOnPebble('UK Transport v' + AppInfo.versionLabel, message);
  }

}());