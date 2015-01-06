/*

UK Transport v1.3

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

src/windows/win-train-departures.c

*/

#include <pebble.h>
#include "win-train-departures.h"
#include <bitmap-loader.h>
#include <pebble-assist.h>
#include "../layers/layer-loading.h"
#include "../train.h"

static void window_load(Window* window);
static void window_unload(Window* window);
static uint16_t menu_get_num_sections_callback(MenuLayer* me, void* data);
static uint16_t menu_get_num_rows_callback(MenuLayer* me,
  uint16_t section_index, void* data);
static int16_t menu_get_header_height_callback(MenuLayer* me,
  uint16_t section_index, void* data);
static int16_t menu_get_cell_height_callback(MenuLayer* me,
  MenuIndex* cell_index, void* data);
static void menu_draw_header_callback(GContext* ctx, const Layer* cell_layer,
  uint16_t section_index, void* data);
static void menu_draw_row_callback(GContext* ctx, const Layer* cell_layer,
  MenuIndex* cell_index, void* data);
static void menu_draw_departure_row(GContext* ctx, MenuIndex* cell_index,
  TrainDeparture* departure);
static void menu_draw_departure_row_expanded(GContext* ctx, MenuIndex* cell_index,
  TrainDeparture* departure);
static void menu_select_click_callback(MenuLayer* me, MenuIndex* cell_index,
  void* callback_context);
static void layer_header_update(Layer* layer, GContext* ctx);
static void departures_update(void);

static Window* window;
static MenuLayer* layer_menu;
static LoadingLayer* layer_loading;
static Layer* layer_header;
static TrainStation* current_station = NULL;
static int8_t expanded_row = -1;

void win_train_departures_create(void) {
  window = window_create();
  window_set_window_handlers(window, (WindowHandlers) {
    .load = window_load,
    .unload = window_unload
  });
  train_register_departures_update_handler(departures_update);
}

void win_train_departures_destroy(void) {
  window_destroy(window);
}

void win_train_departures_show(bool animated) {
  window_stack_push(window, animated);
  train_get_departures(current_station);
  layer_show(layer_loading);
}

void win_train_departures_set_station(TrainStation* station) {
  current_station = station;
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - //

static void window_load(Window* window) {

  layer_header = layer_create(GRect(0, 0, 144, 24));
  layer_set_update_proc(layer_header, layer_header_update);
  layer_add_to_window(layer_header, window);

  layer_menu = menu_layer_create(GRect(0, 24, 144, 128));
  menu_layer_set_callbacks(layer_menu, NULL, (MenuLayerCallbacks){
    .get_num_sections = menu_get_num_sections_callback,
    .get_num_rows = menu_get_num_rows_callback,
    .get_header_height = menu_get_header_height_callback,
    .get_cell_height = menu_get_cell_height_callback,
    .draw_row = menu_draw_row_callback,
    .select_click = menu_select_click_callback
  });
  menu_layer_set_click_config_onto_window(layer_menu, window);
  menu_layer_add_to_window(layer_menu, window);

  layer_loading = loading_layer_create(window);
  loading_layer_set_text(layer_loading, "Querying Departures");
}

static void window_unload(Window* window) {
  menu_layer_destroy(layer_menu);
  loading_layer_destroy(layer_loading);
  layer_destroy(layer_header);
}

static uint16_t menu_get_num_sections_callback(MenuLayer* me, void* data) {
  return 1;
}

static uint16_t menu_get_num_rows_callback(MenuLayer* me,
  uint16_t section_index, void* data) {
  return train_get_departure_count() == 0 ? 1 : train_get_departure_count();
}

static int16_t menu_get_header_height_callback(MenuLayer* me,
  uint16_t section_index, void* data) {
  return 0;
}

static int16_t menu_get_cell_height_callback(MenuLayer* me,
  MenuIndex* cell_index, void* data) {
  if (cell_index->row == 0 && train_get_departure_count() == 0) {
    return 28;
  }
  else {
    TrainDeparture* departure = train_get_departure(cell_index->row);
    if (NULL == departure) {
      return 0;
    }
    if (strlen(departure->platform) > 0) {
      return 64;
    }
    return 46;
  }
}

/*static void menu_draw_header_callback(GContext* ctx, const Layer* cell_layer,
  uint16_t section_index, void* data) {
  return;
}*/

static void menu_draw_row_callback(GContext* ctx, const Layer* cell_layer,
  MenuIndex* cell_index, void* data) {\
  graphics_context_set_text_color(ctx, GColorBlack);
  if (cell_index->row == 0 && train_get_departure_count() == 0) {
    graphics_draw_text(ctx, "No Departures", fonts_get_system_font(FONT_KEY_GOTHIC_24_BOLD), GRect(4, -3, 136, 28), GTextOverflowModeFill, GTextAlignmentCenter, NULL);
  }
  else {
    TrainDeparture* departure = train_get_departure(cell_index->row);
    if (NULL == departure) {
      return;
    }
    if (cell_index->row == expanded_row) {
      menu_draw_departure_row_expanded(ctx, cell_index, departure);
    }
    else {
      menu_draw_departure_row(ctx, cell_index, departure);
    }
  }
}

static void menu_draw_departure_row(GContext* ctx, MenuIndex* cell_index,
  TrainDeparture* departure) {

  graphics_draw_text(ctx, departure->destination,
    fonts_get_system_font(FONT_KEY_GOTHIC_24), GRect(4, -3, 136, 24),
    GTextOverflowModeFill, GTextAlignmentLeft, NULL);

  graphics_draw_text(ctx, departure->est_time,
    fonts_get_system_font(FONT_KEY_GOTHIC_18_BOLD), GRect(4, 22, 64, 18),
    GTextOverflowModeFill, GTextAlignmentLeft, NULL);

  GFont* status_font = fonts_get_system_font(FONT_KEY_GOTHIC_18_BOLD);
  if (train_departure_is_ok(departure)) {
    status_font = fonts_get_system_font(FONT_KEY_GOTHIC_18);
  }

  graphics_draw_text(ctx, departure->status,
    status_font, GRect(72, 22, 64, 18),
    GTextOverflowModeFill, GTextAlignmentRight, NULL);

  if (strlen(departure->platform) > 0) {
    uint8_t platform_str_len = strlen(departure->platform) + 10;
    char* platform_str = malloc(platform_str_len);
    snprintf(platform_str, platform_str_len, "PLATFORM %s",
      departure->platform);
    graphics_draw_text(ctx, platform_str,
      fonts_get_system_font(FONT_KEY_GOTHIC_14_BOLD), GRect(4, 44, 136, 14),
      GTextOverflowModeFill, GTextAlignmentLeft, NULL);
    free_safe(platform_str);
  }

}

static void menu_draw_departure_row_expanded(GContext* ctx,
  MenuIndex* cell_index, TrainDeparture* departure) {
}

static void menu_select_click_callback(MenuLayer* me, MenuIndex* cell_index, void* callback_context) {
  if (expanded_row == cell_index->row) {
    expanded_row = -1;
  }
  else {
    expanded_row = cell_index->row;
  }
  menu_layer_reload_data(layer_menu);
}

static void layer_header_update(Layer* layer, GContext* ctx) {
  graphics_context_set_fill_color(ctx, GColorBlack);
  graphics_context_set_text_color(ctx, GColorWhite);
  graphics_fill_rect(ctx, layer_get_bounds(layer), 0, GCornerNone);
  graphics_draw_text(ctx, current_station->name,
    fonts_get_system_font(FONT_KEY_GOTHIC_14_BOLD), GRect(4, 2, 136, 22),
    GTextOverflowModeFill, GTextAlignmentCenter, NULL);
}

static void departures_update(void) {
  if (! window_stack_contains_window(window)) {
    return;
  }
  menu_layer_reload_data(layer_menu);
  layer_hide(layer_loading);
}