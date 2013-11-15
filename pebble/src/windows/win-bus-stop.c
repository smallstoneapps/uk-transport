/***
 * UK Transport
 * Copyright (C) 2013 Matthew Tole
 *
 * windows/bus-stop.c
 ***/

#include <pebble.h>
#include "win-bus-stop.h"
#include "../libs/pebble-assist.h"
#include "../bus.h"

#define MAX_DEPARTURES 10

static void window_load(Window* window);
static void window_unload(Window* window);
static void layer_loading_update(Layer* layer, GContext* ctx);
static uint16_t menu_get_num_sections_callback(MenuLayer* me, void* data);
static uint16_t menu_get_num_rows_callback(MenuLayer* me, uint16_t section_index, void* data);
static int16_t menu_get_header_height_callback(MenuLayer* me, uint16_t section_index, void* data);
static int16_t menu_get_cell_height_callback(MenuLayer* me, MenuIndex* cell_index, void* data);
static void menu_draw_header_callback(GContext* ctx, const Layer* cell_layer, uint16_t section_index, void* data);
static void menu_draw_row_callback(GContext* ctx, const Layer* cell_layer, MenuIndex* cell_index, void* data);
static void menu_select_click_callback(MenuLayer* menu_layer, MenuIndex* cell_index, void* callback_context);

static Window* window;
static MenuLayer* layer_menu;
static Layer* layer_loading;
static BusDeparture* departures[MAX_DEPARTURES];
static uint8_t departure_count = 0;
static BusStop* current_stop;

void win_bus_stop_create(void) {
  window = window_create();
  window_set_window_handlers(window, (WindowHandlers) {
    .load = window_load,
    .unload = window_unload
  });
}

void win_bus_stop_destroy(void) {
  window_destroy_safe(window);
}

void win_bus_stop_set_stop(BusStop* stop) {
  current_stop = stop;
}

void win_bus_stop_show(bool animated) {
  window_stack_push(window, animated);
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

  layer_loading = layer_create_fullscreen(window);
  layer_set_update_proc(layer_loading, &layer_loading_update);
  layer_add_to_window(layer_loading, window);
}

static void window_unload(Window* window) {
  menu_layer_destroy_safe(layer_menu);
  layer_destroy_safe(layer_loading);
}


static void layer_loading_update(Layer* layer, GContext* ctx) {
  graphics_fill_rect(ctx, layer_get_bounds(layer), 0, GCornerNone);
}

static uint16_t menu_get_num_sections_callback(MenuLayer* me, void* data) {
  return 1;
}

static uint16_t menu_get_num_rows_callback(MenuLayer* me, uint16_t section_index, void* data) {
  return departure_count;
}

static int16_t menu_get_header_height_callback(MenuLayer* me, uint16_t section_index, void* data) {
  return 0;
}

static int16_t menu_get_cell_height_callback(MenuLayer* me, MenuIndex* cell_index, void* data) {
  return 44;
}

static void menu_draw_header_callback(GContext* ctx, const Layer* cell_layer, uint16_t section_index, void* data) {
  return;
}

static void menu_draw_row_callback(GContext* ctx, const Layer* cell_layer, MenuIndex* cell_index, void* data) {
  BusDeparture* departure = departures[cell_index->row];
}

static void menu_select_click_callback(MenuLayer* menu_layer, MenuIndex* cell_index, void* callback_context) {
}
