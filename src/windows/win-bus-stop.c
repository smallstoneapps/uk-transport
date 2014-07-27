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

src/windows/win-bus-stop.c

*/

#include <pebble.h>
#include "win-bus-stop.h"
#include "../libs/bitmap-loader/bitmap-loader.h"
#include "../libs/pebble-assist/pebble-assist.h"
#include "../layers/layer-loading.h"
#include "../bus.h"

#define HEADER_SCROLL_SLEEP_MAX 5;

static void window_load(Window* window);
static void window_unload(Window* window);
static void window_appear(Window* window);
static void window_disappear(Window* window);
static uint16_t menu_get_num_sections_callback(MenuLayer* me, void* data);
static uint16_t menu_get_num_rows_callback(MenuLayer* me, uint16_t section_index, void* data);
static int16_t menu_get_header_height_callback(MenuLayer* me, uint16_t section_index, void* data);
static int16_t menu_get_cell_height_callback(MenuLayer* me, MenuIndex* cell_index, void* data);
static void menu_draw_header_callback(GContext* ctx, const Layer* cell_layer, uint16_t section_index, void* data);
static void menu_draw_row_callback(GContext* ctx, const Layer* cell_layer, MenuIndex* cell_index, void* data);

static void layer_header_update(Layer* layer, GContext* ctx);

static void departures_update(void);

static void header_scroll_init(void);
static void header_scroll_callback(void* data);

static Window* window;
static MenuLayer* layer_menu;
static LoadingLayer* layer_loading;
static Layer* layer_header;
static BusStop* current_stop;
char* header_str = NULL;

static int header_scroll_offset = 0;
static int header_scroll_max = 0;
static bool header_scroll_reverse = false;
static AppTimer* header_scroll_timer = NULL;
static int header_scroll_sleep = 0;

void win_bus_stop_create(void) {
  window = window_create();
  window_set_window_handlers(window, (WindowHandlers) {
    .load = window_load,
    .unload = window_unload,
    .appear = window_appear,
    .disappear = window_disappear
  });
  bus_register_departures_update_handler(departures_update);
}

void win_bus_stop_destroy(void) {
  window_destroy(window);
}

void win_bus_stop_set_stop(BusStop* stop) {
  current_stop = stop;
}

void win_bus_stop_show(bool animated) {
  window_stack_push(window, animated);
  bus_get_departures(current_stop);
  layer_show(layer_loading);
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - //

static void window_load(Window* window) {

  uint8_t header_strlen = (4 + strlen(current_stop->code) + strlen(current_stop->name));
  header_str = malloc(header_strlen);
  snprintf(header_str, header_strlen, "%s - %s", current_stop->indicator, current_stop->name);

  layer_header = layer_create(GRect(0, 0, 144, 24));
  layer_set_update_proc(layer_header, layer_header_update);
  layer_add_to_window(layer_header, window);
  header_scroll_init();

  layer_menu = menu_layer_create(GRect(0, 24, 144, 128));
  menu_layer_set_callbacks(layer_menu, NULL, (MenuLayerCallbacks){
    .get_num_sections = menu_get_num_sections_callback,
    .get_num_rows = menu_get_num_rows_callback,
    .get_header_height = menu_get_header_height_callback,
    .get_cell_height = menu_get_cell_height_callback,
    .draw_header = menu_draw_header_callback,
    .draw_row = menu_draw_row_callback
  });
  menu_layer_set_click_config_onto_window(layer_menu, window);
  menu_layer_add_to_window(layer_menu, window);

  layer_loading = loading_layer_create(window);
  loading_layer_set_text(layer_loading, "Querying Departures");
}

static void window_unload(Window* window) {
  free_safe(header_str);
  menu_layer_destroy(layer_menu);
  loading_layer_destroy(layer_loading);
  layer_destroy(layer_header);
}

static void window_appear(Window* window) {
  app_timer_cancel_safe(header_scroll_timer);
  if (header_scroll_max > 0) {
    header_scroll_callback(NULL);
  }
}

static void window_disappear(Window* window) {
  app_timer_cancel_safe(header_scroll_timer);
}

static uint16_t menu_get_num_sections_callback(MenuLayer* me, void* data) {
  return 1;
}

static uint16_t menu_get_num_rows_callback(MenuLayer* me, uint16_t section_index, void* data) {
  return bus_get_departure_count();
}

static int16_t menu_get_header_height_callback(MenuLayer* me, uint16_t section_index, void* data) {
  return 0;
}

static int16_t menu_get_cell_height_callback(MenuLayer* me, MenuIndex* cell_index, void* data) {
  return 42;
}

static void menu_draw_header_callback(GContext* ctx, const Layer* cell_layer, uint16_t section_index, void* data) {
  return;
}

static void menu_draw_row_callback(GContext* ctx, const Layer* cell_layer, MenuIndex* cell_index, void* data) {
  BusDeparture* departure = bus_get_departure(cell_index->row);
  graphics_context_set_text_color(ctx, GColorBlack);
  graphics_draw_text(ctx, departure->line, fonts_get_system_font(FONT_KEY_GOTHIC_24), GRect(4, -3, 136, 28), GTextOverflowModeFill, GTextAlignmentLeft, NULL);
  graphics_draw_text(ctx, departure->est_time, fonts_get_system_font(FONT_KEY_GOTHIC_24_BOLD), GRect(4, -3, 136, 28), GTextOverflowModeFill, GTextAlignmentRight, NULL);
  graphics_draw_text(ctx, departure->direction, fonts_get_system_font(FONT_KEY_GOTHIC_14_BOLD), GRect(4, 22, 136, 18), GTextOverflowModeFill, GTextAlignmentLeft, NULL);
}

static void layer_header_update(Layer* layer, GContext* ctx) {
  graphics_context_set_fill_color(ctx, GColorBlack);
  graphics_context_set_text_color(ctx, GColorWhite);
  graphics_fill_rect(ctx, layer_get_bounds(layer), 0, GCornerNone);
  graphics_draw_text(ctx, header_str, fonts_get_system_font(FONT_KEY_GOTHIC_14_BOLD), GRect(4 - header_scroll_offset, 0, 136 + header_scroll_offset, 14), GTextOverflowModeTrailingEllipsis, GTextAlignmentLeft, NULL);
}

static void departures_update(void) {
  if (! window_stack_contains_window(window)) {
    return;
  }
  menu_layer_reload_data(layer_menu);
  layer_hide(layer_loading);
}

static void header_scroll_init(void) {
  GSize header_size = graphics_text_layout_get_content_size(header_str, fonts_get_system_font(FONT_KEY_GOTHIC_14_BOLD), GRect(0, 0, 1000, 14), GTextOverflowModeTrailingEllipsis, GTextAlignmentLeft);
  if (header_size.w > 136) {
    header_scroll_offset = 0;
    header_scroll_max = header_size.w - 136;
    header_scroll_callback(NULL);
  }
}

static void header_scroll_callback(void* data) {
  if (header_scroll_sleep > 0) {
    header_scroll_sleep -= 1;
  }
  else {
    header_scroll_offset += header_scroll_reverse ? -1 : 1;
    if (header_scroll_offset > header_scroll_max) {
      header_scroll_offset = header_scroll_max;
      header_scroll_reverse = true;
      header_scroll_sleep = HEADER_SCROLL_SLEEP_MAX;
    }
    else if (header_scroll_offset < 0) {
      header_scroll_offset = 0;
      header_scroll_reverse = false;
      header_scroll_sleep = HEADER_SCROLL_SLEEP_MAX;
    }
    layer_mark_dirty(layer_header);
  }
  header_scroll_timer = app_timer_register(70, header_scroll_callback, NULL);
}