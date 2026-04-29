"use client";

import { useGLTF } from "@react-three/drei";

const MODEL_PATH = "/recordplayer_current.glb";

useGLTF.preload(MODEL_PATH);

export function BakedScene() {
	const { scene } = useGLTF(MODEL_PATH);
	return <primitive object={scene} />;
}
