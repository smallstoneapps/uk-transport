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

src/tube.c

*/

#include <pebble.h>
#include "tube.h"
#include <message-queue.h>
#include <data-processor.h>
#include <pebble-assist.h>

static void message_handler(char* operation, char* data);
static void handle_update(char* data);
static void handle_details(char* data);
static void destroy_lines(void);

static TubeUpdateHandler update_handler = NULL;
static TubeDetailsHandler details_handler = NULL;
static TubeLine** lines;
static uint8_t num_lines = 0;
static char* details = NULL;


void tube_init(void) {
  mqueue_register_handler("TUBE", message_handler);
  num_lines = 0;
}

void tube_deinit(void) {
  destroy_lines();
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

void tube_fetch_details(TubeLine* line) {
  mqueue_add("TUBE", "DETAILS", line->name);
}

void tube_register_details_handler(TubeDetailsHandler handler) {
  details_handler = handler;
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - //

static void message_handler(char* operation, char* data) {
  if (strcmp(operation, "UPDATE") == 0) {
    handle_update(data);
  }
  else if (strcmp(operation, "DETAILS") == 0) {
    handle_details(data);
  }
}

static void handle_update(char* data) {
  destroy_lines();

  data_processor_init(data, '|');
  num_lines = data_processor_get_int();
  lines = malloc(sizeof(TubeLine*) * num_lines);
  for (uint8_t l = 0; l < num_lines; l += 1) {
    TubeLine* line = malloc(sizeof(TubeLine));
    line->name = data_processor_get_string();
    line->status = data_processor_get_string();
    lines[l] = line;
  }
  update_handler();
}

static void handle_details(char* data) {
  free_safe(details);
  data_processor_init(data, '|');
  details = data_processor_get_string();
  if (details_handler) {
    details_handler(details);
  }
}

static void destroy_lines(void) {
  for (uint8_t l = 0; l < num_lines; l += 1) {
    free_safe(lines[l]->name);
    free_safe(lines[l]->status);
    free_safe(lines[l]);
  }
  free_safe(lines);
  num_lines = 0;
}
