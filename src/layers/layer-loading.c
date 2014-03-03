#include <pebble.h>
#include "layer-loading.h"
#include "../libs/font-loader/font-loader.h"
#include "../libs/bitmap-loader/bitmap-loader.h"

typedef struct {
  char* message;
} LoadingData;

static void update_loading_layer(Layer* layer, GContext* ctx);

LoadingLayer* loading_layer_create(Window* window) {
  LoadingLayer* layer = layer_create_with_data(layer_get_bounds(window_get_root_layer(window)), sizeof(LoadingData));
  LoadingData* data = (LoadingData*)layer_get_data(layer);
  data->message = NULL;

  layer_set_update_proc(layer, update_loading_layer);
  layer_add_child(window_get_root_layer(window), layer);
  return layer;
}

void loading_layer_set_text(LoadingLayer* layer, char* text) {
  LoadingData* data = (LoadingData*)layer_get_data(layer);
  if (data->message != NULL) {
    free(data->message);
  }
  data->message = malloc(strlen(text) + 1);
  strcpy(data->message, text);
  layer_mark_dirty(layer);
}

void loading_layer_destroy(LoadingLayer* layer) {
  if (layer == NULL) {
    return;
  }
  LoadingData* data = (LoadingData*)layer_get_data(layer);
  if (data && data->message) {
    free(data->message);
  }
  layer_destroy(layer);
}

static void update_loading_layer(Layer* layer, GContext* ctx) {
  LoadingData* data = (LoadingData*)layer_get_data(layer);
  graphics_context_set_fill_color(ctx, GColorBlack);
  graphics_context_set_text_color(ctx, GColorWhite);
  graphics_fill_rect(ctx, layer_get_bounds(layer), 0, GCornerNone);
  GSize text_size = graphics_text_layout_get_content_size(data->message, fonts_get_system_font(FONT_KEY_GOTHIC_28_BOLD), GRect(8, 0, 144 - 16, 150), GTextOverflowModeWordWrap, GTextAlignmentCenter);
  GRect text_pos = GRect(8, 75 - (text_size.h / 2) - 4, 144 - 16, text_size.h);
  graphics_draw_text(ctx, data->message, fonts_get_system_font(FONT_KEY_GOTHIC_28_BOLD), text_pos, GTextOverflowModeWordWrap, GTextAlignmentCenter, NULL);
}