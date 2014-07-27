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

tests/train.c

*/

#include "unit.h"
#include "tests.h"
#include "../src/train.h"

void train_before_each(void) {
  train_init();
}

void train_after_each(void) {
  train_deinit();
}

static TrainStation* fake_station(void) {
  TrainStation* station = malloc(sizeof(TrainStation));
  station->code = "CODE";
  station->name = "NAME";
  return station;
}

static char* test_add_favourite(void) {
  TrainStation* station = fake_station();
  train_add_favourite(station);
  mu_assert(train_get_favourite_count() == 1, "Favourite count was not 1");
  return 0;
}

static char* test_add_favourite_duplicate(void) {
  TrainStation* station1 = fake_station();
  TrainStation* station2 = fake_station();
  train_add_favourite(station1);
  train_add_favourite(station2);
  mu_assert(train_get_favourite_count() == 1, "Favourite count was not 1");
  return 0;
}

static char* test_is_favourite(void) {
  TrainStation* station = fake_station();
  train_add_favourite(station);
  mu_assert(train_is_favourite(station), "Favourite not identified");
  return 0;
}

static char* test_remove_favourite(void) {
  TrainStation* station = fake_station();
  train_add_favourite(station);
  mu_assert(train_is_favourite(station), "Station wasn't added to favourites");
  train_remove_favourite(station);
  mu_assert(! train_is_favourite(station), "Station wasn't removed from favourites.");
  mu_assert(train_get_favourite_count() == 0, "Station wasn't removed from favourites count.");
  return 0;
}

static char* test_save_favourites(void) {
  TrainStation* station = fake_station();
  train_add_favourite(station);
  train_save_favourites();
  train_init();
  train_load_favourites();
  mu_assert(train_get_favourite_count() == 1, "Favourite count was not 1");
  return 0;
}

// TODO: Test loading of incoming data. HOW?

char* train_tests(void) {
  mu_run_test(test_add_favourite);
  mu_run_test(test_add_favourite_duplicate);
  mu_run_test(test_is_favourite);
  mu_run_test(test_remove_favourite);
  mu_run_test(test_save_favourites);
  return 0;
}