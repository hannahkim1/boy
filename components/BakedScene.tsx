"use client";

import { useGLTF } from "@react-three/drei";

// Drop the exported GLB at /public/baked-scene.glb
const MODEL_PATH = "/baked-scene.glb";

useGLTF.preload(MODEL_PATH);

export function BakedScene() {
	const { scene } = useGLTF(MODEL_PATH);
	return <primitive object={scene} />;
}
