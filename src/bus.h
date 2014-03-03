/***
 * UK Transport
 * Copyright (C) 2013 Matthew Tole
 *
 * bus.h
 ***/

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

void bus_get_departures(BusStop* stop);
uint8_t bus_get_departure_count(void);
BusDeparture* bus_get_departure(uint8_t pos);
void bus_register_departures_update_handler(BusUpdateHandler handler);