/***
 * UK Transport
 * Copyright (C) 2013 Matthew Tole
 *
 * app.c
 ***/

#include <pebble.h>
#include "libs/bitmap-loader/bitmap-loader.h"
#include "libs/font-loader/font-loader.h"
#include "libs/message-queue/message-queue.h"

#include "settings.h"
#include "windows/win-main-menu.h"
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

  mqueue_init();
  tube_init();
  bus_init();
  train_init();

  settings_restore();
  win_main_menu_create();
  win_main_menu_show(true);
}

static void deinit(void) {
  win_main_menu_destroy();
  settings_save();
  bitmaps_cleanup();
  fonts_cleanup();
}
