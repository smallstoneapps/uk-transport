jshint javascript/main.js || { exit 1; }
jshint pebble/appinfo.json || { exit 1; }
cat javascript/main.js > pebble/src/js/pebble-js-app.js
cd pebble
pebble clean || { exit 1; }
pebble build || { exit 1; }
#rm src/js/pebble-js-app.js || { exit 1; }
if [ "$1" = "install" ]; then
    pebble install --logs
fi