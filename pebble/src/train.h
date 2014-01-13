/***
 * UK Transport
 * Copyright (C) 2013 Matthew Tole
 *
 * train.h
 ***/

#pragma once

#include <pebble.h>

typedef struct {
  char* code;
  char* name;
} TrainStation;

typedef struct {
  char* destination;
  char* est_time;
} TrainDeparture;

typedef void (*TrainUpdateHandler)(void);

void train_init(void);
void train_cleanup(void);

void train_get_stations(void);
uint8_t train_get_station_count(void);
TrainStation* train_get_station(uint8_t pos);
void train_register_stations_update_handler(TrainUpdateHandler handler);

void train_load_recent(void);
void train_save_recent(void);
void train_mark_recent(TrainStation* station);
uint8_t train_get_recent_count(void);
TrainStation* train_get_recent(uint8_t pos);

void train_get_departures(TrainStation* stop);
uint8_t train_get_departure_count(void);
TrainDeparture* train_get_departure(uint8_t pos);
void train_register_departures_update_handler(TrainUpdateHandler handler);