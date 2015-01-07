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

src/train.c

*/

#include <pebble.h>
#include "train.h"
#include "persist.h"
#include <pebble-assist.h>
#include <message-queue.h>
#include <data-processor.h>
#include <linked-list.h>

static void message_handler(char* operation, char* data);

static bool compare_stations(void* station1, void* station2);

static void handle_stations(char* data);
static TrainStation* clone_station(TrainStation* station);
static void destroy_station(TrainStation* station);
static void destroy_stations(void);

static void handle_departures(char* data);
static void destroy_departures(void);

static void destroy_favourite_stations(void);

static TrainStation** stations;
static uint8_t num_stations = 0;
static TrainUpdateHandler stations_update_handler = NULL;

static LinkedRoot* favourite_stations = NULL;

static TrainDeparture** departures;
static uint8_t num_departures = 0;
static TrainUpdateHandler departures_update_handler = NULL;

void train_init(void) {
  mqueue_register_handler("TRAIN", message_handler);
  favourite_stations = linked_list_create_root();
}

void train_deinit(void) {
  destroy_departures();
  destroy_stations();
  destroy_favourite_stations();
}

void train_get_stations(void) {
  destroy_stations();
  mqueue_add("TRAIN", "STATIONS", "10");
}

uint8_t train_get_station_count(void) {
  return num_stations;
}

TrainStation* train_get_station(uint8_t pos) {
  if (pos >= num_stations) {
    return NULL;
  }
  return stations[pos];
}

void train_register_stations_update_handler(TrainUpdateHandler handler) {
  stations_update_handler = handler;
}

void train_load_favourites(void) {
  if (! persist_exists(PERSIST_TRAIN_FAVOURITE)) {
    return;
  }
  char* favourite = malloc(256);
  persist_read_string(PERSIST_TRAIN_FAVOURITE, favourite, 256);
  data_processor_init(favourite, '|');
  uint8_t tmp = data_processor_get_int();
  for (uint8_t r = 0; r < tmp; r += 1) {
    TrainStation* station = malloc(sizeof(TrainStation));
    station->code = data_processor_get_string();
    station->name = data_processor_get_string();
    train_add_favourite(station);
    destroy_station(station);
  }
  free_safe(favourite);
}

void train_save_favourites(void) {
  if (train_get_favourite_count() > 0) {
    char* favourite_str = malloc(sizeof(char) * 256);
    uint8_t num = train_get_favourite_count();
    snprintf(favourite_str, 256, "%d", train_get_favourite_count());
    for (uint8_t f = 0; f < num; f += 1) {
      strcat(favourite_str, "|");
      strcat(favourite_str, train_get_favourite(f)->code);
      strcat(favourite_str, "|");
      strcat(favourite_str, train_get_favourite(f)->name);
    }

    persist_write_string(PERSIST_TRAIN_FAVOURITE, favourite_str);
    free_safe(favourite_str);
  }
  else {
    persist_delete(PERSIST_TRAIN_FAVOURITE);
  }
}

uint8_t train_get_favourite_count(void) {
  return linked_list_count(favourite_stations);
}

TrainStation* train_get_favourite(uint8_t pos) {
  return (TrainStation*)linked_list_get(favourite_stations, pos);
}

bool train_add_favourite(TrainStation* station) {
  if (linked_list_contains_compare(favourite_stations, station, compare_stations)) {
    return false;
  }
  linked_list_append(favourite_stations, clone_station(station));
  return true;
}

void train_remove_favourite(TrainStation* station) {
  linked_list_remove(favourite_stations, linked_list_find_compare(favourite_stations, station, compare_stations));
}

bool train_is_favourite(TrainStation* station) {
  return linked_list_contains_compare(favourite_stations, station, compare_stations);
}

void train_get_departures(TrainStation* station) {
  mqueue_add("TRAIN", "DEPARTURES", station->code);
}

uint8_t train_get_departure_count(void) {
  return num_departures;
}

TrainDeparture* train_get_departure(uint8_t pos) {
  return departures[pos];
}

void train_register_departures_update_handler(TrainUpdateHandler handler) {
  departures_update_handler = handler;
}

bool train_departure_is_ok(TrainDeparture* departure) {
  bool status_ok = false;
  status_ok = status_ok || strcmp(departure->status, "ON TIME") == 0;
  status_ok = status_ok || strcmp(departure->status, "STARTS HERE") == 0;
  status_ok = status_ok || strcmp(departure->status, "EARLY") == 0;
  status_ok = status_ok || strcmp(departure->status, "NO REPORT") == 0;
  return status_ok;
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - //

static void message_handler(char* operation, char* data) {
  if (strcmp(operation, "STATIONS") == 0) {
    handle_stations(data);
  }
  else if (strcmp(operation, "DEPARTURES") == 0) {
    handle_departures(data);
  }
}

static bool compare_stations(void* station1, void* station2) {
  return 0 == strcmp(((TrainStation*)station1)->code, ((TrainStation*)station2)->code);
}

static void handle_stations(char* data) {
  destroy_stations();
  data_processor_init(data, '|');
  num_stations = data_processor_get_int();
  stations = malloc(sizeof(TrainStation*) * num_stations);
  for (uint8_t s = 0; s < num_stations; s += 1) {
    TrainStation* station = malloc(sizeof(TrainStation));
    if (station != NULL) {
      station->code = data_processor_get_string();
      station->name = data_processor_get_string();
      stations[s] = station;
    }
    else {
      break;
    }
  }

  if (stations_update_handler != NULL) {
    stations_update_handler();
  }
}

static void destroy_station(TrainStation* station) {
  free_safe(station->code);
  free_safe(station->name);
  free_safe(station);
}

static void destroy_stations(void) {
  for (uint8_t s = 0; s < num_stations; s += 1) {
    destroy_station(stations[s]);
  }
  free_safe(stations);
  num_stations = 0;
}

static TrainStation* clone_station(TrainStation* station) {
  TrainStation* clone = malloc(sizeof(TrainStation));
  clone->code = malloc(strlen(station->code) * sizeof(char));
  strcpy(clone->code, station->code);
  clone->name = malloc(strlen(station->name) * sizeof(char));
  strcpy(clone->name, station->name);
  return clone;
}

static void handle_departures(char* data) {
  destroy_departures();

  data_processor_init(data, '|');
  num_departures = data_processor_get_int();
  departures = malloc(sizeof(TrainDeparture*) * num_departures);
  for (uint8_t d = 0; d < num_departures; d += 1) {
    TrainDeparture* departure = malloc(sizeof(TrainDeparture));
    if (departure == NULL) {
      break;
    }
    departure->destination = data_processor_get_string();
    departure->est_time = data_processor_get_string();
    departure->status = data_processor_get_string();
    departure->platform = data_processor_get_string();
    departures[d] = departure;
  }

  if (departures_update_handler != NULL) {
    departures_update_handler();
  }
}

static void destroy_departures(void) {
  for (uint8_t d = 0; d < num_departures; d += 1) {
    free_safe(departures[d]->destination);
    free_safe(departures[d]->est_time);
    free_safe(departures[d]);
  }
  free_safe(departures);
  num_departures = 0;
}

static void destroy_favourite_stations(void) {
  while (linked_list_count(favourite_stations) > 0) {
    TrainStation* favourite = linked_list_get(favourite_stations, 0);
    free_safe(favourite);
    linked_list_remove(favourite_stations, 0);
  }
}