#include <Wire.h>
#include <Adafruit_MLX90614.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_NeoPixel.h>
#include <BluetoothSerial.h>
#include <freertos/FreeRTOS.h>
#include <freertos/queue.h>
#include <freertos/task.h>
#include <math.h>
#include <stdint.h>

// Detector experimental por amplitud e intervalos entre picos.
class DetectorBPM {
public:
  float bpm = NAN;

  void reiniciar(uint32_t ahora) {
    inicializado = true;
    inicio = ultimaMuestra = ahora;
    ultimoLatido = 0;
    hayLatido = false;
    armado = true;
    pico = 100;
    nivelMedio = 10;
    cantidad = indice = 0;
    bpm = NAN;
  }

  void actualizar(float senal, int adc, bool conectado, uint32_t ahora) {
    if (!inicializado) reiniciar(ahora);
    uint32_t dt = ahora - ultimaMuestra;
    if (!conectado || !isfinite(senal) || adc <= 15 || adc >= 4050 || dt > 40) {
      reiniciar(ahora);
      return;
    }
    ultimaMuestra = ahora;

    float amplitud = fabsf(senal);
    pico = fmaxf(amplitud, pico * expf(-(float)dt / 1800.0f));
    nivelMedio += (1 - expf(-(float)dt / 1000.0f)) * (amplitud - nivelMedio);
    float umbral = fmaxf(60, fmaxf(0.5f * pico, 2.5f * nivelMedio));

    if (amplitud < 0.4f * umbral) armado = true;
    if (ahora - inicio < 2000) return;

    if (hayLatido && ahora - ultimoLatido > 2500) {
      hayLatido = false;
      cantidad = indice = 0;
      bpm = NAN;
    }

    // Los 300 ms evitan contar dos partes del mismo complejo como latidos.
    if (!armado || amplitud < umbral ||
        (hayLatido && ahora - ultimoLatido < 300)) return;
    armado = false;

    if (hayLatido) {
      uint32_t intervalo = ahora - ultimoLatido;
      if (intervalo <= 2000) {
        intervalos[indice] = intervalo;
        indice = (indice + 1) % 5;
        if (cantidad < 5) cantidad++;

        if (cantidad >= 3) {
          uint32_t ordenados[5];
          for (int i = 0; i < cantidad; i++) ordenados[i] = intervalos[i];
          for (int i = 1; i < cantidad; i++) {
            uint32_t valor = ordenados[i];
            int j = i - 1;
            while (j >= 0 && ordenados[j] > valor) {
              ordenados[j + 1] = ordenados[j];
              j--;
            }
            ordenados[j + 1] = valor;
          }
          float mediana = ordenados[cantidad / 2];
          if (cantidad % 2 == 0) {
            mediana = 0.5f * (ordenados[cantidad / 2 - 1] + mediana);
          }
          bpm = 60000.0f / mediana;
        }
      } else {
        cantidad = indice = 0;
        bpm = NAN;
      }
    }

    ultimoLatido = ahora;
    hayLatido = true;
  }

private:
  bool inicializado = false, hayLatido = false, armado = true;
  uint32_t inicio = 0, ultimaMuestra = 0, ultimoLatido = 0;
  uint32_t intervalos[5] = {};
  int cantidad = 0, indice = 0;
  float pico = 100, nivelMedio = 10;
};

#if !defined(CONFIG_BT_SPP_ENABLED)
#error Este programa necesita una ESP32 con Bluetooth clasico SPP.
#endif

Adafruit_MLX90614 sensor;
Adafruit_MPU6050 mpu;
BluetoothSerial SerialBT;
DetectorBPM detector;

const int PIN_LEDS = 16;
const int NUM_LEDS = 40;
const int BRILLO_MINIMO = 60; // con 3 cada canal queda en 0-2 y los colores no se distinguen (amarillo salia verde)
const int BRILLO_MAXIMO = 255;
const float ECG_REPOSO = 120.0f;
const float ECG_PICO = 400.0f;
// Pulso donde la tira empieza a ponerse roja y donde ya es rojo total (umbrales "vigilar" y "critico" de la app).
const float BPM_CALMA = 100.0f;
const float BPM_ROJO = 130.0f;

Adafruit_NeoPixel tira(NUM_LEDS, PIN_LEDS, NEO_RGB + NEO_KHZ800); // esta tira es RGB: con BRG el coral salia verde y la menta morada
float amplitudLuces = 0;
float ultimaAmplitudLuces = 0;
float brilloLuces = BRILLO_MINIMO;
int ultimoBrillo = -1;
uint32_t ultimoColor = 0;
uint32_t tiempoLuces = 0;
volatile bool pedirPruebaLuces = false;
bool pruebaLucesActiva = false;
uint32_t inicioPruebaLuces = 0;
// Color de la mascota, lo manda la app con "C,r,g,b". Azul de antes hasta que llegue.
volatile uint8_t mascotaR = 80, mascotaG = 180, mascotaB = 255;

// Los colores de la mascota son pastel y en LED se ven casi blancos: estirar el canal minimo a 0 los satura.
void ponerColorMascota(int r, int g, int b) {
  r = constrain(r, 0, 255); g = constrain(g, 0, 255); b = constrain(b, 0, 255);
  int menor = min(r, min(g, b)), mayor = max(r, max(g, b));
  if (mayor > menor) {
    r = (r - menor) * 255 / (mayor - menor);
    g = (g - menor) * 255 / (mayor - menor);
    b = (b - menor) * 255 / (mayor - menor);
  }
  mascotaR = r; mascotaG = g; mascotaB = b;
}

// Mezcla del color de la mascota hacia rojo segun el pulso: 0 bajo BPM_CALMA, 1 en BPM_ROJO o mas.
uint32_t colorActual() {
  float bpm = detector.bpm;
  float t = isfinite(bpm) ? (bpm - BPM_CALMA) / (BPM_ROJO - BPM_CALMA) : 0;
  t = fmaxf(0.0f, fminf(1.0f, t));
  return tira.Color(mascotaR + t * (255 - mascotaR), mascotaG * (1 - t), mascotaB * (1 - t));
}

void pintarLuces(int brillo) {
  // gamma: el verde del LED brilla mucho mas que el rojo, sin esto el amarillo y la arena se ven verdes
  uint32_t c = tira.gamma32(colorActual());
  // Tope de consumo: el azul original (80,180,255) a 255 si aguantaba; el blanco a 255 jala ~50 % mas y reiniciaba la ESP.
  int suma = ((c >> 16) & 0xFF) + ((c >> 8) & 0xFF) + (c & 0xFF);
  if (suma > 515) brillo = brillo * 515 / suma;
  if (brillo == ultimoBrillo && c == ultimoColor) return;
  tira.setBrightness(brillo);
  for (int i = 0; i < NUM_LEDS; i++) {
    tira.setPixelColor(i, c);
  }
  tira.show();
  ultimoBrillo = brillo;
  ultimoColor = c;
}

// "C,r,g,b" cambia el color de la mascota; devuelve true si la linea era eso.
bool comandoColor(const String &l) {
  int r, g, b;
  if (!l.startsWith("C,") || sscanf(l.c_str() + 2, "%d,%d,%d", &r, &g, &b) != 3) return false;
  ponerColorMascota(r, g, b);
  return true;
}

const char encabezadoCSV[] =
  "tiempo_us,ecg_crudo,ecg_filtrado,bpm,electrodos_ok,"
  "angulo_x_grados,angulo_y_grados,angulo_z_grados,"
  "aceleracion_x_ms2,aceleracion_y_ms2,aceleracion_z_ms2,"
  "temperatura_objeto_c";

struct PaqueteBT {
  char texto[256];
};

QueueHandle_t colaBT = nullptr;

const int ecg = 34;
const int loMenos = 19;
const int loMas = 18;
const float grados = 57.2957795f;

float offsetX = 0, offsetY = 0, offsetZ = 0;
float qw = 1, qx = 0, qy = 0, qz = 0;
float anguloX = NAN, anguloY = NAN, anguloZ = NAN;
float accelX = NAN, accelY = NAN, accelZ = NAN;
double temperaturaObjeto = NAN;
bool hayIMU = false, hayTemperatura = false;

int ecgCrudo = 0;
float filtrado = 0, centro = 0;
float senalECG = NAN;
bool iniciadoECG = false;
bool electrodosOK = false;
uint8_t contadorEnvios = 0;

uint32_t tiempoECG = 0;
uint32_t tiempoMuestraECG = 0;
uint32_t tiempoIMU = 0;
uint32_t tiempoTemperatura = 0;

void actualizarLuces() {
  if (pedirPruebaLuces) {
    pedirPruebaLuces = false;
    inicioPruebaLuces = millis();
    pruebaLucesActiva = true;
  }

  if (pruebaLucesActiva) {
    uint32_t transcurrido = millis() - inicioPruebaLuces;
    if (transcurrido < 1400) {
      pintarLuces(transcurrido < 700 ? 0 : 255);
      ultimaAmplitudLuces = amplitudLuces;
      amplitudLuces = 0;
      return;
    }
    pruebaLucesActiva = false;
    brilloLuces = BRILLO_MINIMO;
  }

  if (!electrodosOK || !isfinite(senalECG)) {
    brilloLuces = BRILLO_MINIMO;
  } else {
    // Usar ambos signos del ECG para admitir picos invertidos.
    float nivel = (amplitudLuces - ECG_REPOSO) / (ECG_PICO - ECG_REPOSO);
    nivel = fmaxf(0.0f, fminf(1.0f, nivel));
    float objetivo = BRILLO_MINIMO + nivel * (BRILLO_MAXIMO - BRILLO_MINIMO);

    // Subida inmediata con el pico y bajada suave entre latidos.
    if (objetivo >= brilloLuces) {
      brilloLuces = objetivo;
    } else {
      brilloLuces += 0.35f * (objetivo - brilloLuces);
    }
  }

  ultimaAmplitudLuces = amplitudLuces;
  amplitudLuces = 0;
  pintarLuces((int)lroundf(brilloLuces));
}

// El envio Bluetooth va aparte para no detener las lecturas.
void tareaBluetooth(void *parametro) {
  PaqueteBT paquete;
  bool conectadoAntes = false;

  while (true) {
    if (!SerialBT.hasClient()) {
      conectadoAntes = false;
      xQueueReset(colaBT);
      vTaskDelay(pdMS_TO_TICKS(20));
      continue;
    }

    if (!conectadoAntes) {
      SerialBT.println(encabezadoCSV);
      conectadoAntes = true;
    }

    if (SerialBT.available()) {
      String l = SerialBT.readStringUntil('\n');
      if (l.startsWith("S,")) {
        uint32_t us = micros();              // leerlo antes de enviar
        SerialBT.printf("%s,%lu\n", l.c_str(), us);
      } else {
        l.trim();
        if (comandoColor(l)) {
          SerialBT.printf("LED,color=%d,%d,%d\n", mascotaR, mascotaG, mascotaB);
        } else if (l == "L" || l == "l") {
          SerialBT.printf("LED,firmware=PECHO_250HZ,ecg_filtrado=%.1f,pico=%.1f,brillo_enviado=%d\n",
                          senalECG, ultimaAmplitudLuces, ultimoBrillo);
        } else if (l == "T" || l == "t") {
          pedirPruebaLuces = true;
          SerialBT.println("LED,prueba=0_y_255,duracion_ms=1400");
        }
      }
    }

    if (xQueueReceive(colaBT, &paquete, pdMS_TO_TICKS(20)) == pdTRUE) {
      if (SerialBT.hasClient()) {
        SerialBT.println(paquete.texto);
      }
    }
  }
}

void enviarDatos(const char *texto) {
  Serial.println(texto);

  if (SerialBT.hasClient()) {
    PaqueteBT paquete;
    snprintf(paquete.texto, sizeof(paquete.texto), "%s", texto);

    // Si la cola se llena, omitir la fila sin bloquear los sensores.
    xQueueSend(colaBT, &paquete, 0);
  }
}

void calcularAngulos(float ax, float ay, float az,
                    float gx, float gy, float gz, float dt) {
  float magnitud = sqrtf(ax * ax + ay * ay + az * az);

  if (magnitud > 8.3f && magnitud < 11.3f) {
    ax /= magnitud;
    ay /= magnitud;
    az /= magnitud;

    float vx = 2 * (qx * qz - qw * qy);
    float vy = 2 * (qw * qx + qy * qz);
    float vz = 1 - 2 * (qx * qx + qy * qy);

    gx += 1.5f * (ay * vz - az * vy);
    gy += 1.5f * (az * vx - ax * vz);
    gz += 1.5f * (ax * vy - ay * vx);
  }

  float w = qw, x = qx, y = qy, z = qz;
  float paso = dt * 0.5f;

  qw += (-x * gx - y * gy - z * gz) * paso;
  qx += ( w * gx + y * gz - z * gy) * paso;
  qy += ( w * gy - x * gz + z * gx) * paso;
  qz += ( w * gz + x * gy - y * gx) * paso;

  float norma = sqrtf(qw * qw + qx * qx + qy * qy + qz * qz);
  qw /= norma;
  qx /= norma;
  qy /= norma;
  qz /= norma;

  anguloX = atan2f(2 * (qw * qx + qy * qz),
                  1 - 2 * (qx * qx + qy * qy)) * grados;

  float senoY = 2 * (qw * qy - qz * qx);
  senoY = fmaxf(-1.0f, fminf(1.0f, senoY));
  anguloY = asinf(senoY) * grados;

  anguloZ = atan2f(2 * (qw * qz + qx * qy),
                  1 - 2 * (qy * qy + qz * qz)) * grados;
}

void calibrar() {
  sensors_event_t a, g, temp;
  float sumaX = 0, sumaY = 0, sumaZ = 0;
  uint32_t muestras = 0;
  uint32_t inicio = millis();

  // Mantener la IMU quieta durante estos cinco segundos.

  while (millis() - inicio < 5000) {
    if (mpu.getEvent(&a, &g, &temp)) {
      offsetX += g.gyro.x;
      offsetY += g.gyro.y;
      offsetZ += g.gyro.z;
      sumaX += a.acceleration.x;
      sumaY += a.acceleration.y;
      sumaZ += a.acceleration.z;
      muestras++;
    }
    delay(10);
  }

  if (muestras == 0) {
    Serial.println("ERROR: No se pudo leer la IMU.");
    while (true) delay(1000);
  }

  offsetX /= muestras;
  offsetY /= muestras;
  offsetZ /= muestras;

  float ax = sumaX / muestras;
  float ay = sumaY / muestras;
  float az = sumaZ / muestras;
  float roll = atan2f(ay, az);
  float pitch = atan2f(-ax, sqrtf(ay * ay + az * az));

  float cr = cosf(roll / 2), sr = sinf(roll / 2);
  float cp = cosf(pitch / 2), sp = sinf(pitch / 2);

  qw = cr * cp;
  qx = sr * cp;
  qy = cr * sp;
  qz = -sr * sp;
}

void leerECG() {
  electrodosOK = digitalRead(loMenos) == LOW &&
                 digitalRead(loMas) == LOW;
  // Marcar el inicio de la lectura ADC, antes de formar o enviar el CSV.
  tiempoMuestraECG = micros();
  ecgCrudo = analogRead(ecg);

  if (!electrodosOK) {
    iniciadoECG = false;
    senalECG = NAN;
    amplitudLuces = 0;
    detector.reiniciar(millis());
    return;
  }

  if (!iniciadoECG) {
    filtrado = ecgCrudo;
    centro = ecgCrudo;
    iniciadoECG = true;
  }

  filtrado += 0.3f * (ecgCrudo - filtrado);
  centro += 0.002f * (filtrado - centro);
  senalECG = filtrado - centro;
  // Guardar el mayor pico entre dos actualizaciones de la tira.
  amplitudLuces = fmaxf(amplitudLuces, fabsf(senalECG));
  detector.actualizar(senalECG, ecgCrudo, electrodosOK, millis());
}

void leerIMU() {
  sensors_event_t a, g, temp;
  bool lecturaOK = mpu.getEvent(&a, &g, &temp);
  uint32_t ahora = micros();
  float dt = (ahora - tiempoIMU) / 1000000.0f;
  tiempoIMU = ahora;

  if (!lecturaOK) {
    accelX = accelY = accelZ = NAN;
    anguloX = anguloY = anguloZ = NAN;
    return;
  }

  accelX = a.acceleration.x;
  accelY = a.acceleration.y;
  accelZ = a.acceleration.z;

  if (dt > 0 && dt <= 0.1f) {
    calcularAngulos(accelX, accelY, accelZ,
                    g.gyro.x - offsetX,
                    g.gyro.y - offsetY,
                    g.gyro.z - offsetZ, dt);
  } else {
    anguloX = anguloY = anguloZ = NAN;
  }
}

void setup() {
  Serial.setTxBufferSize(512);
  Serial.begin(115200);
  Serial.setTimeout(20); // un comando sin salto de linea no frena el muestreo 1 s
  Serial.println("INFO: PECHO_250HZ");

  tira.begin();
  pintarLuces(0); // apagada hasta que el Bluetooth arranque: su pico de corriente junto con la tira tiraba el voltaje (brownout)

  pinMode(ecg, INPUT);
  pinMode(loMenos, INPUT);
  pinMode(loMas, INPUT);
  analogReadResolution(12);
  analogSetPinAttenuation(ecg, ADC_11db);

  Wire.begin(22, 23, 400000);   // IMU: SDA 22, SCL 23.
  Wire1.begin(32, 33, 100000);  // GY-906: SDA 32, SCL 33.

  delay(200);

  // Un sensor que falta ya no detiene todo: sin esto la ESP se quedaba sin Bluetooth y la app no la veia.
  hayIMU = mpu.begin(0x68, &Wire);
  if (!hayIMU) Serial.println("ERROR: No se encontro el MPU6050. Sigo sin IMU.");
  hayTemperatura = sensor.begin(0x5A, &Wire1);
  if (!hayTemperatura) {
    Serial.println("ERROR: No se encontro el GY-906. Sigo sin temperatura.");
    // Lista lo que si responde en sus pines (32/33): nada = cable o alimentacion; otra direccion = otro sensor.
    Serial.print("INFO: I2C pines 32/33:");
    for (uint8_t d = 1; d < 127; d++) {
      Wire1.beginTransmission(d);
      if (Wire1.endTransmission() == 0) Serial.printf(" 0x%02X", d);
    }
    Serial.print("  | pines 22/23:");
    for (uint8_t d = 1; d < 127; d++) {
      Wire.beginTransmission(d);
      if (Wire.endTransmission() == 0) Serial.printf(" 0x%02X", d);
    }
    Serial.println();
  }

  if (hayIMU) {
    mpu.setAccelerometerRange(MPU6050_RANGE_4_G);
    mpu.setGyroRange(MPU6050_RANGE_500_DEG);
    mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);
    delay(100);
    calibrar();
  }
  if (hayTemperatura) temperaturaObjeto = sensor.readObjectTempC();

  colaBT = xQueueCreate(16, sizeof(PaqueteBT));
  if (colaBT == nullptr || !SerialBT.begin("ESP32_Sensores")) {
    Serial.println("ERROR: No se pudo iniciar Bluetooth.");
    while (true) delay(1000);
  }

  if (xTaskCreate(tareaBluetooth, "envioBT", 4096,
                  nullptr, 1, nullptr) != pdPASS) {
    Serial.println("ERROR: No se pudo iniciar el envio Bluetooth.");
    while (true) delay(1000);
  }

  Serial.println(encabezadoCSV);

  uint32_t ahora = micros();
  tiempoECG = tiempoIMU = tiempoTemperatura = ahora;
}

void loop() {
  // L consulta el brillo; T prueba la tira; C,r,g,b pone el color de la mascota.
  while (Serial.available()) {
    String l = Serial.readStringUntil('\n');
    l.trim();
    if (comandoColor(l)) {
      Serial.printf("LED,color=%d,%d,%d\n", mascotaR, mascotaG, mascotaB);
    } else if (l == "L" || l == "l") {
      Serial.printf("LED,firmware=PECHO_250HZ,ecg_filtrado=%.1f,pico=%.1f,brillo_enviado=%d\n",
                    senalECG, ultimaAmplitudLuces, ultimoBrillo);
    } else if (l == "T" || l == "t") {
      pedirPruebaLuces = true;
      Serial.println("LED,prueba=0_y_255,duracion_ms=1400");
    }
  }

  uint32_t ahora = micros();
  bool nuevaMuestraECG = false;

  if (ahora - tiempoECG >= 4000) {
    tiempoECG = ahora;
    leerECG();
    nuevaMuestraECG = true;
  }

  ahora = micros();
  if (hayIMU && ahora - tiempoIMU >= 10000) {
    leerIMU();
  }

  ahora = micros();
  if (ahora - tiempoTemperatura >= 100000) {
    tiempoTemperatura = ahora;
    if (hayTemperatura) temperaturaObjeto = sensor.readObjectTempC();
  }

  if (nuevaMuestraECG) {
    // Una fila por muestra ECG (~250 Hz). Otros datos cada 25 filas (~10 Hz).
    char linea[256];
    int usados = snprintf(linea, sizeof(linea), "%lu,%d,%.1f,%.1f,%d",
                          (unsigned long)tiempoMuestraECG, ecgCrudo, senalECG,
                          detector.bpm, electrodosOK ? 1 : 0);
    if (usados <= 0 || usados >= (int)sizeof(linea)) return;

    contadorEnvios++;
    int agregados;
    if (contadorEnvios >= 25) {
      contadorEnvios = 0;

      agregados = snprintf(linea + usados, sizeof(linea) - usados,
        ",%.2f,%.2f,%.2f,%.3f,%.3f,%.3f,%.2f",

        anguloX, anguloY, anguloZ,
        accelX, accelY, accelZ, temperaturaObjeto
      );
    } else {
      // Conservar las doce columnas aunque no haya datos nuevos.
      agregados = snprintf(linea + usados, sizeof(linea) - usados,
                            ",,,,,,,");
    }

    if (agregados < 0 || agregados >= (int)(sizeof(linea) - usados)) return;
    enviarDatos(linea);
  }

  ahora = micros();
  if (ahora - tiempoLuces >= 20000) {
    tiempoLuces = ahora;
    actualizarLuces();
  }
}
