/**
 * PINCE — carénages voronoï optimisés
 *
 * Changements vs. le premier jet :
 * - Treillis hexagonal + jitter faible (plus rigide qu'un Worley pur)
 * - Densité variable : cellules serrées aux articulations, ouvertes au milieu
 * - Deux longerons (plan de flexion) jamais ajourés
 * - Bagues d'extrémité fondues dans le motif (pas de couture UV)
 * - Domaine cylindrique seamless (angle depuis la position)
 * - Épaisseur mini constante → imprimable 0.4 mm / paroi ~1.4 mm
 */
import { useMemo } from "react";
import { Color, DoubleSide, Vector3 } from "three";

export const VORONOI_VERT = /* glsl */ `
  varying vec3 vPos;
  varying vec3 vWorldN;
  varying vec3 vViewDir;
  varying float vAlong;
  void main() {
    vPos = position;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldN = normalize(mat3(modelMatrix) * normal);
    vViewDir = normalize(cameraPosition - wp.xyz);
    // Axe du lien = Z local après rotation du mesh (cylindre le long de Y world du geo)
    vAlong = uv.y;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const VORONOI_FRAG = /* glsl */ `
  precision highp float;
  varying vec3 vPos;
  varying vec3 vWorldN;
  varying vec3 vViewDir;
  varying float vAlong;
  uniform vec3 uColor;
  uniform vec3 uEdge;
  uniform float uScale;
  uniform float uThick;
  uniform float uJitter;
  uniform float uSeed;
  uniform float uRib;

  vec2 hash2(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973) + uSeed);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.xx + p3.yz) * p3.zy);
  }

  // Hexagone : plus de 3-connexité, moins de cellules écrasées
  vec2 hexCenter(vec2 p) {
    vec2 s = vec2(1.0, 1.7320508);
    vec2 a = floor(p / s) * s;
    vec2 b = a + s * 0.5;
    vec2 da = p - (a + 0.5 * s * 0.5);
    vec2 db = p - (b + 0.5 * s * 0.5);
    return dot(da, da) < dot(db, db) ? a : b;
  }

  float hexEdge(vec2 p) {
    vec2 n = hexCenter(p);
    float f1 = 8.0;
    float f2 = 8.0;
    for (int j = -2; j <= 2; j++)
    for (int i = -2; i <= 2; i++) {
      vec2 g = n + vec2(float(i) * 0.5, float(j) * 0.866025);
      // n'accepter que les vrais voisins hex
      vec2 o = (hash2(g + 19.0) - 0.5) * uJitter;
      vec2 r = g + o - p;
      float d = dot(r, r);
      if (d < f1) { f2 = f1; f1 = d; }
      else if (d < f2) { f2 = d; }
    }
    return sqrt(max(f2, 0.0)) - sqrt(max(f1, 0.0));
  }

  void main() {
    // Cylindre seamless : phi autour de l'âme, s le long du lien
    float phi = atan(vPos.x, vPos.z);
    float s = vAlong;
    // Cellules un peu plus longues dans l'axe de charge
    vec2 p = vec2(phi * 0.875 + 3.14159, s * 6.28318) * uScale / 6.28318;
    p.y *= 0.82;

    float e = hexEdge(p);

    // Gradient structural : plus de matière aux rotules (s~0 et s~1)
    float joint = pow(smoothstep(0.22, 0.0, s) + smoothstep(0.78, 1.0, s), 0.85);
    float mid = 1.0 - joint;
    float thick = mix(uThick * 0.78, uThick * 1.55, joint);

    float wall = smoothstep(thick * 0.42, thick, e);

    // Longerons haut/bas (plan de flexion) — raidisseurs
    float rib = abs(sin(phi));
    float rail = smoothstep(uRib, uRib * 0.45, rib);

    // Bagues fondues (plus de coupe nette au bout du tube)
    float cap = max(smoothstep(0.08, 0.0, s), smoothstep(0.92, 1.0, s));

    wall = max(wall, rail);
    wall = max(wall, cap);

    // Îlots trop fins → on les ferme (imprimable)
    if (wall > 0.04 && wall < 0.18) wall = 0.18;

    if (wall < 0.10 && mid > 0.35) discard;

    vec3 N = normalize(vWorldN);
    vec3 V = normalize(vViewDir);
    vec3 L = normalize(vec3(0.48, 0.86, 0.28));
    float wrap = 0.28 + 0.72 * max(dot(N, L), 0.0);
    float rim = pow(1.0 - max(dot(N, V), 0.0), 2.2);
    float spec = pow(max(dot(N, normalize(L + V)), 0.0), 28.0) * 0.12;

    vec3 col = mix(uEdge, uColor, clamp(wall, 0.0, 1.0));
    col *= wrap;
    col += vec3(0.62, 0.66, 0.54) * rim * 0.42;
    col += vec3(0.95, 0.93, 0.82) * spec;
    // micro-couches FDM
    col *= 0.96 + 0.04 * sin(s * 420.0);

    gl_FragColor = vec4(col, 1.0);
  }
`;

export function useVoronoiMat(
  color = "#3a4036",
  edge = "#161814",
  scale = 5.4,
  thick = 0.19,
) {
  return useMemo(
    () => ({
      vertexShader: VORONOI_VERT,
      fragmentShader: VORONOI_FRAG,
      uniforms: {
        uColor: { value: new Color(color) },
        uEdge: { value: new Color(edge) },
        uScale: { value: scale },
        uThick: { value: thick },
        uJitter: { value: 0.22 },
        uSeed: { value: 2.15 },
        uRib: { value: 0.22 },
      },
      side: DoubleSide,
    }),
    [color, edge, scale, thick],
  );
}

/** Tube caréné : âme + coque hex-voronoï + bagues. */
export function VoronoiLink({
  length,
  radius = 0.0125,
  shell = 0.0036,
  scale,
  thick,
}: {
  length: number;
  radius?: number;
  shell?: number;
  scale?: number;
  thick?: number;
}) {
  const mat = useVoronoiMat("#3a4036", "#161814", scale ?? 5.4, thick ?? 0.19);
  const core = useMemo(
    () => ({ color: "#262b25", roughness: 0.66, metalness: 0.07 }),
    [],
  );
  return (
    <group>
      <mesh position={[0, 0, length / 2]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[radius * 0.64, radius * 0.7, length, 16]} />
        <meshStandardMaterial {...core} />
      </mesh>
      <mesh position={[0, 0, length / 2]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[radius + shell, radius + shell * 0.9, length * 0.94, 48, 12, true]} />
        <shaderMaterial {...mat} />
      </mesh>
      {[0.007, length - 0.007].map((z) => (
        <mesh key={z} position={[0, 0, z]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[radius + shell + 0.0022, radius + shell + 0.0014, 0.01, 20]} />
          <meshStandardMaterial color="#3c433b" roughness={0.5} metalness={0.1} />
        </mesh>
      ))}
    </group>
  );
}

export function WorkshopLights() {
  return (
    <>
      <color attach="background" args={["#12140f"]} />
      <hemisphereLight args={["#e8eddc", "#1a1c14", 0.72]} />
      <ambientLight intensity={0.32} />
      <directionalLight
        position={[0.55, 0.95, 0.42]}
        intensity={2.55}
        color="#fff4e0"
        castShadow
        shadow-mapSize={[1536, 1536]}
        shadow-bias={-0.00025}
        shadow-camera-near={0.08}
        shadow-camera-far={1.6}
        shadow-camera-left={-0.36}
        shadow-camera-right={0.36}
        shadow-camera-top={0.36}
        shadow-camera-bottom={-0.36}
      />
      <directionalLight position={[-0.55, 0.28, -0.22]} intensity={0.55} color="#9ab0c8" />
      <directionalLight position={[-0.15, 0.55, 0.55]} intensity={0.7} color="#dfe8d4" />
      <pointLight position={[0.02, 0.22, 0.2]} intensity={0.55} distance={0.55} color="#ffe7b0" />
      <spotLight
        position={[0.08, 0.42, 0.12]}
        angle={0.55}
        penumbra={0.45}
        intensity={1.15}
        distance={0.9}
        color="#fff2cc"
        castShadow={false}
        target-position={new Vector3(0.02, 0.08, 0.16)}
      />
    </>
  );
}
