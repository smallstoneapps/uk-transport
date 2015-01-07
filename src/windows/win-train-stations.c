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

src/windows/win-train-stations.c

*/

#include <pebble.h>
#include "win-train-departures.h"
#include "win-train-stations.h"
#include <pebble-assist.h>
#include <bitmap-loader.h>
#include <message-queue.h>
#include "../layers/layer-loading.h"
#include "../train.h"
#include "../analytics.h"

#define SECTION_FAVOURITE 0
#define SECTION_NEARBY 1

static void window_load(Window* window);
static void window_unload(Window* window);
static void window_appear(Window* window);
static uint16_t menu_get_num_sections_callback(MenuLayer* me, void* data);
static uint16_t menu_get_num_rows_callback(MenuLayer* me, uint16_t section_index, void* data);
static int16_t menu_get_header_height_callback(MenuLayer* me, uint16_t section_index, void* data);
static int16_t menu_get_cell_height_callback(MenuLayer* me, MenuIndex* cell_index, void* data);
static void menu_draw_header_callback(GContext* ctx, const Layer* cell_layer, uint16_t section_index, void* data);
static void menu_draw_row_callback(GContext* ctx, const Layer* cell_layer, MenuIndex* cell_index, void* data);
static void menu_select_click_callback(MenuLayer* menu_layer, MenuIndex* cell_index, void* callback_context);
static void menu_select_long_click_callback(MenuLayer* menu_layer, MenuIndex* cell_index, void* callback_context);

static void stations_updated(void);
static void draw_station(GContext* ctx, TrainStation* station);
static void draw_station_favourite(GContext* ctx, TrainStation* station);
static void goto_station(TrainStation* station);
static uint16_t actual_section(uint16_t section_index);

static Window* window;
static MenuLayer* layer_menu;
static LoadingLayer* layer_loading;
static char* loading_message = "Finding Train Stations";

void win_train_create(void) {
  window = window_create();
  window_set_window_handlers(window, (WindowHandlers) {
    .load = window_load,
    .unload = window_unload,
    .appear = window_appear
  });
  win_train_departures_create();
  train_register_stations_update_handler(stations_updated);
}

void win_train_destroy(void) {
  window_destroy(window);
}

void win_train_show(bool animated) {
  window_stack_push(window, animated);
  train_get_stations();
  if (train_get_favourite_count() == 0) {
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

static void window_appear(Window* window) {
  menu_layer_reload_data(layer_menu);
}

static uint16_t menu_get_num_sections_callback(MenuLayer* me, void* data) {
  uint8_t sections = 1;
  sections += train_get_favourite_count() > 0 ? 1 : 0;
  return sections;
}

static uint16_t menu_get_num_rows_callback(MenuLayer* me, uint16_t section_index, void* data) {
  switch (actual_section(section_index)) {
    case SECTION_FAVOURITE:
      return train_get_favourite_count();
    case SECTION_NEARBY:
      return train_get_station_count() == 0 ? 1 : train_get_station_count();
  }
  return 0;
}

static int16_t menu_get_header_height_callback(MenuLayer* me, uint16_t section_index, void* data) {
  if (train_get_favourite_count() == 0) {
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
  return 34;
}

static void menu_draw_header_callback(GContext* ctx, const Layer* cell_layer, uint16_t section_index, void* data) {
  // Blank space between sections.
}

static void menu_draw_row_callback(GContext* ctx, const Layer* cell_layer, MenuIndex* cell_index, void* data) {
  switch (actual_section(cell_index->section)) {
    case SECTION_FAVOURITE:
      draw_station_favourite(ctx, train_get_favourite(cell_index->row));
      break;
    case SECTION_NEARBY:
      if (train_get_station_count() == 0) {
        graphics_context_set_text_color(ctx, GColorBlack);
        graphics_draw_text(ctx, loading_message, fonts_get_system_font(FONT_KEY_GOTHIC_24_BOLD), GRect(4, 0, 136, 28), GTextOverflowModeFill, GTextAlignmentLeft, NULL);
      }
      else {
        draw_station(ctx, train_get_station(cell_index->row));
      }
      break;
  }
}

static void menu_select_click_callback(MenuLayer* menu_layer, MenuIndex* cell_index, void* callback_context) {
  switch (actual_section(cell_index->section)) {
    case SECTION_FAVOURITE:
    snprintf(analytics_str, 32, "code`%s", train_get_favourite(cell_index->row)->code);
      analytics_track_event("train.favourite.view", analytics_str);
      goto_station(train_get_favourite(cell_index->row));
      break;
    case SECTION_NEARBY:
    snprintf(analytics_str, 32, "code`%s", train_get_station(cell_index->row)->code);
      analytics_track_event("train.station.view", analytics_str);
      goto_station(train_get_station(cell_index->row));
      break;
  }
}

static void menu_select_long_click_callback(MenuLayer* menu_layer, MenuIndex* cell_index, void* callback_context) {
  TrainStation* station = NULL;
  switch (actual_section(cell_index->section)) {
    case SECTION_FAVOURITE:
      station = train_get_favourite(cell_index->row);
      snprintf(analytics_str, 32, "code`%s", station->code);
      analytics_track_event("train.favourite.remove", analytics_str);
      train_remove_favourite(station);
      menu_layer_reload_data(layer_menu);
    break;
    case SECTION_NEARBY:
      station = train_get_station(cell_index->row);
      snprintf(analytics_str, 32, "code`%s", station->code);
      analytics_track_event("train.favourite.add", analytics_str);
      train_add_favourite(station);
      menu_layer_reload_data(layer_menu);
      menu_layer_set_selected_index(layer_menu, (MenuIndex) {
        .section = 0,
        .row = (train_get_favourite_count() - 1)
      }, MenuRowAlignCenter, false);
      break;
  }
}

static void stations_updated(void) {
  if (! window_stack_contains_window(window)) {
    return;
  }
  menu_layer_reload_data(layer_menu);
  layer_hide(layer_loading);
}

static void draw_station(GContext* ctx, TrainStation* station) {
  if (station == NULL) {
    return;
  }
  graphics_context_set_text_color(ctx, GColorBlack);
  graphics_draw_text(ctx, station->name,
    fonts_get_system_font(FONT_KEY_GOTHIC_24_BOLD),
    GRect(4, 0, 136, 28),
    GTextOverflowModeFill,
    GTextAlignmentLeft,
    NULL);
}

static void draw_station_favourite(GContext* ctx, TrainStation* station) {
  if (station == NULL) {
    return;
  }
  graphics_context_set_text_color(ctx, GColorBlack);
  graphics_draw_bitmap_in_rect(ctx, bitmaps_get_bitmap(RESOURCE_ID_ICON_FAVOURITE), GRect(4, 10, 14, 14));
  graphics_draw_text(ctx, station->name,
    fonts_get_system_font(FONT_KEY_GOTHIC_24_BOLD),
    GRect(22, 0, 118, 28),
    GTextOverflowModeFill,
    GTextAlignmentLeft,
    NULL);
}


static void goto_station(TrainStation* station) {
  if (station == NULL) {
    return;
  }
  win_train_departures_set_station(station);
  win_train_departures_show(false);
}

static uint16_t actual_section(uint16_t section_index) {
  uint16_t actual_section = section_index;
  if (train_get_favourite_count() == 0) {
    actual_section += 1;
  }
  return actual_section;
}