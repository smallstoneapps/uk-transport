/***
 * Font Loader
 * Copyright © 2013 Matthew Tole
 *
 * 1.0.0
 ***/

#include <pebble.h>
#include "font-loader.h"

typedef struct AppFont AppFont;

struct AppFont {
  GFont font;
  char* name;
  AppFont* next;
};

AppFont* get_tail(void);
AppFont* get_by_name(char* name);

static AppFont* fonts = NULL;

void fonts_init() {
  fonts_cleanup();
  fonts = NULL;
}

bool fonts_assign(char* name, uint32_t res_id) {
  AppFont* font = malloc(sizeof(AppFont));
  font->name = malloc(strlen(name) + 1);
  strcpy(font->name, name);
  font->font = fonts_load_custom_font(resource_get_handle(res_id));

  font->next = NULL;
  AppFont* last = get_tail();
  if (last == NULL) {
    fonts = font;
  }
  else {
    last->next = font;
  }
  return true;
}

GFont fonts_get(char* name) {
  AppFont* font = get_by_name(name);
  return font == NULL ? NULL : font->font;
}

void fonts_cleanup(void) {
  AppFont* current = fonts;
  while (current != NULL) {
    fonts_unload_custom_font(current->font);
    free(current->name);
    AppFont* tmp = current;
    free(current);
    current = tmp->next;
  }
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - //

AppFont* get_tail(void) {
  AppFont* current = fonts;
  while (current != NULL) {
    if (current->next == NULL) {
      return current;
    }
    current = current->next;
  }
  return NULL;
}

AppFont* get_by_name(char* name) {
  AppFont* current = fonts;
  while (current != NULL) {
    if (strcmp(current->name, name) == 0) {
      return current;
    }
    current = current->next;
  }
  return NULL;
}