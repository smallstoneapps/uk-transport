/*

UK Transport v1.6

http://matthewtole.com/pebble/uk-transport/

----------------------

The MIT License (MIT)

Copyright © 2013 - 2014 Matthew Tole

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

--------------------

src/js/src/config.js

*/

/* exported Config */

var Config = {
  keen: {
    projectId: '53a48cb6bcb79c3f5e000000',
    writeKey: 'bcfbf33780ecb04cf8c1f8285688dd0d10018f4041908d209b812326e07f5c3a4e4004452cbbfe051d98d589829f48cf1c1d5e81839d2ac7f40f5c8354ef0617b7b15e85a341c7f424e2b5aac844ba86f3ff22287231120699a428c4db7b149d0376577e5260ad7e54aefd9ec026ff7b'
  },
  api: {
    tube: {
      status: 'http://pebble.matthewtole.com/uk-transport/tube/status.json',
      details: 'http://pebble.matthewtole.com/uk-transport/tube/details.json'
    },
    train: {
      stations: 'http://pebble.matthewtole.com/uk-transport/2/train/stations.json',
      departures: 'http://pebble.matthewtole.com/uk-transport/train/departures.json'
    },
    bus: {
      stops: 'http://pebble.matthewtole.com/uk-transport/bus/stops.json',
      departures: 'http://pebble.matthewtole.com/uk-transport/bus/departures.json'
    }
  },
  debug: false
};
