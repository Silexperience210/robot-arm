// PINCE — LilyGO T-Display S3 (ESP32-S3, ST7789 170×320)
// Arduino IDE 2 : ESP32S3 Dev Module · USB CDC On Boot Enabled · OPI PSRAM · Flash 16MB QIO
// TFT_eSPI : User_Setup_Select.h → Setup206_LilyGo_T_Display_S3.h
// Libs : TFT_eSPI, ESP32Servo, ArduinoJson 6.21, WebSockets (Markus Sattler)
//
// Header P2 (gauche, 3V3 → 5V) :
//   GPIO1 base · GPIO2 épaule · GPIO3 coude · GPIO10 poignet · GPIO11 pince
//   GPIO12 TRIG · GPIO13 ECHO · GND commun · 5V = VBUS USB (interdit aux servos)
// Alim servos : 5 V 3 A EXTERNE + GND commun avec la carte.
// GPIO15 = POWER_ON écran, GPIO38 = backlight — le firmware les met à HIGH.
// GPIO3 est un strapping : brancher le servo coude APRÈS le boot.
// BTN2 (GPIO14) court = home mécanique · long = stop
// Wi-Fi AP : PINCE / pince1234 · ws://192.168.4.1:81
//
// JSON studio → carte
//   {"t":"pose","j":{"base":90,"shoulder":118,"elbow":48,"wrist":108,"grip":72},"spd":0.6}
//   {"t":"home"}  {"t":"park"}  {"t":"stop"}  {"t":"ping"}
// carte → studio
//   {"t":"state","j":{...},"us":12.4,"v":3.94,"clients":1}

#include <WiFi.h>
#include <WebSocketsServer.h>
#include <ESP32Servo.h>
#include <ArduinoJson.h>
#include <TFT_eSPI.h>
#include <math.h>

#define PIN_POWER 15
#define PIN_BL    38
#define PIN_BTN2  14
#define PIN_BATT  4
#define PIN_TRIG  12
#define PIN_ECHO  13

const int SERVO_PIN[5] = {1, 2, 3, 10, 11};
const char* KEYS[5] = {"base","shoulder","elbow","wrist","grip"};
const char* LABELS[5] = {"BASE","EPAU","COUDE","POIG","PINCE"};
const int SMAX[5] = {180, 180, 180, 180, 90};

// HOME mécanique — visser les cornes dans cette pose
const float HOME[5] = {90, 118, 48, 108, 72};
// PARK compact, hors volume d'impression (après calage)
const float PARK[5] = {90, 160, 25, 25, 40};

const char* AP_SSID = "PINCE";
const char* AP_PASS = "pince1234";

TFT_eSPI tft;
Servo srv[5];
WebSocketsServer ws(81);

float cur[5] = {90, 118, 48, 108, 72};
float tgt[5] = {90, 118, 48, 108, 72};
float spd = 0.6f;
uint32_t lastDraw = 0, lastTx = 0, pressAt = 0;
bool pressed = false;
int clients = 0;
bool haltUs = false;

int clampi(int v, int a, int b) { return v < a ? a : (v > b ? b : v); }
float clampf(float v, float a, float b) { return v < a ? a : (v > b ? b : v); }

float usCm() {
  digitalWrite(PIN_TRIG, LOW); delayMicroseconds(2);
  digitalWrite(PIN_TRIG, HIGH); delayMicroseconds(10);
  digitalWrite(PIN_TRIG, LOW);
  long d = pulseIn(PIN_ECHO, HIGH, 18000);
  if (!d) return -1;
  return d / 58.0f;
}

float battV() {
  return analogReadMilliVolts(PIN_BATT) * 2.0f / 1000.0f;
}

void applyPose() {
  float d = usCm();
  haltUs = (d > 0 && d < 2.2f);
  for (int i = 0; i < 5; i++) {
    float goal = tgt[i];
    // Si obstacle très proche, on n'avance plus la pince ni les axes vers le bas
    if (haltUs && i == 4 && goal < cur[i]) goal = cur[i];
    float k = 0.10f + 0.42f * spd;
    cur[i] += (goal - cur[i]) * k;
    if (fabsf(goal - cur[i]) < 0.35f) cur[i] = goal;
    srv[i].write(clampi((int)(cur[i] + 0.5f), 0, SMAX[i]));
  }
}

void fillPose(const float *src) {
  for (int i = 0; i < 5; i++) tgt[i] = src[i];
}

String stateJson() {
  StaticJsonDocument<320> doc;
  doc["t"] = "state";
  JsonObject j = doc.createNestedObject("j");
  for (int i = 0; i < 5; i++) j[KEYS[i]] = (int)(cur[i] + 0.5f);
  doc["us"] = usCm();
  doc["v"] = battV();
  doc["clients"] = clients;
  doc["halt"] = haltUs;
  String s;
  serializeJson(doc, s);
  return s;
}

void sendState(uint8_t n) { ws.sendTXT(n, stateJson()); }
void broadcastState() { if (clients > 0) ws.broadcastTXT(stateJson()); }

void onWs(uint8_t n, WStype_t type, uint8_t *payload, size_t length) {
  if (type == WStype_CONNECTED) { clients++; sendState(n); return; }
  if (type == WStype_DISCONNECTED) { clients = max(0, clients - 1); return; }
  if (type != WStype_TEXT) return;

  StaticJsonDocument<384> doc;
  if (deserializeJson(doc, payload, length)) return;
  const char* t = doc["t"] | "";

  if (!strcmp(t, "ping")) { sendState(n); return; }
  if (!strcmp(t, "stop")) {
    for (int i = 0; i < 5; i++) tgt[i] = cur[i];
    return;
  }
  if (!strcmp(t, "home")) { fillPose(HOME); return; }
  if (!strcmp(t, "park")) { fillPose(PARK); return; }
  if (!strcmp(t, "pose")) {
    JsonObject j = doc["j"];
    for (int i = 0; i < 5; i++) {
      if (j.containsKey(KEYS[i])) tgt[i] = clampf(j[KEYS[i]], 0, SMAX[i]);
    }
    if (doc.containsKey("spd")) spd = clampf(doc["spd"], 0.15f, 1.0f);
  }
}

void drawUi() {
  const uint16_t BG = 0x1082, FG = 0xE73B, MUT = 0x8C71, ACC = 0xC616, OK = 0x8DE9, DAN = 0xE8C4;
  static bool chrome = false;
  static int lastBar[5] = {-1, -1, -1, -1, -1};
  static int lastUs = -999, lastCli = -1;
  if (!chrome) {
    tft.fillScreen(BG);
    tft.setTextDatum(TL_DATUM);
    tft.setTextColor(ACC, BG);
    tft.drawString("PINCE", 8, 6, 2);
    tft.setTextColor(MUT, BG);
    tft.drawString("T-DISPLAY S3", 70, 10, 1);
    for (int i = 0; i < 5; i++) {
      int y = 28 + i * 22;
      tft.setTextColor(MUT, BG);
      tft.drawString(LABELS[i], 8, y, 1);
    }
    tft.setTextColor(MUT, BG);
    tft.drawString("BTN2 home/stop", 200, 154, 1);
    chrome = true;
  }

  char buf[28];
  snprintf(buf, sizeof(buf), "%.2fV", battV());
  tft.setTextDatum(TR_DATUM);
  tft.setTextColor(battV() < 3.5f ? DAN : OK, BG);
  tft.drawString(buf, 312, 8, 1);

  for (int i = 0; i < 5; i++) {
    int w = (int)(200.0f * cur[i] / SMAX[i]);
    if (w == lastBar[i]) continue;
    lastBar[i] = w;
    int y = 28 + i * 22;
    tft.fillRect(56, y + 2, 200, 10, 0x2104);
    tft.fillRect(56, y + 2, w, 10, ACC);
    snprintf(buf, sizeof(buf), "%3d", (int)cur[i]);
    tft.setTextDatum(TR_DATUM);
    tft.setTextColor(FG, BG);
    tft.drawString(buf, 312, y, 1);
  }

  float d = usCm();
  int di = (int)(d * 10);
  if (di != lastUs || clients != lastCli) {
    lastUs = di;
    lastCli = clients;
    tft.fillRect(8, 140, 190, 18, BG);
    tft.setTextDatum(TL_DATUM);
    if (d < 0) {
      tft.setTextColor(MUT, BG);
      tft.drawString("US --", 8, 144, 1);
    } else {
      tft.setTextColor(haltUs ? DAN : MUT, BG);
      snprintf(buf, sizeof(buf), "US %.1f cm", d);
      tft.drawString(buf, 8, 144, 1);
    }
    tft.setTextColor(clients ? OK : MUT, BG);
    tft.drawString(clients ? "WS ON" : "AP PINCE", 110, 144, 1);
  }
}

void handleBtn() {
  bool down = digitalRead(PIN_BTN2) == LOW;
  uint32_t now = millis();
  if (down && !pressed) { pressed = true; pressAt = now; }
  if (!down && pressed) {
    pressed = false;
    uint32_t dt = now - pressAt;
    if (dt > 50 && dt < 700) fillPose(HOME);
    else if (dt >= 700) {
      for (int i = 0; i < 5; i++) tgt[i] = cur[i];
    }
  }
}

void setup() {
  pinMode(PIN_POWER, OUTPUT);
  digitalWrite(PIN_POWER, HIGH);
  pinMode(PIN_BL, OUTPUT);
  digitalWrite(PIN_BL, HIGH);
  pinMode(PIN_BTN2, INPUT_PULLUP);
  pinMode(PIN_TRIG, OUTPUT);
  pinMode(PIN_ECHO, INPUT);
  analogReadResolution(12);

  Serial.begin(115200);
  delay(160);
  tft.init();
  tft.setRotation(1);
  tft.fillScreen(0x1082);

  ESP32PWM::allocateTimer(0);
  ESP32PWM::allocateTimer(1);
  ESP32PWM::allocateTimer(2);
  ESP32PWM::allocateTimer(3);
  for (int i = 0; i < 5; i++) {
    srv[i].setPeriodHertz(50);
    srv[i].attach(SERVO_PIN[i], 500, 2500);
    srv[i].write((int)cur[i]);
  }

  WiFi.mode(WIFI_AP);
  WiFi.softAP(AP_SSID, AP_PASS);
  delay(80);
  ws.begin();
  ws.onEvent(onWs);
  Serial.print("AP ");
  Serial.println(WiFi.softAPIP());
  drawUi();
}

void loop() {
  ws.loop();
  applyPose();
  handleBtn();
  uint32_t now = millis();
  if (now - lastDraw > 160) {
    lastDraw = now;
    drawUi();
  }
  if (now - lastTx > 220) {
    lastTx = now;
    broadcastState();
  }
  delay(6);
}
