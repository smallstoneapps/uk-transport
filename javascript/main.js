/* global Pebble */
/* global PblAnalytics */

(function () {
  "use strict";

  PblAnalytics.init({ uuid: '00e9deeb-16b4-4752-ae35-2cc088fc6ca9', version: '0.2.3'});
  Pebble.addEventListener('ready', pebbleReady);

  function pebbleReady() {
  }

}());