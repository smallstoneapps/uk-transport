/***
 * UK Transport
 * Copyright (C) 2013 Matthew Tole
 *
 * windows/train-station.c
 ***/

#include <pebble.h>
#include "win-train-station.h"
#include "../libs/bitmap-loader/bitmap-loader.h"
#include "../libs/pebble-assist/pebble-assist.h"
#include "../layers/layer-loading.h"
#include "../train.h"

static void window_load(Window* window);
static void window_unload(Window* window);
static uint16_t menu_get_num_sections_callback(MenuLayer* me, void* data);
static uint16_t menu_get_num_rows_callback(MenuLayer* me, uint16_t section_index, void* data);
static int16_t menu_get_header_height_callback(MenuLayer* me, uint16_t section_index, void* data);
static int16_t menu_get_cell_height_callback(MenuLayer* me, MenuIndex* cell_index, void* data);
static void menu_draw_header_callback(GContext* ctx, const Layer* cell_layer, uint16_t section_index, void* data);
static void menu_draw_row_callback(GContext* ctx, const Layer* cell_layer, MenuIndex* cell_index, void* data);

static void layer_header_update(Layer* layer, GContext* ctx);

static void departures_update(void);

static Window* window;
static MenuLayer* layer_menu;
static LoadingLayer* layer_loading;
static Layer* layer_header;
static TrainStation* current_station = NULL;

void win_train_station_create(void) {
  window = window_create();
  window_set_window_handlers(window, (WindowHandlers) {
    .load = window_load,
    .unload = window_unload
  });
  train_register_departures_update_handler(departures_update);
}

void win_train_station_destroy(void) {
  window_destroy(window);
}

void win_train_station_show(bool animated) {
  window_stack_push(window, animated);
  train_get_departures(current_station);
  layer_show(layer_loading);
}

void win_train_station_set_station(TrainStation* station) {
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
    .draw_header = menu_draw_header_callback,
    .draw_row = menu_draw_row_callback
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

static uint16_t menu_get_num_rows_callback(MenuLayer* me, uint16_t section_index, void* data) {
  return train_get_departure_count() == 0 ? 1 : train_get_departure_count();
}

static int16_t menu_get_header_height_callback(MenuLayer* me, uint16_t section_index, void* data) {
  return 0;
}

static int16_t menu_get_cell_height_callback(MenuLayer* me, MenuIndex* cell_index, void* data) {
  return 30;
}

static void menu_draw_header_callback(GContext* ctx, const Layer* cell_layer, uint16_t section_index, void* data) {
  return;
}

static void menu_draw_row_callback(GContext* ctx, const Layer* cell_layer, MenuIndex* cell_index, void* data) {\
  graphics_context_set_text_color(ctx, GColorBlack);
  if (cell_index->row == 0 && train_get_departure_count() == 0) {
    graphics_draw_text(ctx, "No Departures", fonts_get_system_font(FONT_KEY_GOTHIC_24_BOLD), GRect(4, -3, 136, 28), GTextOverflowModeFill, GTextAlignmentCenter, NULL);
  }
  else {
    TrainDeparture* departure = train_get_departure(cell_index->row);
    graphics_draw_text(ctx, departure->destination, fonts_get_system_font(FONT_KEY_GOTHIC_24), GRect(4, -3, 96, 28), GTextOverflowModeFill, GTextAlignmentLeft, NULL);
    graphics_draw_text(ctx, departure->est_time, fonts_get_system_font(FONT_KEY_GOTHIC_18_BOLD), GRect(4, 2, 136, 22), GTextOverflowModeFill, GTextAlignmentRight, NULL);
  }
}

static void layer_header_update(Layer* layer, GContext* ctx) {
  graphics_context_set_fill_color(ctx, GColorBlack);
  graphics_context_set_text_color(ctx, GColorWhite);
  graphics_fill_rect(ctx, layer_get_bounds(layer), 0, GCornerNone);
  graphics_draw_text(ctx, current_station->name, fonts_get_system_font(FONT_KEY_GOTHIC_14_BOLD), GRect(4, 2, 136, 22), GTextOverflowModeFill, GTextAlignmentCenter, NULL);
}

static void departures_update(void) {
  menu_layer_reload_data(layer_menu);
  layer_hide(layer_loading);
}