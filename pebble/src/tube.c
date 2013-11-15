/***
 * UK Transport
 * Copyright (C) 2013 Matthew Tole
 *
 * tube.c
 ***/

#include <pebble.h>
#include "tube.h"
#include "libs/mqueue.h"

void message_handler(char* operation, char* data);

TubeUpdateHandler update_handler = NULL;

void tube_init(void) {
  mqueue_register_handler("TUBE", message_handler);
}

void tube_update_lines(void) {
  mqueue_add("TUBE", "UPDATE", "");
}

uint8_t tube_get_line_count() {
  return 0;
}

TubeLine* tube_get_line(uint8_t pos) {
  return NULL;
}

void tube_register_update_handler(TubeUpdateHandler handler) {
  update_handler = handler;
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - //

void message_handler(char* operation, char* data) {
  update_handler();
}