/*

UK Transport v1.4

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

src/windows/win-tube-details.c

*/

#include <pebble.h>
#include "win-tube-details.h"
#include <scroll-text-layer.h>
#include <pebble-assist.h>
#include "../layers/layer-loading.h"
#include "../tube.h"

static void window_load(Window* window);
static void window_unload(Window* window);
static void tube_details_handler(char* details);

static Window* window;
static ScrollTextLayer* layer;
static LoadingLayer* layer_loading;

void win_tube_details_create(void) {
  window = window_create();
  window_set_window_handlers(window, (WindowHandlers) {
    .load = window_load,
    .unload = window_unload
  });
  tube_register_details_handler(tube_details_handler);
}

void win_tube_details_destroy(void) {
  window_destroy(window);
}

void win_tube_details_show(TubeLine* line, bool animated) {
  window_stack_push(window, animated);
  tube_fetch_details(line);
  layer_show(layer_loading);
}

//

static void window_load(Window* window) {
  layer = scroll_text_layer_create_fullscreen(window);
  scroll_text_layer_set_system_font(layer, FONT_KEY_GOTHIC_24_BOLD);
  scroll_text_layer_add_to_window(layer, window);

  layer_loading = loading_layer_create(window);
  loading_layer_set_text(layer_loading, "Fetching Status Details");
}

static void window_unload(Window* window) {
  scroll_text_layer_destroy(layer);
  loading_layer_destroy(layer_loading);
}

static void tube_details_handler(char* details) {
  scroll_text_layer_set_text(layer, details);
  layer_hide(layer_loading);
}