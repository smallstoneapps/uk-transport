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
      http: http,
      location: location,
      debug: false,
      transportApi: Config.transportApi
    });
  });

  it('should listen for the ready event', function (done) {
    train.init();
    expect(pebble._getEventListeners('ready').length).to.equal(1);
    done();
  });

  it('should listen for app messages when ready', function (done) {
    train.init();
    pebble._emit('ready', { ready: true });
    expect(pebble._getEventListeners('appmessage').length).to.equal(1);
    done();
  });

  it('should respond to request for nearest stations', function (done) {
    train.init();
    http.addHandler(/.*/, function (url, data, callback) {
      expect(data.app_id).to.equal(Config.transportApi.appId);
      expect(data.api_key).to.equal(Config.transportApi.apiKey);
      return callback(null, {
        stations: [
          {
            station_code: "CST",
            name: "London Cannon Street"
          },
          {
            station_code: "CTK",
            name: "City Thameslink",
          }
        ]
      });
    });
    pebble._on('appmessage', function (payload) {
      expect(payload.group).to.equal('TRAIN');
      expect(payload.operation).to.equal('STATIONS');
      expect(payload.data).to.equal('2|CST|London Cannon Street|CTK|City Thameslink');
      done();
    });
    pebble._emit('ready', { ready: true });
    pebble._emit('appmessage', { payload: { group: 'TRAIN', operation: 'STATIONS', data: '' } });
  });

  it('should handle a location error', function (done) {
    location._disable();
    train.init();
    pebble._on('appmessage', function (payload) {
      expect(payload.group).to.equal('ERROR');
      expect(payload.operation).to.equal('LOCATION');
      expect(payload.data).to.equal('Location access disabled.');
      done();
    });
    pebble._emit('ready', { ready: true });
    pebble._emit('appmessage', { payload: { group: 'TRAIN', operation: 'STATIONS', data: '' } });
  });

  it('should respond to a request for upcoming departures', function (done) {
    train.init();
    http.addHandler(/.*/, function (url, data, callback) {
      expect(data.app_id).to.equal(Config.transportApi.appId);
      expect(data.api_key).to.equal(Config.transportApi.apiKey);
      return callback(null, {
        departures: {
          all: [
            {
              destination_name: "Luton",
              expected_departure_time: "21:02"
            },
            {
              destination_name: "Sutton (Surrey)",
              expected_departure_time: "21:10"
            }
          ]
        }
      });
    });
    pebble._on('appmessage', function (payload) {
      expect(payload.group).to.equal('TRAIN');
      expect(payload.operation).to.equal('DEPARTURES');
      expect(payload.data).to.equal('2|Luton|21:02|Sutton (Surrey)|21:10');
      done();
    });
    pebble._emit('ready', { ready: true });
    pebble._emit('appmessage', { payload: { group: 'TRAIN', operation: 'DEPARTURES', data: 'CST' } });
  });

  it('should send an error message if not connected to the internet', function (done) {
    train.init();
    http.addHandler(/.*/, function (url, data, callback) {
      return callback(new Error('NOT_CONNECTED'), null);
    });
    pebble._on('appmessage', function (payload) {
      expect(payload.group).to.equal('ERROR');
      expect(payload.operation).to.equal('HTTP');
      expect(payload.data).to.equal('Not online.');
      done();
    });
    pebble._emit('ready', { ready: true });
    pebble._emit('appmessage', { payload: { group: 'TRAIN', operation: 'DEPARTURES', data: 'CST' } });
  });

});