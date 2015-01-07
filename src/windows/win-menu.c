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

src/windows/win-menu.c

*/

#include <pebble.h>
#include <pebble-assist.h>
#include <bitmap-loader.h>
#include "win-menu.h"
#include "win-bus.h"
#include "win-tube.h"
#include "win-train-stations.h"
#include "win-about.h"
#include "../analytics.h"

#define MENU_SECTIONS 2

#define MENU_SECTION_MAIN 0
#define MENU_SECTION_FOOTER 1

#define MENU_ROWS_MAIN 3
#define MENU_ROWS_FOOTER 1

#define MENU_ROW_MAIN_TUBE 2
#define MENU_ROW_MAIN_BUS 0
#define MENU_ROW_MAIN_TRAIN 1

#define MENU_ROW_FOOTER_SETTINGS 1
#define MENU_ROW_FOOTER_ABOUT 0

static void window_load(Window* window);
static void window_unload(Window* window);

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
  win_about_create();

  window = window_create();
  window_set_window_handlers(window, (WindowHandlers) {
    .load = window_load,
    .unload = window_unload
  });
}

void win_main_menu_destroy(void) {
  window_destroy(window);
  win_about_destroy();
  win_train_destroy();
  win_tube_destroy();
  win_bus_destroy();
}

void win_main_menu_show(bool animated) {
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
}

static void window_unload(Window* window) {
  menu_layer_destroy(layer_menu);
}

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
  return 40;
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
  char title[24];
  GBitmap* icon = NULL;

  switch (row_index) {
    case MENU_ROW_MAIN_TUBE:
      strcpy(title, "Tube");
      icon = bitmaps_get_bitmap(RESOURCE_ID_MENU_TFL);
    break;
    case MENU_ROW_MAIN_BUS:
      strcpy(title, "Buses");
      icon = bitmaps_get_bitmap(RESOURCE_ID_MENU_BUS);
    break;
    case MENU_ROW_MAIN_TRAIN:
      strcpy(title, "Trains");
      icon = bitmaps_get_bitmap(RESOURCE_ID_MENU_RAIL);
    break;
  }

  graphics_context_set_text_color(ctx, GColorBlack);
  graphics_draw_text(ctx, title, fonts_get_system_font(FONT_KEY_GOTHIC_24_BOLD), GRect(36, 3, 100, 24), GTextOverflowModeFill, GTextAlignmentLeft, NULL);
  graphics_draw_bitmap_in_rect(ctx, icon, GRect(4, 8, 24, 24));
}

static void menu_draw_footer_row(GContext* ctx, const Layer* cell_layer, uint16_t row_index) {
  char title[24];
  GBitmap* icon = NULL;

  switch (row_index) {
    case MENU_ROW_FOOTER_SETTINGS:
      strcpy(title, "Settings");
      icon = bitmaps_get_bitmap(RESOURCE_ID_MENU_SETTINGS);
    break;
    case MENU_ROW_FOOTER_ABOUT:
      strcpy(title, "About");
      icon = bitmaps_get_bitmap(RESOURCE_ID_MENU_ABOUT);
    break;
  }

  graphics_context_set_text_color(ctx, GColorBlack);
  graphics_draw_text(ctx, title, fonts_get_system_font(FONT_KEY_GOTHIC_24_BOLD), GRect(36, 3, 100, 28), GTextOverflowModeFill, GTextAlignmentLeft, NULL);
  graphics_draw_bitmap_in_rect(ctx, icon, GRect(4, 8, 24, 24));
}

static void menu_select_click_callback(MenuLayer* menu_layer, MenuIndex* cell_index, void* callback_context) {
  switch (cell_index->section) {
    case MENU_SECTION_MAIN:
      switch (cell_index->row) {
        case MENU_ROW_MAIN_TUBE:
          win_tube_show(false);
        break;
        case MENU_ROW_MAIN_BUS:
          win_bus_show(false);
        break;
        case MENU_ROW_MAIN_TRAIN:
          win_train_show(false);
        break;
      }
    break;
    case MENU_SECTION_FOOTER:
      switch (cell_index->row) {
        case MENU_ROW_FOOTER_ABOUT:
          analytics_track_event("window.about", " ");
          win_about_show(false);
        break;
      }
    break;
  }
}
