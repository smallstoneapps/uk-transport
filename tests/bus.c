/*

UK Transport v0.3.0

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

tests/bus.c

*/

#include "unit.h"
#include "tests.h"
#include "../src/bus.h"

void bus_before_each(void) {
  bus_init();
}

void bus_after_each(void) {
  bus_deinit();
}

static BusStop* fake_stop(void) {
  BusStop* stop = malloc(sizeof(BusStop));
  stop->code = "CODE";
  stop->indicator = "INDICATOR";
  stop->name = "NAME";
  return stop;
}

static BusStop* fake_stop_no_name(void) {
  BusStop* stop = malloc(sizeof(BusStop));
  stop->code = "CODE";
  stop->indicator = "INDICATOR";
  stop->name = "";
  return stop;
}

static char* test_add_favourite(void) {
  BusStop* stop = fake_stop();
  bus_add_favourite(stop);
  mu_assert(bus_get_favourite_count() == 1, "Favourite count was not 1");
  return 0;
}

static char* test_add_favourite_duplicate(void) {
  BusStop* stop1 = fake_stop();
  BusStop* stop2 = fake_stop();
  bus_add_favourite(stop1);
  bus_add_favourite(stop2);
  mu_assert(bus_get_favourite_count() == 1, "Favourite count was not 1");
  return 0;
}

static char* test_add_favourite_no_name(void) {
  BusStop* stop = fake_stop_no_name();
  bus_add_favourite(stop);
  mu_assert(bus_get_favourite_count() == 1, "Favourite count was not 1");
  return 0;
}

static char* test_is_favourite(void) {
  BusStop* stop = fake_stop();
  bus_add_favourite(stop);
  mu_assert(bus_is_favourite(stop), "Favourite not identified");
  return 0;
}

static char* test_remove_favourite(void) {
  BusStop* stop = fake_stop();
  bus_add_favourite(stop);
  mu_assert(bus_is_favourite(stop), "Stop wasn't added to favourites");
  bus_remove_favourite(stop);
  mu_assert(! bus_is_favourite(stop), "Stop wasn't removed from favourites.");
  mu_assert(bus_get_favourite_count() == 0, "Stop wasn't removed from favourites count.");
  return 0;
}

static char* test_save_favourites(void) {
  BusStop* stop = fake_stop();
  bus_add_favourite(stop);
  bus_save_favourites();
  bus_init();
  bus_load_favourites();
  mu_assert(bus_get_favourite_count() == 1, "Favourite count was not 1");
  return 0;
}

char* bus_tests(void) {
  mu_run_test(test_add_favourite);
  mu_run_test(test_add_favourite_duplicate);
  mu_run_test(test_add_favourite_no_name);
  mu_run_test(test_is_favourite);
  mu_run_test(test_remove_favourite);
  mu_run_test(test_save_favourites);
  return 0;
}
