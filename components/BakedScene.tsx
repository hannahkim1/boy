"use client";

import { useEffect, useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";

const MODEL_PATH = "/recordplayer_current.glb";

useGLTF.preload(MODEL_PATH);

// Mesh-name prefix → emissive glow override applied on top of glTF material
const GLOW_PREFIXES: Record<string, { color: string; intensity: number }> = {
	Lamp_Shade: { color: "#cc88ff", intensity: 2.5 },
	LampShade: { color: "#cc88ff", intensity: 2.5 },
	LED_Strip: { color: "#bb77ff", intensity: 2.5 },
};

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
	const cloned = useMemo(() => scene.clone(true), [scene]);

	useEffect(() => {
		const meshNames: string[] = [];
		cloned.traverse((node) => {
			// Attach a real point light inside the lamp shade so it floods the room
			if (node.name === "Lamp_Shade") {
				const purple = new THREE.PointLight("#aa66ff", 5, 12, 2);
				purple.position.set(0, 0, 0);
				node.add(purple);
			}

			if (node.name === "LED_Strip") {
				const led = new THREE.PointLight("#8844ee", 3, 14, 2);
				led.position.set(0, -0.3, 0);
				node.add(led);
			}

			if (!(node instanceof THREE.Mesh)) return;
			meshNames.push(node.name);

			const patch = (mat: THREE.Material): THREE.Material => {
				if (!(mat instanceof THREE.MeshStandardMaterial)) return mat;

				if (mat.map) {
					mat.map.colorSpace = THREE.SRGBColorSpace;
					mat.map.flipY = false;
					mat.map.minFilter = THREE.LinearMipmapLinearFilter;
					mat.map.needsUpdate = true;
				}

				const glow = Object.entries(GLOW_PREFIXES).find(
					([k]) => node.name.startsWith(k) || mat.name.startsWith(k),
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
		console.log("[BakedScene] mesh names:", meshNames);
	}, [cloned]);

	const isInteractive = (name: string) =>
		!interactiveMeshes || interactiveMeshes.includes(name);

	return (
		<primitive
			object={cloned}
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
