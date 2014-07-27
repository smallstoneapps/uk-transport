/*

UK Transport v0.3.0

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

src/app.c

*/

#include <pebble.h>
#include "libs/bitmap-loader/bitmap-loader.h"
#include "libs/font-loader/font-loader.h"
#include "libs/message-queue/message-queue.h"

#include "settings.h"
#include "windows/win-menu.h"
#include "tube.h"
#include "bus.h"
#include "train.h"

static void init(void);
static void deinit(void);

int main(void) {
  init();
  app_event_loop();
  deinit();
}

static void init(void) {
  bitmaps_init();
  fonts_init();
  fonts_assign("icomoon", RESOURCE_ID_FONT_ICON_8);

  mqueue_init();
  tube_init();
  bus_init();
  train_init();

  settings_restore();
  win_main_menu_create();
  win_main_menu_show(true);
}

static void deinit(void) {
  // win_main_menu_destroy();
  settings_save();
  // bitmaps_cleanup();
  // fonts_cleanup();

  // mqueue_deinit();
  // tube_deinit();
  // bus_deinit();
  // train_deinit();
}
