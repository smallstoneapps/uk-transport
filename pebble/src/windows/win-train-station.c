/***
 * UK Transport
 * Copyright (C) 2013 Matthew Tole
 *
 * windows/train-station.c
 ***/

#include <pebble.h>
#include "win-train-station.h"

static TrainStation* current_station = NULL;

void win_train_station_create(void) {

}

void win_train_station_destroy(void) {

}

void win_train_station_show(bool animated) {

}

void win_train_station_set_station(TrainStation* station) {
  current_station = station;
}