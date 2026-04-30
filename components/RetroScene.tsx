"use client";

import { Suspense, useEffect, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF, Environment } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette, N8AO } from "@react-three/postprocessing";
import * as THREE from "three";

const GLB_PATH = "/recordplayer_current.glb";
const CAMERA_POSITION: [number, number, number] = [0, 6, 18];
const CAMERA_TARGET: [number, number, number] = [0, 2, 0];

// Objects whose names start with these keys get emissive glow applied
const GLOW_PREFIXES: Record<string, { color: string; intensity: number }> = {
  Lamp_Shade: { color: "#cc88ff", intensity: 2.5 }, // shade: glowing like mini lamp
  LampShade:  { color: "#cc88ff", intensity: 2.5 }, // alternate naming from Blender
  LED_Strip:  { color: "#bb77ff", intensity: 2.5  }, // strip: intentionally bright so bloom spreads it
};

type SceneProps = {
  enableOrbit?: boolean;
  className?: string;
  topArtistImages?: string[];
};

function BlenderScene({ topArtistImages }: { topArtistImages?: string[] }) {
  const { scene } = useGLTF(GLB_PATH);
  const cloned = useMemo(() => scene.clone(true), [scene]);

  useEffect(() => {
    cloned.traverse((node) => {
      // Attach lights inside the lamp shade — warm key light + soft purple tint
      if (node.name === "Lamp_Shade") {
        const purple = new THREE.PointLight("#aa66ff", 5, 12, 2);
        purple.position.set(0, 0, 0);
        node.add(purple);
      }

      if (node.name === "LED_Strip") {
        // Offset downward so the light floods the shelf and wall below the strip
        const light = new THREE.PointLight("#8844ee", 3, 14, 2);
        light.position.set(0, -0.3, 0);
        node.add(light);
      }

      if (!(node instanceof THREE.Mesh)) return;

      const patch = (mat: THREE.Material): THREE.Material => {
        // Keep the GLB's MeshStandardMaterial so lights actually affect it.
        // Only fix texture color space and wire up intentional emissive objects.
        if (!(mat instanceof THREE.MeshStandardMaterial)) return mat;

        if (mat.map) {
          mat.map.colorSpace = THREE.SRGBColorSpace;
          mat.map.flipY = false;
          mat.map.minFilter = THREE.LinearMipmapLinearFilter;
          mat.map.needsUpdate = true;
        }

        const glow = Object.entries(GLOW_PREFIXES).find(
          ([k]) => node.name.startsWith(k) || mat.name.startsWith(k)
        )?.[1];

        if (glow) {
          mat.emissive = new THREE.Color(glow.color);
          mat.emissiveIntensity = glow.intensity;
        }

        mat.needsUpdate = true;
        return mat;
      };

      node.material = Array.isArray(node.material)
        ? node.material.map(patch)
        : patch(node.material);
    });
  }, [cloned]);

  useEffect(() => {
    if (!topArtistImages || topArtistImages.length === 0) return;

    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");

    cloned.traverse((node) => {
      if (!(node instanceof THREE.Mesh)) return;

      const match = node.name.match(/^Cover_(\d+)$/);
      if (!match) return;

      const index = parseInt(match[1], 10) - 1;
      const imageUrl = topArtistImages[index];
      if (!imageUrl) return;

      // Regenerate UVs from vertex positions so the full image
      // maps onto each face (the original UVs are atlas-packed)
      const geometry = node.geometry.clone();
      const posAttr = geometry.getAttribute("position");
      const uvAttr = geometry.getAttribute("uv") as THREE.BufferAttribute;

      if (posAttr && uvAttr) {
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (let i = 0; i < posAttr.count; i++) {
          minX = Math.min(minX, posAttr.getX(i));
          maxX = Math.max(maxX, posAttr.getX(i));
          minY = Math.min(minY, posAttr.getY(i));
          maxY = Math.max(maxY, posAttr.getY(i));
        }
        const rangeX = maxX - minX || 1;
        const rangeY = maxY - minY || 1;

        for (let i = 0; i < uvAttr.count; i++) {
          uvAttr.setXY(
            i,
            1 - (posAttr.getX(i) - minX) / rangeX,
            1 - (posAttr.getY(i) - minY) / rangeY
          );
        }
        uvAttr.needsUpdate = true;
      }
      node.geometry = geometry;

      loader.load(
        imageUrl,
        (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.flipY = false;
          texture.needsUpdate = true;

          const originalMat = node.material as THREE.MeshStandardMaterial;
          if (originalMat.isMeshStandardMaterial) {
            const newMat = originalMat.clone();
            newMat.map = texture;
            newMat.color.set(0xffffff);
            newMat.emissive.set(0x000000);
            newMat.emissiveIntensity = 0;
            newMat.metalness = 0;
            newMat.roughness = 1;
            newMat.needsUpdate = true;
            node.material = newMat;
          }
        },
        undefined,
        (err) => {
          console.warn(`Failed to load cover texture for ${node.name}:`, err);
        }
      );
    });
  }, [cloned, topArtistImages]);

  return <primitive object={cloned} />;
}

function Loader() {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial color="#1a1a2e" wireframe />
    </mesh>
  );
}

export function RetroScene({
  enableOrbit = true,
  className = "h-full w-full",
  topArtistImages,
}: SceneProps) {
  return (
    <Canvas
      className={className}
      camera={{ position: CAMERA_POSITION, fov: 35, near: 0.1, far: 200 }}
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
        toneMapping: THREE.ACESFilmicToneMapping,
      }}
      dpr={[1, 2]}
      onCreated={({ camera, scene, gl }) => {
        camera.lookAt(...CAMERA_TARGET);
        scene.background = new THREE.Color(0x08080b);
        gl.outputColorSpace = THREE.SRGBColorSpace;
        gl.toneMappingExposure = 1.1;
      }}
    >
      <Suspense fallback={<Loader />}>
        {/* Warm fill — enough to read detail in shadowed areas of a dark room */}
        <ambientLight intensity={0.22} color="#c8b89a" />

        {/* Warm key — top front right */}
        <spotLight
          position={[8, 12, 10]}
          angle={0.6}
          penumbra={0.85}
          intensity={60}
          color="#ffb070"
        />
        {/* Cool rim — opposite side, defines silhouette */}
        <spotLight
          position={[-12, 10, -10]}
          angle={0.7}
          penumbra={0.9}
          intensity={30}
          color="#5fc8d6"
        />
        {/* Subtle front fill */}
        <pointLight
          position={[0, 4, 12]}
          intensity={4}
          color="#ffffff"
          distance={30}
          decay={2}
        />

        {/* Low-intensity IBL for fill reflections on metals */}
        <Environment preset="warehouse" environmentIntensity={0.18} />

        <BlenderScene topArtistImages={topArtistImages} />

        <EffectComposer>
          {/* N8AO approximates Cycles' ambient occlusion — softens corners and
              crevices so surfaces stop looking flat and blocky */}
          <N8AO
            aoRadius={3}
            intensity={8}
            distanceFalloff={1}
            aoSamples={16}
            denoiseSamples={4}
            denoiseRadius={12}
            screenSpaceRadius={false}
          />
          <Bloom
            luminanceThreshold={0.6}
            luminanceSmoothing={0.9}
            intensity={0.8}
            mipmapBlur
          />
          <Vignette eskil={false} offset={0.18} darkness={0.7} />
        </EffectComposer>
      </Suspense>

      {enableOrbit && (
        <OrbitControls
          enablePan={false}
          enableZoom
          enableDamping
          dampingFactor={0.05}
          minPolarAngle={Math.PI * 0.15}
          maxPolarAngle={Math.PI * 0.55}
          minAzimuthAngle={-Math.PI * 0.35}
          maxAzimuthAngle={Math.PI * 0.35}
          minDistance={8}
          maxDistance={30}
          target={CAMERA_TARGET}
        />
      )}
    </Canvas>
  );
}

useGLTF.preload(GLB_PATH);
