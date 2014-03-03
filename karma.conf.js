module.exports = function(config) {
  config.set({
    basePath: 'src/js/src',
    frameworks: ['mocha', 'chai', 'sinon'],
    files: [
      'test/mocks/*.js',
      'test/*.js',
      './*.js'
    ],
    exclude: [
      'main.js',
      'http.js',
      'pbl-analytics.js'
    ],
    reporters: ['dots', 'osx'],
    port: 9876,
    colors: true,
    logLevel: config.LOG_ERROR,
    autoWatch: true,
    browsers: ['Chrome'],
    captureTimeout: 60000,
    singleRun: false
  });
};
