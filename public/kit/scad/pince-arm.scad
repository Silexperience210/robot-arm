// PINCE — pack imprimable 5 DDL + pince + berceau LilyGO T-Display S3
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
