/* global describe */
/* global expect */
/* global beforeEach */
/* global it */
/* global Config */
/* global MockHttp */
/* global MockPebble */
/* global MockLocation */
/* global Train */

describe('Train', function () {

  var http = null;
  var pebble = null;
  var train = null;
  var location = null;

  beforeEach(function () {
    http = new MockHttp();
    pebble = new MockPebble();
    location = new MockLocation();
    train = new Train({
      pebble: pebble,
      messageQueue: pebble,
      http: http,
      location: location,
      debug: false,
      transportApi: Config.transportApi,
      api: Config.api.train,
    });
    train.init();
  });

  it('should listen for app messages when ready', function (done) {
    expect(pebble._getEventListeners('appmessage').length).to.equal(1);
    done();
  });

  it('should respond to request for nearest stations', function (done) {
    http.addHandler(/.*/, function (url, data, callback) {
      return callback(null, [
        {
          code: 'CST',
          name: 'London Cannon Street'
        },
        {
          code: 'CTK',
          name: 'City Thameslink',
        }
      ]);
    });
    pebble._on('appmessage', function (payload) {
      expect(payload.group).to.equal('TRAIN');
      expect(payload.operation).to.equal('STATIONS');
      expect(payload.data).to.equal('2|CST|London Cannon Street|CTK|City Thameslink');
      done();
    });
    pebble._emit('appmessage', { payload: { group: 'TRAIN', operation: 'STATIONS', data: '' } });
  });

  it('should handle a location error', function (done) {
    location._disable();
    pebble._on('appmessage', function (payload) {
      expect(payload.group).to.equal('TRAIN');
      expect(payload.operation).to.equal('ERROR');
      expect(payload.data).to.equal('Location access failed.');
      done();
    });
    pebble._emit('appmessage', { payload: { group: 'TRAIN', operation: 'STATIONS', data: '' } });
  });

  it('should respond to a request for upcoming departures', function (done) {
    http.addHandler(/.*/, function (url, data, callback) {
      expect(data.station).to.equal('CST');
      return callback(null, {
        departures: {
          all: [
            /*jshint -W106*/
            {
              destination_name: 'Luton',
              expected_departure_time: '21:02',
              status: 'LATE',
              platform: '5'
            },
            {
              destination_name: 'Sutton (Surrey)',
              expected_departure_time: '21:10'
            }
            /*jshint +W106*/
          ]
        }
      });
    });
    pebble._on('appmessage', function (payload) {
      expect(payload.group).to.equal('TRAIN');
      expect(payload.operation).to.equal('DEPARTURES');
      expect(payload.data).to.equal('2|Luton|21:02|LATE|5|Sutton (Surrey)|21:10||');
      done();
    });
    pebble._emit('appmessage', { payload: { group: 'TRAIN', operation: 'DEPARTURES', data: 'CST' } });
  });

  it('should send an error message if not connected to the internet', function (done) {
    http.addHandler(/.*/, function (url, data, callback) {
      return callback(new Error('NOT_CONNECTED'), null);
    });
    pebble._on('appmessage', function (payload) {
      expect(payload.group).to.equal('TRAIN');
      expect(payload.operation).to.equal('ERROR');
      expect(payload.data).to.equal('Not online.');
      done();
    });
    pebble._emit('appmessage', { payload: { group: 'TRAIN', operation: 'DEPARTURES', data: 'CST' } });
  });

});
