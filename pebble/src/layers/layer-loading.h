#pragma once

#include <pebble.h>

typedef Layer LoadingLayer;

LoadingLayer* loading_layer_create(Window* window, GBitmap* icon);
void loading_layer_set_text(LoadingLayer* layer, char* text);
void loading_layer_destroy(LoadingLayer* layer);