"use client";

import { useRef, useEffect, useCallback } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

type DragState = "idle" | "dragging" | "dropping" | "snapping";

interface SnapTarget {
	/** Name of the draggable mesh this snap applies to */
	draggableName: string;
	/** Name of the target mesh to snap onto */
	targetName: string;
	/** Max world-space distance to trigger snap */
	snapRadius: number;
	/** Y offset above the target so the object hovers instead of clipping */
	yOffset?: number;
	/** Euler rotation (in radians) to apply when snapped */
	snapRotation?: [number, number, number];
}

interface SurfaceBox {
	minX: number;
	maxX: number;
	minZ: number;
	maxZ: number;
	topY: number; // world-space Y of the top surface
}

interface DragInfo {
	name: string;
	object: THREE.Object3D;
	originalLocalPosition: THREE.Vector3;
	grabNDC: THREE.Vector2;
	depth: number;
	velocity: THREE.Vector3;
	/** Cached bounding boxes for solid surfaces (world space) */
	surfaces: SurfaceBox[];
	/** World Y of the object's bounding box bottom when position.y = 0 (baked vertex offset) */
	bakedBottomY: number;
	state: DragState;
	/** Local-space position to lerp towards when snapping */
	snapLocalTarget?: THREE.Vector3;
	/** Target rotation when snapping */
	snapTargetRotation?: THREE.Euler;
	/** Original rotation before snapping (for lerping) */
	originalRotation?: THREE.Euler;
	/** Local-space geometry center offset from origin (for rotating around center) */
	geometryCenter?: THREE.Vector3;
	/** True if the drag started from a snapped position — suppress snap until outside radius */
	startedSnapped?: boolean;
	/** Set to true once the object has left the snap radius (re-enables snapping) */
	leftSnapRadius?: boolean;
}

interface UseDragAndDropReturn {
	onMeshPointerDown: (name: string, object: THREE.Object3D) => void;
	onMeshPointerUp: () => void;
	isDragging: React.RefObject<boolean>;
	draggingName: React.RefObject<string | null>;
}

const LERP_SPEED = 0.15;
const GRAVITY = -9.8;
const BOUNCE_DAMPING = 0.3;
const REST_THRESHOLD = 0.005;
const DRAG_SCALE = 0.7;
/** Shrink surface bounding boxes inward so landing Y sits on the visual flat surface
 *  rather than the tip of protruding parts (knobs, tonearm, etc.) */
const SURFACE_INSET = 0.45;

export function useDragAndDrop(
	draggableMeshNames: string[],
	sceneRef: React.RefObject<THREE.Object3D | null>,
	solidSurfaceNames: { name: string; container?: boolean; surfaceInset?: number; xzInset?: number; boundingChild?: string }[],
	snapTargets: SnapTarget[] = [],
): UseDragAndDropReturn {
	const { camera, gl, invalidate } = useThree();
	const isDragging = useRef(false);
	const draggingName = useRef<string | null>(null);
	const dragInfo = useRef<DragInfo | null>(null);
	const mouse = useRef(new THREE.Vector2());
	const targetPos = useRef(new THREE.Vector3());
	const keysPressed = useRef<Set<string>>(new Set());
	const keyOffset = useRef(new THREE.Vector3());

	useEffect(() => {
		const canvas = gl.domElement;

		const onPointerMove = (e: PointerEvent) => {
			const rect = canvas.getBoundingClientRect();
			mouse.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
			mouse.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
		};

		const onPointerUp = () => {
			if (dragInfo.current && dragInfo.current.state === "dragging") {
				dragInfo.current.state = "dropping";
				dragInfo.current.velocity.set(0, 0, 0);
				isDragging.current = false;
			}
		};

		const onKeyDown = (e: KeyboardEvent) => {
			const key = e.key.toLowerCase();
			if (["w", "a", "s", "d", "q", "e", "r", "f"].includes(key)) {
				keysPressed.current.add(key);
			}
		};

		const onKeyUp = (e: KeyboardEvent) => {
			keysPressed.current.delete(e.key.toLowerCase());
		};

		window.addEventListener("pointermove", onPointerMove);
		window.addEventListener("pointerup", onPointerUp);
		window.addEventListener("keydown", onKeyDown);
		window.addEventListener("keyup", onKeyUp);

		return () => {
			window.removeEventListener("pointermove", onPointerMove);
			window.removeEventListener("pointerup", onPointerUp);
			window.removeEventListener("keydown", onKeyDown);
			window.removeEventListener("keyup", onKeyUp);
		};
	}, [gl]);

	/** Offset above container bbox bottom to reach the interior floor */
	const CONTAINER_FLOOR_OFFSET = 0.05;
	/** Shrink container XZ bounds inward so objects only land inside the interior */
	const CONTAINER_WALL_INSET = 0.15;

	// Compute world-space bounding boxes for all solid surface objects
	const computeSurfaces = useCallback((): SurfaceBox[] => {
		if (!sceneRef.current) return [];

		sceneRef.current.updateMatrixWorld(true);
		const boxes: SurfaceBox[] = [];

		for (const surfaceDef of solidSurfaceNames) {
			const obj = sceneRef.current.getObjectByName(surfaceDef.name);
			if (!obj) {
				console.warn(`[DragDrop] Surface "${surfaceDef.name}" not found in scene`);
				continue;
			}

			const box = new THREE.Box3();
			// Use boundingChild mesh for bbox if specified, otherwise all children
			const boundsRoot = surfaceDef.boundingChild
				? obj.getObjectByName(surfaceDef.boundingChild) ?? obj
				: obj;
			boundsRoot.traverse((child) => {
				if (child instanceof THREE.Mesh) {
					child.geometry.computeBoundingBox();
					const meshBox = child.geometry.boundingBox!.clone();
					meshBox.applyMatrix4(child.matrixWorld);
					box.union(meshBox);
				}
			});

			if (!box.isEmpty()) {
				const isContainer = surfaceDef.container;
				const inset = surfaceDef.surfaceInset ?? SURFACE_INSET;
				const topY = isContainer
					? box.min.y + CONTAINER_FLOOR_OFFSET
					: box.max.y - inset;
				const xzInset = surfaceDef.xzInset ?? (isContainer ? CONTAINER_WALL_INSET : 0);
				const surface = {
					minX: box.min.x + xzInset,
					maxX: box.max.x - xzInset,
					minZ: box.min.z + xzInset,
					maxZ: box.max.z - xzInset,
					topY,
				};
				console.log(`[DragDrop] Surface "${surfaceDef.name}":`, surface);
				boxes.push(surface);
			}
		}

		return boxes;
	}, [sceneRef, solidSurfaceNames]);

	const onMeshPointerDown = useCallback(
		(name: string, object: THREE.Object3D) => {
			if (!draggableMeshNames.includes(name)) return;

			const originalLocalPosition = object.position.clone();

			const worldPos = new THREE.Vector3();
			object.getWorldPosition(worldPos);
			const depth = camera.position.distanceTo(worldPos);

			// Compute actual world Y from bounding box (vertex positions are baked in glTF)
			object.updateMatrixWorld(true);
			const objBox = new THREE.Box3();
			object.traverse((child) => {
				if (child instanceof THREE.Mesh) {
					child.geometry.computeBoundingBox();
					const meshBox = child.geometry.boundingBox!.clone();
					meshBox.applyMatrix4(child.matrixWorld);
					objBox.union(meshBox);
				}
			});
			// bakedBottomY = the world Y of the bottom when position.y is at its current value
			// So actual bottom world Y at any time = bakedBottomY + (position.y - originalLocalPosition.y)
			const bakedBottomY = objBox.isEmpty() ? 0 : objBox.min.y;

			// Check if the object is currently sitting on a snap target
			let startedSnapped = false;
			if (sceneRef.current && snapTargets.length > 0) {
				for (const snap of snapTargets) {
					if (name !== snap.draggableName) continue;
					const target = sceneRef.current.getObjectByName(snap.targetName);
					if (!target) continue;
					target.updateMatrixWorld(true);
					const targetWorld = new THREE.Vector3();
					target.getWorldPosition(targetWorld);
					if (worldPos.distanceTo(targetWorld) < snap.snapRadius) {
						startedSnapped = true;
						break;
					}
				}
			}

			keyOffset.current.set(0, 0, 0);

			dragInfo.current = {
				name,
				object,
				originalLocalPosition,
				grabNDC: mouse.current.clone(),
				depth,
				velocity: new THREE.Vector3(),
				surfaces: computeSurfaces(),
				bakedBottomY,
				state: "dragging",
				startedSnapped,
				leftSnapRadius: false,
			};
			isDragging.current = true;
			draggingName.current = name;
		},
		[draggableMeshNames, camera, computeSurfaces, sceneRef, snapTargets],
	);

	const onMeshPointerUp = useCallback(() => {
		if (dragInfo.current && dragInfo.current.state === "dragging") {
			dragInfo.current.state = "dropping";
			dragInfo.current.velocity.set(0, 0, 0);
			isDragging.current = false;
		}
	}, []);

	const camRight = useRef(new THREE.Vector3());
	const camUp = useRef(new THREE.Vector3());
	const parentPos = useRef(new THREE.Vector3());

	// Helper: get the parent's world Y fresh each call
	const getParentWorldY = (obj: THREE.Object3D): number => {
		if (!obj.parent) return 0;
		obj.parent.updateMatrixWorld(true);
		obj.parent.getWorldPosition(parentPos.current);
		return parentPos.current.y;
	};

	useFrame((_, delta) => {
		const info = dragInfo.current;
		if (!info || info.state === "idle") return;
		invalidate();

		const dt = Math.min(delta, 0.05);

		if (info.state === "dragging") {
			const dx = mouse.current.x - info.grabNDC.x;
			const dy = mouse.current.y - info.grabNDC.y;

			camRight.current.setFromMatrixColumn(camera.matrixWorld, 0).normalize();
			camUp.current.setFromMatrixColumn(camera.matrixWorld, 1).normalize();
			// Camera forward = negative Z column of the camera's world matrix
			const camForward = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 2).normalize().negate();

			// Accumulate WASD key offset (camera-relative)
			const KEY_SPEED = 3.0;
			const keys = keysPressed.current;
			if (keys.size > 0) {
				if (keys.has("a")) keyOffset.current.addScaledVector(camRight.current, -KEY_SPEED * dt);
				if (keys.has("d")) keyOffset.current.addScaledVector(camRight.current, KEY_SPEED * dt);
				if (keys.has("w")) keyOffset.current.addScaledVector(camUp.current, KEY_SPEED * dt);
				if (keys.has("s")) keyOffset.current.addScaledVector(camUp.current, -KEY_SPEED * dt);
				if (keys.has("q")) keyOffset.current.y += KEY_SPEED * dt;  // up
				if (keys.has("e")) keyOffset.current.y -= KEY_SPEED * dt;  // down
				if (keys.has("r")) keyOffset.current.addScaledVector(camForward, KEY_SPEED * dt);   // forward (into screen)
				if (keys.has("f")) keyOffset.current.addScaledVector(camForward, -KEY_SPEED * dt);  // backward (out of screen)
			}

			const vFov = THREE.MathUtils.degToRad((camera as THREE.PerspectiveCamera).fov);
			const worldPerNDC = Math.tan(vFov / 2) * info.depth;
			const aspect = gl.domElement.clientWidth / gl.domElement.clientHeight;

			const worldDx = dx * worldPerNDC * aspect * DRAG_SCALE;
			const worldDy = dy * worldPerNDC * DRAG_SCALE;

			// Build target in world space, then convert to local
			const origWorld = info.originalLocalPosition.clone();
			if (info.object.parent) {
				info.object.parent.updateMatrixWorld(true);
				info.object.parent.localToWorld(origWorld);
			}
			origWorld.x += camRight.current.x * worldDx + camUp.current.x * worldDy + keyOffset.current.x;
			origWorld.y += camRight.current.y * worldDx + camUp.current.y * worldDy + keyOffset.current.y;
			origWorld.z += camRight.current.z * worldDx + camUp.current.z * worldDy + keyOffset.current.z;

			// Convert back to local space
			if (info.object.parent) {
				info.object.parent.worldToLocal(origWorld);
			}
			targetPos.current.copy(origWorld);

			info.object.position.lerp(targetPos.current, LERP_SPEED);

			// Check for snap targets while dragging — use the cursor's target position
			// (where the object is heading) so the snap feels instant
			if (sceneRef.current && snapTargets.length > 0) {
				// Convert targetPos (local) to world space for distance check
				const cursorWorld = targetPos.current.clone();
				if (info.object.parent) {
					info.object.parent.updateMatrixWorld(true);
					info.object.parent.localToWorld(cursorWorld);
				}

				for (const snap of snapTargets) {
					if (info.name !== snap.draggableName) continue;
					const target = sceneRef.current.getObjectByName(snap.targetName);
					if (!target) continue;

					target.updateMatrixWorld(true);
					const targetWorld = new THREE.Vector3();
					target.getWorldPosition(targetWorld);

					const dist = cursorWorld.distanceTo(targetWorld);

					// Track when object leaves snap radius so it can re-snap later
					if (info.startedSnapped && !info.leftSnapRadius) {
						if (dist >= snap.snapRadius) {
							info.leftSnapRadius = true;
							// Reset rotation to flat now that we've left the tray
							info.object.rotation.set(0, 0, 0);
						}
						continue; // Skip snapping until we've left the radius
					}

					if (dist < snap.snapRadius) {
						targetWorld.y += snap.yOffset ?? 0;
						const snapLocal = targetWorld.clone();
						if (info.object.parent) {
							info.object.parent.updateMatrixWorld(true);
							info.object.parent.worldToLocal(snapLocal);
						}

						// Compute geometry center offset so rotation pivots around center
						const geoCenter = new THREE.Vector3();
						const localBox = new THREE.Box3();
						info.object.traverse((child) => {
							if (child instanceof THREE.Mesh && child.geometry.boundingBox) {
								localBox.expandByObject(child);
							}
						});
						if (!localBox.isEmpty()) {
							localBox.getCenter(geoCenter);
							// Convert to local space relative to object origin
							info.object.worldToLocal(geoCenter);
						}

						// Adjust snap position to compensate for rotation around center
						if (snap.snapRotation) {
							const rot = new THREE.Euler(...snap.snapRotation);
							const rotMatrix = new THREE.Matrix4().makeRotationFromEuler(rot);
							const rotatedCenter = geoCenter.clone().applyMatrix4(rotMatrix);
							const offset = geoCenter.clone().sub(rotatedCenter);
							snapLocal.add(offset);
						}

						info.snapLocalTarget = snapLocal;
						info.geometryCenter = geoCenter;
						info.originalRotation = info.object.rotation.clone();
						info.snapTargetRotation = snap.snapRotation
							? new THREE.Euler(...snap.snapRotation)
							: undefined;
						info.state = "snapping";
						isDragging.current = false;
						break;
					}
				}
			}
		} else if (info.state === "dropping") {
			// Check for snap targets before applying gravity
			if (sceneRef.current && snapTargets.length > 0) {
				for (const snap of snapTargets) {
					if (info.name !== snap.draggableName) continue;
					const target = sceneRef.current.getObjectByName(snap.targetName);
					if (!target) continue;

					target.updateMatrixWorld(true);
					const targetWorld = new THREE.Vector3();
					target.getWorldPosition(targetWorld);

					info.object.updateMatrixWorld(true);
					const objWorld = new THREE.Vector3();
					info.object.getWorldPosition(objWorld);

					if (objWorld.distanceTo(targetWorld) < snap.snapRadius) {
						targetWorld.y += snap.yOffset ?? 0;
						// Convert target world position to object's parent local space
						const snapLocal = targetWorld.clone();
						if (info.object.parent) {
							info.object.parent.updateMatrixWorld(true);
							info.object.parent.worldToLocal(snapLocal);
						}

						// Compute geometry center offset so rotation pivots around center
						const geoCenter = new THREE.Vector3();
						const localBox = new THREE.Box3();
						info.object.traverse((child) => {
							if (child instanceof THREE.Mesh && child.geometry.boundingBox) {
								localBox.expandByObject(child);
							}
						});
						if (!localBox.isEmpty()) {
							localBox.getCenter(geoCenter);
							info.object.worldToLocal(geoCenter);
						}

						// Adjust snap position to compensate for rotation around center
						if (snap.snapRotation) {
							const rot = new THREE.Euler(...snap.snapRotation);
							const rotMatrix = new THREE.Matrix4().makeRotationFromEuler(rot);
							const rotatedCenter = geoCenter.clone().applyMatrix4(rotMatrix);
							const offset = geoCenter.clone().sub(rotatedCenter);
							snapLocal.add(offset);
						}

						info.snapLocalTarget = snapLocal;
						info.geometryCenter = geoCenter;
						info.originalRotation = info.object.rotation.clone();
						info.snapTargetRotation = snap.snapRotation
							? new THREE.Euler(...snap.snapRotation)
							: undefined;
						info.state = "snapping";
						break;
					}
				}
			}

			if (info.state === "dropping") {
				// The object's true world bottom Y = bakedBottomY + (position.y - originalPosition.y)
				const posOffset = info.object.position.y - info.originalLocalPosition.y;
				const prevBottomWorldY = info.bakedBottomY + posOffset;

				// Apply gravity
				info.velocity.y += GRAVITY * dt;
				info.object.position.y += info.velocity.y * dt;

				const newPosOffset = info.object.position.y - info.originalLocalPosition.y;
				const newBottomWorldY = info.bakedBottomY + newPosOffset;

				// Fallback: original position (posOffset = 0, so bottom = bakedBottomY)
				let landBottomWorldY = info.bakedBottomY;

				// Get actual world XZ from bounding box center
				info.object.updateMatrixWorld(true);
				const wp = new THREE.Vector3();
				info.object.getWorldPosition(wp);
				const objBox = new THREE.Box3();
				info.object.traverse((child) => {
					if (child instanceof THREE.Mesh) {
						child.geometry.computeBoundingBox();
						const meshBox = child.geometry.boundingBox!.clone();
						meshBox.applyMatrix4(child.matrixWorld);
						objBox.union(meshBox);
					}
				});
				const wx = (objBox.min.x + objBox.max.x) / 2;
				const wz = (objBox.min.z + objBox.max.z) / 2;

				// Find highest surface the object crosses through this frame
				for (const s of info.surfaces) {
					if (wx >= s.minX && wx <= s.maxX && wz >= s.minZ && wz <= s.maxZ) {
						if (s.topY <= prevBottomWorldY + 0.1 && s.topY >= newBottomWorldY && s.topY > landBottomWorldY) {
							landBottomWorldY = s.topY;
						}
					}
				}

				// Convert landing world Y back to local position offset
				const landLocalY = landBottomWorldY - info.bakedBottomY + info.originalLocalPosition.y;

				if (info.object.position.y <= landLocalY) {
					info.object.position.y = landLocalY;
					if (Math.abs(info.velocity.y) < REST_THRESHOLD) {
						info.state = "idle";
						dragInfo.current = null;
						draggingName.current = null;
					} else {
						info.velocity.y = -info.velocity.y * BOUNCE_DAMPING;
					}
				}
			}
		} else if (info.state === "snapping" && info.snapLocalTarget) {
			// Smoothly lerp into the snap position
			info.object.position.lerp(info.snapLocalTarget, 0.15);

			// Smoothly lerp rotation if a snap rotation is defined
			if (info.snapTargetRotation) {
				const t = 0.15;
				info.object.rotation.x += (info.snapTargetRotation.x - info.object.rotation.x) * t;
				info.object.rotation.y += (info.snapTargetRotation.y - info.object.rotation.y) * t;
				info.object.rotation.z += (info.snapTargetRotation.z - info.object.rotation.z) * t;
			}

			const dist = info.object.position.distanceTo(info.snapLocalTarget);
			if (dist < 0.001) {
				info.object.position.copy(info.snapLocalTarget);
				if (info.snapTargetRotation) {
					info.object.rotation.copy(info.snapTargetRotation);
				}
				info.state = "idle";
				dragInfo.current = null;
				draggingName.current = null;
			}
		}
	});

	return { onMeshPointerDown, onMeshPointerUp, isDragging, draggingName };
}
