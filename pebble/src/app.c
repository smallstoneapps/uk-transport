/***
 * UK Transport
 * Copyright (C) 2013 Matthew Tole
 *
 * app.c
 ***/

#include <pebble.h>
#include "settings.h"
#include "libs/bitmaps.h"
#include "libs/fonts.h"
#include "windows/win-main-menu.h"

static void init(void);
static void deinit(void);

int main(void) {
  init();
  app_event_loop();
  deinit();
}

static void init(void) {
  bitmaps_init(1);
  fonts_init(1);
  settings_restore();
  win_main_menu_create();
  win_main_menu_show(true);
}

static void deinit(void) {
  win_main_menu_destroy();
  settings_save();
}
