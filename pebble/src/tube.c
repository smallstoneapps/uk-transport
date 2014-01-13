/***
 * UK Transport
 * Copyright (C) 2013 Matthew Tole
 *
 * tube.c
 ***/

#include <pebble.h>
#include "tube.h"
#include "libs/message-queue/message-queue.h"
#include "libs/data-processor.h"

static void message_handler(char* operation, char* data);
static void handle_update(char* data);
static void destroy_lines(void);

TubeUpdateHandler update_handler = NULL;
TubeLine** lines;
uint8_t num_lines = 0;

void tube_init(void) {
  mqueue_register_handler("TUBE", message_handler);
  num_lines = 0;
}

void tube_update_lines(void) {
  mqueue_add("TUBE", "UPDATE", " ");
}

uint8_t tube_get_line_count() {
  return num_lines;
}

TubeLine* tube_get_line(uint8_t pos) {
  return lines[pos];
}

void tube_register_update_handler(TubeUpdateHandler handler) {
  update_handler = handler;
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - //

static void message_handler(char* operation, char* data) {
  if (strcmp(operation, "UPDATE") == 0) {
    handle_update(data);
  }
}

static void handle_update(char* data) {
  destroy_lines();

  data_processor_init(data, '|');
  data_processor_get_uint8(&num_lines);
  lines = malloc(sizeof(TubeLine*) * num_lines);
  for (uint8_t l = 0; l < num_lines; l += 1) {
    TubeLine* line = malloc(sizeof(TubeLine));
    data_processor_get_string(&line->name);
    data_processor_get_string(&line->status);
    lines[l] = line;
  }
  update_handler();
}

static void destroy_lines(void) {
  for (uint8_t l = 0; l < num_lines; l += 1) {
    free(lines[l]->name);
    free(lines[l]->status);
    free(lines[l]);
  }
  free(lines);
  num_lines = 0;
}