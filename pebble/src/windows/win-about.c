/***
 * UK Transport
 * Copyright (C) 2013 Matthew Tole
 *
 * windows/about.c
 ***/

#include <pebble.h>
#include "win-about.h"
#include "libs/scroll-text-layer/scroll-text-layer.h"

static void window_load(Window* window);
static void window_unload(Window* window);

static Window* window;
static ScrollTextLayer* layer;
static char* text_about = "UK Transport is a Pebble app developed by Matthew Tole.\n\nIf you like this app, please consider donating to help fund future development.\n\nGo to http://matthewtole.com/pebble/ for details.";

void win_about_create(void) {
  window = window_create();
  window_set_window_handlers(window, (WindowHandlers) {
    .load = window_load,
    .unload = window_unload
  });
}

void win_about_destroy(void) {
  window_destroy(window);
}

void win_about_show(bool animated) {
  window_stack_push(window, animated);
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - //

static void window_load(Window* window) {
  layer = scroll_text_layer_create(layer_get_bounds(window_get_root_layer(window)));
  scroll_text_layer_set_font(layer, fonts_get_system_font(FONT_KEY_GOTHIC_24_BOLD));
  scroll_text_layer_set_text(layer, text_about);
  scroll_text_layer_add_to_window(layer, window);
}

static void window_unload(Window* window) {
  scroll_text_layer_destroy(layer);
}
