/***
 * UK Transport
 * Copyright (C) 2013 Matthew Tole
 *
 * windows/tube.c
 ***/

#include <pebble.h>
#include "win-tube.h"
#include "../libs/pebble-assist.h"
#include "../layers/layer-loading.h"
#include "../tube.h"

static void window_load(Window* window);
static void window_unload(Window* window);
static uint16_t menu_get_num_sections_callback(MenuLayer* me, void* data);
static uint16_t menu_get_num_rows_callback(MenuLayer* me, uint16_t section_index, void* data);
static int16_t menu_get_header_height_callback(MenuLayer* me, uint16_t section_index, void* data);
static int16_t menu_get_cell_height_callback(MenuLayer* me, MenuIndex* cell_index, void* data);
static void menu_draw_header_callback(GContext* ctx, const Layer* cell_layer, uint16_t section_index, void* data);
static void menu_draw_row_callback(GContext* ctx, const Layer* cell_layer, MenuIndex* cell_index, void* data);
static void menu_select_click_callback(MenuLayer* menu_layer, MenuIndex* cell_index, void* callback_context);

static void tube_updated(void);

static Window* window;
static MenuLayer* layer_menu;
static LoadingLayer* layer_loading;

void win_tube_create(void) {
  window = window_create();
  window_set_window_handlers(window, (WindowHandlers) {
    .load = window_load,
    .unload = window_unload
  });
  tube_register_update_handler(tube_updated);
}

void win_tube_destroy(void) {
  window_destroy_safe(window);
}

void win_tube_show(bool animated) {
  window_stack_push(window, animated);
  tube_update_lines();
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
  loading_layer_set_text(layer_loading, "Updating Tube Status");
}

static void window_unload(Window* window) {
  menu_layer_destroy_safe(layer_menu);
  loading_layer_destroy_safe(layer_loading);
}

static uint16_t menu_get_num_sections_callback(MenuLayer* me, void* data) {
  return 1;
}

static uint16_t menu_get_num_rows_callback(MenuLayer* me, uint16_t section_index, void* data) {
  return tube_get_line_count();
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
  TubeLine* line = tube_get_line(cell_index->row);
}

static void menu_select_click_callback(MenuLayer* menu_layer, MenuIndex* cell_index, void* callback_context) {

}

static void tube_updated(void) {
  menu_layer_reload_data(layer_menu);
}