#!/usr/bin/env python3
"""PINCE printable kit: mesh STL (hex fairings) + firmware + docs + zip."""
from __future__ import annotations

import math
import re
import shutil
import struct
import zipfile
from pathlib import Path

import numpy as np

ROOT = Path("/workspace")
OUT = ROOT / "public" / "kit"
ZIP_PATH = ROOT / "public" / "pince-kit.zip"
RES = 0.42  # mm


def unescape_js(s: str) -> str:
    return s.replace("\\\\", "\\")


def extract_ts_template(src: str, name: str) -> str:
    m = re.search(rf"export const {name} = `([\s\S]*?)`;", src)
    if not m:
        raise SystemExit(f"missing {name}")
    return unescape_js(m.group(1))


class Grid:
    def __init__(self, xmin, xmax, ymin, ymax, zmin, zmax, res=RES):
        self.res = float(res)
        pad = self.res * 2
        self.origin = np.array([xmin - pad, ymin - pad, zmin - pad], dtype=np.float64)
        nx = int(math.ceil((xmax - xmin + 2 * pad) / self.res)) + 2
        ny = int(math.ceil((ymax - ymin + 2 * pad) / self.res)) + 2
        nz = int(math.ceil((zmax - zmin + 2 * pad) / self.res)) + 2
        self.g = np.zeros((nx, ny, nz), dtype=np.uint8)

    def coords(self):
        ox, oy, oz = self.origin
        rs = self.res
        nx, ny, nz = self.g.shape
        xs = ox + (np.arange(nx) + 0.5) * rs
        ys = oy + (np.arange(ny) + 0.5) * rs
        zs = oz + (np.arange(nz) + 0.5) * rs
        return np.meshgrid(xs, ys, zs, indexing="ij")

    def or_mask(self, mask):
        self.g[mask] = 1

    def carve(self, mask):
        self.g[mask] = 0

    def add_box(self, x0, x1, y0, y1, z0, z1, val=1):
        X, Y, Z = self.coords()
        m = (X >= min(x0, x1)) & (X <= max(x0, x1)) & (Y >= min(y0, y1)) & (Y <= max(y0, y1)) & (
            Z >= min(z0, z1)
        ) & (Z <= max(z0, z1))
        if val:
            self.g[m] = 1
        else:
            self.g[m] = 0

    def add_cyl_z(self, x, y, z0, z1, r, val=1):
        X, Y, Z = self.coords()
        m = ((X - x) ** 2 + (Y - y) ** 2 <= r * r) & (Z >= min(z0, z1)) & (Z <= max(z0, z1))
        if val:
            self.g[m] = 1
        else:
            self.g[m] = 0

    def add_cyl_y(self, x, z, y0, y1, r, val=1):
        X, Y, Z = self.coords()
        m = ((X - x) ** 2 + (Z - z) ** 2 <= r * r) & (Y >= min(y0, y1)) & (Y <= max(y0, y1))
        if val:
            self.g[m] = 1
        else:
            self.g[m] = 0

    def add_cyl_x(self, y, z, x0, x1, r, val=1):
        X, Y, Z = self.coords()
        m = ((Y - y) ** 2 + (Z - z) ** 2 <= r * r) & (X >= min(x0, x1)) & (X <= max(x0, x1))
        if val:
            self.g[m] = 1
        else:
            self.g[m] = 0

    def add_rounded_plate(self, x0, x1, y0, y1, z0, z1, r):
        X, Y, Z = self.coords()
        xm = np.clip(X, x0 + r, x1 - r)
        ym = np.clip(Y, y0 + r, y1 - r)
        m = ((X - xm) ** 2 + (Y - ym) ** 2 <= r * r) & (Z >= z0) & (Z <= z1)
        self.g[m] = 1


def greedy2d(mask: np.ndarray):
    h, w = mask.shape
    vis = np.zeros_like(mask, dtype=np.uint8)
    rects = []
    for y in range(h):
        x = 0
        row = mask[y]
        vrow = vis[y]
        while x < w:
            if not row[x] or vrow[x]:
                x += 1
                continue
            x2 = x + 1
            while x2 < w and row[x2] and not vrow[x2]:
                x2 += 1
            y2 = y + 1
            while y2 < h:
                sl = mask[y2, x:x2]
                vs = vis[y2, x:x2]
                if sl.size == 0 or (not sl.all()) or vs.any():
                    break
                y2 += 1
            vis[y:y2, x:x2] = 1
            rects.append((x, y, x2, y2))
            x = x2
    return rects


def write_stl(path: Path, quads):
    path.parent.mkdir(parents=True, exist_ok=True)
    n = len(quads) * 2
    rec = struct.Struct("<12fH")
    with path.open("wb") as f:
        f.write(b"PINCE-KIT".ljust(80, b"\0"))
        f.write(struct.pack("<I", n))
        for a, b, c, d in quads:
            for tri in ((a, b, c), (a, c, d)):
                p0, p1, p2 = tri
                ux, uy, uz = p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]
                vx, vy, vz = p2[0] - p0[0], p2[1] - p0[1], p2[2] - p0[2]
                nx = uy * vz - uz * vy
                ny = uz * vx - ux * vz
                nz = ux * vy - uy * vx
                l = math.sqrt(nx * nx + ny * ny + nz * nz) or 1.0
                f.write(
                    rec.pack(
                        nx / l, ny / l, nz / l,
                        p0[0], p0[1], p0[2],
                        p1[0], p1[1], p1[2],
                        p2[0], p2[1], p2[2],
                        0,
                    )
                )
    print(f"  {path.name:28} {n:7d} tri")


def grid_to_stl(grid: Grid, path: Path):
    g = grid.g
    nx, ny, nz = g.shape
    ox, oy, oz = grid.origin
    r = grid.res
    quads = []

    def emit(mask, make_quad):
        rects = greedy2d(mask)
        for x, y, x2, y2 in rects:
            quads.append(make_quad(x, y, x2, y2))

    # +X / -X
    for i in range(nx - 1):
        pos = (g[i, :, :] == 0) & (g[i + 1, :, :] != 0)
        neg = (g[i, :, :] != 0) & (g[i + 1, :, :] == 0)
        x = ox + (i + 1) * r

        def qpos(j0, k0, j1, k1, x=x):
            y0, y1 = oy + j0 * r, oy + j1 * r
            z0, z1 = oz + k0 * r, oz + k1 * r
            return ((x, y0, z0), (x, y1, z0), (x, y1, z1), (x, y0, z1))

        def qneg(j0, k0, j1, k1, x=x):
            y0, y1 = oy + j0 * r, oy + j1 * r
            z0, z1 = oz + k0 * r, oz + k1 * r
            return ((x, y0, z0), (x, y0, z1), (x, y1, z1), (x, y1, z0))

        emit(pos, qpos)
        emit(neg, qneg)

    # +Y / -Y
    for j in range(ny - 1):
        pos = (g[:, j, :] == 0) & (g[:, j + 1, :] != 0)
        neg = (g[:, j, :] != 0) & (g[:, j + 1, :] == 0)
        y = oy + (j + 1) * r

        def qpos(i0, k0, i1, k1, y=y):
            x0, x1 = ox + i0 * r, ox + i1 * r
            z0, z1 = oz + k0 * r, oz + k1 * r
            return ((x0, y, z0), (x0, y, z1), (x1, y, z1), (x1, y, z0))

        def qneg(i0, k0, i1, k1, y=y):
            x0, x1 = ox + i0 * r, ox + i1 * r
            z0, z1 = oz + k0 * r, oz + k1 * r
            return ((x0, y, z0), (x1, y, z0), (x1, y, z1), (x0, y, z1))

        emit(pos, qpos)
        emit(neg, qneg)

    # +Z / -Z
    for k in range(nz - 1):
        pos = (g[:, :, k] == 0) & (g[:, :, k + 1] != 0)
        neg = (g[:, :, k] != 0) & (g[:, :, k + 1] == 0)
        z = oz + (k + 1) * r

        def qpos(i0, j0, i1, j1, z=z):
            x0, x1 = ox + i0 * r, ox + i1 * r
            y0, y1 = oy + j0 * r, oy + j1 * r
            return ((x0, y0, z), (x1, y0, z), (x1, y1, z), (x0, y1, z))

        def qneg(i0, j0, i1, j1, z=z):
            x0, x1 = ox + i0 * r, ox + i1 * r
            y0, y1 = oy + j0 * r, oy + j1 * r
            return ((x0, y0, z), (x0, y1, z), (x1, y1, z), (x1, y0, z))

        emit(pos, qpos)
        emit(neg, qneg)

    write_stl(path, quads)


def hex_dist(u, v, cell):
    h = cell * math.sqrt(3) * 0.5
    ia = np.round(u / cell)
    ja = np.round(v / h)
    da = np.hypot(u - ia * cell, v - ja * h)
    ib = np.round((u - cell * 0.5) / cell)
    jb = np.round((v - h * 0.5) / h)
    db = np.hypot(u - (ib + 0.5) * cell, v - (jb + 0.5) * h)
    return np.minimum(da, db)


def servo_pocket_mask(X, Y, Z, cx, cy, cz, axis="z"):
    """Empty region for an SG90 sitting at (cx,cy,cz), output along +axis."""
    # body 23.4 x 12.6 x 23, flange 32.6 x 12.6
    if axis == "z":
        body = (np.abs(X - cx) < 11.9) & (np.abs(Y - cy) < 6.5) & (Z > cz - 2) & (Z < cz + 24)
        fl = (np.abs(X - cx) < 16.5) & (np.abs(Y - cy) < 6.5) & (Z > cz + 15.5) & (Z < cz + 19)
        cab = (X < cx - 11.5) & (np.abs(Y - cy) < 3.2) & (Z > cz + 4) & (Z < cz + 14)
        return body | fl | cab
    if axis == "y":
        body = (np.abs(X - cx) < 11.9) & (np.abs(Z - cz) < 6.5) & (Y > cy - 2) & (Y < cy + 24)
        fl = (np.abs(X - cx) < 16.5) & (np.abs(Z - cz) < 6.5) & (Y > cy + 15.5) & (Y < cy + 19)
        cab = (X < cx - 11.5) & (np.abs(Z - cz) < 3.2) & (Y > cy + 4) & (Y < cy + 14)
        return body | fl | cab
    return np.zeros_like(X, dtype=bool)


def horn_holes_z(X, Y, Z, cx, cy, z0, z1):
    hole = ((X - cx) ** 2 + (Y - cy) ** 2 < 1.15**2)
    for a in (0, 90, 180, 270):
        rad = math.radians(a)
        hx = cx + 4.6 * math.cos(rad)
        hy = cy + 4.6 * math.sin(rad)
        hole = hole | ((X - hx) ** 2 + (Y - hy) ** 2 < 0.75**2)
    return hole & (Z >= z0) & (Z <= z1)


def part_base() -> Grid:
    g = Grid(-46, 46, -46, 46, -1, 28, 0.42)
    g.add_rounded_plate(-42, 42, -42, 42, 0, 6.2, 6)
    g.add_cyl_z(0, 0, 6, 9, 18)
    g.add_cyl_z(0, 0, 6, 9.2, 11.5, 0)
    X, Y, Z = g.coords()
    for x in (-32, 32):
        for y in (-32, 32):
            g.carve(((X - x) ** 2 + (Y - y) ** 2 < 1.7**2) & (Z > -1) & (Z < 10))
    g.add_box(-14, 14, -9, 9, 4, 12)
    g.carve(servo_pocket_mask(X, Y, Z, 0, 0, 4, "z"))
    g.carve(horn_holes_z(X, Y, Z, 0, 0, -1, 12))
    return g


def part_yoke() -> Grid:
    g = Grid(-18, 18, -16, 16, -1, 40, 0.38)
    g.add_cyl_z(0, 0, 0, 4.2, 15)
    g.add_box(-15, 15, -12.6, -8.2, 0, 36)
    g.add_box(-15, 15, 8.2, 12.6, 0, 36)
    g.add_box(-15, 15, -12.6, 12.6, 32, 36)
    X, Y, Z = g.coords()
    g.carve(horn_holes_z(X, Y, Z, 0, 0, -1, 6))
    body = (np.abs(X) < 11.9) & (np.abs(Z - 18) < 6.5) & (np.abs(Y) < 12)
    fl = (np.abs(X) < 16.5) & (np.abs(Z - 18) < 6.5) & (Y > 6) & (Y < 12.8)
    g.carve(body | fl)
    g.carve((X ** 2 + (Z - 18) ** 2 < 4.6**2) & (np.abs(Y) < 13))
    g.add_cyl_y(0, 18, -13, -8, 5.5)
    g.carve((X ** 2 + (Z - 18) ** 2 < 1.7**2) & (Y < -7) & (Y > -14))
    return g


def part_link(length: float, wide: float, R: float) -> Grid:
    pad = 18
    g = Grid(-pad, length + pad, -wide, wide, -6, 18, 0.40)
    X, Y, Z = g.coords()
    r = np.hypot(Y, Z - 4)
    cell = 6.6
    u = np.arctan2(Y, Z - 4) * R
    v = X
    hd = hex_dist(u, v, cell)
    t = np.clip(np.minimum(X, length - X) / 22.0, 0, 1)
    hole = 1.45 + 1.35 * t
    spine = r < (3.15 + 0.4 * (1 - t))
    shell = (r <= R) & (r >= R - 2.55)
    wall = hd > hole
    caps = (X >= 0) & (X <= 12) | (X >= length - 12) & (X <= length)
    beam = (X >= 0) & (X <= length) & (spine | (shell & wall) | (caps & (r <= R)))
    beam = beam & (np.abs(Y) <= (wide / 2 - 0.6 * np.clip(X / length, 0, 1)))
    g.or_mask(beam)
    g.add_cyl_z(0, 0, 8, 13.2, 4.1)
    g.carve(horn_holes_z(X, Y, Z, 0, 0, -2, 16))
    g.add_box(length - 14, length + 12, -8, 8, 0, 14)
    body = (np.abs(X - length) < 12) & (np.abs(Z - 4) < 6.5) & (np.abs(Y) < 13)
    fl = (np.abs(X - length) < 16.6) & (np.abs(Z - 4) < 6.5) & (Y > 5) & (Y < 13)
    cab = (X > length + 8) & (np.abs(Z - 4) < 3) & (np.abs(Y) < 4)
    g.carve(body | fl | cab)
    g.carve(((X - length) ** 2 + (Z - 4) ** 2 < 1.15**2) & (np.abs(Y) < 14))
    return g


def part_palm() -> Grid:
    """Wrist plate + SG90 gripper pocket + jaw pivots + US tap."""
    g = Grid(-26, 26, -20, 20, -16, 18, 0.28)
    g.add_rounded_plate(-21, 21, -14.5, 14.5, -8.5, 9.0, 3.4)
    g.add_cyl_y(0, 0, -17, -9, 7.4)
    g.add_box(-8, 8, -14, -8, -6, 6)
    X, Y, Z = g.coords()
    g.add_box(-14, 14, -8.5, 8.5, 3, 13)
    g.carve(servo_pocket_mask(X, Y, Z, 0, 0, -6, "z"))
    g.carve((X < -12.5) & (np.abs(Y) < 3.4) & (Z > -3) & (Z < 7))
    for x in (-12.0, 12.0):
        g.add_cyl_x(0, 0, x - 3.2, x + 3.2, 4.6)
        g.carve(((Y) ** 2 + (Z) ** 2 < 1.15**2) & (np.abs(X - x) < 5))
    g.carve(((X) ** 2 + (Z) ** 2 < 1.15**2) & (Y < -8) & (Y > -18))
    for a in (0, 90, 180, 270):
        rad = math.radians(a)
        hx = 4.6 * math.cos(rad)
        hz = 4.6 * math.sin(rad)
        g.carve(((X - hx) ** 2 + (Z - hz) ** 2 < 0.75**2) & (Y < -8) & (Y > -18))
    g.carve(((X) ** 2 + (Y - 11.5) ** 2 < 1.15**2) & (Z > -10) & (Z < 2))
    return g


def part_jaw() -> Grid:
    """Finger + 4-arm horn clamp. Print 2×, second mirrored in slicer."""
    g = Grid(-10, 24, -12, 12, -26, 28, 0.24)
    g.add_box(-5.2, 5.2, -5.6, 5.6, -21, 19)
    g.add_box(-5.2, 5.2, -9.8, 9.8, 12, 23)
    g.add_box(3, 17, -2.1, 2.1, -21, -1)
    g.add_box(14, 18.6, -6.4, 6.4, -21, -2.5)
    X, Y, Z = g.coords()
    groove = (X > 17.2) & (np.abs(Y) < 5.6) & (Z > -20.5) & (Z < -3.5)
    groove = groove & ((np.floor((Z + 21) / 3.0) % 2) == 0)
    g.carve(groove)
    g.carve(((X) ** 2 + (Z - 16.5) ** 2 < 1.15**2) & (np.abs(Y) < 12))
    g.carve((np.abs(X) < 2.4) & (np.abs(Y) < 2.4) & (Z > -14) & (Z < 8))
    return g


def part_cradle() -> Grid:
    """LilyGO T-Display S3 — PCB 64.5 × 33.5 mm, USB-C on the short side."""
    g = Grid(-2, 78, -2, 50, -1, 16, 0.30)
    g.add_rounded_plate(0, 74, 0, 46, 0, 13.2, 3.4)
    X, Y, Z = g.coords()
    inner = (X > 4.0) & (X < 70.0) & (Y > 5.4) & (Y < 40.6) & (Z > 2.6)
    g.carve(inner)
    g.carve((X < 6.5) & (Y > 17.5) & (Y < 28.5) & (Z > 3.0))
    g.carve((X > 20) & (X < 50) & (Y > 39.5) & (Z > 5.0))
    for x0, x1 in ((4.0, 9.0), (65.0, 70.0)):
        for y0, y1 in ((5.4, 9.5), (36.5, 40.6)):
            g.add_box(x0, x1, y0, y1, 11.4, 13.2)
    return g


def part_cam() -> Grid:
    """ESP32-CAM AI-Thinker 40.5 × 27 mm, lens Ø8 toward the bed."""
    g = Grid(-2, 46, -2, 42, -1, 16, 0.30)
    g.add_rounded_plate(0, 42, 0, 14, 0, 4.4, 2)
    g.add_box(7, 35, 10, 36, 0, 4.4)
    g.add_cyl_z(21, 31, 4, 13.2, 6.4)
    X, Y, Z = g.coords()
    g.carve(((X - 21) ** 2 + (Y - 31) ** 2 < 4.1**2) & (Z > -1) & (Z < 16))
    for x in (5, 37):
        g.carve(((X - x) ** 2 + (Y - 7) ** 2 < 1.15**2) & (Z > -1) & (Z < 8))
    g.carve((X > 1.2) & (X < 40.8) & (Y > 1.2) & (Y < 12.6) & (Z > 2.2) & (Z < 8))
    return g


def part_bin() -> Grid:
    g = Grid(-38, 38, -2, 36, -38, 38, 0.42)
    t = 2.4
    g.add_box(-35, 35, 0, t, -35, 35)
    g.add_box(-35, 35, 0, 32, -35, -35 + t)
    g.add_box(-35, 35, 0, 32, 35 - t, 35)
    g.add_box(-35, -35 + t, 0, 32, -35, 35)
    g.add_box(35 - t, 35, 0, 32, -35, 35)
    g.add_box(-35, 35, 0, 6, -35, -31.5)
    g.add_box(-35, 35, 0, 6, 31.5, 35)
    return g


def part_us() -> Grid:
    g = Grid(-22, 22, -9, 9, -1, 16, 0.30)
    g.add_rounded_plate(-17, 17, -6.5, 6.5, 0, 3.4, 2)
    g.add_cyl_z(-8.5, 0, 0, 12, 8.3)
    g.add_cyl_z(8.5, 0, 0, 12, 8.3)
    g.add_cyl_z(-8.5, 0, -1, 14, 6.55, 0)
    g.add_cyl_z(8.5, 0, -1, 14, 6.55, 0)
    g.add_cyl_z(0, 0, -1, 6, 1.15, 0)
    return g


def part_clip() -> Grid:
    g = Grid(-9, 9, -6, 6, -1, 12, 0.26)
    g.add_box(-5.5, 5.5, -3.4, 3.4, 0, 9)
    g.add_box(-3.3, 3.3, -5, 5, 2.2, 7.2, 0)
    return g


def part_clamp() -> Grid:
    """C-clamp 2020 extrusion — two M3 to 01-base."""
    g = Grid(-24, 24, -3, 42, -2, 30, 0.30)
    g.add_box(-18, 18, 0, 36, 0, 26)
    X, Y, Z = g.coords()
    g.carve((np.abs(X) < 10.4) & (Y > 8.5) & (Y < 29.4) & (Z > 2.4) & (Z < 23.6))
    g.carve((np.abs(X) < 10.4) & (Y > 27) & (Z > 2.4) & (Z < 23.6))
    g.carve(((X) ** 2 + (Z - 13) ** 2 < 2.65**2) & (Y > -1) & (Y < 10))
    for x in (-12, 12):
        g.carve(((X - x) ** 2 + (Z - 6.5) ** 2 < 1.7**2) & (Y > -1) & (Y < 9))
    return g


README = """PINCE — kit bras robotique 5 DDL
================================
LilyGO T-Display S3 + 5× servo 9g/MG90 + ESP32-CAM + HC-SR04

1. Imprime le dossier stl/     (PRINT.txt)
2. Flash firmware/             (FLASH.txt)
3. Câble selon CABLAGE.txt
4. Téléphone → Wi-Fi PINCE / pince1234 → studio PINCE → Lier le LilyGO

stl/          pièces prêtes à slicer (mm, origin = pose d'impression)
scad/         source OpenSCAD (regénérer / modifier)
firmware/     T-Display S3 + ESP32-CAM + setup TFT_eSPI
pi/           pont optionnel Raspberry Pi 4
"""

BOM = """Nomenclature PINCE
==================

Déjà chez toi
-------------
1× LilyGO T-Display S3
5× servo 9g SG90 (épaule : MG90S si tu as)
1× ESP32-CAM AI-Thinker (OV2640)
1× HC-SR04
1× Raspberry Pi 4 (optionnel)
1× imprimante 3D

À imprimer
----------
1× 01-base.stl
1× 02-shoulder-yoke.stl
1× 03-link-120.stl          (épaule → coude, carénage hex)
1× 04-link-105.stl          (coude → poignet, carénage hex)
1× 05-palm.stl
2× 06-jaw.stl               (miroir la 2e dans le slicer)
1× 07-tdisplay-cradle.stl
1× 08-cam-mount.stl
1× 09-us-bracket.stl
2× 10-bin.stl
4× 11-cable-clip.stl
1× 12-frame-clamp.stl       (profilé 2020 de l'imprimante)

À acheter (~8–15 €)
-------------------
Vis M2 × 8 mm (cornes + mâchoires)     × 16
Vis M3 × 12 mm + écrous (base)         × 4
Vis M5 × 25 mm + écrou T 2020          × 1
Alim 5 V 3 A (jack ou USB-C PD + buck)
Fil Dupont femelle 15 cm
2× colliers
(option) palets caoutchouc 1 mm sous les mâchoires
"""

PRINT = """Impression
==========
Slicer : Prusa / Cura / Orca
Couche : 0.20 mm
Buse : 0.4 mm
Parois : 3  (4 pour 01-base, 02-yoke, 03-link-120)
Infill : 25 % gyroid
         32 % pour 01-base, 02-yoke, 03-link-120
Matériau : PLA OK · PETG mieux près de l'imprimante
Plateau : 60 °C PLA · 80 °C PETG
Supports : OUI seulement
  06-jaw (pad en porte-à-faux)
  07-tdisplay-cradle (cavité + lèvres)
  02-shoulder-yoke (poche servo)
  12-frame-clamp (poche 2020)

Orientation (déjà dans le STL)
------------------------------
01-base              face vis vers le plateau
02-shoulder-yoke     disque corne sur le plateau
03 / 04-link         à plat, bossage corne vers le haut
05-palm              poche servo vers le haut
06-jaw               face plane sur le plateau
07-cradle            fond sur le plateau
08-cam-mount         plaque sur le plateau
09-us-bracket        colliers vers le haut
10-bin               fond sur le plateau
11-cable-clip        n'importe
12-frame-clamp       face ouverte vers le haut

Assemblage (40 min)
-------------------
1. Servo base dans 01-base, vis de corne
2. 02-yoke visé sur cette corne. Servo épaule dans le U
3. 03-link-120 visé sur la corne d'épaule
4. Servo coude en bout de 03, 04-link-105 sur sa corne
5. Servo poignet + 05-palm
6. Servo pince dans la paume, 2× 06-jaw en miroir sur la corne
7. HC-SR04 dans 09, visé sous la paume
8. T-Display S3 clipsé dans 07 (USB-C dégagé, 64,5 × 33,5 mm)
9. ESP32-CAM dans 08, objectif vers le plateau
10. 2× 10-bin à gauche / droite. 11-clips le long du bras
11. 12-frame-clamp sur un 2020 de l'imprimante, 01-base par-dessus (M3)

Calage
------
Avant de visser les cornes : flasher, alimenter, attendre HOME
base 90 · épaule 118 · coude 48 · poignet 108 · pince 72
Puis visser. Sinon le bras tape le plateau.
"""

CABLAGE = """Câblage LilyGO T-Display S3
===========================
Alim servos : 5 V 3 A EXTERNE. GND commun avec le header GND.
Ne jamais alimenter 5 servos par le 5V USB de la carte.
GPIO15 POWER_ON et GPIO38 backlight : le firmware les force HIGH.

Header P2 (gauche, du 3V3 vers le 5V)
-------------------------------------
3V3      — ne pas servir les servos
GPIO1    servo BASE        (signal orange)
GPIO2    servo ÉPAULE
GPIO3    servo COUDE       (strapping : brancher APRÈS le boot)
GPIO10   servo POIGNET
GPIO11   servo PINCE
GPIO12   HC-SR04 TRIG
GPIO13   HC-SR04 ECHO      (5 V → 3V3 : pont 1k/2k conseillé)
GND      masse commune servos + HC-SR04
5V       VBUS USB — interdit pour les servos

Header P1 (droit) — libre
-------------------------
GPIO18 / 17   I²C optionnel
GPIO21 / 16   PWM de rechange
GPIO43 / 44   UART0 — laisser

Servos  Brun/noir → GND alim 5 V (+ un fil vers GND T-Display)
        Rouge     → +5 V alim externe
        Orange    → GPIO

ESP32-CAM
---------
Alim 5 V propre. Rejoint PINCE / pince1234, IP fixe 192.168.4.2
Stream http://192.168.4.2:81/stream
GPIO4 = flash LED (éteint par le firmware)

Téléphone
---------
Wi-Fi PINCE  mot de passe pince1234
Studio → Kit → ws://192.168.4.1:81 → Lier le LilyGO
Œil → http://192.168.4.2:81/stream
"""

FLASH = """Flash
=====

A. LilyGO T-Display S3
----------------------
Arduino IDE 2
Cartes : « esp32 » par Espressif (3.x)
Carte : ESP32S3 Dev Module
USB CDC On Boot : Enabled
PSRAM : OPI PSRAM
Flash : 16 MB QIO
Upload speed : 921600

Bibliothèques :
  TFT_eSPI
  ESP32Servo
  ArduinoJson 6.21.x   (pas la 7)
  WebSockets (Markus Sattler)

TFT_eSPI : Arduino/libraries/TFT_eSPI/User_Setup_Select.h
  commenter   #include <User_Setup.h>
  décommenter #include <User_Setups/Setup206_LilyGo_T_Display_S3.h>
(le fichier firmware/TFT_eSPI-setup.h est le pense-bête)

Ouvrir firmware/pince-tdisplay-s3/pince-tdisplay-s3.ino
Maintenir BOOT, brancher l'USB-C, flasher, relâcher BOOT, reset.
L'écran affiche PINCE. AP Wi-Fi PINCE.

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
  GPIO0 au GND pendant le flash, puis relâcher + RST

Ouvrir firmware/pince-esp32-cam/pince-esp32-cam.ino
La CAM rejoint PINCE, IP 192.168.4.2, stream :81/stream
"""

FW_README = """Firmware PINCE
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
"""

LIBS = """TFT_eSPI
ESP32Servo
ArduinoJson@6.21.5
WebSockets (Markus Sattler)
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
    a = fw / "pince-tdisplay-s3"
    b = fw / "pince-esp32-cam"
    a.mkdir(parents=True, exist_ok=True)
    b.mkdir(parents=True, exist_ok=True)
    (a / "pince-tdisplay-s3.ino").write_text(extract_ts_template(src, "FIRMWARE_INO"), encoding="utf-8")
    (b / "pince-esp32-cam.ino").write_text(extract_ts_template(src, "CAM_INO"), encoding="utf-8")
    (fw / "TFT_eSPI-setup.h").write_text(extract_ts_template(src, "TFT_SETUP"), encoding="utf-8")
    (fw / "README.txt").write_text(FW_README, encoding="utf-8")
    (fw / "LIBS.txt").write_text(LIBS, encoding="utf-8")
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
    grid_to_stl(part_base(), stl / "01-base.stl")
    grid_to_stl(part_yoke(), stl / "02-shoulder-yoke.stl")
    grid_to_stl(part_link(120, 16, 8.2), stl / "03-link-120.stl")
    grid_to_stl(part_link(105, 14, 7.4), stl / "04-link-105.stl")
    grid_to_stl(part_palm(), stl / "05-palm.stl")
    grid_to_stl(part_jaw(), stl / "06-jaw.stl")
    grid_to_stl(part_cradle(), stl / "07-tdisplay-cradle.stl")
    grid_to_stl(part_cam(), stl / "08-cam-mount.stl")
    grid_to_stl(part_us(), stl / "09-us-bracket.stl")
    grid_to_stl(part_bin(), stl / "10-bin.stl")
    grid_to_stl(part_clip(), stl / "11-cable-clip.stl")
    grid_to_stl(part_clamp(), stl / "12-frame-clamp.stl")


def zip_kit():
    if ZIP_PATH.exists():
        ZIP_PATH.unlink()
    with zipfile.ZipFile(ZIP_PATH, "w", zipfile.ZIP_DEFLATED) as z:
        for p in sorted(OUT.rglob("*")):
            if p.is_file():
                z.write(p, f"PINCE-kit/{p.relative_to(OUT)}")
    dest = ROOT / "pince-kit.zip"
    shutil.copy2(ZIP_PATH, dest)
    print("zip", ZIP_PATH, ZIP_PATH.stat().st_size)


def main():
    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir(parents=True)
    write_docs(OUT)
    write_firmware(OUT)
    write_stls(OUT)
    zip_kit()


if __name__ == "__main__":
    main()
