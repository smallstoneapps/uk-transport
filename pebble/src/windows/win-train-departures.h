/***
 * UK Transport
 * Copyright (C) 2013 Matthew Tole
 *
 * windows/win-train-departures.h
 ***/

#pragma once

#include <pebble.h>
#include "../train.h"

void win_train_departures_create(void);
void win_train_departures_destroy(void);
void win_train_departures_show(bool animated);
void win_train_departures_set_station(TrainStation* station);