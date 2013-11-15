#pragma once

#include <pebble.h>

struct LoadingLayer;
typedef struct LoadingLayer LoadingLayer;

LoadingLayer* loading_layer_create(Window* window);
void loading_layer_set_text(LoadingLayer* layer, char* text);
void loading_layer_destroy_safe(LoadingLayer* layer);