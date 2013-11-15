#include <pebble.h>
#include "layer-loading.h"

struct LoadingLayer {
  Layer* layer;
  char* message;
};

LoadingLayer* loading_layer_create(Window* window) {
  LoadingLayer* layer = malloc(sizeof(LoadingLayer));
  return layer;
}

void loading_layer_set_text(LoadingLayer* layer, char* text) {

}

void loading_layer_destroy_safe(LoadingLayer* layer) {

}