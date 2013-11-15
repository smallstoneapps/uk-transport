/***
 * UK Transport
 * Copyright (C) 2013 Matthew Tole
 *
 * windows/train-station.h
 ***/

#pragma once

#include <pebble.h>
#include "../train.h"

void win_train_station_create(void);
void win_train_station_destroy(void);
void win_train_station_show(bool animated);
void win_train_station_set_station(TrainStation* station);