/*

UK Transport v1.1

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

src/settings.c

*/

#include <pebble.h>
#include <pebble-assist.h>
#include "settings.h"
#include "analytics.h"
#include "persist.h"
#include "train.h"
#include "bus.h"

void settings_restore(void) {
  if (! persist_exists(PERSIST_VERSION_KEY)) {
    return;
  }
  uint8_t persist_version = persist_read_int(PERSIST_VERSION_KEY);
  if (PERSIST_VERSION == persist_version) {
    train_load_favourites();
    bus_load_favourites();
  }
  else{
    WARN("Mismatched persistence version (Current: %d, Stored: %d)",
      PERSIST_VERSION, persist_version);
  }
  if (persist_exists(PERSIST_CRASH)) {
    analytics_track_event("crash.detected", " ");
  }
  persist_write_bool(PERSIST_CRASH, true);
}

void settings_save(void) {
  train_save_favourites();
  bus_save_favourites();
  persist_write_int(PERSIST_VERSION_KEY, PERSIST_VERSION);
  persist_delete(PERSIST_CRASH);
}