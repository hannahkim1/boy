"use client";

import { useEffect } from "react";
import { useGLTF } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import type * as THREE from "three";

const MODEL_PATH = "/recordplayer_current.glb";

useGLTF.preload(MODEL_PATH);

interface BakedSceneProps {
	interactiveMeshes?: string[];
	onMeshClick?: (name: string) => void;
	onMeshHover?: (name: string | null) => void;
}

export function BakedScene({
	interactiveMeshes,
	onMeshClick,
	onMeshHover,
}: BakedSceneProps = {}) {
	const { scene } = useGLTF(MODEL_PATH);

	useEffect(() => {
		if (!scene) return;
		const names: string[] = [];
		scene.traverse((obj) => {
			if ((obj as THREE.Mesh).isMesh) names.push(obj.name);
		});
		console.log("[BakedScene] mesh names:", names);
	}, [scene]);

	const isInteractive = (name: string) =>
		!interactiveMeshes || interactiveMeshes.includes(name);

	return (
		<primitive
			object={scene}
			onClick={(e: ThreeEvent<MouseEvent>) => {
				const name = e.object.name;
				if (!isInteractive(name)) return;
				e.stopPropagation();
				onMeshClick?.(name);
			}}
			onPointerOver={(e: ThreeEvent<PointerEvent>) => {
				const name = e.object.name;
				if (!isInteractive(name)) return;
				e.stopPropagation();
				onMeshHover?.(name);
				document.body.style.cursor = "pointer";
			}}
			onPointerOut={() => {
				onMeshHover?.(null);
				document.body.style.cursor = "auto";
			}}
		/>
	);
}
