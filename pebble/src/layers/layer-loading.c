#include <pebble.h>
#include "layer-loading.h"

typedef struct {
  char* message;
} LoadingData;

GBitmap* bmp_icon;

static void update_loading_layer(Layer* layer, GContext* ctx);

LoadingLayer* loading_layer_create(Window* window, GBitmap* icon) {
  LoadingLayer* layer = layer_create_with_data(layer_get_bounds(window_get_root_layer(window)), sizeof(LoadingData));
  LoadingData* data = (LoadingData*)layer_get_data(layer);
  data->message = NULL;
  bmp_icon = icon;
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
  layer_destroy(layer);
}

static void update_loading_layer(Layer* layer, GContext* ctx) {
  LoadingData* data = (LoadingData*)layer_get_data(layer);
  graphics_context_set_fill_color(ctx, GColorBlack);
  graphics_context_set_text_color(ctx, GColorWhite);
  graphics_fill_rect(ctx, layer_get_bounds(layer), 0, GCornerNone);
  graphics_draw_text(ctx, data->message, fonts_get_system_font(FONT_KEY_GOTHIC_24_BOLD), GRect(4, 88, 136, 80), GTextOverflowModeWordWrap, GTextAlignmentCenter, NULL);
  graphics_draw_bitmap_in_rect(ctx, bmp_icon, GRect(36, 12, 72, 72));
}