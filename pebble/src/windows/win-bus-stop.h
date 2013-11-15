/***
 * UK Transport
 * Copyright (C) 2013 Matthew Tole
 *
 * windows/bus-stop.h
 ***/

#pragma once

#include <pebble.h>
#include "../bus.h"

void win_bus_stop_create(void);
void win_bus_stop_destroy(void);
void win_bus_stop_set_stop(BusStop* stop);
void win_bus_stop_show(bool animated);