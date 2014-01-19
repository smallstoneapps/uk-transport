/***
 * UK Transport
 * Copyright (C) 2013 Matthew Tole
 *
 * windows/bus.c
 ***/

#include <pebble.h>
#include "../libs/pebble-assist/pebble-assist.h"
#include "../libs/bitmap-loader/bitmap-loader.h"
#include "../layers/layer-loading.h"
#include "../bus.h"
#include "win-bus.h"
#include "win-bus-stop.h"

static void window_load(Window* window);
static void window_unload(Window* window);
static uint16_t menu_get_num_sections_callback(MenuLayer* me, void* data);
static uint16_t menu_get_num_rows_callback(MenuLayer* me, uint16_t section_index, void* data);
static int16_t menu_get_header_height_callback(MenuLayer* me, uint16_t section_index, void* data);
static int16_t menu_get_cell_height_callback(MenuLayer* me, MenuIndex* cell_index, void* data);
static void menu_draw_header_callback(GContext* ctx, const Layer* cell_layer, uint16_t section_index, void* data);
static void menu_draw_row_callback(GContext* ctx, const Layer* cell_layer, MenuIndex* cell_index, void* data);
static void menu_select_click_callback(MenuLayer* menu_layer, MenuIndex* cell_index, void* callback_context);

static void stops_updated(void);

static Window* window;
static MenuLayer* layer_menu;
static LoadingLayer* layer_loading;

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
  layer_show(layer_loading);
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

  layer_loading = loading_layer_create(window);
  loading_layer_set_text(layer_loading, "Locating Nearest Bus Stops");
}

static void window_unload(Window* window) {
  menu_layer_destroy(layer_menu);
  loading_layer_destroy(layer_loading);
}

static uint16_t menu_get_num_sections_callback(MenuLayer* me, void* data) {
  return 1;
}

static uint16_t menu_get_num_rows_callback(MenuLayer* me, uint16_t section_index, void* data) {
  return bus_get_stop_count();
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
  BusStop* stop = bus_get_stop(cell_index->row);
  graphics_context_set_text_color(ctx, GColorBlack);
  graphics_draw_text(ctx, stop->indicator, fonts_get_system_font(FONT_KEY_GOTHIC_24_BOLD), GRect(4, -4, 136, 28), GTextOverflowModeFill, GTextAlignmentLeft, NULL);
  graphics_draw_text(ctx, stop->name, fonts_get_system_font(FONT_KEY_GOTHIC_18_BOLD), GRect(4, 20, 136, 22), GTextOverflowModeFill, GTextAlignmentLeft, NULL);
}

static void menu_select_click_callback(MenuLayer* menu_layer, MenuIndex* cell_index, void* callback_context) {
  win_bus_stop_set_stop(bus_get_stop(cell_index->row));
  win_bus_stop_show(true);
}

static void stops_updated(void) {
  if (! window_stack_contains_window(window)) {
    return;
  }
  menu_layer_reload_data(layer_menu);
  layer_hide(layer_loading);
}