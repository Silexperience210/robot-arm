export const FIRMWARE_INO = `// PINCE — LilyGO T-Display S3 (ESP32-S3, ST7789 170×320)
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
`;

export const TFT_SETUP = `// Copier dans Arduino/libraries/TFT_eSPI/User_Setup_Select.h
// 1. Commenter  #include <User_Setup.h>
// 2. Décommenter :

#include <User_Setups/Setup206_LilyGo_T_Display_S3.h>
`;

export const CAM_INO = `// PINCE — ESP32-CAM AI-Thinker (OV2640)
// Arduino : AI Thinker ESP32-CAM · PSRAM Enabled · Partition Huge APP
// Flash USB-TTL 5V : U0R←TX, U0T→RX, GND, 5V. GPIO0 au GND pendant le flash, puis relâcher + RST
// Rejoint l'AP du T-Display S3 (PINCE / pince1234) en IP fixe 192.168.4.2
// Stream : http://192.168.4.2:81/stream
// Still  : http://192.168.4.2/capture

#include "esp_camera.h"
#include <WiFi.h>
#include "esp_http_server.h"

const char* SSID = "PINCE";
const char* PASS = "pince1234";

IPAddress LOCAL(192, 168, 4, 2);
IPAddress GATEWAY(192, 168, 4, 1);
IPAddress SUBNET(255, 255, 255, 0);

#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM      0
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27
#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM        5
#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22
#define FLASH_GPIO         4

httpd_handle_t stream_httpd = NULL;
httpd_handle_t cam_httpd = NULL;

static const char* STREAM_CT = "multipart/x-mixed-replace;boundary=frame";

static esp_err_t stream_handler(httpd_req_t *req) {
  camera_fb_t *fb = NULL;
  esp_err_t res = ESP_OK;
  char part[72];
  httpd_resp_set_type(req, STREAM_CT);
  httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
  while (true) {
    fb = esp_camera_fb_get();
    if (!fb) { res = ESP_FAIL; break; }
    size_t hlen = snprintf(part, sizeof(part),
      "--frame\\r\\nContent-Type: image/jpeg\\r\\nContent-Length: %u\\r\\n\\r\\n",
      (unsigned)fb->len);
    res = httpd_resp_send_chunk(req, part, hlen);
    if (res == ESP_OK) res = httpd_resp_send_chunk(req, (const char*)fb->buf, fb->len);
    if (res == ESP_OK) res = httpd_resp_send_chunk(req, "\\r\\n", 2);
    esp_camera_fb_return(fb);
    if (res != ESP_OK) break;
  }
  return res;
}

static esp_err_t capture_handler(httpd_req_t *req) {
  camera_fb_t *fb = esp_camera_fb_get();
  if (!fb) return ESP_FAIL;
  httpd_resp_set_type(req, "image/jpeg");
  httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
  esp_err_t r = httpd_resp_send(req, (const char*)fb->buf, fb->len);
  esp_camera_fb_return(fb);
  return r;
}

void startCameraServer() {
  httpd_config_t config = HTTPD_DEFAULT_CONFIG();
  config.server_port = 80;
  httpd_uri_t cap = { .uri = "/capture", .method = HTTP_GET, .handler = capture_handler, .user_ctx = NULL };
  if (httpd_start(&cam_httpd, &config) == ESP_OK) httpd_register_uri_handler(cam_httpd, &cap);
  config.server_port = 81;
  config.ctrl_port = 32769;
  httpd_uri_t st = { .uri = "/stream", .method = HTTP_GET, .handler = stream_handler, .user_ctx = NULL };
  if (httpd_start(&stream_httpd, &config) == ESP_OK) httpd_register_uri_handler(stream_httpd, &st);
}

bool initCam() {
  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;
  config.pin_d0 = Y2_GPIO_NUM; config.pin_d1 = Y3_GPIO_NUM;
  config.pin_d2 = Y4_GPIO_NUM; config.pin_d3 = Y5_GPIO_NUM;
  config.pin_d4 = Y6_GPIO_NUM; config.pin_d5 = Y7_GPIO_NUM;
  config.pin_d6 = Y8_GPIO_NUM; config.pin_d7 = Y9_GPIO_NUM;
  config.pin_xclk = XCLK_GPIO_NUM;
  config.pin_pclk = PCLK_GPIO_NUM;
  config.pin_vsync = VSYNC_GPIO_NUM;
  config.pin_href = HREF_GPIO_NUM;
  config.pin_sscb_sda = SIOD_GPIO_NUM;
  config.pin_sscb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;
  config.frame_size = FRAMESIZE_VGA;
  config.jpeg_quality = 14;
  config.fb_count = 2;
  config.fb_location = CAMERA_FB_IN_PSRAM;
  config.grab_mode = CAMERA_GRAB_LATEST;
  return esp_camera_init(&config) == ESP_OK;
}

void setup() {
  Serial.begin(115200);
  pinMode(FLASH_GPIO, OUTPUT);
  digitalWrite(FLASH_GPIO, LOW);
  if (!initCam()) {
    Serial.println("cam init fail");
    return;
  }
  WiFi.mode(WIFI_STA);
  WiFi.config(LOCAL, GATEWAY, SUBNET);
  WiFi.begin(SSID, PASS);
  for (int i = 0; i < 80 && WiFi.status() != WL_CONNECTED; i++) delay(200);
  Serial.print("cam ");
  Serial.println(WiFi.localIP());
  startCameraServer();
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    WiFi.disconnect();
    WiFi.config(LOCAL, GATEWAY, SUBNET);
    WiFi.begin(SSID, PASS);
    delay(2000);
  }
  delay(4000);
}
`;

export const PI_BRIDGE = `#!/usr/bin/env python3
# PINCE — pont Raspberry Pi 4 (optionnel) vers LilyGO T-Display S3
# python3 -m pip install aiohttp websockets
# python3 pince-pi.py --esp ws://192.168.4.1:81

import argparse, asyncio, websockets
from aiohttp import web

ESP = None
clients = set()

async def pump_esp(url):
    global ESP
    while True:
        try:
            async with websockets.connect(url) as ws:
                ESP = ws
                async for msg in ws:
                    for c in list(clients):
                        await c.send_str(msg)
        except Exception as e:
            print("esp", e)
            ESP = None
            await asyncio.sleep(2)

async def ws_handler(request):
    ws = web.WebSocketResponse()
    await ws.prepare(request)
    clients.add(ws)
    try:
        async for msg in ws:
            if msg.type == web.WSMsgType.TEXT and ESP:
                await ESP.send(msg.data)
    finally:
        clients.discard(ws)
    return ws

async def health(_):
    return web.json_response({"ok": True, "esp": ESP is not None})

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--esp", default="ws://192.168.4.1:81")
    p.add_argument("--port", type=int, default=8088)
    args = p.parse_args()
    app = web.Application()
    app.router.add_get("/ws", ws_handler)
    app.router.add_get("/health", health)
    loop = asyncio.get_event_loop()
    loop.create_task(pump_esp(args.esp))
    web.run_app(app, host="0.0.0.0", port=args.port)

if __name__ == "__main__":
    main()
`;

export const OPENSCAD = `// PINCE — pack imprimable 5 DDL + pince + berceau LilyGO T-Display S3
// OpenSCAD 2021+ · F6 → STL · mm
// 0.20 mm, buse 0.4, 3 parois, 25–30 % gyroid, PLA ou PETG
//
// En haut, choisir la pièce :
part = "assembly"; // assembly | base | yoke | link120 | link105 | palm | jaw | cradle | cam | us | bin | clip | clamp

$fn = 36;
clear = 0.35;
sg90 = [23.2, 12.4, 22.5];
flange = [32.2, 12.4, 2.6];

module hex_grid_holes(len=120, wide=16, thick=8, cell=7.2, hole=2.15) {
  rows = floor((len - 22) / (cell * 0.866));
  cols = 3;
  for (j = [0:rows]) {
    for (i = [-1:1]) {
      off = (j % 2) * cell * 0.5;
      x = 12 + j * cell * 0.866;
      y = i * cell * 0.92 + off * 0.15;
      if (abs(y) < wide/2 - hole - 0.8)
        translate([x, y, -1]) cylinder(h=thick+4, r=hole * (0.78 + 0.22 * sin(j*19)));
    }
  }
}

module sg90_pocket() {
  cube(sg90 + [clear, clear, 8], center=true);
  translate([0, 0, sg90.z/2]) cube(flange + [clear, clear, 0], center=true);
  translate([-sg90.x/2 - 4, 0, -2]) cube([8, 6, 10], center=true); // câble
}

module horn_boss() {
  difference() {
    cylinder(h=5, d=8.2);
    translate([0,0,-1]) cylinder(h=8, d=2.2);
    for (a=[0:90:270]) rotate([0,0,a]) translate([4.6,0,-1]) cylinder(h=6, d=1.5);
  }
}

module base() {
  difference() {
    hull() {
      for (x=[-38,38], y=[-38,38]) translate([x,y,0]) cylinder(h=6, r=6);
    }
    for (a=[0,90,180,270]) rotate([0,0,a]) translate([32,32,-1]) cylinder(h=10, d=3.3);
    translate([0,0,18]) sg90_pocket();
  }
}

module yoke() {
  difference() {
    union() {
      cylinder(h=4, d=30);
      for (s=[-1,1]) translate([0, s*10.4, 0])
        cube([30, 4.2, 36], center=false);
      translate([-15, -12.5, 32]) cube([30, 25, 4]);
    }
    translate([0,0,-1]) cylinder(h=8, d=2.2);
    for (a=[0:90:270]) rotate([0,0,a]) translate([4.6,0,-1]) cylinder(h=8, d=1.5);
    translate([0,0,18]) rotate([90,0,0]) cylinder(h=40, d=9, center=true);
    translate([0, 12, 18]) rotate([90,0,0]) cylinder(h=8, d=3.3, center=true);
  }
}

module link(len=120, wide=16, thick=8) {
  difference() {
    union() {
      hull() {
        cylinder(h=thick, d=wide);
        translate([len,0,0]) cylinder(h=thick, d=wide-2);
      }
      translate([0,0,thick]) horn_boss();
      translate([len, 0, thick/2]) rotate([90,0,0])
        cube([26, 16, 14], center=true);
    }
    translate([0,0,-1]) cylinder(h=thick+10, d=2.2);
    translate([len, 0, thick/2]) rotate([90,0,0]) cylinder(h=20, d=2.2, center=true);
    hex_grid_holes(len, wide, thick);
    translate([len, 0, thick/2 + 10]) rotate([0,90,0]) sg90_pocket();
  }
}

module jaw() {
  difference() {
    union() {
      cube([8, 12, 36], center=true);
      translate([0,0,16]) cube([8, 18, 8], center=true);
      translate([6,0,-10]) cube([12, 3.2, 16], center=true);
    }
    translate([0,0,16]) rotate([90,0,0]) cylinder(h=22, d=2.2, center=true);
  }
}

module palm() {
  difference() {
    cube([36, 24, 16], center=true);
    translate([0,0,5]) cube([20, 15, 14], center=true);
    for (x=[-11,11]) translate([x,0,0]) rotate([90,0,0]) cylinder(h=30, d=2.2, center=true);
  }
}

module tdisplay_cradle() {
  difference() {
    rounded(74, 46, 13, 3.4);
    translate([4, 5.4, 2.6]) rounded(66, 35.2, 14, 2);
    translate([-1, 17.5, 3]) cube([8, 11, 10]); // USB-C
    translate([20, 39.5, 5]) cube([30, 8, 10]); // BOOT + IO14
  }
}

module frame_clamp() {
  difference() {
    cube([36, 36, 26], center=false);
    translate([7.6, 8.5, 2.4]) cube([20.8, 28, 21.2]);
    translate([18, -1, 13]) rotate([-90,0,0]) cylinder(h=12, d=5.3);
    for (x=[6, 30]) translate([x, -1, 6.5]) rotate([-90,0,0]) cylinder(h=12, d=3.3);
  }
}

module cam_mount() {
  difference() {
    union() {
      cube([40, 12, 4]);
      translate([8, 12, 0]) cube([24, 22, 4]);
      translate([14, 26, 4]) cylinder(h=8, d=12);
    }
    translate([20, 32, -1]) cylinder(h=16, d=6.4);
    for (x=[5, 35]) translate([x, 6, -1]) cylinder(h=8, d=2.2);
  }
}

module us_bracket() {
  difference() {
    union() {
      cube([34, 12, 3], center=true);
      for (x=[-8.5, 8.5]) translate([x,0,6]) cylinder(h=10, d=16.4, center=true);
    }
    for (x=[-8.5, 8.5]) translate([x,0,6]) cylinder(h=14, d=13.2, center=true);
    cylinder(h=10, d=2.2, center=true);
  }
}

module bin() {
  difference() {
    cube([68, 32, 68], center=true);
    translate([0, 2.2, 0]) cube([63.6, 32, 63.6], center=true);
  }
}

module clip() {
  difference() {
    cube([10, 6, 8], center=true);
    translate([0,0,1]) cube([6.2, 8, 5], center=true);
  }
}

module rounded(x, y, z, r) {
  hull() {
    for (ix=[r, x-r], iy=[r, y-r]) translate([ix, iy, 0]) cylinder(h=z, r=r);
  }
}

module assembly() {
  base();
  translate([50, 0, 0]) yoke();
  translate([0, 55, 0]) link(120, 16);
  translate([0, 80, 0]) link(105, 14);
  translate([90, 40, 8]) palm();
  translate([90, 62, 8]) jaw();
  translate([90, 80, 8]) mirror([1,0,0]) jaw();
  translate([-90, -20, 0]) tdisplay_cradle();
  translate([40, -55, 0]) cam_mount();
  translate([90, -20, 8]) us_bracket();
  translate([-90, 40, 16]) bin();
  translate([40, -90, 0]) frame_clamp();
}

if (part == "base") base();
else if (part == "yoke") yoke();
else if (part == "link120") link(120, 16);
else if (part == "link105") link(105, 14);
else if (part == "palm") palm();
else if (part == "jaw") jaw();
else if (part == "cradle") tdisplay_cradle();
else if (part == "cam") cam_mount();
else if (part == "us") us_bracket();
else if (part == "bin") bin();
else if (part == "clip") clip();
else if (part == "clamp") frame_clamp();
else assembly();
`;

export const KIT_STLS = [
  { file: "01-base.stl", qty: 1, note: "Socle yaw · 4× M3" },
  { file: "02-shoulder-yoke.stl", qty: 1, note: "U d'épaule" },
  { file: "03-link-120.stl", qty: 1, note: "Épaule → coude · hex" },
  { file: "04-link-105.stl", qty: 1, note: "Coude → poignet · hex" },
  { file: "05-palm.stl", qty: 1, note: "Paume + poche pince" },
  { file: "06-jaw.stl", qty: 2, note: "Mâchoire (miroir la 2e)" },
  { file: "07-tdisplay-cradle.stl", qty: 1, note: "Berceau T-Display S3" },
  { file: "08-cam-mount.stl", qty: 1, note: "Support ESP32-CAM" },
  { file: "09-us-bracket.stl", qty: 1, note: "Collier HC-SR04" },
  { file: "10-bin.stl", qty: 2, note: "Bacs PLA / PETG" },
  { file: "11-cable-clip.stl", qty: 4, note: "Clips câbles" },
  { file: "12-frame-clamp.stl", qty: 1, note: "Collier 2020 imprimante" },
] as const;

function clickDownload(url: string, filename: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function downloadText(filename: string, content: string, mime = "text/plain") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  clickDownload(url, filename);
  URL.revokeObjectURL(url);
}

export async function downloadPublic(path: string, filename: string) {
  const res = await fetch(path);
  if (!res.ok) throw new Error("fichier introuvable");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  clickDownload(url, filename);
  URL.revokeObjectURL(url);
}

export async function downloadKitZip() {
  await downloadPublic("/pince-kit.zip", "PINCE-kit.zip");
}
