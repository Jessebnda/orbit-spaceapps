// esp cabeza: el codigo original + Bluetooth antes que la camara + mensajes de diagnostico por USB.
#include <Arduino.h>
#include <Wire.h>
// AI.invoke() le da 1 s a la Grove para mandar la imagen y por I2C tarda mas: se usa su wait() privado con mas tiempo.
#define private public
#include <Seeed_Arduino_SSCMA.h>
#undef private
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include "mbedtls/base64.h"
#include "esp_system.h"

#define SERVICE_UUID "6e400001-b5a3-f393-e0a9-e50e24dcca9e"
#define RX_UUID      "6e400002-b5a3-f393-e0a9-e50e24dcca9e"  // celular -> ESP32
#define TX_UUID      "6e400003-b5a3-f393-e0a9-e50e24dcca9e"  // ESP32 -> celular

const char* NOMBRE_BLE = "esp cabeza";

SSCMA AI;
bool camaraOk = false;
BLECharacteristic *txChar;
volatile bool conectado = false;
volatile uint8_t pedirFoto = 0;
volatile uint16_t chunkBin = 20;

class ServerCB : public BLEServerCallbacks {
  void onConnect(BLEServer *s) { conectado = true; Serial.println("BLE: celular conectado"); }
  void onDisconnect(BLEServer *s) {
    conectado = false;
    Serial.println("BLE: celular desconectado, anunciando otra vez");
    s->startAdvertising();
  }
};

class RxCB : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *c) {
    auto v = c->getValue();
    if (v.length() == 0) return;
    uint8_t b0 = (uint8_t)v[0];
    Serial.printf("Comando recibido: %02X len=%u\n", b0, (unsigned)v.length());
    if (b0 == 1) {
      uint16_t ch = 20;
      if (v.length() >= 2) ch = (uint8_t)v[1];
      if (ch < 20) ch = 20;
      if (ch > 244) ch = 244;  // MTU 247 - 3 de cabecera ATT
      chunkBin = ch;
      pedirFoto = 1;
    } else if (b0 == 'C' || b0 == 'c') {
      pedirFoto = 2;
    }
  }
};

void enviar(const uint8_t *datos, size_t len, size_t chunk, int pausaMs) {
  for (size_t i = 0; i < len && conectado; i += chunk) {
    size_t n = min(chunk, len - i);
    txChar->setValue((uint8_t *)(datos + i), n);
    txChar->notify();
    delay(pausaMs);
  }
}

bool tomar() {
  if (!camaraOk) { Serial.println("Camara no inicializada, reintentando AI.begin()"); camaraOk = AI.begin(); if (!camaraOk) return false; }
  Serial.printf("Invocando camara... memoria libre %u\n", ESP.getFreeHeap());
  uint32_t t = millis();
  // 2 capturas seguidas, enviar siempre (2o campo en 1 = "solo si cambio"), con imagen.
  // La Grove entrega primero el frame que tenia guardado (el de la foto anterior): se descarta y queda el segundo, el actual.
  AI.write("AT+INVOKE=2,0,0\r\n", 17);
  int r = AI.wait(CMD_TYPE_RESPONSE, CMD_AT_INVOKE, 4000);
  if (r == CMD_OK) r = AI.wait(CMD_TYPE_EVENT, CMD_AT_INVOKE, 15000);
  if (r == CMD_OK) r = AI.wait(CMD_TYPE_EVENT, CMD_AT_INVOKE, 15000);
  Serial.printf("invoke = %d en %u ms\n", r, (unsigned)(millis() - t));
  return r == CMD_OK;
}

void enviarBinario() {
  uint32_t t0 = millis();
  if (!tomar()) { Serial.println("Error al invocar la camara"); return; }
  String b64 = AI.last_image();
  Serial.printf("base64: %u chars\n", (unsigned)b64.length());
  if (b64.length() == 0) { Serial.println("Sin imagen"); return; }

  size_t maxLen = (b64.length() * 3) / 4 + 4;
  uint8_t *jpg = (uint8_t *)malloc(maxLen);
  if (!jpg) { Serial.println("Sin memoria"); return; }

  size_t jpgLen = 0;
  mbedtls_base64_decode(jpg, maxLen, &jpgLen, (const uint8_t *)b64.c_str(), b64.length());
  b64 = String();  // libera el texto antes de enviar
  Serial.printf("Foto lista en %u ms. ", (unsigned)(millis() - t0));
  Serial.printf("JPEG: %u bytes, chunk=%u, memoria libre %u\n", (unsigned)jpgLen, chunkBin, ESP.getFreeHeap());

  uint32_t len32 = jpgLen;
  uint32_t t = millis();
  enviar((uint8_t *)&len32, 4, 4, 6);
  enviar(jpg, jpgLen, chunkBin, 6);  // con 3 ms a veces se perdia un paquete y la foto quedaba sin final
  free(jpg);
  Serial.printf("JPEG enviado en %u ms (%u paquetes)\n", (unsigned)(millis() - t), (unsigned)((jpgLen + chunkBin - 1) / chunkBin));
}

void enviarTexto(const char *s) { enviar((const uint8_t *)s, strlen(s), 20, 8); }

void enviarFotoTexto() {
  enviarTexto("Tomando foto...\n");
  if (!tomar()) { enviarTexto("ERROR: no responde la camara\n"); return; }
  String b64 = AI.last_image();
  if (b64.length() == 0) { enviarTexto("ERROR: sin imagen\n"); return; }
  enviarTexto("FOTO_INICIO\n");
  enviarTexto("data:image/jpeg;base64,");
  enviar((const uint8_t *)b64.c_str(), b64.length(), 20, 8);
  enviarTexto("\nFOTO_FIN\n");
}

void setup() {
  Serial.begin(115200);
  Serial.setTxTimeoutMs(0);  // conectado a una compu sin monitor abierto, cada print esperaba ~100 ms y frenaba la foto
  delay(1500);  // da tiempo a abrir el monitor
  Serial.printf("\nArranque. Motivo=%d (1=encendido 3=reset 4=error 9=bajon de voltaje)\n", esp_reset_reason());

  // Bluetooth primero: aunque la camara se trabe, el celular ve y conecta la placa.
  BLEDevice::init(NOMBRE_BLE);
  BLEDevice::setMTU(247);
  BLEServer *server = BLEDevice::createServer();
  server->setCallbacks(new ServerCB());
  BLEService *service = server->createService(SERVICE_UUID);
  BLECharacteristic *rx = service->createCharacteristic(RX_UUID, BLECharacteristic::PROPERTY_WRITE | BLECharacteristic::PROPERTY_WRITE_NR);
  rx->setCallbacks(new RxCB());
  txChar = service->createCharacteristic(TX_UUID, BLECharacteristic::PROPERTY_NOTIFY);
  txChar->addDescriptor(new BLE2902());
  service->start();
  BLEAdvertising *adv = BLEDevice::getAdvertising();
  adv->addServiceUUID(SERVICE_UUID);
  adv->start();
  Serial.println("BLE activo: esp cabeza");

  Wire.setBufferSize(256);  // la libreria lee paquetes de 250 bytes; con los 128 por defecto llegaban en cero
  Wire.begin();  // XIAO ESP32-C3: SDA=D4, SCL=D5
  Serial.print("I2C encontrado en:");
  int n = 0;
  for (uint8_t a = 1; a < 127; a++) { Wire.beginTransmission(a); if (Wire.endTransmission() == 0) { Serial.printf(" 0x%02X", a); n++; } }
  Serial.println(n ? "" : " nada (revisa cables SDA/SCL y alimentacion de la Grove)");
  Serial.println("Iniciando camara (Grove Vision AI V2, I2C 0x62)...");
  camaraOk = AI.begin();
  Serial.println(camaraOk ? "Camara OK" : "Camara NO responde por I2C");
}

// Manda un comando AT a la Grove y muestra su respuesta cruda (sin imagen, recortada).
void crudo(const char *cmd, uint32_t ms) {
  Serial.printf(">> %s", cmd);
  AI.write(cmd, strlen(cmd));
  static char buf[512];
  uint32_t t = millis(), total = 0;
  while (millis() - t < ms) {
    int n = AI.available();
    if (n <= 0) { delay(2); continue; }
    n = AI.read(buf, min(n, (int)sizeof(buf) - 1));
    for (int i = 0; i < n; i++) if (buf[i] == 0) buf[i] = '~'; else if (buf[i] == '\r' || buf[i] == '\n') buf[i] = '|';
    buf[n] = 0;
    if (total < 700) Serial.print(buf);
    else if (total < 100000 && strstr(buf, "\"type\"")) Serial.printf("\n[...%u] %.160s", (unsigned)total, strstr(buf, "\"type\""));
    total += n;
  }
  Serial.printf("\n<< %u bytes en %u ms\n", (unsigned)total, (unsigned)ms);
}

void loop() {
  // Pruebas por el monitor serial, sin celular: 'f' toma una foto, 'r' muestra respuestas crudas de la Grove.
  char k = Serial.available() ? Serial.read() : 0;
  if (k == 'r') { crudo("AT+INVOKE=1,0,0\r\n", 12000); }
  if (k == 's') { crudo("AT+INVOKE=1,0,1\r\n", 5000); }
  if (k == 'f') {
    if (tomar()) { Serial.printf("Prueba: base64 %u chars\n", (unsigned)AI.last_image().length()); } else Serial.println("Prueba: fallo la camara");
  }
  if (pedirFoto && conectado) {
    uint8_t modo = pedirFoto;
    pedirFoto = 0;
    if (modo == 1) enviarBinario();
    else enviarFotoTexto();
  }
  static uint32_t vivo = 0;
  if (millis() - vivo > 10000) { vivo = millis(); Serial.printf("vivo, %s, memoria libre %u\n", conectado ? "conectado" : "esperando conexion", ESP.getFreeHeap()); }
  delay(5);
}
