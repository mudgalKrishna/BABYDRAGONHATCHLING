import { useRef, useMemo, useState, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { SpineNode, SimState } from "@/lib/mockEngine";
import { SPINE_ROWS, SPINE_COLS } from "@/lib/mockEngine";

interface SpineProps {
  nodes: SpineNode[];
  state: SimState;
  writePulse: { active: boolean; demoId: number | null };
  prefersReducedMotion: boolean;
}

const BRASS = "#C9A66B";
const BRASS_BRIGHT = "#E8D28A";
const CLAY = "#A6503B";
const VERDIGRIS = "#4C7A70";

// Node color: brass by default, clay when attacked, verdigris when patched
function nodeColor(node: SpineNode): THREE.Color {
  // Raise the floor so even dim nodes are clearly visible
  const intensity = 0.25 + node.brightness * 0.75;
  if (node.attacked) {
    return new THREE.Color(CLAY).multiplyScalar(intensity);
  }
  if (node.patched) {
    return new THREE.Color(VERDIGRIS).multiplyScalar(intensity);
  }
  return new THREE.Color(BRASS).multiplyScalar(intensity);
}

// Position nodes in a grid mapped onto a gently coiling ribbon
function ribbonPosition(
  row: number,
  col: number,
  totalRows: number,
  totalCols: number,
  time: number
): THREE.Vector3 {
  const t = row / Math.max(1, totalRows - 1); // 0..1 along ribbon length
  const u = (col / Math.max(1, totalCols - 1)) - 0.5; // -0.5..0.5 across width

  const length = 9;
  const coils = 1.0;
  const baseRadius = 3.0;
  const radius = baseRadius - t * 0.6; // slight taper
  const widthScale = 3.5;

  const y = (t - 0.5) * length;
  const angle = t * coils * Math.PI * 2 + time * 0.06;
  const x = Math.cos(angle) * radius + u * widthScale * Math.cos(angle + Math.PI / 2);
  const z = Math.sin(angle) * radius + u * widthScale * Math.sin(angle + Math.PI / 2);

  return new THREE.Vector3(x, y, z);
}

function RibbonMesh({
  nodes,
  state,
  writePulse,
  prefersReducedMotion,
}: {
  nodes: SpineNode[];
  state: SimState;
  writePulse: { active: boolean; demoId: number | null };
  prefersReducedMotion: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const nodeRefs = useRef<THREE.Mesh[]>([]);
  const glowRefs = useRef<THREE.Mesh[]>([]);
  const [hovered, setHovered] = useState<number | null>(null);
  const { camera } = useThree();
  const timeRef = useRef(0);
  const pulseRef = useRef(0);

  const totalRows = SPINE_ROWS;
  const totalCols = SPINE_COLS;

  // Capacity squeeze narrows the ribbon width
  const widthMod = state.activeAttack === "capacity" ? 0.4 + (state.capacity / 32) * 0.6 : 1;

  // Attack warp
  const warpFactor = useMemo(() => {
    if (state.activeAttack === "distractor") return 0.12;
    if (state.activeAttack === "interference") return 0.18;
    return 0;
  }, [state.activeAttack]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    timeRef.current += delta;

    if (!prefersReducedMotion) {
      groupRef.current.rotation.y += delta * 0.06;
    }

    // Write pulse
    if (writePulse.active) {
      pulseRef.current = Math.min(1, pulseRef.current + delta * 1.8);
    } else {
      pulseRef.current = Math.max(0, pulseRef.current - delta * 0.7);
    }

    // Interference flicker
    const flicker =
      state.activeAttack === "interference" && !prefersReducedMotion
        ? 0.6 + Math.sin(timeRef.current * 12) * 0.4
        : 1;

    nodes.forEach((node, i) => {
      const mesh = nodeRefs.current[i];
      const glow = glowRefs.current[i];
      if (!mesh) return;

      const pos = ribbonPosition(node.row, node.col, totalRows, totalCols, timeRef.current);

      // Attack warps
      if (state.activeAttack === "distractor" && node.attacked) {
        pos.x += Math.sin(timeRef.current * 2.5 + i) * warpFactor;
        pos.z += Math.cos(timeRef.current * 2 + i) * warpFactor;
      }
      if (state.activeAttack === "interference") {
        pos.x += (Math.sin(timeRef.current * 7 + i * 0.4) - 0.5) * warpFactor * 0.4;
        pos.y += (Math.cos(timeRef.current * 5 + i * 0.3) - 0.5) * warpFactor * 0.25;
      }

      // Width narrowing for capacity
      pos.x *= widthMod;
      pos.z *= widthMod;

      mesh.position.copy(pos);

      // Exaggerated brightness range
      const pulseBoost = writePulse.active && writePulse.demoId === node.demoId
        ? pulseRef.current * 0.4
        : 0;
      const effectiveBrightness = Math.min(1, node.brightness + pulseBoost) * flicker;
      const targetScale = 0.05 + effectiveBrightness * 0.12;

      mesh.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.12);

      // Color
      const baseColor = nodeColor(node);
      if (writePulse.active && writePulse.demoId === node.demoId) {
        baseColor.lerp(new THREE.Color(BRASS_BRIGHT), pulseRef.current * 0.6);
      }
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.color.lerp(baseColor, 0.15);
      mat.emissive.lerp(baseColor, 0.15);
      mat.emissiveIntensity = 0.35 + effectiveBrightness * 0.55;

      // Glow halo
      if (glow) {
        const glowScale = targetScale * (1.8 + effectiveBrightness * 2.5);
        glow.scale.lerp(new THREE.Vector3(glowScale, glowScale, glowScale), 0.12);
        glow.position.copy(mesh.position);
        const glowMat = glow.material as THREE.MeshBasicMaterial;
        const glowColor = node.attacked
          ? new THREE.Color(CLAY)
          : node.patched
            ? new THREE.Color(VERDIGRIS)
            : new THREE.Color(BRASS);
        glowMat.color.lerp(glowColor, 0.15);
        glowMat.opacity = (0.1 + effectiveBrightness * 0.4) * flicker;
      }

      // Hover boost
      if (hovered === i) {
        mesh.scale.multiplyScalar(2);
        if (glow) glow.scale.multiplyScalar(1.5);
      }
    });
  });

  // Camera move between acts
  const targetCamPos = useMemo(() => {
    const angle = ((state.act - 1) / 5) * Math.PI * 0.25;
    const dist = 12;
    return new THREE.Vector3(
      Math.sin(angle) * dist,
      0.5 + state.act * 0.2,
      Math.cos(angle) * dist
    );
  }, [state.act]);

  useFrame(() => {
    camera.position.lerp(targetCamPos, 0.02);
    camera.lookAt(0, 0, 0);
  });

  const handleNodeHover = useCallback((idx: number | null) => {
    setHovered(idx);
  }, []);

  // Tether for hovered node
  const tetherGeom = useMemo(() => {
    if (hovered === null || !nodeRefs.current[hovered]) return null;
    const pos = nodeRefs.current[hovered].position.clone();
    const camPos = camera.position.clone();
    const mid = pos.clone().lerp(camPos, 0.25);
    return new THREE.BufferGeometry().setFromPoints([pos, mid]);
  }, [hovered, camera]);

  // Guide line geometry — faint row/column lines
  const guideLineGeom = useMemo(() => {
    const positions: number[] = [];
    // Row lines (along columns at each row)
    for (let r = 0; r < totalRows; r++) {
      for (let c = 0; c < totalCols - 1; c++) {
        const p1 = ribbonPosition(r, c, totalRows, totalCols, 0);
        const p2 = ribbonPosition(r, c + 1, totalRows, totalCols, 0);
        positions.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z);
      }
    }
    // Column lines (along rows at each column)
    for (let c = 0; c < totalCols; c++) {
      for (let r = 0; r < totalRows - 1; r++) {
        const p1 = ribbonPosition(r, c, totalRows, totalCols, 0);
        const p2 = ribbonPosition(r + 1, c, totalRows, totalCols, 0);
        positions.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    return geo;
  }, [totalRows, totalCols]);

  // Animate guide lines to follow ribbon
  const guideLineRef = useRef<THREE.LineSegments>(null);
  useFrame(() => {
    if (!guideLineRef.current) return;
    const positions = guideLineRef.current.geometry.attributes.position.array as Float32Array;
    let idx = 0;
    // Row lines
    for (let r = 0; r < totalRows; r++) {
      for (let c = 0; c < totalCols - 1; c++) {
        const p1 = ribbonPosition(r, c, totalRows, totalCols, timeRef.current);
        const p2 = ribbonPosition(r, c + 1, totalRows, totalCols, timeRef.current);
        positions[idx++] = p1.x * widthMod;
        positions[idx++] = p1.y;
        positions[idx++] = p1.z * widthMod;
        positions[idx++] = p2.x * widthMod;
        positions[idx++] = p2.y;
        positions[idx++] = p2.z * widthMod;
      }
    }
    // Column lines
    for (let c = 0; c < totalCols; c++) {
      for (let r = 0; r < totalRows - 1; r++) {
        const p1 = ribbonPosition(r, c, totalRows, totalCols, timeRef.current);
        const p2 = ribbonPosition(r + 1, c, totalRows, totalCols, timeRef.current);
        positions[idx++] = p1.x * widthMod;
        positions[idx++] = p1.y;
        positions[idx++] = p1.z * widthMod;
        positions[idx++] = p2.x * widthMod;
        positions[idx++] = p2.y;
        positions[idx++] = p2.z * widthMod;
      }
    }
    guideLineRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <group ref={groupRef}>
      {/* Row/column guide lines — faint, make it read as a matrix */}
      <lineSegments ref={guideLineRef}>
        <primitive object={guideLineGeom} attach="geometry" />
        <lineBasicMaterial color={BRASS} transparent opacity={0.1} />
      </lineSegments>

      {/* Nodes */}
      {nodes.map((node, i) => (
        <group key={i}>
          <mesh
            ref={(el) => {
              if (el) nodeRefs.current[i] = el;
            }}
            onPointerOver={(e) => {
              e.stopPropagation();
              handleNodeHover(i);
            }}
            onPointerOut={() => handleNodeHover(null)}
          >
            <sphereGeometry args={[1, 10, 10]} />
            <meshStandardMaterial
              color={nodeColor(node)}
              emissive={nodeColor(node)}
              emissiveIntensity={0.3}
              roughness={0.35}
              metalness={0.7}
            />
          </mesh>
          <mesh
            ref={(el) => {
              if (el) glowRefs.current[i] = el;
            }}
          >
            <sphereGeometry args={[1, 6, 6]} />
            <meshBasicMaterial
              transparent
              opacity={0}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        </group>
      ))}

      {/* Tether for hovered node */}
      {tetherGeom && hovered !== null && (
        <line>
          <primitive object={tetherGeom} attach="geometry" />
          <lineBasicMaterial color={BRASS} transparent opacity={0.4} />
        </line>
      )}
    </group>
  );
}

export default function Spine({ nodes, state, writePulse, prefersReducedMotion }: SpineProps) {
  return (
    <Canvas
      camera={{ position: [0, 1, 12], fov: 45 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      style={{ background: "transparent" }}
    >
      <fogExp2 attach="fog" args={["#0A0907", 0.022]} />

      {/* Warm key light + brass fill light */}
      <ambientLight intensity={0.2} color="#C9A66B" />
      <directionalLight position={[6, 4, 5]} intensity={0.85} color="#E8D28A" />
      <directionalLight position={[-4, -1, -3]} intensity={0.25} color="#C9A66B" />
      <pointLight position={[0, 0, 3]} intensity={0.4} color="#E8D28A" distance={20} />

      <RibbonMesh
        nodes={nodes}
        state={state}
        writePulse={writePulse}
        prefersReducedMotion={prefersReducedMotion}
      />

      <OrbitControls
        enableZoom={!prefersReducedMotion}
        enablePan={false}
        enableRotate={!prefersReducedMotion}
        autoRotate={false}
        dampingFactor={0.08}
        rotateSpeed={0.5}
        minDistance={7}
        maxDistance={18}
        enabled={!prefersReducedMotion}
      />
    </Canvas>
  );
}
