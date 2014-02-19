var MockLocation = function () {
  this.location = {
    latitude: 0,
    longitude: 0
  };
  this.disabled = false;
};

MockLocation.prototype.getCurrentPosition = function(success, error) {
  if (this.disabled) {
    return error();
  }
  return success({ coords: this.location });
};

MockLocation.prototype._setLocation = function(latitude, longitude) {
  this.location.latitude = latitude;
  this.location.longitude = longitude;
};

MockLocation.prototype._disable = function() {
  this.disabled = true;
};