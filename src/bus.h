/*

UK Transport v1.1

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

src/bus.h

*/

#include <pebble.h>

#pragma once

typedef struct {
  char* code;
  char* name;
  char* indicator;
} BusStop;

typedef struct {
  char* line;
  char* direction;
  char* est_time;
} BusDeparture;

typedef void (*BusUpdateHandler)(void);

void bus_init(void);
void bus_deinit(void);

void bus_get_stops(void);
uint8_t bus_get_stop_count(void);
BusStop* bus_get_stop(uint8_t pos);
void bus_register_stops_update_handler(BusUpdateHandler handler);

void bus_load_favourites(void);
void bus_save_favourites(void);
uint8_t bus_get_favourite_count(void);
BusStop* bus_get_favourite(uint8_t pos);
bool bus_add_favourite(BusStop* stop);
void bus_remove_favourite(BusStop* stop);
bool bus_is_favourite(BusStop* stop);

void bus_get_departures(BusStop* stop);
uint8_t bus_get_departure_count(void);
BusDeparture* bus_get_departure(uint8_t pos);
void bus_register_departures_update_handler(BusUpdateHandler handler);