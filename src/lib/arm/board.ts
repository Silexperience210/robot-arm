import type { JointId } from "./types";

/** LilyGO T-Display S3 — header 2.54 mm, écran 170×320 ST7789 8-bit. */
export const TDISPLAY = {
  name: "LilyGO T-Display S3",
  short: "T-Display S3",
  screen: { w: 320, h: 170, driver: "ST7789", bus: "i8080 8-bit" },
  pcb: "62.3 × 38 mm · USB-C · PSRAM 8 Mo",
  apSsid: "PINCE",
  apPass: "pince1234",
  wsUrl: "ws://192.168.4.1:81",
  powerOn: 15,
  backlight: 38,
  batteryAdc: 4,
  btnBoot: 0,
  btn2: 14,
  i2cSda: 18,
  i2cScl: 17,
} as const;

export const SERVO_PINS: Record<JointId, number> = {
  base: 1,
  shoulder: 2,
  elbow: 3,
  wrist: 10,
  grip: 11,
};

export const US_PINS = { trig: 12, echo: 13 } as const;

export type HeaderPin = {
  label: string;
  gpio?: number;
  role: string;
  kind: "pwr" | "gnd" | "servo" | "us" | "free" | "uart";
};

export const HEADER_P2: HeaderPin[] = [
  { label: "3V3", role: "3,3 V (max 100 mA)", kind: "pwr" },
  { label: "GPIO1", gpio: 1, role: "Servo base", kind: "servo" },
  { label: "GPIO2", gpio: 2, role: "Servo épaule", kind: "servo" },
  { label: "GPIO3", gpio: 3, role: "Servo coude · strapping", kind: "servo" },
  { label: "GPIO10", gpio: 10, role: "Servo poignet", kind: "servo" },
  { label: "GPIO11", gpio: 11, role: "Servo pince", kind: "servo" },
  { label: "GPIO12", gpio: 12, role: "US TRIG", kind: "us" },
  { label: "GPIO13", gpio: 13, role: "US ECHO", kind: "us" },
  { label: "GND", role: "Masse commune servos", kind: "gnd" },
  { label: "5V", role: "VBUS USB — pas les servos", kind: "pwr" },
];

export const HEADER_P1: HeaderPin[] = [
  { label: "GND", role: "Masse", kind: "gnd" },
  { label: "GND", role: "Masse", kind: "gnd" },
  { label: "GPIO43", gpio: 43, role: "U0TXD — console", kind: "uart" },
  { label: "GPIO44", gpio: 44, role: "U0RXD — console", kind: "uart" },
  { label: "GPIO18", gpio: 18, role: "I²C SDA (CAM / extra)", kind: "free" },
  { label: "GPIO17", gpio: 17, role: "I²C SCL", kind: "free" },
  { label: "GPIO21", gpio: 21, role: "Libre PWM", kind: "free" },
  { label: "GPIO16", gpio: 16, role: "Libre PWM", kind: "free" },
  { label: "GND", role: "Masse", kind: "gnd" },
  { label: "3V3", role: "3,3 V", kind: "pwr" },
];

export const FLASH_STEPS = [
  "Arduino IDE 2 · carte « ESP32S3 Dev Module »",
  "USB CDC On Boot : Enabled · PSRAM : OPI PSRAM · Flash : 16 MB QIO",
  "TFT_eSPI : dans User_Setup_Select.h, décommenter Setup206_LilyGo_T_Display_S3.h",
  "Libs : TFT_eSPI, ESP32Servo, ArduinoJson, WebSockets (Markus Sattler)",
  "Maintenir BOOT, brancher l’USB-C, flasher, relâcher",
  "Servos sur alim 5 V 3 A externe, GND commun au header GND — jamais le 3V3",
];

export const ESP32_CAM = {
  name: "ESP32-CAM AI-Thinker",
  sensor: "OV2640 640×480",
  note: "Rejoint le Wi-Fi PINCE, stream MJPEG :81/stream",
  stream: "http://192.168.4.2:81/stream",
  flashGpio: 4,
} as const;

export const CAM_FLASH_STEPS = [
  "Arduino IDE · carte « AI Thinker ESP32-CAM »",
  "Outils → PSRAM : Enabled · Partition : Huge APP",
  "Flasher avec un USB-TTL : U0R←TX, U0T→RX, GND, 5 V. GPIO0 au GND pendant le flash",
  "Relâcher GPIO0, reset. La CAM rejoint l’AP PINCE et sert http://192.168.4.2:81/stream",
  "Fixer le module au portique, objectif vers le plateau. Flash LED = GPIO4",
];
