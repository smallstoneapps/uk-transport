/***
 * UK Transport
 * Copyright (C) 2013 Matthew Tole
 *
 * tube.h
 ***/

#pragma once

#include <pebble.h>

typedef struct {
  char* name;
  char* status;
} TubeLine;

typedef void (*TubeUpdateHandler)(void);

void tube_init(void);
void tube_deinit(void);
void tube_update_lines(void);
uint8_t tube_get_line_count();
TubeLine* tube_get_line(uint8_t pos);
void tube_register_update_handler(TubeUpdateHandler handler);