/*

UK Transport v1.7

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

src/windows/win-tube.c

*/

#include <pebble.h>
#include "win-tube.h"
#include "win-tube-details.h"
#include "../libs/pebble-assist/pebble-assist.h"
#include "../libs/bitmap-loader/bitmap-loader.h"
#include "../layers/layer-loading.h"
#include "../tube.h"

static void window_load(Window* window);
static void window_unload(Window* window);
static void window_disappear(Window* window);
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
    .unload = window_unload,
    .disappear = window_disappear
  });
  tube_register_update_handler(tube_updated);
  win_tube_details_create();
}

void win_tube_destroy(void) {
  window_destroy(window);
  win_tube_details_destroy();
}

void win_tube_show(bool animated) {
  window_stack_push(window, animated);
  tube_update_lines();
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
  loading_layer_set_text(layer_loading, "Updating Tube Status");
}

static void window_unload(Window* window) {
  menu_layer_destroy(layer_menu);
  loading_layer_destroy(layer_loading);
}

static void window_disappear(Window* window) {
  layer_hide(layer_loading);
}

static uint16_t menu_get_num_sections_callback(MenuLayer* me, void* data) {
  return 2;
}

static uint16_t menu_get_num_rows_callback(MenuLayer* me, uint16_t section_index, void* data) {
  return section_index == 0 ? tube_get_line_count() : 1;
}

static int16_t menu_get_header_height_callback(MenuLayer* me, uint16_t section_index, void* data) {
  return section_index == 0 ? 0 : 4;
}

static int16_t menu_get_cell_height_callback(MenuLayer* me, MenuIndex* cell_index, void* data) {
  return cell_index->section == 0 ? 44 : 36;
}

static void menu_draw_header_callback(GContext* ctx, const Layer* cell_layer, uint16_t section_index, void* data) {
  return;
}

static void menu_draw_row_callback(GContext* ctx, const Layer* cell_layer, MenuIndex* cell_index, void* data) {
  graphics_context_set_text_color(ctx, GColorBlack);
  switch (cell_index->section) {
    case 0: {
      TubeLine* line = tube_get_line(cell_index->row);
      graphics_draw_text(ctx, line->name, fonts_get_system_font(FONT_KEY_GOTHIC_24_BOLD), GRect(4, -4, 140, 28), GTextOverflowModeFill, GTextAlignmentLeft, NULL);
      graphics_draw_text(ctx, line->status, (strcmp(line->status, "Good Service") == 0) ? fonts_get_system_font(FONT_KEY_GOTHIC_18) : fonts_get_system_font(FONT_KEY_GOTHIC_18_BOLD), GRect(4, 20, 140, 24), GTextOverflowModeFill, GTextAlignmentLeft, NULL);
    }
    break;
    case 1:
      graphics_draw_bitmap_in_rect(ctx, bitmaps_get_bitmap(RESOURCE_ID_MENU_REFRESH), GRect(6, 6, 24, 24));
      graphics_draw_text(ctx, "Refresh", fonts_get_system_font(FONT_KEY_GOTHIC_24_BOLD), GRect(48, 0, 140, 28), GTextOverflowModeFill, GTextAlignmentLeft, NULL);
    break;
  }
}

static void menu_select_click_callback(MenuLayer* menu_layer, MenuIndex* cell_index, void* callback_context) {
  if (cell_index->section == 0) {
    TubeLine* line = tube_get_line(cell_index->row);
    if (true || strcmp(line->status, "Good Service") != 0) {
      win_tube_details_show(line, false);
    }
  }
  if (cell_index->section == 1 && cell_index->row == 0) {
    tube_update_lines();
    layer_show(layer_loading);
  }
}

static void tube_updated(void) {
  if (! window_stack_contains_window(window)) {
    return;
  }
  menu_layer_reload_data(layer_menu);
  menu_layer_set_selected_index(layer_menu, (MenuIndex) { .section = 0, .row = 0 }, MenuRowAlignTop, false);
  layer_hide(layer_loading);
}
