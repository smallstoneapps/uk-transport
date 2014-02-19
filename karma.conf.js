module.exports = function(config) {
  config.set({
    basePath: '',
    frameworks: ['mocha', 'chai', 'sinon'],
    files: [
      'javascript/test/mocks/*.js',
      'javascript/test/*.js',
      'javascript/*.js'
    ],
    exclude: [
      'javascript/main.js',
      'javascript/http.js',
      'javascript/pbl-analytics.js'
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
