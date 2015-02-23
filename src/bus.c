/*

UK Transport v1.6

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

src/bus.c

*/

#include <pebble.h>
#include "persist.h"
#include "bus.h"
#include <pebble-assist.h>
#include <message-queue.h>
#include <linked-list.h>
#include <data-processor.h>

static void message_handler(char* operation, char* data);
static bool compare_stops(void* stop1, void* stop2);
static void handle_stops(char* data);
static BusStop* clone_stop(BusStop* stop);
static void destroy_stop(BusStop* stop);
static void destroy_stops(void);
static void handle_departures(char* data);
static void destroy_departures(void);

BusStop** stops;
uint8_t num_stops = 0;
BusUpdateHandler stops_update_handler = NULL;

BusDeparture** departures;
uint8_t num_departures = 0;
BusUpdateHandler departures_update_handler = NULL;

LinkedRoot* favourite_stops = NULL;

void bus_init(void) {
  mqueue_register_handler("BUS", message_handler);
  favourite_stops = linked_list_create_root();
}

void bus_deinit(void) {
  destroy_departures();
  destroy_stops();
}

void bus_get_stops(void) {
  destroy_stops();
  mqueue_add("BUS", "STOPS", " ");
}

uint8_t bus_get_stop_count(void) {
  return num_stops;
}

BusStop* bus_get_stop(uint8_t pos) {
  if (pos >= num_stops) {
    return NULL;
  }
  return stops[pos];
}

void bus_register_stops_update_handler(BusUpdateHandler handler) {
  stops_update_handler = handler;
}

void bus_load_favourites(void) {
  if (! persist_exists(PERSIST_BUS_FAVOURITE)) {
    return;
  }
  char* favourite = malloc(256);
  persist_read_string(PERSIST_BUS_FAVOURITE, favourite, 256);
  data_processor_init(favourite, '|');
  uint8_t tmp = data_processor_get_int();
  for (uint8_t r = 0; r < tmp; r += 1) {
    BusStop* stop = malloc(sizeof(BusStop));
    stop->code = data_processor_get_string();
    stop->name = data_processor_get_string();
    stop->indicator = data_processor_get_string();
    bus_add_favourite(stop);
    destroy_stop(stop);
  }
  free_safe(favourite);
}

void bus_save_favourites(void) {
  if (bus_get_favourite_count() > 0) {
    char* favourite_str = malloc(sizeof(char) * 256);
    uint8_t num = bus_get_favourite_count();
    snprintf(favourite_str, 256, "%d", num);
    for (uint8_t f = 0; f < num; f += 1) {
      strcat(favourite_str, "|");
      strcat(favourite_str, bus_get_favourite(f)->code);
      strcat(favourite_str, "|");
      strcat(favourite_str, bus_get_favourite(f)->name);
      strcat(favourite_str, "|");
      strcat(favourite_str, bus_get_favourite(f)->indicator);
    }
    persist_write_string(PERSIST_BUS_FAVOURITE, favourite_str);
    DEBUG("%s", favourite_str);
    free_safe(favourite_str);
  }
  else {
    persist_delete(PERSIST_BUS_FAVOURITE);
  }
}

uint8_t bus_get_favourite_count(void) {
  return linked_list_count(favourite_stops);
}

BusStop* bus_get_favourite(uint8_t pos) {
  return (BusStop*)linked_list_get(favourite_stops, pos);
}

bool bus_add_favourite(BusStop* stop) {
  if (bus_is_favourite(stop)) {
    return false;
  }
  linked_list_append(favourite_stops, clone_stop(stop));
  return true;
}

void bus_remove_favourite(BusStop* stop) {
  linked_list_remove(favourite_stops, linked_list_find_compare(favourite_stops, stop, compare_stops));
}

bool bus_is_favourite(BusStop* stop) {
  return linked_list_contains_compare(favourite_stops, stop, compare_stops);
}

void bus_get_departures(BusStop* stop) {
  mqueue_add("BUS", "DEPARTURES", stop->code);
}

uint8_t bus_get_departure_count(void) {
  return num_departures;
}

BusDeparture* bus_get_departure(uint8_t pos) {
  return departures[pos];
}

void bus_register_departures_update_handler(BusUpdateHandler handler) {
  departures_update_handler = handler;
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - //

static void message_handler(char* operation, char* data) {
  if (strcmp(operation, "STOPS") == 0) {
    handle_stops(data);
  }
  else if (strcmp(operation, "DEPARTURES") == 0) {
    handle_departures(data);
  }
}

static bool compare_stops(void* stop1, void* stop2) {
  return 0 == strcmp(((BusStop*)stop1)->code, ((BusStop*)stop2)->code);
}

static void handle_stops(char* data) {
  destroy_stops();
  data_processor_init(data, '|');
  num_stops = data_processor_get_int();
  stops = malloc(sizeof(BusStop*) * num_stops);
  for (uint8_t s = 0; s < num_stops; s += 1) {
    BusStop* stop = malloc(sizeof(BusStop));
    stop->code = data_processor_get_string();
    stop->name = data_processor_get_string();
    stop->indicator = data_processor_get_string();
    stops[s] = stop;
  }
  stops_update_handler();
}

static BusStop* clone_stop(BusStop* stop) {
  BusStop* clone = malloc(sizeof(BusStop));
  clone->code = malloc(strlen(stop->code));
  strcpy(clone->code, stop->code);
  clone->indicator = malloc(strlen(stop->indicator));
  strcpy(clone->indicator, stop->indicator);
  clone->name = malloc(strlen(stop->name));
  strcpy(clone->name, stop->name);
  return clone;
}

static void destroy_stop(BusStop* stop) {
  free_safe(stop->name);
  free_safe(stop->code);
  free_safe(stop->indicator);
  free_safe(stop);
}

static void destroy_stops(void) {
  for (uint8_t s = 0; s < num_stops; s += 1) {
    destroy_stop(stops[s]);
  }
  free_safe(stops);
  num_stops = 0;
}

static void handle_departures(char* data) {
  destroy_departures();
  data_processor_init(data, '|');
  num_departures = data_processor_get_int();
  departures = malloc(sizeof(BusDeparture*) * num_departures);
  for (uint8_t d = 0; d < num_departures; d += 1) {
    BusDeparture* departure = malloc(sizeof(BusDeparture));
    departure->line = data_processor_get_string();
    departure->direction = data_processor_get_string();
    departure->est_time = data_processor_get_string();
    departures[d] = departure;
  }
  departures_update_handler();
}

static void destroy_departures(void) {
  for (uint8_t d = 0; d < num_departures; d += 1) {
    free_safe(departures[d]->line);
    free_safe(departures[d]->direction);
    free_safe(departures[d]->est_time);
    free_safe(departures[d]);
  }
  free_safe(departures);
  num_departures = 0;
}