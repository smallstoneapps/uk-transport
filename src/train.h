/*

UK Transport v1.4

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

src/train.h

*/

#pragma once

#include <pebble.h>

typedef struct {
  char* code;
  char* name;
} TrainStation;

typedef struct {
  char* destination;
  char* est_time;
  char* status;
  char* platform;
} TrainDeparture;

typedef void (*TrainUpdateHandler)(void);

void train_init(void);
void train_deinit(void);

void train_get_stations(void);
uint8_t train_get_station_count(void);
TrainStation* train_get_station(uint8_t pos);
void train_register_stations_update_handler(TrainUpdateHandler handler);

void train_load_favourites(void);
void train_save_favourites(void);
uint8_t train_get_favourite_count(void);
TrainStation* train_get_favourite(uint8_t pos);
bool train_add_favourite(TrainStation* station);
void train_remove_favourite(TrainStation* station);
bool train_is_favourite(TrainStation* station);

void train_get_departures(TrainStation* stop);
uint8_t train_get_departure_count(void);
TrainDeparture* train_get_departure(uint8_t pos);
void train_register_departures_update_handler(TrainUpdateHandler handler);
bool train_departure_is_ok(TrainDeparture* departure);