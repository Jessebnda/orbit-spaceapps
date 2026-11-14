// Orbit wearable reference firmware (ESP32, Arduino core 3.x built-in BLE).
// Implements the BLE contract in shared/src/index.ts. Replace readMetrics() with the real sensors.
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLE2902.h>

#define CREW_ID "c1"
#define DEVICE  "band"   // band | sleeve | vest
#define SERVICE_UUID "6f726269-7400-4000-8000-000000000001"
#define VITALS_UUID  "6f726269-7400-4000-8000-000000000002"

BLECharacteristic* vitals;
bool connected = false;

class Cb : public BLEServerCallbacks {
  void onConnect(BLEServer*) override { connected = true; }
  void onDisconnect(BLEServer* s) override { connected = false; s->startAdvertising(); } // keep advertising for proximity RSSI
};

String readMetrics() {
  // shortcut: fake values; wire MAX30102 (hr/spo2), MLX90614 (temp), cuff (bp), strain gauge (resp), MPU6050 (activity).
  if (strcmp(DEVICE, "band") == 0)   return "{\"hr\":" + String(65 + random(10)) + ",\"spo2\":" + String(97 + random(3)) + ",\"temp\":36.6}";
  if (strcmp(DEVICE, "sleeve") == 0) return "{\"bpSys\":" + String(115 + random(10)) + ",\"bpDia\":" + String(75 + random(6)) + "}";
  return "{\"resp\":" + String(13 + random(4)) + ",\"activity\":" + String(random(60)) + "}";
}

void setup() {
  BLEDevice::init("ORB-" CREW_ID "-" DEVICE);   // name is how phones identify crew + device
  BLEServer* server = BLEDevice::createServer();
  server->setCallbacks(new Cb());
  BLEService* svc = server->createService(SERVICE_UUID);
  vitals = svc->createCharacteristic(VITALS_UUID, BLECharacteristic::PROPERTY_NOTIFY | BLECharacteristic::PROPERTY_READ);
  vitals->addDescriptor(new BLE2902());
  svc->start();
  BLEAdvertising* adv = BLEDevice::getAdvertising();
  adv->addServiceUUID(SERVICE_UUID);
  adv->setScanResponse(true);
  BLEDevice::startAdvertising();
}

void loop() {
  if (connected) {
    String json = readMetrics();
    vitals->setValue(json.c_str());
    vitals->notify();
  }
  delay(2000);
}
