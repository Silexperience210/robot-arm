Firmware PINCE
==============

pince-tdisplay-s3/pince-tdisplay-s3.ino
  Cerveau. AP PINCE / pince1234, WebSocket :81
  GPIO 1/2/3/10/11 servos · 12/13 US · 15 POWER_ON · 38 backlight
  HOME mécanique 90 / 118 / 48 / 108 / 72  (visser les cornes ICI)
  PARK         90 / 160 /  25 /  25 / 40
  JSON : pose | home | park | stop | ping
  ArduinoJson 6 (pas 7) · ESP32Servo · TFT_eSPI Setup206

pince-esp32-cam/pince-esp32-cam.ino
  Œil. STA sur PINCE, IP fixe 192.168.4.2
  http://192.168.4.2:81/stream   MJPEG VGA
  http://192.168.4.2/capture     still

TFT_eSPI-setup.h  — pense-bête à coller dans User_Setup_Select.h
LIBS.txt          — versions des bibliothèques
