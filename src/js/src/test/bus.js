/* global describe */
/* global expect */
/* global beforeEach */
/* global it */
/* global Config */
/* global MockHttp */
/* global MockPebble */
/* global MockLocation */
/* global Bus */

describe('Bus', function () {

  var http = null;
  var pebble = null;
  var bus = null;
  var location = null;

  beforeEach(function () {
    http = new MockHttp();
    pebble = new MockPebble();
    location = new MockLocation();
    bus = new Bus({
      pebble: pebble,
      http: http,
      location: location,
      debug: false,
      transportApi: Config.transportApi
    });
    bus.init();
  });

  it('should listen for app messages when ready', function (done) {
    expect(pebble._getEventListeners('appmessage').length).to.equal(1);
    done();
  });

  it('should respond to request for nearest stops', function (done) {
    http.addHandler(/.*/, function (url, data, callback) {
      /*jshint -W106*/
      expect(data.app_id).to.equal(Config.transportApi.appId);
      expect(data.api_key).to.equal(Config.transportApi.apiKey);
      /*jshint +W106*/
      return callback(null, {
        stops: [
          {
            atcocode: "490015107N",
            name: "Spencer Street Goswell Road",
            indicator: "Stop US",
          },
          {
            atcocode: "490015107S",
            name: "Spencer Street Goswell Road",
            indicator: "Stop UN",
          }
        ]
      });
    });
    pebble._on('appmessage', function (payload) {
      expect(payload.group).to.equal('BUS');
      expect(payload.operation).to.equal('STOPS');
      expect(payload.data).to.equal('2|490015107N|Spencer Street Goswell Road|Stop US|490015107S|Spencer Street Goswell Road|Stop UN');
      done();
    });
    pebble._emit('appmessage', { payload: { group: 'BUS', operation: 'STOPS', data: '' } });
  });

  it('should response to a request for upcoming departures', function (done) {
    http.addHandler(/.*/, function (url, data, callback) {
      /*jshint -W106*/
      expect(data.app_id).to.equal(Config.transportApi.appId);
      expect(data.api_key).to.equal(Config.transportApi.apiKey);
      /*jshint +W106*/
      return callback(null, {
        departures: {
          all: [
            /*jshint -W106*/
            {
              line: "56",
              direction: "Whipps Cross",
              best_departure_estimate: "00:05",
            },
            {
              line: "56",
              direction: "Whipps Cross",
              best_departure_estimate: "00:12",
            }
            /*jshint +W106*/
          ]
        }
      });
    });
    pebble._on('appmessage', function (payload) {
      expect(payload.group).to.equal('BUS');
      expect(payload.operation).to.equal('DEPARTURES');
      expect(payload.data).to.equal('2|56|Whipps Cross|00:05|56|Whipps Cross|00:12');
      done();
    });
    pebble._emit('appmessage', { payload: { group: 'BUS', operation: 'DEPARTURES', data: '490015107S' } });
  });

});