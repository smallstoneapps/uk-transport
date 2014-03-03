/***
 * Font Loader
 * Copyright © 2013 Matthew Tole
 *
 * 1.0.0
 ***/

#pragma once

#include <pebble.h>

void fonts_init(void);
bool fonts_assign(char* name, uint32_t res_id);
GFont fonts_get(char* name);
void fonts_cleanup(void);
