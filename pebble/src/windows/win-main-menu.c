/***
 * UK Transport
 * Copyright (C) 2013 Matthew Tole
 *
 * windows/main-menu.c
 ***/

#include <pebble.h>
#include "../libs/pebble-assist.h"
#include "win-main-menu.h"
#include "win-bus.h"
#include "win-tube.h"
#include "win-train.h"
#include "win-settings.h"
#include "win-about.h"

#define MENU_SECTIONS 2
#define MENU_SECTION_MAIN 0
#define MENU_SECTION_FOOTER 1
#define MENU_ROWS_MAIN 3
#define MENU_ROWS_FOOTER 2
#define MENU_ROW_MAIN_TUBE 0
#define MENU_ROW_MAIN_BUS 1
#define MENU_ROW_MAIN_TRAIN 2
#define MENU_ROW_FOOTER_SETTINGS 0
#define MENU_ROW_FOOTER_ABOUT 1

static uint16_t menu_get_num_sections_callback(MenuLayer* me, void* data);
static uint16_t menu_get_num_rows_callback(MenuLayer* me, uint16_t section_index, void* data);
static int16_t menu_get_header_height_callback(MenuLayer* me, uint16_t section_index, void* data);
static int16_t menu_get_cell_height_callback(MenuLayer* me, MenuIndex* cell_index, void* data);
static void menu_draw_header_callback(GContext* ctx, const Layer* cell_layer, uint16_t section_index, void* data);
static void menu_draw_row_callback(GContext* ctx, const Layer* cell_layer, MenuIndex* cell_index, void* data);
static void menu_draw_main_row(GContext* ctx, const Layer* cell_layer, uint16_t row_index);
static void menu_draw_footer_row(GContext* ctx, const Layer* cell_layer, uint16_t row_index);
static void menu_select_click_callback(MenuLayer* menu_layer, MenuIndex* cell_index, void* callback_context);

static Window* window;
static MenuLayer* layer_menu;

void win_main_menu_create(void) {
  win_bus_create();
  win_tube_create();
  win_train_create();
  win_settings_create();
  win_about_create();

  window = window_create();

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

void win_main_menu_destroy(void) {
  menu_layer_destroy_safe(layer_menu);
  window_destroy_safe(window);

  win_about_destroy();
  win_settings_destroy();
  win_train_destroy();
  win_tube_destroy();
  win_bus_destroy();
}

void win_main_menu_show(bool animated) {
  window_stack_push(window, animated);
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - //

static uint16_t menu_get_num_sections_callback(MenuLayer* me, void* data) {
  return MENU_SECTIONS;
}

static uint16_t menu_get_num_rows_callback(MenuLayer* me, uint16_t section_index, void* data) {
  switch (section_index) {
    case MENU_SECTION_MAIN:
      return MENU_ROWS_MAIN;
    case MENU_SECTION_FOOTER:
      return MENU_ROWS_FOOTER;
  }
  return 0;
}

static int16_t menu_get_header_height_callback(MenuLayer* me, uint16_t section_index, void* data) {
  switch (section_index) {
    case MENU_SECTION_MAIN:
      return 0;
    case MENU_SECTION_FOOTER:
      return 4;
  }
  return 0;
}

static int16_t menu_get_cell_height_callback(MenuLayer* me, MenuIndex* cell_index, void* data) {
  return 44;
}

static void menu_draw_header_callback(GContext* ctx, const Layer* cell_layer, uint16_t section_index, void* data) {
  switch (section_index) {
    case MENU_SECTION_MAIN:
    break;
    case MENU_SECTION_FOOTER:
    break;
  }
}

static void menu_draw_row_callback(GContext* ctx, const Layer* cell_layer, MenuIndex* cell_index, void* data) {
  switch (cell_index->section) {
    case MENU_SECTION_MAIN:
      menu_draw_main_row(ctx, cell_layer, cell_index->row);
    break;
    case MENU_SECTION_FOOTER:
      menu_draw_footer_row(ctx, cell_layer, cell_index->row);
    break;
  }
}

static void menu_draw_main_row(GContext* ctx, const Layer* cell_layer, uint16_t row_index) {
  switch (row_index) {
    case MENU_ROW_MAIN_TUBE:
      menu_cell_title_draw(ctx, cell_layer, "London Tube");
    break;
    case MENU_ROW_MAIN_BUS:
      menu_cell_title_draw(ctx, cell_layer, "Live Buses");
    break;
    case MENU_ROW_MAIN_TRAIN:
      menu_cell_title_draw(ctx, cell_layer, "Live Train");
    break;
  }
}

static void menu_draw_footer_row(GContext* ctx, const Layer* cell_layer, uint16_t row_index) {
  switch (row_index) {
    case MENU_ROW_FOOTER_SETTINGS:
      menu_cell_title_draw(ctx, cell_layer, "Settings");
    break;
    case MENU_ROW_FOOTER_ABOUT:
      menu_cell_title_draw(ctx, cell_layer, "About");
    break;
  }
}

static void menu_select_click_callback(MenuLayer* menu_layer, MenuIndex* cell_index, void* callback_context) {
  switch (cell_index->section) {
    case MENU_SECTION_MAIN:
      switch (cell_index->row) {
        case MENU_ROW_MAIN_TUBE:
          win_tube_show(true);
        break;
        case MENU_ROW_MAIN_BUS:
          win_bus_show(true);
        break;
        case MENU_ROW_MAIN_TRAIN:
          win_train_show(true);
        break;
      }
    break;
    case MENU_SECTION_FOOTER:
      switch (cell_index->row) {
        case MENU_ROW_FOOTER_SETTINGS:
          win_settings_show(true);
        break;
        case MENU_ROW_FOOTER_ABOUT:
          win_about_show(true);
        break;
      }
    break;
  }
}
