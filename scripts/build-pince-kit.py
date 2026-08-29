#!/usr/bin/env python3
"""Build the PINCE printable kit: STL + firmware + docs + zip."""
from __future__ import annotations

import math
import os
import re
import struct
import zipfile
from pathlib import Path

import numpy as np

ROOT = Path("/workspace")
OUT = ROOT / "public" / "pince-kit"
ZIP_PATH = ROOT / "public" / "pince-kit.zip"
RES = 0.45  # mm


def unescape_js(s: str) -> str:
    return s.replace("\\\\", "\\")


def extract_ts_template(src: str, name: str) -> str:
    m = re.search(rf"export const {name} = `([\s\S]*?)`;", src)
    if not m:
        raise SystemExit(f"missing {name}")
    return unescape_js(m.group(1))


class Grid:
    def __init__(self, xmin, xmax, ymin, ymax, zmin, zmax, res=RES):
        self.res = res
        pad = res * 2
        self.origin = np.array([xmin - pad, ymin - pad, zmin - pad], dtype=np.float64)
        nx = int(math.ceil((xmax - xmin + 2 * pad) / res)) + 1
        ny = int(math.ceil((ymax - ymin + 2 * pad) / res)) + 1
        nz = int(math.ceil((zmax - zmin + 2 * pad) / res)) + 1
        self.g = np.zeros((nx, ny, nz), dtype=np.uint8)

    def _ijk(self, x, y, z):
        p = (np.array([x, y, z]) - self.origin) / self.res
        return p.astype(int)

    def add_box(self, x0, x1, y0, y1, z0, z1, val=1):
        a = self._ijk(min(x0, x1), min(y0, y1), min(z0, z1))
        b = self._ijk(max(x0, x1), max(y0, y1), max(z0, z1))
        self.g[a[0] : b[0] + 1, a[1] : b[1] + 1, a[2] : b[2] + 1] = val

    def add_cyl_z(self, x, y, z0, z1, r, val=1):
        a = self._ijk(x - r, y - r, min(z0, z1))
        b = self._ijk(x + r, y + r, max(z0, z1))
        ox, oy, oz = self.origin
        rs = self.res
        xs = np.arange(a[0], b[0] + 1)
        ys = np.arange(a[1], b[1] + 1)
        if xs.size == 0 or ys.size == 0:
            return
        xx = ox + (xs + 0.5) * rs
        yy = oy + (ys + 0.5) * rs
        dx = xx[:, None] - x
        dy = yy[None, :] - y
        mask = dx * dx + dy * dy <= r * r
        zslice = self.g[a[0] : b[0] + 1, a[1] : b[1] + 1, a[2] : b[2] + 1]
        zslice[mask] = val

    def add_cyl_y(self, x, z, y0, y1, r, val=1):
        a = self._ijk(x - r, min(y0, y1), z - r)
        b = self._ijk(x + r, max(y0, y1), z + r)
        ox, oy, oz = self.origin
        rs = self.res
        xs = np.arange(a[0], b[0] + 1)
        zs = np.arange(a[2], b[2] + 1)
        if xs.size == 0 or zs.size == 0:
            return
        xx = ox + (xs + 0.5) * rs
        zz = oz + (zs + 0.5) * rs
        dx = xx[:, None] - x
        dz = zz[None, :] - z
        mask = dx * dx + dz * dz <= r * r  # (nx, nz)
        yslice = self.g[a[0] : b[0] + 1, a[1] : b[1] + 1, a[2] : b[2] + 1]
        yslice[np.broadcast_to(mask[:, None, :], yslice.shape)] = val

    def add_cyl_x(self, y, z, x0, x1, r, val=1):
        a = self._ijk(min(x0, x1), y - r, z - r)
        b = self._ijk(max(x0, x1), y + r, z + r)
        ox, oy, oz = self.origin
        rs = self.res
        ys = np.arange(a[1], b[1] + 1)
        zs = np.arange(a[2], b[2] + 1)
        if ys.size == 0 or zs.size == 0:
            return
        yy = oy + (ys + 0.5) * rs
        zz = oz + (zs + 0.5) * rs
        dy = yy[:, None] - y
        dz = zz[None, :] - z
        mask = dy * dy + dz * dz <= r * r  # (ny, nz)
        xslice = self.g[a[0] : b[0] + 1, a[1] : b[1] + 1, a[2] : b[2] + 1]
        xslice[np.broadcast_to(mask[None, :, :], xslice.shape)] = val

    def to_stl(self, path: Path):
        g = self.g
        nx, ny, nz = g.shape
        ox, oy, oz = self.origin
        r = self.res
        faces: list[tuple] = []

        def quad(p0, p1, p2, p3):
            faces.append((p0, p1, p2))
            faces.append((p0, p2, p3))

        # +X
        d = g[1:, :, :] != g[:-1, :, :]
        ii, jj, kk = np.where(d)
        for i, j, k in zip(ii.tolist(), jj.tolist(), kk.tolist()):
            x = ox + (i + 1) * r
            y0, y1 = oy + j * r, oy + (j + 1) * r
            z0, z1 = oz + k * r, oz + (k + 1) * r
            if g[i + 1, j, k]:
                quad((x, y0, z0), (x, y1, z0), (x, y1, z1), (x, y0, z1))
            else:
                quad((x, y0, z0), (x, y0, z1), (x, y1, z1), (x, y1, z0))
        # +Y
        d = g[:, 1:, :] != g[:, :-1, :]
        ii, jj, kk = np.where(d)
        for i, j, k in zip(ii.tolist(), jj.tolist(), kk.tolist()):
            y = oy + (j + 1) * r
            x0, x1 = ox + i * r, ox + (i + 1) * r
            z0, z1 = oz + k * r, oz + (k + 1) * r
            if g[i, j + 1, k]:
                quad((x0, y, z0), (x0, y, z1), (x1, y, z1), (x1, y, z0))
            else:
                quad((x0, y, z0), (x1, y, z0), (x1, y, z1), (x0, y, z1))
        # +Z
        d = g[:, :, 1:] != g[:, :, :-1]
        ii, jj, kk = np.where(d)
        for i, j, k in zip(ii.tolist(), jj.tolist(), kk.tolist()):
            z = oz + (k + 1) * r
            x0, x1 = ox + i * r, ox + (i + 1) * r
            y0, y1 = oy + j * r, oy + (j + 1) * r
            if g[i, j, k + 1]:
                quad((x0, y0, z), (x1, y0, z), (x1, y1, z), (x0, y1, z))
            else:
                quad((x0, y0, z), (x0, y1, z), (x1, y1, z), (x1, y0, z))

        path.parent.mkdir(parents=True, exist_ok=True)
        n = len(faces)
        with path.open("wb") as f:
            f.write(b"PINCE-KIT".ljust(80, b"\0"))
            f.write(struct.pack("<I", n))
            rec = struct.Struct("<12fH")
            for a, b, c in faces:
                ux, uy, uz = b[0] - a[0], b[1] - a[1], b[2] - a[2]
                vx, vy, vz = c[0] - a[0], c[1] - a[1], c[2] - a[2]
                nx = uy * vz - uz * vy
                ny = uz * vx - ux * vz
                nz = ux * vy - uy * vx
                l = math.sqrt(nx * nx + ny * ny + nz * nz) or 1.0
                f.write(
                    rec.pack(
                        nx / l, ny / l, nz / l,
                        a[0], a[1], a[2],
                        b[0], b[1], b[2],
                        c[0], c[1], c[2],
                        0,
                    )
                )
        print(f"  {path.name:28} {n:7d} tri")


def part_base() -> Grid:
    g = Grid(-46, 46, -46, 46, 0, 8)
    g.add_box(-42, 42, -42, 42, 0, 6)
    for x in (-38, 38):
        for y in (-38, 38):
            g.add_cyl_z(x, y, 0, 6, 6, 1)
    for x in (-32, 32):
        for y in (-32, 32):
            g.add_cyl_z(x, y, -1, 8, 1.7, 0)
    g.add_box(-12, 12, -6.6, 6.6, 2.4, 8, 0)
    g.add_box(-16.5, 16.5, -6.6, 6.6, 4.8, 8, 0)
    return g


def part_link(length: float, wide: float) -> Grid:
    g = Grid(-12, length + 12, -wide, wide, 0, 14)
    # tapered bar
    steps = 12
    for i in range(steps):
        t0, t1 = i / steps, (i + 1) / steps
        w0 = wide - t0 * 2
        x0, x1 = t0 * length, t1 * length
        g.add_box(x0, x1, -w0 / 2, w0 / 2, 0, 8)
    g.add_cyl_z(0, 0, 0, 8, wide / 2)
    g.add_cyl_z(length, 0, 0, 8, (wide - 2) / 2)
    g.add_cyl_z(0, 0, 8, 12, 3.5)
    g.add_cyl_z(0, 0, -1, 14, 1.15, 0)
    g.add_cyl_z(length, 0, -1, 14, 1.15, 0)
    for a in range(4):
        ang = a * math.pi / 2
        g.add_cyl_z(4.6 * math.cos(ang), 4.6 * math.sin(ang), -1, 6, 0.75, 0)
    return g


def part_jaw() -> Grid:
    g = Grid(-12, 16, -12, 12, -22, 24)
    g.add_box(-4, 4, -6, 6, -18, 18)
    g.add_box(-4, 4, -9, 9, 12, 20)
    g.add_box(0, 10, -1.6, 1.6, -18, -2)
    g.add_cyl_y(0, 16, -12, 12, 1.15, 0)
    return g


def part_palm() -> Grid:
    g = Grid(-20, 20, -14, 14, -10, 10)
    g.add_box(-17, 17, -11, 11, -7, 7)
    g.add_box(-9, 9, -7, 7, -2, 8, 0)
    g.add_cyl_y(-10, 0, -16, 16, 1.15, 0)
    g.add_cyl_y(10, 0, -16, 16, 1.15, 0)
    return g


def part_cradle() -> Grid:
    g = Grid(-2, 74, -2, 42, 0, 12)
    g.add_box(0, 70, 0, 38, 0, 10)
    g.add_box(3, 67, 3, 35, 3, 12, 0)
    g.add_box(-2, 6, 12, 22, 4, 12, 0)  # USB-C
    g.add_box(28, 44, -2, 5, 6, 12, 0)  # buttons
    return g


def part_cam() -> Grid:
    g = Grid(-2, 40, -2, 36, 0, 14)
    g.add_box(0, 36, 0, 10, 0, 4)
    g.add_box(8, 28, 10, 28, 0, 4)
    g.add_cyl_z(18, 26, 4, 12, 5)
    g.add_cyl_z(18, 26, -1, 14, 3.1, 0)
    g.add_cyl_z(4, 5, -1, 8, 1.15, 0)
    g.add_cyl_z(32, 5, -1, 8, 1.15, 0)
    return g


def part_bin() -> Grid:
    g = Grid(-40, 40, 0, 36, -40, 40)
    t = 2.2
    g.add_box(-34, 34, 0, t, -34, 34)
    g.add_box(-34, 34, 0, 30, -34, -34 + t)
    g.add_box(-34, 34, 0, 30, 34 - t, 34)
    g.add_box(-34, -34 + t, 0, 30, -34, 34)
    g.add_box(34 - t, 34, 0, 30, -34, 34)
    return g


def part_us_bracket() -> Grid:
    g = Grid(-20, 20, -8, 8, 0, 14)
    g.add_box(-16, 16, -6, 6, 0, 3)
    g.add_cyl_z(-8.5, 0, 0, 10, 8.2)
    g.add_cyl_z(8.5, 0, 0, 10, 8.2)
    g.add_cyl_z(-8.5, 0, -1, 12, 6.6, 0)
    g.add_cyl_z(8.5, 0, -1, 12, 6.6, 0)
    g.add_cyl_z(0, 0, -1, 8, 1.15, 0)
    return g


README = """PINCE — kit bras robotique 5 DDL
================================
LilyGO T-Display S3 + 5× servo 9g + ESP32-CAM + HC-SR04

1. Imprime le dossier stl/  (voir PRINT.txt)
2. Flash firmware/  (voir FLASH.txt)
3. Câble selon CABLAGE.txt
4. Ouvre le studio PINCE sur le téléphone, Wi-Fi PINCE / pince1234

Contenu
-------
stl/          pièces prêtes à slicer (mm)
scad/         source OpenSCAD si tu veux modifier
firmware/     T-Display S3 + ESP32-CAM + setup TFT_eSPI
pi/           pont optionnel Raspberry Pi 4
BOM.txt       ce que tu as / ce qu'il manque
CABLAGE.txt   GPIO exacts T-Display S3
PRINT.txt     orientation, infill, quantités
FLASH.txt     Arduino pas à pas
"""

BOM = """Nomenclature PINCE
==================

Déjà chez toi
-------------
1× LilyGO T-Display S3
5× servo 9g SG90 (épaule : MG90S si tu as, mieux)
1× ESP32-CAM AI-Thinker (OV2640)
1× HC-SR04
1× Raspberry Pi 4 (optionnel)
1× imprimante 3D

À imprimer (dossier stl/)
-------------------------
1× 01-base.stl
1× 02-link-120.stl          (épaule → coude)
1× 03-link-105.stl          (coude → poignet)
1× 04-palm.stl
2× 05-jaw.stl
1× 06-tdisplay-cradle.stl
1× 07-cam-mount.stl
2× 08-bin.stl
1× 09-us-bracket.stl        (HC-SR04 sur la pince)

À acheter (~8–15 €)
-------------------
Vis M2 × 8 mm  (cornes servo, mâchoires)     × 16
Vis M3 × 12 mm + écrous (base sur l'établi)  × 4
Alim 5 V 3 A (Jack ou USB-C PD + buck 5 V)
Fil Dupont femelle, 15 cm
2× colliers pour le câble bras
(option) palets caoutchouc 1 mm sous les mâchoires

Outils
------
Tournevis PH0 / PH1, pince, colle cyano (cornes), fer à souder si tu rallonges
"""

PRINT = """Impression
==========
Slicer : n'importe (Prusa, Cura, Orca)
Couche : 0.20 mm
Buse : 0.4 mm
Parois : 3
Infill : 25 % gyroid (30 % pour 01-base et 02-link-120)
Matériau : PLA OK, PETG mieux près de l'imprimante
Plateau : 60 °C PLA · 80 °C PETG
Supports : OUI seulement 05-jaw (pad en porte-à-faux) et 06-tdisplay-cradle (cavité)

Orientation
-----------
01-base            face vis vers le plateau, poche servo vers le haut
02 / 03-link       à plat, bossage corne vers le haut
04-palm            poche vers le haut
05-jaw             face plane sur le plateau, pad en l'air + supports
06-cradle          fond sur le plateau + supports cavité
07-cam-mount       plaque sur le plateau
08-bin             fond sur le plateau, pas de supports
09-us-bracket      collier vers le haut

Assemblage (30–45 min)
----------------------
1. Servo base dans 01-base, vis de corne (fournie SG90)
2. 02-link-120 visé sur la corne de l'épaule
3. Servo coude en bout de 02, 03-link-105 sur sa corne
4. Servo poignet + 04-palm
5. Servo pince dans la paume, 2× 05-jaw sur la corne (miroir)
6. HC-SR04 dans 09-us-bracket, collé sous la paume, câble le long du bras
7. T-Display S3 clipsé dans 06-cradle (USB-C dégagé)
8. ESP32-CAM vissée dans 07-cam-mount, objectif vers le plateau
9. 2× 08-bin à gauche / droite de la base

Calage servos
-------------
Avant de visser les cornes : brancher, flash, attendre HOME
(base 90 · épaule 118 · coude 48 · poignet 108 · pince 72).
Puis visser les cornes dans cette pose. Sinon le bras tape le plateau.
"""

CABLAGE = """Câblage LilyGO T-Display S3
===========================
Alim servos : 5 V 3 A EXTERNE. GND commun avec le header GND.
Ne jamais alimenter 5 servos par le 5V USB de la carte.
GPIO15 est forcé HIGH par le firmware (POWER_ON écran) — ne pas y câbler.

Header P2 (gauche, du 3V3 vers le 5V)
-------------------------------------
3V3      — ne pas servir les servos
GPIO1    servo BASE        (signal orange)
GPIO2    servo ÉPAULE
GPIO3    servo COUDE       (strapping : brancher après le boot)
GPIO10   servo POIGNET
GPIO11   servo PINCE
GPIO12   HC-SR04 TRIG
GPIO13   HC-SR04 ECHO      (5 V → 3V3 : pont diviseur 1k/2k si tu es prudent)
GND      masse commune servos + HC-SR04
5V       VBUS USB — interdit pour les servos

Header P1 (droit) — libre
-------------------------
GPIO18 / 17   I²C optionnel
GPIO21 / 16   PWM de rechange
GPIO43 / 44   UART0 — laisser tranquille

Servos
------
Brun/noir  → GND alim 5 V  (et un fil vers GND du T-Display)
Rouge      → +5 V alim externe
Orange     → GPIO ci-dessus

ESP32-CAM
---------
Alim 5 V propre (le 5V USB-TTL ou un 5 V régulé).
Elle rejoint le Wi-Fi PINCE / pince1234 toute seule.
Stream : http://192.168.4.2:81/stream
GPIO4 = flash LED (déjà dans le firmware, éteint).

Téléphone
---------
Wi-Fi PINCE  mot de passe pince1234
Studio PINCE → Kit → ws://192.168.4.1:81 → Lier le LilyGO
Œil → http://192.168.4.2:81/stream
"""

FLASH = """Flash
=====

A. LilyGO T-Display S3
----------------------
Arduino IDE 2
Cartes : installer « esp32 » par Espressif (3.x)
Carte : ESP32S3 Dev Module
USB CDC On Boot : Enabled
PSRAM : OPI PSRAM
Flash : 16 MB QIO
Upload speed : 921600

Bibliothèques :
  TFT_eSPI
  ESP32Servo
  ArduinoJson
  WebSockets (Markus Sattler)

TFT_eSPI : Arduino/libraries/TFT_eSPI/User_Setup_Select.h
  commenter  #include <User_Setup.h>
  décommenter #include <User_Setups/Setup206_LilyGo_T_Display_S3.h>
(le fichier firmware/TFT_eSPI-setup.h est le pense-bête)

Maintenir BOOT, brancher l'USB-C, flasher firmware/pince-tdisplay-s3.ino
Relâcher BOOT, reset. L'écran affiche PINCE. AP Wi-Fi PINCE.

B. ESP32-CAM AI-Thinker
-----------------------
Carte : AI Thinker ESP32-CAM
PSRAM : Enabled
Partition : Huge APP

USB-TTL 5 V :
  U0R  ← TX
  U0T  → RX
  GND  — GND
  5V   — 5V
  GPIO0 au GND pendant le flash, puis relâcher + reset

Flasher firmware/pince-esp32-cam.ino
La CAM rejoint PINCE et sert :81/stream
"""


def write_docs(out: Path):
    (out / "README.txt").write_text(README, encoding="utf-8")
    (out / "BOM.txt").write_text(BOM, encoding="utf-8")
    (out / "PRINT.txt").write_text(PRINT, encoding="utf-8")
    (out / "CABLAGE.txt").write_text(CABLAGE, encoding="utf-8")
    (out / "FLASH.txt").write_text(FLASH, encoding="utf-8")


def write_firmware(out: Path):
    src = (ROOT / "src/lib/arm/kit.ts").read_text(encoding="utf-8")
    fw = out / "firmware"
    fw.mkdir(parents=True, exist_ok=True)
    (fw / "pince-tdisplay-s3.ino").write_text(extract_ts_template(src, "FIRMWARE_INO"), encoding="utf-8")
    (fw / "pince-esp32-cam.ino").write_text(extract_ts_template(src, "CAM_INO"), encoding="utf-8")
    (fw / "TFT_eSPI-setup.h").write_text(extract_ts_template(src, "TFT_SETUP"), encoding="utf-8")
    pi = out / "pi"
    pi.mkdir(parents=True, exist_ok=True)
    (pi / "pince-pi.py").write_text(extract_ts_template(src, "PI_BRIDGE"), encoding="utf-8")
    scad = out / "scad"
    scad.mkdir(parents=True, exist_ok=True)
    (scad / "pince-arm.scad").write_text(extract_ts_template(src, "OPENSCAD"), encoding="utf-8")


def write_stls(out: Path):
    stl = out / "stl"
    stl.mkdir(parents=True, exist_ok=True)
    print("STL…")
    part_base().to_stl(stl / "01-base.stl")
    part_link(120, 16).to_stl(stl / "02-link-120.stl")
    part_link(105, 14).to_stl(stl / "03-link-105.stl")
    part_palm().to_stl(stl / "04-palm.stl")
    part_jaw().to_stl(stl / "05-jaw.stl")
    part_cradle().to_stl(stl / "06-tdisplay-cradle.stl")
    part_cam().to_stl(stl / "07-cam-mount.stl")
    part_bin().to_stl(stl / "08-bin.stl")
    part_us_bracket().to_stl(stl / "09-us-bracket.stl")


def zip_kit():
    if ZIP_PATH.exists():
        ZIP_PATH.unlink()
    with zipfile.ZipFile(ZIP_PATH, "w", zipfile.ZIP_DEFLATED) as z:
        for p in OUT.rglob("*"):
            if p.is_file():
                z.write(p, f"PINCE-kit/{p.relative_to(OUT)}")
    print("zip", ZIP_PATH, ZIP_PATH.stat().st_size)


def main():
    if OUT.exists():
        import shutil
        shutil.rmtree(OUT)
    OUT.mkdir(parents=True)
    write_docs(OUT)
    write_firmware(OUT)
    write_stls(OUT)
    zip_kit()


if __name__ == "__main__":
    main()
