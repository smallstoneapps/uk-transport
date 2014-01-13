;(function () {

  Pebble.addEventListener('ready', pebbleReady);

  function pebbleReady(e) {
    console.log('Pebble Account Token: ' + Pebble.getAccountToken());
    eval('console.log("boobs");');
  }


}());