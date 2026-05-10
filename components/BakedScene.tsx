"use client";

import { useEffect, useMemo, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
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
	draggableMeshes?: string[];
	onMeshClick?: (name: string) => void;
	onMeshHover?: (name: string | null) => void;
	onMeshPointerDown?: (name: string, object: THREE.Object3D) => void;
	onMeshPointerUp?: () => void;
	isDragging?: React.RefObject<boolean>;
	topArtistImages?: string[];
	onCoverPositions?: (positions: Map<string, THREE.Vector3>) => void;
	sceneRef?: React.MutableRefObject<THREE.Object3D | null>;
}

export function BakedScene({
	interactiveMeshes,
	draggableMeshes,
	onMeshClick,
	onMeshHover,
	onMeshPointerDown,
	onMeshPointerUp,
	isDragging,
	topArtistImages,
	onCoverPositions,
	sceneRef,
}: BakedSceneProps = {}) {
	const { scene } = useGLTF(MODEL_PATH);
	const cloned = useMemo(() => scene.clone(true), [scene]);

	useEffect(() => {
		if (sceneRef) sceneRef.current = cloned;
	}, [cloned, sceneRef]);

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

	useEffect(() => {
		if (!topArtistImages || topArtistImages.length === 0) return;

		const loader = new THREE.TextureLoader();
		loader.setCrossOrigin("anonymous");

		// Track resources for cleanup
		const loadedTextures: THREE.Texture[] = [];
		const createdMaterials: THREE.MeshStandardMaterial[] = [];
		const clonedGeometries: THREE.BufferGeometry[] = [];
		const previousMaterials: THREE.Material[] = [];

		cloned.traverse((node) => {
			if (!(node instanceof THREE.Mesh)) return;

			const match = node.name.match(/^Cover_(\d+)$/);
			if (!match) return;

			const index = parseInt(match[1], 10) - 1;
			const imageUrl = topArtistImages[index];
			if (!imageUrl) return;

			// Regenerate UVs from vertex positions so the full image
			// maps onto each face (the original UVs are atlas-packed)
			const oldGeometry = node.geometry;
			const geometry = oldGeometry.clone();
			clonedGeometries.push(geometry);
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
					loadedTextures.push(texture);

					const originalMat = node.material as THREE.MeshStandardMaterial;
					previousMaterials.push(originalMat);
					if (originalMat.isMeshStandardMaterial) {
						const newMat = originalMat.clone();
						newMat.map = texture;
						newMat.color.set(0xffffff);
						newMat.emissive.set(0xffffff);
						newMat.emissiveMap = texture;
						newMat.emissiveIntensity = 0.4;
						newMat.metalness = 0;
						newMat.roughness = 1;
						newMat.needsUpdate = true;
						createdMaterials.push(newMat);
						node.material = newMat;
					}
				},
				undefined,
				(err) => {
					console.warn(`Failed to load cover texture for ${node.name}:`, err);
				}
			);
		});

		return () => {
			loadedTextures.forEach((t) => t.dispose());
			createdMaterials.forEach((m) => m.dispose());
			clonedGeometries.forEach((g) => g.dispose());
		};
	}, [cloned, topArtistImages]);

	// Report cover world positions after the first frame (when world matrices are valid)
	const onCoverPositionsRef = useRef(onCoverPositions);
	onCoverPositionsRef.current = onCoverPositions;
	const coverPositionsReported = useRef(false);

	useFrame(() => {
		if (coverPositionsReported.current || !onCoverPositionsRef.current) return;
		const positions = new Map<string, THREE.Vector3>();
		cloned.traverse((node) => {
			if (node.name.match(/^Cover_\d+$/) && (node as THREE.Mesh).isMesh) {
				const mesh = node as THREE.Mesh;
				// Use bounding box center in world space — more accurate than
				// node origin when geometry is offset from the transform.
				mesh.geometry.computeBoundingBox();
				const center = new THREE.Vector3();
				mesh.geometry.boundingBox!.getCenter(center);
				mesh.localToWorld(center);
				positions.set(node.name, center);
			}
		});
		if (positions.size > 0) {
			onCoverPositionsRef.current(positions);
			coverPositionsReported.current = true;
		}
	});

	const isInteractive = (name: string) =>
		!interactiveMeshes || interactiveMeshes.includes(name);

	// Walk up from a mesh to find the nearest ancestor whose name is in draggableMeshes
	const findDraggableAncestor = (obj: THREE.Object3D): THREE.Object3D | null => {
		if (!draggableMeshes) return null;
		let current: THREE.Object3D | null = obj;
		while (current) {
			if (draggableMeshes.includes(current.name)) return current;
			current = current.parent;
		}
		return null;
	};

	return (
		<primitive
			object={cloned}
			onClick={(e: ThreeEvent<MouseEvent>) => {
				// Suppress click that fires after a drag
				if (isDragging?.current) return;
				const name = e.object.name;
				if (!isInteractive(name) && !findDraggableAncestor(e.object)) return;
				e.stopPropagation();
				onMeshClick?.(name);
			}}
			onPointerDown={(e: ThreeEvent<PointerEvent>) => {
				const group = findDraggableAncestor(e.object);
				if (!group) return;
				e.stopPropagation();
				onMeshPointerDown?.(group.name, group);
			}}
			onPointerUp={(e: ThreeEvent<PointerEvent>) => {
				const group = findDraggableAncestor(e.object);
				if (!group) return;
				e.stopPropagation();
				onMeshPointerUp?.();
			}}
			onPointerOver={(e: ThreeEvent<PointerEvent>) => {
				const name = e.object.name;
				const draggable = findDraggableAncestor(e.object);
				if (!isInteractive(name) && !draggable) return;
				e.stopPropagation();
				onMeshHover?.(name);
				document.body.style.cursor = draggable ? "grab" : "pointer";
			}}
			onPointerOut={() => {
				onMeshHover?.(null);
				document.body.style.cursor = "auto";
			}}
		/>
	);
}
