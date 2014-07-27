/* global describe */
/* global expect */
/* global beforeEach */
/* global it */
/* global MockHttp */
/* global MockPebble */
/* global Keen */

describe('Keen', function () {

  var http = null;
  var pebble = null;
  var bus = null;
  var config = {
    projectId: 'PROJECT_ID',
    writeKey: 'WRITE_KEY'
  };

  beforeEach(function () {
    http = new MockHttp();
    pebble = new MockPebble();
    Keen.init(http, pebble, config, {});
  });

  describe('sendEvent', function () {

    it('should make the request to the Keen API', function (done) {
      http.addHandler(/.*/, function (url, data, callback) {
        expect(url).to.equal('https://api.keen.io/3.0/projects/' + config.projectId + '/events/' + 'test' + '?api_key=' + config.writeKey);
        var dataObj = JSON.parse(data);
        expect(dataObj.test).to.equal('foo');
        done();
      });
      Keen.sendEvent('test', { test: 'foo' });
    });

  });

});