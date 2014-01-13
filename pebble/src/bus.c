/***
 * UK Transport
 * Copyright (C) 2013 Matthew Tole
 *
 * bus.c
 ***/

#include <pebble.h>
#include "bus.h"
#include "train.h"
#include "libs/message-queue/message-queue.h"
#include "libs/data-processor.h"

static void message_handler(char* operation, char* data);
static void handle_stops(char* data);
static void destroy_stops(void);
static void handle_departures(char* data);
static void destroy_departures(void);

BusStop** stops;
uint8_t num_stops = 0;
BusUpdateHandler stops_update_handler = NULL;

BusDeparture** departures;
uint8_t num_departures = 0;
BusUpdateHandler departures_update_handler = NULL;

void bus_init(void) {
  mqueue_register_handler("BUS", message_handler);
}

void bus_get_stops(void) {
  mqueue_add("BUS", "STOPS", " ");
}

uint8_t bus_get_stop_count(void) {
  return num_stops;
}

BusStop* bus_get_stop(uint8_t pos) {
  return stops[pos];
}

void bus_register_stops_update_handler(BusUpdateHandler handler) {
  stops_update_handler = handler;
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

static void handle_stops(char* data) {
  train_cleanup();
  destroy_stops();
  data_processor_init(data, '|');
  data_processor_get_uint8(&num_stops);
  stops = malloc(sizeof(BusStop*) * num_stops);
  for (uint8_t s = 0; s < num_stops; s += 1) {
    BusStop* stop = malloc(sizeof(BusStop));
    data_processor_get_string(&stop->code);
    data_processor_get_string(&stop->name);
    data_processor_get_string(&stop->indicator);
    stops[s] = stop;
  }
  stops_update_handler();
}

static void destroy_stops(void) {
  for (uint8_t s = 0; s < num_stops; s += 1) {
    free(stops[s]->name);
    free(stops[s]->code);
    free(stops[s]->indicator);
    free(stops[s]);
  }
  free(stops);
  num_stops = 0;
}

static void handle_departures(char* data) {
  train_cleanup();
  destroy_departures();
  data_processor_init(data, '|');
  data_processor_get_uint8(&num_departures);

  departures = malloc(sizeof(BusDeparture*) * num_departures);
  for (uint8_t d = 0; d < num_departures; d += 1) {
    BusDeparture* departure = malloc(sizeof(BusDeparture));
    data_processor_get_string(&departure->line);
    data_processor_get_string(&departure->direction);
    data_processor_get_string(&departure->est_time);
    departures[d] = departure;
  }
  departures_update_handler();
}

static void destroy_departures(void) {
  for (uint8_t d = 0; d < num_departures; d += 1) {
    free(departures[d]->line);
    free(departures[d]->direction);
    free(departures[d]->est_time);
    free(departures[d]);
  }
  free(departures);
  num_departures = 0;
}