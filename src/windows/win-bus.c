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

src/windows/win-bus.c

*/

#include <pebble.h>
#include <pebble-assist.h>
#include <bitmap-loader.h>
#include "../layers/layer-loading.h"
#include "../bus.h"
#include "../analytics.h"
#include "win-bus.h"
#include "win-bus-stop.h"

#define SECTION_FAVOURITE 0
#define SECTION_NEARBY 1

static void window_load(Window* window);
static void window_unload(Window* window);
static uint16_t menu_get_num_sections_callback(MenuLayer* me, void* data);
static uint16_t menu_get_num_rows_callback(MenuLayer* me, uint16_t section_index, void* data);
static int16_t menu_get_header_height_callback(MenuLayer* me, uint16_t section_index, void* data);
static int16_t menu_get_cell_height_callback(MenuLayer* me, MenuIndex* cell_index, void* data);
static void menu_draw_header_callback(GContext* ctx, const Layer* cell_layer, uint16_t section_index, void* data);
static void menu_draw_row_callback(GContext* ctx, const Layer* cell_layer, MenuIndex* cell_index, void* data);
static void menu_select_click_callback(MenuLayer* menu_layer, MenuIndex* cell_index, void* callback_context);
static void menu_select_long_click_callback(MenuLayer* menu_layer, MenuIndex* cell_index, void* callback_context);
static void draw_stop(GContext* ctx, BusStop* stop);
static void draw_stop_favourite(GContext* ctx, BusStop* stop);

static void stops_updated(void);
static uint16_t actual_section(uint16_t section_index);

static Window* window;
static MenuLayer* layer_menu;
static LoadingLayer* layer_loading;

static char* loading_message = "Finding Bus Stops";

void win_bus_create(void) {
  window = window_create();
  window_set_window_handlers(window, (WindowHandlers) {
    .load = window_load,
    .unload = window_unload
  });
  win_bus_stop_create();
  bus_register_stops_update_handler(stops_updated);
}

void win_bus_destroy(void) {
  win_bus_stop_destroy();
  window_destroy(window);
}

void win_bus_show(bool animated) {
  window_stack_push(window, animated);
  bus_get_stops();
  if (bus_get_favourite_count() == 0) {
    layer_show(layer_loading);
  }
  else {
    layer_hide(layer_loading);
  }
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - //

static void window_load(Window* window) {
  layer_menu = menu_layer_create_fullscreen(window);
  menu_layer_set_callbacks(layer_menu, NULL, (MenuLayerCallbacks){
    .get_num_sections = menu_get_num_sections_callback,
    .get_num_rows = menu_get_num_rows_callback,
    .get_header_height = menu_get_header_height_callback,
    .get_cell_height = menu_get_cell_height_callback,
    .draw_header = menu_draw_header_callback,
    .draw_row = menu_draw_row_callback,
    .select_click = menu_select_click_callback,
    .select_long_click = menu_select_long_click_callback
  });
  menu_layer_set_click_config_onto_window(layer_menu, window);
  menu_layer_add_to_window(layer_menu, window);

  layer_loading = loading_layer_create(window);
  loading_layer_set_text(layer_loading, loading_message);
}

static void window_unload(Window* window) {
  menu_layer_destroy(layer_menu);
  loading_layer_destroy(layer_loading);
}

static uint16_t menu_get_num_sections_callback(MenuLayer* me, void* data) {
  uint8_t sections = 1;
  sections += bus_get_favourite_count() > 0 ? 1 : 0;
  return sections;
}

static uint16_t menu_get_num_rows_callback(MenuLayer* me, uint16_t section_index, void* data) {
  switch (actual_section(section_index)) {
    case SECTION_FAVOURITE:
      return bus_get_favourite_count();
    case SECTION_NEARBY:
      return bus_get_stop_count() == 0 ? 1 : bus_get_stop_count();
  }
  return 0;
}

static int16_t menu_get_header_height_callback(MenuLayer* me, uint16_t section_index, void* data) {
  if (bus_get_favourite_count() == 0) {
    return 0;
  }
  switch (actual_section(section_index)) {
    case SECTION_FAVOURITE:
      return 0;
    case SECTION_NEARBY:
      return 4;
  }
  return 0;
}

static int16_t menu_get_cell_height_callback(MenuLayer* me, MenuIndex* cell_index, void* data) {
  return 44;
}

static void menu_draw_header_callback(GContext* ctx, const Layer* cell_layer, uint16_t section_index, void* data) {
  return;
}

static void menu_draw_row_callback(GContext* ctx, const Layer* cell_layer, MenuIndex* cell_index, void* data) {
  switch (actual_section(cell_index->section)) {
    case SECTION_FAVOURITE:
      draw_stop_favourite(ctx, bus_get_favourite(cell_index->row));
      break;
    case SECTION_NEARBY:
      if (bus_get_stop_count() == 0) {
        graphics_context_set_text_color(ctx, GColorBlack);
        graphics_draw_text(ctx, loading_message, fonts_get_system_font(FONT_KEY_GOTHIC_24_BOLD), GRect(4, 0, 136, 28), GTextOverflowModeFill, GTextAlignmentLeft, NULL);
      }
      else {
        draw_stop(ctx, bus_get_stop(cell_index->row));
      }
      break;
  }
}

static void menu_select_click_callback(MenuLayer* menu_layer, MenuIndex* cell_index, void* callback_context) {
  BusStop* stop = NULL;
  switch (actual_section(cell_index->section)) {
    case SECTION_FAVOURITE:
      stop = bus_get_favourite(cell_index->row);
      snprintf(analytics_str, 32, "code`%s", stop->code);
      analytics_track_event("bus.favourite.view", analytics_str);
      break;
    case SECTION_NEARBY:
      stop = bus_get_stop(cell_index->row);
      snprintf(analytics_str, 32, "code`%s", stop->code);
      analytics_track_event("bus.stop.view", analytics_str);
      break;
  }
  if (stop == NULL) {
    return;
  }
  win_bus_stop_set_stop(stop);
  win_bus_stop_show(false);
}

static void menu_select_long_click_callback(MenuLayer* menu_layer, MenuIndex* cell_index, void* callback_context) {
  switch (actual_section(cell_index->section)) {
    case SECTION_FAVOURITE:
      snprintf(analytics_str, 32, "code`%s", bus_get_favourite(cell_index->row)->code);
      analytics_track_event("bus.favourite.remove", analytics_str);
      bus_remove_favourite(bus_get_favourite(cell_index->row));
      menu_layer_reload_data(layer_menu);
      break;
    case SECTION_NEARBY:
      snprintf(analytics_str, 32, "code`%s", bus_get_stop(cell_index->row)->code);
      analytics_track_event("bus.favourite.add", analytics_str);
      bus_add_favourite(bus_get_stop(cell_index->row));
      menu_layer_reload_data(layer_menu);
      menu_layer_set_selected_index(layer_menu, (MenuIndex) {
        .section = 0,
        .row = (bus_get_favourite_count() - 1)
      }, MenuRowAlignCenter, false);
      break;
  }
}

static void draw_stop(GContext* ctx, BusStop* stop) {
  if (NULL == stop) {
    return;
  }
  graphics_context_set_text_color(ctx, GColorBlack);
  graphics_draw_text(ctx, stop->indicator, fonts_get_system_font(FONT_KEY_GOTHIC_24_BOLD), GRect(4, -4, 136, 28), GTextOverflowModeFill, GTextAlignmentLeft, NULL);
  graphics_draw_text(ctx, stop->name, fonts_get_system_font(FONT_KEY_GOTHIC_18_BOLD), GRect(4, 20, 136, 22), GTextOverflowModeFill, GTextAlignmentLeft, NULL);
}

static void draw_stop_favourite(GContext* ctx, BusStop* stop) {
  if (NULL == stop) {
    return;
  }
  graphics_context_set_text_color(ctx, GColorBlack);
  graphics_draw_bitmap_in_rect(ctx, bitmaps_get_bitmap(RESOURCE_ID_ICON_FAVOURITE), GRect(4, 6, 14, 14));
  graphics_draw_text(ctx, stop->indicator, fonts_get_system_font(FONT_KEY_GOTHIC_24_BOLD), GRect(22, -4, 118, 28), GTextOverflowModeFill, GTextAlignmentLeft, NULL);
  graphics_draw_text(ctx, stop->name, fonts_get_system_font(FONT_KEY_GOTHIC_18_BOLD), GRect(4, 20, 136, 22), GTextOverflowModeFill, GTextAlignmentLeft, NULL);
}

static void stops_updated(void) {
  if (! window_stack_contains_window(window)) {
    return;
  }
  menu_layer_reload_data(layer_menu);
  layer_hide(layer_loading);
}

static uint16_t actual_section(uint16_t section_index) {
  uint16_t actual_section = section_index;
  if (bus_get_favourite_count() == 0) {
    actual_section += 1;
  }
  return actual_section;
}