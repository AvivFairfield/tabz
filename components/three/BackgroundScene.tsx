"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import * as THREE from "three";

/*
  Minimal ambient backdrop: sakura petals drifting down the whole page
  over faint stars. No models, no scenery.
  Isolated Three.js leaf: no Motion inside this tree.
*/

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

/** A real petal silhouette: teardrop with a notched tip, like a sakura petal. */
function makePetalGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.bezierCurveTo(0.42, 0.12, 0.5, 0.62, 0.28, 0.92);
  shape.lineTo(0.18, 0.8); // notch in the tip
  shape.lineTo(0.08, 0.94);
  shape.bezierCurveTo(-0.22, 0.72, -0.3, 0.2, 0, 0);
  const geo = new THREE.ShapeGeometry(shape, 6);
  geo.center();
  // slight fold along the spine so petals catch light as they tumble
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    pos.setZ(i, Math.abs(pos.getX(i)) * 0.35);
  }
  geo.computeVertexNormals();
  return geo;
}

const PETAL_COUNT = 120;
const SPAN_X = 24;
const SPAN_Y = 16;

function SakuraPetals({ animate }: { animate: boolean }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const geometry = useMemo(() => makePetalGeometry(), []);
  // deterministic per-petal params; petals fall across the whole viewport
  // and wrap back to the top
  const petals = useMemo(
    () =>
      Array.from({ length: PETAL_COUNT }, (_, i) => {
        const r = (n: number) => {
          const x = Math.sin(i * 127.1 + n * 311.7) * 43758.5453;
          return x - Math.floor(x);
        };
        return {
          x0: (r(1) - 0.5) * SPAN_X,
          y0: r(2) * SPAN_Y,
          z: -1.5 - r(3) * 5,
          fall: 0.25 + r(4) * 0.4,
          sway: 0.4 + r(5) * 0.8,
          phase: r(6) * Math.PI * 2,
          scale: 0.08 + r(7) * 0.09,
        };
      }),
    []
  );

  useFrame((state) => {
    if (!mesh.current) return;
    const t = animate ? state.clock.elapsedTime : 1.5;
    petals.forEach((p, i) => {
      const y = ((p.y0 - t * p.fall) % SPAN_Y + SPAN_Y) % SPAN_Y - SPAN_Y / 2;
      const x = p.x0 + Math.sin(t * p.sway + p.phase) * 0.7;
      dummy.position.set(x, y, p.z);
      dummy.rotation.set(t * p.sway + p.phase, p.phase, t * 0.6 + p.phase);
      dummy.scale.setScalar(p.scale);
      dummy.updateMatrix();
      mesh.current!.setMatrixAt(i, dummy.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[geometry, undefined, PETAL_COUNT]}>
      <meshStandardMaterial
        color="#eba0b3"
        emissive="#7e3140"
        emissiveIntensity={0.5}
        transparent
        opacity={0.85}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </instancedMesh>
  );
}

export default function BackgroundScene() {
  const reduced = usePrefersReducedMotion();
  const animate = !reduced;
  return (
    <div aria-hidden className="fixed inset-0 z-0 pointer-events-none">
      <Canvas
        camera={{ position: [0, 0, 9], fov: 45 }}
        dpr={[1, 1.5]}
        frameloop={animate ? "always" : "demand"}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.7} />
        <directionalLight position={[3, 5, 4]} intensity={0.9} color="#dfe4f2" />
        <Stars radius={70} depth={25} count={700} factor={2.2} saturation={0} fade speed={animate ? 0.5 : 0} />
        <SakuraPetals animate={animate} />
      </Canvas>
      <div className="absolute inset-0 bg-gradient-to-b from-canvas/30 via-transparent to-canvas/50" />
    </div>
  );
}
