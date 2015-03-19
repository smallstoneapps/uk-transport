#include <pebble.h>

typedef struct Persist Persist;

typedef enum PersistType {
  DATA, NUMBER, STRING
} PersistType;

struct Persist {
  uint32_t key;
  PersistType type;
  void* data;
  uint32_t number;
  char* str;
  Persist* next;
};

static Persist* persist_read(uint32_t key);
static bool persist_write(Persist* persist);

Persist* persistence = NULL;

bool persist_exists(const uint32_t key) {
  return NULL != persist_read(key);
}

int persist_read_data(const uint32_t key, void *buffer, const size_t buffer_size) {
  Persist* persist = persist_read(key);
  if (! persist) {
    return -1;
  }
  if (DATA != persist->type) {
    return -1;
  }
  buffer = malloc(buffer_size);
  memcpy(buffer, persist->data, buffer_size);
  return buffer_size;
}

int32_t persist_read_int(const uint32_t key) {
  Persist* persist = persist_read(key);
  if (! persist) {
    return -1;
  }
  if (NUMBER != persist->type) {
    return -1;
  }
  return persist->number;
}

status_t persist_write_int(const uint32_t key, const int32_t value) {
  persist_delete(key);
  Persist* persist = malloc(sizeof(Persist));
  persist->key = key;
  persist->type = NUMBER;
  persist->number = value;
  persist->next = NULL;
  persist_write(persist);
  return 0;
}

int persist_write_data(const uint32_t key, const void *data, const size_t size) {
  persist_delete(key);
  Persist* persist = malloc(sizeof(Persist));
  persist->key = key;
  persist->type = DATA;
  persist->data = malloc(size);
  memcpy(persist->data, data, size);
  persist->next = NULL;
  persist_write(persist);
  return size;
}

int persist_read_string(const uint32_t key, char *buffer, const size_t buffer_size) {
  Persist* persist = persist_read(key);
  if (! persist) {
    return -1;
  }
  if (STRING != persist->type) {
    return -1;
  }
  strncpy(buffer, persist->str, buffer_size);
  return buffer_size;
}

int persist_write_string(const uint32_t key, const char *cstring) {
  persist_delete(key);
  Persist* persist = malloc(sizeof(Persist));
  persist->key = key;
  persist->type = STRING;
  persist->str = malloc(strlen(cstring) + 1);
  strcpy(persist->str, cstring);
  persist->next = NULL;
  persist_write(persist);
  return strlen(cstring);
}

static bool persist_write(Persist* persist) {
  if (NULL == persistence) {
    persistence = persist;
  }
  else {
    Persist* ptr = persistence;
    while (NULL != ptr->next) {
      ptr = ptr->next;
    }
    ptr->next = persist;
  }
  return true;
}

static Persist* persist_read(uint32_t key) {
  Persist* ptr = persistence;
  while (NULL != ptr) {
    if (key == ptr->key) {
      return ptr;
    }
    ptr = ptr->next;
  }
  return NULL;
}

status_t persist_delete(uint32_t key) {
  return S_SUCCESS;
}

void app_log(uint8_t log_level, const char *src_filename, int src_line_number, const char *fmt, ...) {

}

uint32_t app_message_inbox_size_maximum(void) {
  return APP_MESSAGE_INBOX_SIZE_MINIMUM;
}

uint32_t app_message_outbox_size_maximum(void) {
  return APP_MESSAGE_OUTBOX_SIZE_MINIMUM;
}

AppMessageResult app_message_open(const uint32_t size_inbound, const uint32_t size_outbound) {
  return APP_MSG_OK;
}

AppMessageInboxReceived app_message_register_inbox_received(AppMessageInboxReceived received_callback) {
  return received_callback;
}

AppMessageInboxDropped app_message_register_inbox_dropped(AppMessageInboxDropped dropped_callback) {
  return dropped_callback;
}

AppMessageOutboxSent app_message_register_outbox_sent(AppMessageOutboxSent sent_callback) {
  return sent_callback;
}

AppMessageOutboxFailed app_message_register_outbox_failed(AppMessageOutboxFailed failed_callback) {
  return failed_callback;
}

AppMessageResult app_message_outbox_begin(DictionaryIterator **iterator) {
  return APP_MSG_OK;
}

AppMessageResult app_message_outbox_send(void) {
  return APP_MSG_OK;
}

Tuple *dict_find(const DictionaryIterator *iter, const uint32_t key) {
  return NULL;
}

DictionaryResult dict_write_cstring(DictionaryIterator *iter, const uint32_t key, const char * const cstring) {
  return DICT_OK;
}

AppTimer* app_timer_register(uint32_t timeout_ms, AppTimerCallback callback, void* callback_data) {
  callback(callback_data);
  return NULL;
}
