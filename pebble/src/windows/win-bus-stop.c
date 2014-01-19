/***
 * UK Transport
 * Copyright (C) 2013 Matthew Tole
 *
 * windows/bus-stop.c
 ***/

#include <pebble.h>
#include "win-bus-stop.h"
#include "../libs/bitmap-loader/bitmap-loader.h"
#include "../libs/pebble-assist/pebble-assist.h"
#include "../layers/layer-loading.h"
#include "../bus.h"

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
static BusStop* current_stop;

void win_bus_stop_create(void) {
  window = window_create();
  window_set_window_handlers(window, (WindowHandlers) {
    .load = window_load,
    .unload = window_unload
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
  graphics_draw_text(ctx, current_stop->name, fonts_get_system_font(FONT_KEY_GOTHIC_14_BOLD), GRect(4, 2, 136, 22), GTextOverflowModeFill, GTextAlignmentCenter, NULL);
}


static void departures_update(void) {
  menu_layer_reload_data(layer_menu);
  layer_hide(layer_loading);
}