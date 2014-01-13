/***
 * UK Transport
 * Copyright (C) 2013 Matthew Tole
 *
 * windows/train.c
 ***/

#include <pebble.h>
#include "win-train.h"
#include "win-train-station.h"
#include "../libs/pebble-assist/pebble-assist.h"
#include "../libs/bitmap-loader/bitmap-loader.h"
#include "../layers/layer-loading.h"
#include "../train.h"

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

static void stations_updated(void);
static void draw_station(GContext* ctx, TrainStation* station);
static void goto_station(TrainStation* station);

static Window* window;
static MenuLayer* layer_menu;

void win_train_create(void) {
  window = window_create();
  window_set_window_handlers(window, (WindowHandlers) {
    .load = window_load,
    .unload = window_unload,
    .appear = window_appear
  });
  win_train_station_create();
  train_register_stations_update_handler(stations_updated);
}

void win_train_destroy(void) {
  window_destroy(window);
}

void win_train_show(bool animated) {
  window_stack_push(window, animated);
  train_get_stations();
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
    .select_click = menu_select_click_callback
  });
  menu_layer_set_click_config_onto_window(layer_menu, window);
  menu_layer_add_to_window(layer_menu, window);
}

static void window_unload(Window* window) {
  menu_layer_destroy(layer_menu);
}

static void window_appear(Window* window) {
  menu_layer_reload_data(layer_menu);
}

static uint16_t menu_get_num_sections_callback(MenuLayer* me, void* data) {
  return (train_get_recent_count() > 0) ? 2 : 1;
}

static uint16_t menu_get_num_rows_callback(MenuLayer* me, uint16_t section_index, void* data) {
  if (train_get_recent_count() > 0 && section_index == 0) {
    return train_get_recent_count();
  }
  return train_get_station_count();
}

static int16_t menu_get_header_height_callback(MenuLayer* me, uint16_t section_index, void* data) {
  if (train_get_recent_count() > 0) {
    return MENU_CELL_BASIC_HEADER_HEIGHT;
  }
  return 0;
}

static int16_t menu_get_cell_height_callback(MenuLayer* me, MenuIndex* cell_index, void* data) {
  return 30;
}

static void menu_draw_header_callback(GContext* ctx, const Layer* cell_layer, uint16_t section_index, void* data) {
  if (train_get_recent_count() == 0) {
    return;
  }
  switch (section_index) {
    case 0:
      menu_cell_basic_header_draw(ctx, cell_layer, "Recent Stations");
    break;
    case 1:
      menu_cell_basic_header_draw(ctx, cell_layer, "Nearby Stations");
    break;
  }
}

static void menu_draw_row_callback(GContext* ctx, const Layer* cell_layer, MenuIndex* cell_index, void* data) {
  if (train_get_recent_count() > 0 && cell_index->section == 0) {
    draw_station(ctx, train_get_recent(cell_index->row));
  }
  else {
    draw_station(ctx, train_get_station(cell_index->row));
  }
}

static void menu_select_click_callback(MenuLayer* menu_layer, MenuIndex* cell_index, void* callback_context) {
  if (train_get_recent_count() > 0 && cell_index->section == 0) {
    goto_station(train_get_recent(cell_index->row));
  }
  else {
    goto_station(train_get_station(cell_index->row));
  }
}

static void stations_updated(void) {
  menu_layer_reload_data(layer_menu);
}

static void draw_station(GContext* ctx, TrainStation* station) {
  if (station == NULL) {
    return;
  }
  graphics_context_set_text_color(ctx, GColorBlack);
  graphics_draw_text(ctx, station->name, fonts_get_system_font(FONT_KEY_GOTHIC_24_BOLD), GRect(4, -2, 136, 28), GTextOverflowModeFill, GTextAlignmentLeft, NULL);
}

static void goto_station(TrainStation* station) {
  if (station == NULL) {
    return;
  }
  win_train_station_set_station(station);
  win_train_station_show(true);
  train_mark_recent(station);
}