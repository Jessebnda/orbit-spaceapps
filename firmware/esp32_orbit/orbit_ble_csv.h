// Drop-in BLE replacement for BluetoothSerial in the sensor sketch.
// Orbit (Android and iPhone) only talks BLE; iOS has no Classic SPP at all.
//
//   #include "orbit_ble_csv.h"
//   setup():  orbitBleBegin("c1", "band");      // crew id from the app profile; band | sleeve | vest
//   loop():   orbitBleSend(line);               // the same CSV line you print, without the "\n"
//
// Lines are batched 5 per notify (~100 ms) to stay well under the 247-byte MTU the app requests.
#pragma once
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLE2902.h>

#define ORBIT_SERVICE "6f726269-7400-4000-8000-000000000001"
#define ORBIT_VITALS  "6f726269-7400-4000-8000-000000000002"

static BLECharacteristic* orbitChar = nullptr;
static volatile bool orbitConnected = false;
static String orbitBatch;
static uint8_t orbitLines = 0;

class OrbitCb : public BLEServerCallbacks {
  void onConnect(BLEServer*) override { orbitConnected = true; }
  // Keep advertising after a connect: other crew phones read its RSSI for proximity.
  void onDisconnect(BLEServer* s) override { orbitConnected = false; s->startAdvertising(); }
};

inline void orbitBleBegin(const char* crewId, const char* device) {
  String name = String("ORB-") + crewId + "-" + device;  // how the app finds crew + device
  BLEDevice::init(name.c_str());
  BLEDevice::setMTU(247);
  BLEServer* server = BLEDevice::createServer();
  server->setCallbacks(new OrbitCb());
  BLEService* svc = server->createService(ORBIT_SERVICE);
  orbitChar = svc->createCharacteristic(ORBIT_VITALS, BLECharacteristic::PROPERTY_NOTIFY);
  orbitChar->addDescriptor(new BLE2902());
  svc->start();
  BLEAdvertising* adv = BLEDevice::getAdvertising();
  adv->addServiceUUID(ORBIT_SERVICE);
  adv->setScanResponse(true);
  BLEDevice::startAdvertising();
}

inline void orbitBleSend(const String& line) {
  if (!orbitConnected || !orbitChar) { orbitBatch = ""; orbitLines = 0; return; }
  orbitBatch += line;
  orbitBatch += '\n';
  if (++orbitLines < 5 && orbitBatch.length() < 180) return;
  orbitChar->setValue((uint8_t*)orbitBatch.c_str(), orbitBatch.length());
  orbitChar->notify();
  orbitBatch = "";
  orbitLines = 0;
}
