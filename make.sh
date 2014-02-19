jshint javascript/*.js --config ~/Projects/Pebble/pebble-jshintrc --verbose || { exit 1; }
jshint pebble/appinfo.json || { exit 1; }
karma start --single-run --reporters=dots
cat \
  javascript/pbl-analytics.js \
  javascript/http.js \
  javascript/config.js \
  javascript/bus.js \
  javascript/train.js \
  javascript/tube.js \
  javascript/main.js \
    > pebble/src/js/pebble-js-app.js
jshint pebble/src/js/pebble-js-app.js || { exit 1; }
cd pebble
pebble clean || { exit 1; }
pebble build || { exit 1; }
rm src/js/pebble-js-app.js || { exit 1; }
if [ "$1" = "install" ]; then
    pebble install --logs
fi