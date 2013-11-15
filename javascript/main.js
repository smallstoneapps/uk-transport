Pebble.addEventListener("ready", pebbleReady);
Pebble.addEventListener("appmessage", pebbleAppMessage);

function pebbleReady(e) {
  console.log("Pebble Account Token: " + Pebble.getAccountToken());
}

function pebbleAppMessage(e) {
  console.log('pebbleAppMessage');
}