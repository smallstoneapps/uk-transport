/***
 * UK Transport
 * Copyright (C) 2013 Matthew Tole
 *
 * train.c
 ***/

#include <pebble.h>
#include "train.h"

#include "libs/message-queue/message-queue.h"
#include "libs/data-processor/data-processor.h"

#define MAX_RECENT_STATIONS 3

static void message_handler(char* operation, char* data);

static void handle_stations(char* data);
static TrainStation* clone_station(TrainStation* station);
static void destroy_station(TrainStation* station);
static void destroy_stations(void);

static void handle_departures(char* data);
static void destroy_departures(void);

static bool recent_station_exists(TrainStation* station);

static TrainStation** stations;
static uint8_t num_stations = 0;
static TrainUpdateHandler stations_update_handler = NULL;

static TrainStation* recent_stations[MAX_RECENT_STATIONS];
static uint8_t recent_station_count = 0;

static TrainDeparture** departures;
static uint8_t num_departures = 0;
static TrainUpdateHandler departures_update_handler = NULL;

void train_init(void) {
  mqueue_register_handler("TRAIN", message_handler);
}

void train_deinit(void) {
  destroy_departures();
  destroy_stations();
}

void train_get_stations(void) {
  mqueue_add("TRAIN", "STATIONS", "10");
}

uint8_t train_get_station_count(void) {
  return num_stations;
}

TrainStation* train_get_station(uint8_t pos) {
  return stations[pos];
}

void train_register_stations_update_handler(TrainUpdateHandler handler) {
  stations_update_handler = handler;
}

void train_load_recent(void) {

}

void train_save_recent(void) {

}

void train_mark_recent(TrainStation* station) {
  if (recent_station_exists(station)) {
    return;
  }
  TrainStation* recent = clone_station(station);
  if (recent_station_count > 0) {
    TrainStation* last = recent_stations[MAX_RECENT_STATIONS - 1];
    for (uint8_t r = 1; r < MAX_RECENT_STATIONS; r += 1) {
      recent_stations[r] = recent_stations[r - 1];
    }
    if (last != NULL) {
      destroy_station(last);
    }
  }
  recent_station_count += 1;
  if (recent_station_count > MAX_RECENT_STATIONS) {
    recent_station_count = MAX_RECENT_STATIONS;
  }
  recent_stations[0] = recent;
}

uint8_t train_get_recent_count(void) {
  return recent_station_count;
}

TrainStation* train_get_recent(uint8_t pos) {
  return recent_stations[pos];
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

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - //

static void message_handler(char* operation, char* data) {
  if (strcmp(operation, "STATIONS") == 0) {
    handle_stations(data);
  }
  else if (strcmp(operation, "DEPARTURES") == 0) {
    handle_departures(data);
  }
}

static void handle_stations(char* data) {
  destroy_stations();

  data_processor_init(data, '|');
  data_processor_get_uint8(&num_stations);
  stations = malloc(sizeof(TrainStation*) * num_stations);
  for (uint8_t s = 0; s < num_stations; s += 1) {
    TrainStation* station = malloc(sizeof(TrainStation));
    data_processor_get_string(&station->code);
    data_processor_get_string(&station->name);
    stations[s] = station;
  }

  if (stations_update_handler != NULL) {
    stations_update_handler();
  }
}

static void destroy_station(TrainStation* station) {
  free(station->code);
  free(station->name);
  free(station);
}

static void destroy_stations(void) {
  for (uint8_t s = 0; s < num_stations; s += 1) {
    destroy_station(stations[s]);
  }
  free(stations);
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
  data_processor_get_uint8(&num_departures);
  departures = malloc(sizeof(TrainDeparture*) * num_departures);
  for (uint8_t d = 0; d < num_departures; d += 1) {
    TrainDeparture* departure = malloc(sizeof(TrainDeparture));
    data_processor_get_string(&departure->destination);
    data_processor_get_string(&departure->est_time);
    departures[d] = departure;
  }

  if (departures_update_handler != NULL) {
    departures_update_handler();
  }
}

static void destroy_departures(void) {
  for (uint8_t d = 0; d < num_departures; d += 1) {
    free(departures[d]->destination);
    free(departures[d]->est_time);
    free(departures[d]);
  }
  free(departures);
  num_departures = 0;
}

static bool recent_station_exists(TrainStation* station) {
  for (uint8_t r = 0; r < recent_station_count; r += 1) {
    if (strcmp(recent_stations[r]->code, station->code) == 0) {
      return true;
    }
  }
  return false;
}