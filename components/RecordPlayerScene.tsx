"use client";

import {
	Suspense,
	useRef,
	useState,
	useEffect,
	useCallback,
} from "react";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { Text, Html } from "@react-three/drei";
import { BakedScene } from "./BakedScene";
import * as THREE from "three";
import type { SpotifyTrack } from "@/lib/types";
import { MonitorScreenContent, type PlaylistDetails } from "./MonitorScreen";

// Component to handle WebGL context cleanup on unmount
function WebGLCleanup() {
	const { gl } = useThree();

	useEffect(() => {
		return () => {
			// Only dispose, don't force context loss as it can cause issues during hot reload
			gl.dispose();
		};
	}, [gl]);

	return null;
}

interface VinylRecordProps {
	albumArt: string | null;
	isPlaying: boolean;
}

function VinylRecordWithTexture({ albumArt, isPlaying }: VinylRecordProps) {
	const discRef = useRef<THREE.Group>(null);
	const materialRef = useRef<THREE.MeshStandardMaterial>(null);

	const texture = useLoader(
		THREE.TextureLoader,
		albumArt!,
		undefined,
		() => {},
	);

	useEffect(() => {
		if (texture && albumArt) {
			texture.colorSpace = THREE.SRGBColorSpace;
			texture.needsUpdate = true;
			if (materialRef.current) {
				materialRef.current.needsUpdate = true;
			}
		}
	}, [texture, albumArt]);

	useFrame((_, delta) => {
		if (discRef.current && isPlaying) {
			discRef.current.rotation.y += delta * 0.8;
		}
	});

	const vinylRadius = 0.14;
	const labelRadius = 0.065; // Bigger center label
	const thickness = 0.003;
	const labelY = thickness / 2 + 0.0005;

	return (
		<group ref={discRef} position={[0, 0.003, 0]}>
			{/* Main vinyl disc */}
			<mesh>
				<cylinderGeometry args={[vinylRadius, vinylRadius, thickness, 64]} />
				<meshStandardMaterial color="#111111" metalness={0.4} roughness={0.3} />
			</mesh>

			{/* Vinyl grooves - subtle concentric rings */}
			{Array.from({ length: 12 }).map((_, i) => {
				const radius =
					labelRadius + 0.008 + i * ((vinylRadius - labelRadius - 0.015) / 12);
				return (
					<mesh
						key={i}
						position={[0, thickness / 2 + 0.0001, 0]}
						rotation={[-Math.PI / 2, 0, 0]}
					>
						<ringGeometry args={[radius - 0.001, radius, 64]} />
						<meshStandardMaterial
							color="#0a0a0a"
							metalness={0.5}
							roughness={0.4}
							transparent
							opacity={0.6}
						/>
					</mesh>
				);
			})}

			{/* Vinyl sheen highlight */}
			<mesh
				position={[0, thickness / 2 + 0.0002, 0]}
				rotation={[-Math.PI / 2, 0, 0]}
			>
				<ringGeometry
					args={[
						labelRadius + 0.01,
						vinylRadius - 0.005,
						64,
						1,
						0.5,
						Math.PI / 4,
					]}
				/>
				<meshStandardMaterial
					color="#ffffff"
					transparent
					opacity={0.06}
					metalness={1}
					roughness={0}
				/>
			</mesh>

			{/* Center label with album art */}
			<mesh position={[0, labelY, 0]} rotation={[-Math.PI / 2, 0, 0]}>
				<circleGeometry args={[labelRadius, 64]} />
				<meshStandardMaterial
					ref={materialRef}
					map={albumArt ? texture : null}
					color={albumArt ? "#ffffff" : "#1a1a1a"}
					metalness={0.1}
					roughness={0.7}
				/>
			</mesh>

			{/* Center spindle hole */}
			<mesh
				position={[0, thickness / 2 + 0.0006, 0]}
				rotation={[-Math.PI / 2, 0, 0]}
			>
				<circleGeometry args={[0.003, 32]} />
				<meshStandardMaterial color="#050505" metalness={0.9} roughness={0.1} />
			</mesh>

			{/* Back side of vinyl */}
			<mesh
				position={[0, -thickness / 2 - 0.0001, 0]}
				rotation={[Math.PI / 2, 0, 0]}
			>
				<circleGeometry args={[vinylRadius, 64]} />
				<meshStandardMaterial color="#111111" metalness={0.4} roughness={0.3} />
			</mesh>
		</group>
	);
}

function VinylRecordDefault({ isPlaying }: { isPlaying: boolean }) {
	const discRef = useRef<THREE.Group>(null);

	useFrame((_, delta) => {
		if (discRef.current && isPlaying) {
			discRef.current.rotation.y += delta * 0.8;
		}
	});

	const vinylRadius = 0.14;
	const labelRadius = 0.065;
	const thickness = 0.003;
	const labelY = thickness / 2 + 0.0005;

	return (
		<group ref={discRef} position={[0, 0.003, 0]}>
			{/* Main vinyl disc */}
			<mesh>
				<cylinderGeometry args={[vinylRadius, vinylRadius, thickness, 64]} />
				<meshStandardMaterial color="#111111" metalness={0.4} roughness={0.3} />
			</mesh>

			{/* Vinyl grooves */}
			{Array.from({ length: 12 }).map((_, i) => {
				const radius =
					labelRadius + 0.008 + i * ((vinylRadius - labelRadius - 0.015) / 12);
				return (
					<mesh
						key={i}
						position={[0, thickness / 2 + 0.0001, 0]}
						rotation={[-Math.PI / 2, 0, 0]}
					>
						<ringGeometry args={[radius - 0.001, radius, 64]} />
						<meshStandardMaterial
							color="#0a0a0a"
							metalness={0.5}
							roughness={0.4}
							transparent
							opacity={0.6}
						/>
					</mesh>
				);
			})}

			{/* Center label - default dark */}
			<mesh position={[0, labelY, 0]} rotation={[-Math.PI / 2, 0, 0]}>
				<circleGeometry args={[labelRadius, 64]} />
				<meshStandardMaterial color="#1a1a1a" metalness={0.1} roughness={0.7} />
			</mesh>

			{/* Center spindle hole */}
			<mesh
				position={[0, thickness / 2 + 0.0006, 0]}
				rotation={[-Math.PI / 2, 0, 0]}
			>
				<circleGeometry args={[0.003, 32]} />
				<meshStandardMaterial color="#050505" metalness={0.9} roughness={0.1} />
			</mesh>

			{/* Back side of vinyl */}
			<mesh
				position={[0, -thickness / 2 - 0.0001, 0]}
				rotation={[Math.PI / 2, 0, 0]}
			>
				<circleGeometry args={[vinylRadius, 64]} />
				<meshStandardMaterial color="#111111" metalness={0.4} roughness={0.3} />
			</mesh>
		</group>
	);
}

function VinylRecord({ albumArt, isPlaying }: VinylRecordProps) {
	if (!albumArt) {
		return <VinylRecordDefault isPlaying={isPlaying} />;
	}
	return (
		<Suspense
			key={albumArt}
			fallback={<VinylRecordDefault isPlaying={isPlaying} />}
		>
			<VinylRecordWithTexture
				key={albumArt}
				albumArt={albumArt}
				isPlaying={isPlaying}
			/>
		</Suspense>
	);
}

// Tonearm/Needle component - simplified
function Tonearm({ isPlaying }: { isPlaying: boolean }) {
	const armRef = useRef<THREE.Group>(null);
	const targetRotation = useRef(isPlaying ? 0.35 : -0.15);

	useFrame(() => {
		if (armRef.current) {
			const target = isPlaying ? 0.35 : -0.15;
			targetRotation.current = THREE.MathUtils.lerp(
				targetRotation.current,
				target,
				0.05,
			);
			armRef.current.rotation.y = targetRotation.current;
		}
	});

	return (
		<group position={[0.07, 0.01, -0.1]}>
			{/* Tonearm base/pivot - simple cylinder */}
			<mesh>
				<cylinderGeometry args={[0.012, 0.012, 0.015, 32]} />
				<meshStandardMaterial color="#2a2a2a" metalness={0.7} roughness={0.3} />
			</mesh>

			{/* Rotating arm assembly */}
			<group ref={armRef} position={[0, 0.01, 0]}>
				{/* Horizontal arm */}
				<group position={[0, 0.005, 0]}>
					{/* Main arm tube */}
					<mesh position={[-0.06, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
						<cylinderGeometry args={[0.003, 0.003, 0.12, 16]} />
						<meshStandardMaterial
							color="#333333"
							metalness={0.8}
							roughness={0.2}
						/>
					</mesh>

					{/* Counterweight */}
					<mesh position={[0.025, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
						<cylinderGeometry args={[0.008, 0.008, 0.015, 24]} />
						<meshStandardMaterial
							color="#1a1a1a"
							metalness={0.6}
							roughness={0.4}
						/>
					</mesh>

					{/* Headshell */}
					<group position={[-0.115, -0.003, 0]}>
						<mesh>
							<boxGeometry args={[0.02, 0.006, 0.01]} />
							<meshStandardMaterial
								color="#222222"
								metalness={0.6}
								roughness={0.4}
							/>
						</mesh>
						{/* Cartridge */}
						<mesh position={[0.003, -0.005, 0]}>
							<boxGeometry args={[0.012, 0.006, 0.006]} />
							<meshStandardMaterial
								color="#1a1a1a"
								metalness={0.5}
								roughness={0.5}
							/>
						</mesh>
						{/* Stylus/Needle */}
						<mesh position={[-0.004, -0.01, 0]} rotation={[0, 0, 0.2]}>
							<coneGeometry args={[0.001, 0.008, 8]} />
							<meshStandardMaterial
								color="#888888"
								metalness={0.9}
								roughness={0.1}
							/>
						</mesh>
					</group>
				</group>
			</group>
		</group>
	);
}

// Square push button with proper icons - for front panel
interface ClassicButtonProps {
	position: [number, number, number];
	onClick: () => void;
	buttonColor: string;
	hoverColor?: string;
	icon: "prev" | "play" | "next";
	iconColor?: string;
}

function ClassicButton({
	position,
	onClick,
	buttonColor,
	hoverColor,
	icon,
	iconColor = "#888888",
}: ClassicButtonProps) {
	const [isPressed, setIsPressed] = useState(false);
	const [isHovered, setIsHovered] = useState(false);
	const buttonRef = useRef<THREE.Group>(null);
	const targetZ = useRef(0);

	const buttonSize = 0.022; // Bigger buttons
	const buttonDepth = 0.006;

	useFrame(() => {
		if (buttonRef.current) {
			const target = isPressed ? -0.003 : 0;
			targetZ.current = THREE.MathUtils.lerp(targetZ.current, target, 0.3);
			buttonRef.current.position.z = targetZ.current;
		}
	});

	const handlePointerDown = () => setIsPressed(true);
	const handlePointerUp = () => {
		setIsPressed(false);
		onClick();
	};

	const currentColor = isHovered ? hoverColor || "#555555" : buttonColor;

	return (
		<group position={position}>
			{/* Button housing/recess - square */}
			<mesh position={[0, 0, -0.002]}>
				<boxGeometry args={[buttonSize + 0.004, buttonSize + 0.004, 0.006]} />
				<meshStandardMaterial color="#0a0a0a" metalness={0.2} roughness={0.9} />
			</mesh>

			{/* Button cap - square and protruding */}
			<group ref={buttonRef}>
				<mesh
					onPointerDown={handlePointerDown}
					onPointerUp={handlePointerUp}
					onPointerLeave={() => {
						setIsPressed(false);
						setIsHovered(false);
					}}
					onPointerEnter={() => setIsHovered(true)}
					position={[0, 0, buttonDepth / 2]}
				>
					<boxGeometry args={[buttonSize, buttonSize, buttonDepth]} />
					<meshStandardMaterial
						color={currentColor}
						metalness={0.5}
						roughness={0.4}
					/>
				</mesh>

				{/* Icon on button front face - flat triangles flush with button */}
				{icon === "prev" && (
					<group position={[0, 0, buttonDepth + 0.0005]}>
						{/* Two left-pointing flat triangles for skip back */}
						<mesh position={[0.003, 0, 0]} rotation={[0, 0, Math.PI]}>
							<circleGeometry args={[0.006, 3]} />
							<meshBasicMaterial color={iconColor} side={THREE.DoubleSide} />
						</mesh>
						<mesh position={[-0.003, 0, 0]} rotation={[0, 0, Math.PI]}>
							<circleGeometry args={[0.006, 3]} />
							<meshBasicMaterial color={iconColor} side={THREE.DoubleSide} />
						</mesh>
					</group>
				)}
				{icon === "play" && (
					<group position={[0, 0, buttonDepth + 0.0005]}>
						{/* Play triangle pointing right - flat */}
						<mesh position={[0.001, 0, 0]} rotation={[0, 0, 0]}>
							<circleGeometry args={[0.007, 3]} />
							<meshBasicMaterial color={iconColor} side={THREE.DoubleSide} />
						</mesh>
					</group>
				)}
				{icon === "next" && (
					<group position={[0, 0, buttonDepth + 0.0005]}>
						{/* Two right-pointing flat triangles for skip forward */}
						<mesh position={[-0.003, 0, 0]} rotation={[0, 0, 0]}>
							<circleGeometry args={[0.006, 3]} />
							<meshBasicMaterial color={iconColor} side={THREE.DoubleSide} />
						</mesh>
						<mesh position={[0.003, 0, 0]} rotation={[0, 0, 0]}>
							<circleGeometry args={[0.006, 3]} />
							<meshBasicMaterial color={iconColor} side={THREE.DoubleSide} />
						</mesh>
					</group>
				)}
			</group>
		</group>
	);
}

// Screen display widget - embedded in front of base with glass
interface ScreenWidgetProps {
	albumArt: string | null;
	progress: number;
	duration: number;
	isPlaying: boolean;
	baseSize?: number;
	trackName?: string | null;
	artistName?: string | null;
}

function ScreenWidgetWithArt({
	albumArt,
	progress,
	duration,
	isPlaying,
	baseSize = 0.38,
	trackName,
	artistName,
}: ScreenWidgetProps & { albumArt: string }) {
	const texture = useLoader(THREE.TextureLoader, albumArt, undefined, () => {});

	useEffect(() => {
		if (texture) {
			texture.colorSpace = THREE.SRGBColorSpace;
			texture.needsUpdate = true;
		}
	}, [texture]);

	return (
		<ScreenWidgetBase
			texture={texture}
			progress={progress}
			duration={duration}
			isPlaying={isPlaying}
			baseSize={baseSize}
			trackName={trackName}
			artistName={artistName}
		/>
	);
}

function ScreenWidgetBase({
	texture,
	progress,
	duration,
	isPlaying,
	baseSize = 0.38,
	trackName,
	artistName,
}: {
	texture?: THREE.Texture | null;
	progress: number;
	duration: number;
	isPlaying: boolean;
	baseSize?: number;
	trackName?: string | null;
	artistName?: string | null;
}) {
	const progressPercent = duration > 0 ? progress / duration : 0;

	// Format time for display
	const formatTime = (ms: number) => {
		const totalSec = Math.floor(ms / 1000);
		const min = Math.floor(totalSec / 60);
		const sec = totalSec % 60;
		return `${min}:${sec.toString().padStart(2, "0")}`;
	};

	// Screen dimensions
	const screenWidth = 0.12;
	const screenHeight = 0.045;

	// Position flush left on front panel
	const screenX = -baseSize / 2 + screenWidth / 2 + 0.015;

	// Truncate long text
	const displayTrack = trackName
		? trackName.length > 15
			? trackName.slice(0, 14) + "…"
			: trackName
		: "No Track";
	const displayArtist = artistName
		? artistName.length > 18
			? artistName.slice(0, 17) + "…"
			: artistName
		: "";

	return (
		<group position={[screenX, 0.035, baseSize / 2]}>
			{/* Outer bezel/frame - recessed into the panel */}
			<mesh position={[0, 0, -0.003]}>
				<boxGeometry args={[screenWidth + 0.01, screenHeight + 0.01, 0.006]} />
				<meshStandardMaterial color="#050505" metalness={0.3} roughness={0.8} />
			</mesh>

			{/* Screen display surface - dark background */}
			<mesh position={[0, 0, 0.001]} renderOrder={1}>
				<planeGeometry args={[screenWidth, screenHeight]} />
				<meshBasicMaterial color="#080808" />
			</mesh>

			{/* Album art on the left */}
			<mesh position={[-0.035, 0, 0.002]} renderOrder={2}>
				<planeGeometry args={[0.032, 0.032]} />
				{texture ? (
					<meshBasicMaterial map={texture} />
				) : (
					<meshBasicMaterial color="#151515" />
				)}
			</mesh>

			{/* Track name text - smaller */}
			<Text
				position={[0.02, 0.008, 0.003]}
				fontSize={0.006}
				color="#dddddd"
				anchorX="center"
				anchorY="middle"
				maxWidth={0.058}
				renderOrder={3}
			>
				{displayTrack}
			</Text>

			{/* Artist name text - smaller */}
			<Text
				position={[0.02, -0.002, 0.003]}
				fontSize={0.0045}
				color="#777777"
				anchorX="center"
				anchorY="middle"
				maxWidth={0.058}
				renderOrder={3}
			>
				{displayArtist}
			</Text>

			{/* Progress bar background */}
			<mesh position={[0.02, -0.012, 0.002]} renderOrder={2}>
				<planeGeometry args={[0.052, 0.003]} />
				<meshBasicMaterial color="#222222" />
			</mesh>

			{/* Progress bar fill */}
			{progressPercent > 0 && (
				<mesh
					position={[
						0.02 - 0.026 + (progressPercent * 0.052) / 2,
						-0.012,
						0.0025,
					]}
					renderOrder={3}
				>
					<planeGeometry
						args={[Math.max(0.001, progressPercent * 0.052), 0.002]}
					/>
					<meshBasicMaterial color="#1db954" />
				</mesh>
			)}

			{/* Time display - smaller */}
			<Text
				position={[0.02, -0.017, 0.003]}
				fontSize={0.003}
				color="#555555"
				anchorX="center"
				anchorY="middle"
				renderOrder={3}
			>
				{formatTime(progress)} / {formatTime(duration)}
			</Text>

			{/* Playing indicator dot */}
			{isPlaying && (
				<mesh position={[0.05, 0.014, 0.002]} renderOrder={2}>
					<circleGeometry args={[0.0025, 16]} />
					<meshBasicMaterial color="#1db954" />
				</mesh>
			)}

			{/* Glass cover - flush with front, creates embedded look */}
			<mesh position={[0, 0, 0.004]} renderOrder={4}>
				<planeGeometry args={[screenWidth + 0.004, screenHeight + 0.004]} />
				<meshPhysicalMaterial
					color="#ffffff"
					transparent
					opacity={0.12}
					metalness={0.9}
					roughness={0.1}
					depthWrite={false}
				/>
			</mesh>
		</group>
	);
}

function ScreenWidgetDefault({
	progress,
	duration,
	isPlaying,
	baseSize = 0.38,
	trackName,
	artistName,
}: Omit<ScreenWidgetProps, "albumArt">) {
	const progressPercent = duration > 0 ? progress / duration : 0;

	const formatTime = (ms: number) => {
		const totalSec = Math.floor(ms / 1000);
		const min = Math.floor(totalSec / 60);
		const sec = totalSec % 60;
		return `${min}:${sec.toString().padStart(2, "0")}`;
	};

	const screenWidth = 0.12;
	const screenHeight = 0.045;
	const screenX = -baseSize / 2 + screenWidth / 2 + 0.015;

	const displayTrack = trackName
		? trackName.length > 15
			? trackName.slice(0, 14) + "…"
			: trackName
		: "No Track";
	const displayArtist = artistName
		? artistName.length > 18
			? artistName.slice(0, 17) + "…"
			: artistName
		: "";

	return (
		<group position={[screenX, 0.035, baseSize / 2]}>
			<mesh position={[0, 0, -0.003]}>
				<boxGeometry args={[screenWidth + 0.01, screenHeight + 0.01, 0.006]} />
				<meshStandardMaterial color="#050505" metalness={0.3} roughness={0.8} />
			</mesh>

			<mesh position={[0, 0, 0.001]} renderOrder={1}>
				<planeGeometry args={[screenWidth, screenHeight]} />
				<meshBasicMaterial color="#080808" />
			</mesh>

			<mesh position={[-0.035, 0, 0.002]} renderOrder={2}>
				<planeGeometry args={[0.032, 0.032]} />
				<meshBasicMaterial color="#1a1a1a" />
			</mesh>

			<Text
				position={[0.02, 0.008, 0.003]}
				fontSize={0.006}
				color="#dddddd"
				anchorX="center"
				anchorY="middle"
				maxWidth={0.058}
				renderOrder={3}
			>
				{displayTrack}
			</Text>

			<Text
				position={[0.02, -0.002, 0.003]}
				fontSize={0.0045}
				color="#777777"
				anchorX="center"
				anchorY="middle"
				maxWidth={0.058}
				renderOrder={3}
			>
				{displayArtist}
			</Text>

			<mesh position={[0.02, -0.012, 0.002]} renderOrder={2}>
				<planeGeometry args={[0.052, 0.003]} />
				<meshBasicMaterial color="#222222" />
			</mesh>

			{progressPercent > 0 && (
				<mesh
					position={[
						0.02 - 0.026 + (progressPercent * 0.052) / 2,
						-0.012,
						0.0025,
					]}
					renderOrder={3}
				>
					<planeGeometry
						args={[Math.max(0.001, progressPercent * 0.052), 0.002]}
					/>
					<meshBasicMaterial color="#1db954" />
				</mesh>
			)}

			<Text
				position={[0.02, -0.017, 0.003]}
				fontSize={0.003}
				color="#555555"
				anchorX="center"
				anchorY="middle"
				renderOrder={3}
			>
				{formatTime(progress)} / {formatTime(duration)}
			</Text>

			{isPlaying && (
				<mesh position={[0.05, 0.014, 0.002]} renderOrder={2}>
					<circleGeometry args={[0.0025, 16]} />
					<meshBasicMaterial color="#1db954" />
				</mesh>
			)}

			<mesh position={[0, 0, 0.004]} renderOrder={4}>
				<planeGeometry args={[screenWidth + 0.004, screenHeight + 0.004]} />
				<meshPhysicalMaterial
					color="#ffffff"
					transparent
					opacity={0.12}
					metalness={0.9}
					roughness={0.1}
					depthWrite={false}
				/>
			</mesh>
		</group>
	);
}

function ScreenWidget(props: ScreenWidgetProps) {
	if (props.albumArt) {
		return (
			<Suspense fallback={<ScreenWidgetBase {...props} texture={null} />}>
				<ScreenWidgetWithArt {...props} albumArt={props.albumArt} />
			</Suspense>
		);
	}
	return <ScreenWidgetBase {...props} texture={null} />;
}

// Glass lid for the turntable
interface GlassLidProps {
	isOpen?: boolean;
	baseWidth?: number;
	baseDepth?: number;
	baseHeight?: number;
}

function GlassLid({
	isOpen = false,
	baseWidth = 0.38,
	baseDepth = 0.38,
	baseHeight = 0.07,
}: GlassLidProps) {
	const lidRef = useRef<THREE.Group>(null);
	const targetRotation = useRef(isOpen ? -Math.PI / 3 : 0);

	useFrame(() => {
		if (lidRef.current) {
			const target = isOpen ? -Math.PI / 3 : -0.05;
			targetRotation.current = THREE.MathUtils.lerp(
				targetRotation.current,
				target,
				0.05,
			);
			lidRef.current.rotation.x = targetRotation.current;
		}
	});

	const lidWidth = baseWidth - 0.02;
	const lidDepth = baseDepth - 0.06;
	const lidHeight = 0.045;

	return (
		<group position={[0, baseHeight, -baseDepth / 2 + 0.015]}>
			<group ref={lidRef}>
				{/* Main glass panel - top */}
				<mesh position={[0, lidHeight, lidDepth / 2]}>
					<boxGeometry args={[lidWidth, 0.002, lidDepth]} />
					<meshStandardMaterial
						color="#ffffff"
						transparent
						opacity={0.12}
						metalness={0.9}
						roughness={0.05}
					/>
				</mesh>

				{/* Glass lid frame - back */}
				<mesh position={[0, lidHeight, 0.002]}>
					<boxGeometry args={[lidWidth, 0.004, 0.004]} />
					<meshStandardMaterial
						color="#2a2a2a"
						metalness={0.5}
						roughness={0.5}
					/>
				</mesh>

				{/* Glass lid frame - front */}
				<mesh position={[0, lidHeight, lidDepth - 0.002]}>
					<boxGeometry args={[lidWidth, 0.004, 0.004]} />
					<meshStandardMaterial
						color="#2a2a2a"
						metalness={0.5}
						roughness={0.5}
					/>
				</mesh>

				{/* Glass lid frame - left */}
				<mesh position={[-lidWidth / 2 + 0.002, lidHeight, lidDepth / 2]}>
					<boxGeometry args={[0.004, 0.004, lidDepth]} />
					<meshStandardMaterial
						color="#2a2a2a"
						metalness={0.5}
						roughness={0.5}
					/>
				</mesh>

				{/* Glass lid frame - right */}
				<mesh position={[lidWidth / 2 - 0.002, lidHeight, lidDepth / 2]}>
					<boxGeometry args={[0.004, 0.004, lidDepth]} />
					<meshStandardMaterial
						color="#2a2a2a"
						metalness={0.5}
						roughness={0.5}
					/>
				</mesh>

				{/* Side panels - left */}
				<mesh position={[-lidWidth / 2, lidHeight / 2, lidDepth / 2]}>
					<boxGeometry args={[0.002, lidHeight, lidDepth]} />
					<meshStandardMaterial
						color="#ffffff"
						transparent
						opacity={0.08}
						metalness={0.9}
						roughness={0.05}
					/>
				</mesh>

				{/* Side panels - right */}
				<mesh position={[lidWidth / 2, lidHeight / 2, lidDepth / 2]}>
					<boxGeometry args={[0.002, lidHeight, lidDepth]} />
					<meshStandardMaterial
						color="#ffffff"
						transparent
						opacity={0.08}
						metalness={0.9}
						roughness={0.05}
					/>
				</mesh>

				{/* Front panel */}
				<mesh position={[0, lidHeight / 2, lidDepth]}>
					<boxGeometry args={[lidWidth, lidHeight, 0.002]} />
					<meshStandardMaterial
						color="#ffffff"
						transparent
						opacity={0.08}
						metalness={0.9}
						roughness={0.05}
					/>
				</mesh>

				{/* Connecting bars from hinge to lid - left */}
				<mesh position={[-0.1, lidHeight / 2, 0.01]}>
					<boxGeometry args={[0.004, lidHeight, 0.004]} />
					<meshStandardMaterial
						color="#2a2a2a"
						metalness={0.5}
						roughness={0.5}
					/>
				</mesh>

				{/* Connecting bars from hinge to lid - right */}
				<mesh position={[0.1, lidHeight / 2, 0.01]}>
					<boxGeometry args={[0.004, lidHeight, 0.004]} />
					<meshStandardMaterial
						color="#2a2a2a"
						metalness={0.5}
						roughness={0.5}
					/>
				</mesh>
			</group>

			{/* Hinges */}
			<group position={[-0.1, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
				<mesh>
					<cylinderGeometry args={[0.004, 0.004, 0.012, 12]} />
					<meshStandardMaterial
						color="#333333"
						metalness={0.7}
						roughness={0.3}
					/>
				</mesh>
			</group>
			<group position={[0.1, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
				<mesh>
					<cylinderGeometry args={[0.004, 0.004, 0.012, 12]} />
					<meshStandardMaterial
						color="#333333"
						metalness={0.7}
						roughness={0.3}
					/>
				</mesh>
			</group>
		</group>
	);
}

interface TurntableProps {
	isPlaying: boolean;
	onPlayPause: () => void;
	onSkipNext: () => void;
	onSkipPrevious: () => void;
	albumArt: string | null;
	progress: number;
	duration: number;
	trackName?: string | null;
	artistName?: string | null;
}

function Turntable({
	isPlaying,
	onPlayPause,
	onSkipNext,
	onSkipPrevious,
	albumArt,
	progress,
	duration,
	trackName,
	artistName,
}: TurntableProps) {
	// Base dimensions - square top platform
	const baseSize = 0.38; // Square
	const baseHeight = 0.07;
	const discZOffset = 0.03; // Move disc closer to front

	return (
		<group>
			{/* Main turntable body/base - square */}
			<mesh position={[0, baseHeight / 2, 0]}>
				<boxGeometry args={[baseSize, baseHeight, baseSize]} />
				<meshStandardMaterial color="#1a1a1a" metalness={0.3} roughness={0.7} />
			</mesh>

			{/* Top surface detail */}
			<mesh position={[0, baseHeight + 0.001, 0]}>
				<boxGeometry args={[baseSize - 0.01, 0.002, baseSize - 0.01]} />
				<meshStandardMaterial color="#222222" metalness={0.2} roughness={0.8} />
			</mesh>

			{/* Platter base/motor housing - moved forward */}
			<mesh position={[0, baseHeight + 0.004, discZOffset]}>
				<cylinderGeometry args={[0.15, 0.15, 0.006, 64]} />
				<meshStandardMaterial color="#1a1a1a" metalness={0.4} roughness={0.6} />
			</mesh>

			{/* Platter */}
			<mesh position={[0, baseHeight + 0.008, discZOffset]}>
				<cylinderGeometry args={[0.155, 0.155, 0.005, 64]} />
				<meshStandardMaterial color="#2a2a2a" metalness={0.5} roughness={0.4} />
			</mesh>

			{/* Platter mat */}
			<mesh position={[0, baseHeight + 0.011, discZOffset]}>
				<cylinderGeometry args={[0.15, 0.15, 0.002, 64]} />
				<meshStandardMaterial color="#1a1a1a" metalness={0.1} roughness={0.9} />
			</mesh>

			{/* Spindle */}
			<mesh position={[0, baseHeight + 0.019, discZOffset]}>
				<cylinderGeometry args={[0.003, 0.003, 0.015, 16]} />
				<meshStandardMaterial color="#666666" metalness={0.9} roughness={0.1} />
			</mesh>

			{/* Tonearm - moved left to be on platform */}
			<group position={[0.06, baseHeight, discZOffset]}>
				<Tonearm isPlaying={isPlaying} />
			</group>

			{/* Power LED on top of platform - near front right */}
			<mesh
				position={[
					baseSize / 2 - 0.025,
					baseHeight + 0.003,
					baseSize / 2 - 0.025,
				]}
			>
				<cylinderGeometry args={[0.004, 0.004, 0.003, 12]} />
				<meshStandardMaterial
					color={isPlaying ? "#1db954" : "#333333"}
					emissive={isPlaying ? "#1db954" : "#000000"}
					emissiveIntensity={isPlaying ? 1 : 0}
				/>
			</mesh>

			{/* Front panel - control section */}
			<mesh position={[0, baseHeight / 2, baseSize / 2 - 0.001]}>
				<boxGeometry args={[baseSize - 0.01, baseHeight - 0.01, 0.002]} />
				<meshStandardMaterial color="#1e1e1e" metalness={0.4} roughness={0.6} />
			</mesh>

			{/* Screen widget on front of base - flush left */}
			<ScreenWidget
				albumArt={albumArt}
				progress={progress}
				duration={duration}
				isPlaying={isPlaying}
				baseSize={baseSize}
				trackName={trackName}
				artistName={artistName}
			/>

			{/* Control buttons on front of base - right side, bigger spacing */}
			<group position={[0.09, 0.035, baseSize / 2 + 0.001]}>
				<ClassicButton
					position={[-0.038, 0, 0]}
					onClick={onSkipPrevious}
					buttonColor="#3a3a3a"
					hoverColor="#4a4a4a"
					icon="prev"
					iconColor="#888888"
				/>
				<ClassicButton
					position={[0, 0, 0]}
					onClick={onPlayPause}
					buttonColor={isPlaying ? "#1db954" : "#3a3a3a"}
					hoverColor={isPlaying ? "#1ed760" : "#4a4a4a"}
					icon="play"
					iconColor={isPlaying ? "#ffffff" : "#888888"}
				/>
				<ClassicButton
					position={[0.038, 0, 0]}
					onClick={onSkipNext}
					buttonColor="#3a3a3a"
					hoverColor="#4a4a4a"
					icon="next"
					iconColor="#888888"
				/>
			</group>

			{/* Glass lid - connected to base properly */}
			<GlassLid
				isOpen={true}
				baseWidth={baseSize}
				baseDepth={baseSize}
				baseHeight={baseHeight}
			/>

			{/* Feet - repositioned for square base */}
			{[
				[-0.16, -0.16],
				[0.16, -0.16],
				[-0.16, 0.16],
				[0.16, 0.16],
			].map(([x, z], i) => (
				<mesh key={i} position={[x, -0.003, z]}>
					<cylinderGeometry args={[0.012, 0.015, 0.01, 16]} />
					<meshStandardMaterial
						color="#1a1a1a"
						metalness={0.3}
						roughness={0.8}
					/>
				</mesh>
			))}
		</group>
	);
}

function Table() {
	return (
		<group position={[0, -0.3, 0]}>
			<mesh position={[0, 0.28, 0]}>
				<boxGeometry args={[1.4, 0.035, 0.6]} />
				<meshStandardMaterial color="#2a1810" metalness={0.1} roughness={0.8} />
			</mesh>

			{[
				[-0.6, -0.22],
				[0.6, -0.22],
				[-0.6, 0.22],
				[0.6, 0.22],
			].map(([x, z], i) => (
				<mesh key={i} position={[x, 0.13, z]}>
					<cylinderGeometry args={[0.025, 0.025, 0.26, 16]} />
					<meshStandardMaterial
						color="#2a1810"
						metalness={0.1}
						roughness={0.8}
					/>
				</mesh>
			))}
		</group>
	);
}


// Desktop Monitor component
interface MonitorProps {
	onClick: () => void;
	isHovered: boolean;
	onHover: (hovered: boolean) => void;
	isFocused: boolean;
	onNavigate: (path: string) => void;
	searchTracks: (query: string) => Promise<SpotifyTrack[]>;
	createPlaylist: (name: string, tracks: SpotifyTrack[], description?: string) => Promise<string>;
	getPlaylists: () => Promise<{ items: PlaylistDetails[] }>;
	playPlaylistById: (playlistId: string) => Promise<void>;
	onPlaylistSelect: (playlistId: string, playlistName: string) => void;
	getPlaylistTracks: (playlistId: string) => Promise<SpotifyTrack[]>;
	playTrackInPlaylist: (playlistUri: string, trackUri: string) => Promise<void>;
	currentTrackName?: string | null;
	currentArtistName?: string | null;
	currentAlbumArt?: string | null;
	isPlaying?: boolean;
	onPlayPause?: () => void;
	onSkipNext?: () => void;
	onSkipPrevious?: () => void;
	onLikeTrack?: () => Promise<void>;
	isLiked?: boolean;
	isReceiverMode?: boolean;
	receiverPlaylistName?: string | null;
	receiverPlaylistTracks?: SpotifyTrack[];
	receiverPlaylistId?: string | null;
	receiverPlaylistImage?: string | null;
	isCurrentTrackInPlaylist?: boolean;
}

function Monitor({
	onClick,
	isHovered,
	onHover,
	isFocused,
	onNavigate,
	searchTracks,
	createPlaylist,
	getPlaylists,
	playPlaylistById,
	onPlaylistSelect,
	getPlaylistTracks,
	playTrackInPlaylist,
	currentTrackName,
	currentArtistName,
	currentAlbumArt,
	isPlaying,
	onPlayPause,
	onSkipNext,
	onSkipPrevious,
	onLikeTrack,
	isLiked,
	isReceiverMode,
	receiverPlaylistName,
	receiverPlaylistTracks,
	receiverPlaylistId,
	receiverPlaylistImage,
	isCurrentTrackInPlaylist,
}: MonitorProps) {
	// Monitor dimensions
	const screenWidth = 0.48;
	const screenHeight = 0.3;
	const bezelWidth = 0.008; // Very thin bezel trim
	const frameDepth = 0.01;
	const standHeight = 0.05;
	const standBaseWidth = 0.12;
	const standBaseDepth = 0.07;

	return (
		<group
			position={[-0.28, 0.004, -0.05]}
			rotation={[0, 0.2, 0]} // Angled toward center of desk
		>
			{/* Monitor Stand Base */}
			<mesh position={[0, 0.004, 0]}>
				<boxGeometry args={[standBaseWidth, 0.008, standBaseDepth]} />
				<meshStandardMaterial color="#1a1a1a" metalness={0.7} roughness={0.3} />
			</mesh>

			{/* Monitor Stand Neck */}
			<mesh position={[0, standHeight / 2 + 0.008, -0.01]}>
				<boxGeometry args={[0.02, standHeight, 0.015]} />
				<meshStandardMaterial color="#1a1a1a" metalness={0.7} roughness={0.3} />
			</mesh>

			{/* Monitor Frame */}
			<group
				position={[
					0,
					standHeight + 0.008 + screenHeight / 2 + bezelWidth,
					-0.02,
				]}
			>
				{/* Thin bezel frame around screen */}
				{/* Top bezel */}
				<mesh position={[0, screenHeight / 2 + bezelWidth / 2, 0]}>
					<boxGeometry
						args={[screenWidth + bezelWidth * 2, bezelWidth, frameDepth]}
					/>
					<meshStandardMaterial
						color="#1a1a1a"
						metalness={0.5}
						roughness={0.5}
					/>
				</mesh>
				{/* Bottom bezel */}
				<mesh position={[0, -screenHeight / 2 - bezelWidth / 2, 0]}>
					<boxGeometry
						args={[screenWidth + bezelWidth * 2, bezelWidth, frameDepth]}
					/>
					<meshStandardMaterial
						color="#1a1a1a"
						metalness={0.5}
						roughness={0.5}
					/>
				</mesh>
				{/* Left bezel */}
				<mesh position={[-screenWidth / 2 - bezelWidth / 2, 0, 0]}>
					<boxGeometry args={[bezelWidth, screenHeight, frameDepth]} />
					<meshStandardMaterial
						color="#1a1a1a"
						metalness={0.5}
						roughness={0.5}
					/>
				</mesh>
				{/* Right bezel */}
				<mesh position={[screenWidth / 2 + bezelWidth / 2, 0, 0]}>
					<boxGeometry args={[bezelWidth, screenHeight, frameDepth]} />
					<meshStandardMaterial
						color="#1a1a1a"
						metalness={0.5}
						roughness={0.5}
					/>
				</mesh>

				{/* Screen background */}
				<mesh position={[0, 0, -0.001]}>
					<planeGeometry args={[screenWidth, screenHeight]} />
					<meshBasicMaterial color="#0a0a0a" />
				</mesh>

				{/* Outer glow border when hovered */}
				{isHovered && !isFocused && (
					<>
						<mesh position={[0, screenHeight / 2 + bezelWidth + 0.003, 0.001]}>
							<planeGeometry
								args={[screenWidth + bezelWidth * 2 + 0.006, 0.004]}
							/>
							<meshBasicMaterial color="#ffffff" transparent opacity={0.4} />
						</mesh>
						<mesh position={[0, -screenHeight / 2 - bezelWidth - 0.003, 0.001]}>
							<planeGeometry
								args={[screenWidth + bezelWidth * 2 + 0.006, 0.004]}
							/>
							<meshBasicMaterial color="#ffffff" transparent opacity={0.4} />
						</mesh>
						<mesh position={[-screenWidth / 2 - bezelWidth - 0.003, 0, 0.001]}>
							<planeGeometry
								args={[0.004, screenHeight + bezelWidth * 2 + 0.006]}
							/>
							<meshBasicMaterial color="#ffffff" transparent opacity={0.4} />
						</mesh>
						<mesh position={[screenWidth / 2 + bezelWidth + 0.003, 0, 0.001]}>
							<planeGeometry
								args={[0.004, screenHeight + bezelWidth * 2 + 0.006]}
							/>
							<meshBasicMaterial color="#ffffff" transparent opacity={0.4} />
						</mesh>
					</>
				)}

				{/* Embedded HTML content on screen - fixed to monitor surface */}
				<Html
					position={[0, 0, 0.003]}
					transform
					scale={0.022}
					style={{
						width: "870px",
						height: "545px",
						overflow: "hidden",
						backfaceVisibility: "hidden",
						imageRendering: "auto",
					}}
					zIndexRange={[0, 0]}
				>
					{/* Wrapper handles click-to-focus when not focused */}
					{/* eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events */}
					<div
						onClick={(e) => {
							if (!isFocused) {
								e.stopPropagation();
								onClick();
							}
						}}
						onMouseEnter={() => {
							if (!isFocused) {
								onHover(true);
							}
						}}
						onMouseLeave={() => {
							if (!isFocused) {
								onHover(false);
							}
						}}
						style={{
							width: "100%",
							height: "100%",
							pointerEvents: "auto",
							cursor: isFocused ? "default" : "pointer",
						}}
					>
						<div
							style={{
								pointerEvents: isFocused ? "auto" : "none",
								width: "100%",
								height: "100%",
							}}
						>
							<MonitorScreenContent
								onNavigate={onNavigate}
								searchTracks={searchTracks}
								createPlaylist={createPlaylist}
								getPlaylists={getPlaylists}
								playPlaylistById={playPlaylistById}
								onPlaylistSelect={onPlaylistSelect}
								getPlaylistTracks={getPlaylistTracks}
								playTrackInPlaylist={playTrackInPlaylist}
								currentTrackName={currentTrackName}
								currentArtistName={currentArtistName}
								currentAlbumArt={currentAlbumArt}
								isPlaying={isPlaying}
								onPlayPause={onPlayPause}
								onSkipNext={onSkipNext}
								onSkipPrevious={onSkipPrevious}
								onLikeTrack={onLikeTrack}
								isLiked={isLiked}
								isReceiverMode={isReceiverMode}
								receiverPlaylistName={receiverPlaylistName}
								receiverPlaylistTracks={receiverPlaylistTracks}
								receiverPlaylistId={receiverPlaylistId}
								receiverPlaylistImage={receiverPlaylistImage}
								isCurrentTrackInPlaylist={isCurrentTrackInPlaylist}
							/>
						</div>
					</div>
				</Html>
			</group>
		</group>
	);
}

// Keyboard component
function Keyboard() {
	const keyboardWidth = 0.22;
	const keyboardDepth = 0.08;
	const keyboardHeight = 0.008;

	return (
		<group position={[-0.28, 0.004, 0.12]} rotation={[0, 0, 0]}>
			{/* Keyboard base */}
			<mesh position={[0, keyboardHeight / 2, 0]}>
				<boxGeometry args={[keyboardWidth, keyboardHeight, keyboardDepth]} />
				<meshStandardMaterial color="#2a2a2a" metalness={0.5} roughness={0.5} />
			</mesh>

			{/* Keyboard keys - 5 rows */}
			{Array.from({ length: 5 }).map((_, row) => {
				const keysInRow = row === 4 ? 8 : 12; // Fewer keys in bottom row (spacebar area)
				const keyWidth = row === 4 ? 0.014 : 0.014;
				const rowOffset = row === 4 ? 0 : 0;

				return Array.from({ length: keysInRow }).map((_, col) => {
					// Make spacebar wider
					const isSpacebar = row === 4 && col >= 3 && col <= 4;
					const actualKeyWidth = isSpacebar ? 0.05 : keyWidth;
					const xPos =
						row === 4
							? col < 3
								? -0.08 + col * 0.018
								: col > 4
									? 0.04 + (col - 5) * 0.018
									: 0
							: -0.09 + col * 0.015 + rowOffset;

					if (isSpacebar && col === 4) return null; // Skip duplicate spacebar position

					return (
						<mesh
							key={`key-${row}-${col}`}
							position={[xPos, keyboardHeight + 0.002, -0.028 + row * 0.014]}
						>
							<boxGeometry args={[actualKeyWidth, 0.003, 0.011]} />
							<meshStandardMaterial
								color="#1a1a1a"
								metalness={0.2}
								roughness={0.8}
							/>
						</mesh>
					);
				});
			})}
		</group>
	);
}

// Mouse component
function Mouse() {
	return (
		<group position={[-0.05, 0.004, 0.12]} rotation={[0, 0, 0]}>
			{/* Mouse body - ergonomic shape */}
			<mesh position={[0, 0.012, 0]}>
				<boxGeometry args={[0.035, 0.018, 0.055]} />
				<meshStandardMaterial color="#2a2a2a" metalness={0.5} roughness={0.4} />
			</mesh>

			{/* Mouse top curve */}
			<mesh position={[0, 0.022, -0.005]}>
				<boxGeometry args={[0.033, 0.008, 0.045]} />
				<meshStandardMaterial color="#1a1a1a" metalness={0.5} roughness={0.4} />
			</mesh>

			{/* Left click */}
			<mesh position={[-0.008, 0.026, -0.015]}>
				<boxGeometry args={[0.014, 0.002, 0.025]} />
				<meshStandardMaterial color="#252525" metalness={0.3} roughness={0.6} />
			</mesh>

			{/* Right click */}
			<mesh position={[0.008, 0.026, -0.015]}>
				<boxGeometry args={[0.014, 0.002, 0.025]} />
				<meshStandardMaterial color="#252525" metalness={0.3} roughness={0.6} />
			</mesh>

			{/* Scroll wheel */}
			<mesh position={[0, 0.027, -0.015]} rotation={[Math.PI / 2, 0, 0]}>
				<cylinderGeometry args={[0.003, 0.003, 0.006, 12]} />
				<meshStandardMaterial color="#3a3a3a" metalness={0.6} roughness={0.3} />
			</mesh>
		</group>
	);
}

// Post-it note component for playlist description
interface PostItNoteProps {
	description: string;
	isFocused: boolean;
	onClick: () => void;
	onClose: () => void;
}

function PostItNote({ description, isFocused, onClick, onClose }: PostItNoteProps) {
	const [isHovered, setIsHovered] = useState(false);
	const groupRef = useRef<THREE.Group>(null);
	const meshRef = useRef<THREE.Mesh>(null);
	const { camera, gl } = useThree();

	// Note dimensions
	const noteWidth = isFocused ? 0.22 : 0.08;
	const noteHeight = isFocused ? 0.22 : 0.08;

	// Resting position on desk
	const restPosition = new THREE.Vector3(0.55, 0.006, 0.08);
	const restRotation = new THREE.Euler(-Math.PI / 2 + 0.05, -0.3, 0.02);

	// Animate the note position and rotation
	useFrame(() => {
		if (!groupRef.current) return;

		if (isFocused) {
			// Calculate position in front of camera
			const cameraDirection = new THREE.Vector3();
			camera.getWorldDirection(cameraDirection);
			const targetPos = camera.position.clone().add(cameraDirection.multiplyScalar(0.4));
			targetPos.y = camera.position.y - 0.05; // Slightly below eye level

			// Face the camera directly
			groupRef.current.position.lerp(targetPos, 0.1);
			groupRef.current.lookAt(camera.position);
			// Add slight tilt
			groupRef.current.rotation.z += 0.03;
		} else {
			// Return to rest position on desk
			groupRef.current.position.lerp(restPosition, 0.1);
			groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, restRotation.x, 0.1);
			groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, restRotation.y, 0.1);
			groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, restRotation.z, 0.1);
		}

		// When focused, clear depth buffer so note renders on top
		if (isFocused && meshRef.current) {
			meshRef.current.onBeforeRender = () => {
				gl.clearDepth();
			};
		} else if (meshRef.current) {
			meshRef.current.onBeforeRender = () => {};
		}
	});

	return (
		<group
			ref={groupRef}
			position={[0.55, 0.006, 0.08]}
			rotation={[-Math.PI / 2 + 0.05, -0.3, 0.02]}
		>
			{/* Invisible larger click target */}
			<mesh
				visible={false}
				onPointerOver={() => !isFocused && setIsHovered(true)}
				onPointerOut={() => setIsHovered(false)}
				onClick={(e) => {
					e.stopPropagation();
					if (isFocused) {
						onClose();
					} else {
						onClick();
					}
				}}
			>
				<planeGeometry args={[noteWidth * 1.2, noteHeight * 1.2]} />
				<meshBasicMaterial transparent opacity={0} />
			</mesh>

			{/* Post-it note paper */}
			<mesh ref={meshRef} renderOrder={isFocused ? 9999 : 2}>
				<planeGeometry args={[noteWidth, noteHeight]} />
				<meshBasicMaterial
					color={isHovered && !isFocused ? "#ffeb3b" : "#fff59d"}
					side={THREE.DoubleSide}
					depthTest={!isFocused}
					depthWrite={true}
				/>
			</mesh>

			{/* Outline/border when hovered */}
			{isHovered && !isFocused && (
				<mesh position={[0, 0, 0.0005]} renderOrder={3}>
					<planeGeometry args={[noteWidth + 0.005, noteHeight + 0.005]} />
					<meshBasicMaterial color="#ffffff" transparent opacity={0.5} side={THREE.DoubleSide} />
				</mesh>
			)}

			{/* Slight shadow underneath - only when on desk */}
			{!isFocused && (
				<mesh position={[0.003, -0.003, -0.001]} renderOrder={0}>
					<planeGeometry args={[noteWidth, noteHeight]} />
					<meshBasicMaterial
						color="#000000"
						transparent
						opacity={0.2}
						side={THREE.DoubleSide}
					/>
				</mesh>
			)}

			{/* Curled corner effect */}
			<mesh
				position={[noteWidth / 2 - noteWidth * 0.08, -noteHeight / 2 + noteHeight * 0.08, 0.001]}
				renderOrder={isFocused ? 10000 : 4}
			>
				<planeGeometry args={[noteWidth * 0.15, noteHeight * 0.15]} />
				<meshBasicMaterial
					color="#fff9c4"
					side={THREE.DoubleSide}
					depthTest={!isFocused}
				/>
			</mesh>

			{/* HTML content for the handwritten text */}
			<Html
				position={[0, 0, 0.002]}
				transform
				scale={isFocused ? 0.018 : 0.008}
				style={{
					width: isFocused ? "480px" : "380px",
					height: isFocused ? "480px" : "380px",
					pointerEvents: "none",
				}}
				zIndexRange={isFocused ? [10000, 10001] : [0, 0]}
			>
				<div
					style={{
						width: "100%",
						height: "100%",
						padding: isFocused ? "40px" : "20px",
						fontFamily: "var(--font-caveat), cursive",
						fontSize: isFocused ? "32px" : "24px",
						lineHeight: 1.5,
						color: "#3a3a3a",
						overflow: "hidden",
						textOverflow: "ellipsis",
						display: "-webkit-box",
						WebkitLineClamp: isFocused ? 12 : 6,
						WebkitBoxOrient: "vertical" as const,
						textAlign: "left",
						transform: "rotate(1deg)",
					}}
				>
					{description}
				</div>
			</Html>
		</group>
	);
}

function Room() {
	const wallColor = "#0a1628"; // Dark blue walls
	const floorColor = "#1a1a1a"; // Dark floor
	const ceilingColor = "#080810"; // Very dark ceiling
	const backWallColor = "#0d1a2d"; // Slightly lighter blue for the wall behind desk

	return (
		<group>
			{/* Floor */}
			<mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.35, 0]}>
				<planeGeometry args={[8, 8]} />
				<meshStandardMaterial
					color={floorColor}
					metalness={0.3}
					roughness={0.8}
				/>
			</mesh>

			{/* Ceiling */}
			<mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 3, 0]}>
				<planeGeometry args={[8, 8]} />
				<meshStandardMaterial
					color={ceilingColor}
					metalness={0.1}
					roughness={0.9}
				/>
			</mesh>

			{/* Wall behind desk - closer and more visible */}
			<mesh position={[0, 0.5, -0.35]}>
				<planeGeometry args={[2, 1.2]} />
				<meshStandardMaterial color={backWallColor} roughness={0.85} />
			</mesh>

			{/* Back wall */}
			<mesh position={[0, 1.5, -2.5]}>
				<planeGeometry args={[8, 4]} />
				<meshStandardMaterial color={wallColor} roughness={0.9} />
			</mesh>

			{/* Front wall (behind camera) */}
			<mesh position={[0, 1.5, 4]} rotation={[0, Math.PI, 0]}>
				<planeGeometry args={[8, 4]} />
				<meshStandardMaterial color={wallColor} roughness={0.9} />
			</mesh>

			{/* Left wall */}
			<mesh position={[-3, 1.5, 0]} rotation={[0, Math.PI / 2, 0]}>
				<planeGeometry args={[8, 4]} />
				<meshStandardMaterial color={wallColor} roughness={0.9} />
			</mesh>

			{/* Right wall */}
			<mesh position={[3, 1.5, 0]} rotation={[0, -Math.PI / 2, 0]}>
				<planeGeometry args={[8, 4]} />
				<meshStandardMaterial color={wallColor} roughness={0.9} />
			</mesh>
		</group>
	);
}

function Lighting() {
	return (
		<>
			<ambientLight intensity={0.5} color="#ffffff" />
			{/* Main overhead light */}
			<pointLight
				position={[0, 1.2, 0.4]}
				intensity={2}
				color="#fff5e6"
				distance={4}
			/>
			{/* Light on the right side for record player */}
			<pointLight
				position={[0.4, 0.5, 0.3]}
				intensity={1}
				color="#ffffff"
				distance={2.5}
			/>
			{/* Light specifically for the monitor area */}
			<pointLight
				position={[-0.5, 0.5, 0.4]}
				intensity={1.2}
				color="#e6f0ff"
				distance={2}
			/>
			{/* Subtle fill light from front */}
			<pointLight
				position={[0, 0.3, 1]}
				intensity={0.6}
				color="#ffffff"
				distance={2}
			/>
		</>
	);
}

// Camera controller that follows mouse movement
interface CameraControllerProps {
	monitorFocused: boolean;
	mousePosition: { x: number; y: number };
}

// Default camera matches the Blender scene camera (exported via glTF Y-up conversion)
const CAMERA_DEFAULT = new THREE.Vector3(0.535, 7.161, 18.605);
const TARGET_DEFAULT = new THREE.Vector3(0.535, 6.004, 13.741);

// Camera focus on the laptop screen — positioned ~1u in front along its normal
const CAMERA_MONITOR = new THREE.Vector3(0.655, 2.31, -2.58);
const TARGET_MONITOR = new THREE.Vector3(0.655, 2.619, -3.527);

// How much the camera look-at point moves based on mouse position
const MOUSE_LOOK_X = 0.6;
const MOUSE_LOOK_Y = 0.3;
const MOUSE_LERP_SPEED = 0.008;

function CameraController({
	monitorFocused,
	mousePosition,
}: CameraControllerProps) {
	const { camera } = useThree();
	const isAnimating = useRef(false);
	const animationProgress = useRef(0);
	const currentPosition = useRef(new THREE.Vector3().copy(CAMERA_DEFAULT));
	const currentTarget = useRef(new THREE.Vector3().copy(TARGET_DEFAULT));
	const wasMonitorFocused = useRef(false);
	const initialized = useRef(false);

	// Initialize camera position and orientation on mount
	useEffect(() => {
		camera.position.copy(CAMERA_DEFAULT);
		camera.lookAt(TARGET_DEFAULT);
		initialized.current = true;
	}, [camera]);

	useEffect(() => {
		if (monitorFocused !== wasMonitorFocused.current) {
			isAnimating.current = true;
			animationProgress.current = 0;
			wasMonitorFocused.current = monitorFocused;
		}
	}, [monitorFocused]);

	useFrame(() => {
		if (!initialized.current) return;

		if (monitorFocused) {
			// Animate to monitor focus position
			if (isAnimating.current) {
				animationProgress.current += 0.03;
				const t = Math.min(animationProgress.current, 1);
				const eased = 1 - (1 - t) ** 3;

				currentPosition.current.lerpVectors(
					CAMERA_DEFAULT,
					CAMERA_MONITOR,
					eased,
				);
				currentTarget.current.lerpVectors(
					TARGET_DEFAULT,
					TARGET_MONITOR,
					eased,
				);

				if (t >= 1) {
					isAnimating.current = false;
				}
			}

			camera.position.copy(currentPosition.current);
			camera.lookAt(currentTarget.current);
		} else {
			// Animate back from monitor if needed
			if (isAnimating.current) {
				animationProgress.current += 0.03;
				const t = Math.min(animationProgress.current, 1);
				const eased = 1 - (1 - t) ** 3;

				currentPosition.current.lerpVectors(
					CAMERA_MONITOR,
					CAMERA_DEFAULT,
					eased,
				);
				currentTarget.current.lerpVectors(
					TARGET_MONITOR,
					TARGET_DEFAULT,
					eased,
				);

				if (t >= 1) {
					isAnimating.current = false;
				}
			} else {
				// Reset position to default when not animating
				currentPosition.current.copy(CAMERA_DEFAULT);
			}

			// Calculate where on the desk the cursor is pointing
			const targetLookX = TARGET_DEFAULT.x + mousePosition.x * MOUSE_LOOK_X;
			const targetLookZ = TARGET_DEFAULT.z - mousePosition.y * MOUSE_LOOK_Y;

			// Smoothly interpolate the look-at target
			currentTarget.current.x = THREE.MathUtils.lerp(
				currentTarget.current.x,
				targetLookX,
				MOUSE_LERP_SPEED,
			);
			currentTarget.current.z = THREE.MathUtils.lerp(
				currentTarget.current.z,
				targetLookZ,
				MOUSE_LERP_SPEED,
			);
			currentTarget.current.y = TARGET_DEFAULT.y;

			camera.position.copy(currentPosition.current);
			camera.lookAt(currentTarget.current);
		}
	});

	return null;
}

function VinylRecordWithFallback({ albumArt, isPlaying }: VinylRecordProps) {
	if (!albumArt) {
		return <VinylRecordNoTexture isPlaying={isPlaying} />;
	}
	return (
		<Suspense fallback={<VinylRecordNoTexture isPlaying={isPlaying} />}>
			<VinylRecord albumArt={albumArt} isPlaying={isPlaying} />
		</Suspense>
	);
}

function VinylRecordNoTexture({ isPlaying }: { isPlaying: boolean }) {
	const discRef = useRef<THREE.Group>(null);

	useFrame((_, delta) => {
		if (discRef.current && isPlaying) {
			discRef.current.rotation.y += delta * 0.8;
		}
	});

	const vinylRadius = 0.14;
	const labelRadius = 0.065; // Bigger center label
	const thickness = 0.003;
	const labelY = thickness / 2 + 0.0005;

	return (
		<group ref={discRef} position={[0, 0.003, 0]}>
			<mesh>
				<cylinderGeometry args={[vinylRadius, vinylRadius, thickness, 64]} />
				<meshStandardMaterial color="#111111" metalness={0.4} roughness={0.3} />
			</mesh>

			{Array.from({ length: 12 }).map((_, i) => {
				const radius =
					labelRadius + 0.008 + i * ((vinylRadius - labelRadius - 0.015) / 12);
				return (
					<mesh
						key={i}
						position={[0, thickness / 2 + 0.0001, 0]}
						rotation={[-Math.PI / 2, 0, 0]}
					>
						<ringGeometry args={[radius - 0.001, radius, 64]} />
						<meshStandardMaterial
							color="#0a0a0a"
							metalness={0.5}
							roughness={0.4}
							transparent
							opacity={0.6}
						/>
					</mesh>
				);
			})}

			<mesh position={[0, labelY, 0]} rotation={[-Math.PI / 2, 0, 0]}>
				<circleGeometry args={[labelRadius, 64]} />
				<meshStandardMaterial color="#1a1a1a" metalness={0.1} roughness={0.7} />
			</mesh>

			<mesh
				position={[0, thickness / 2 + 0.0006, 0]}
				rotation={[-Math.PI / 2, 0, 0]}
			>
				<circleGeometry args={[0.003, 32]} />
				<meshStandardMaterial color="#050505" metalness={0.9} roughness={0.1} />
			</mesh>

			<mesh
				position={[0, -thickness / 2 - 0.0001, 0]}
				rotation={[Math.PI / 2, 0, 0]}
			>
				<circleGeometry args={[vinylRadius, 64]} />
				<meshStandardMaterial color="#111111" metalness={0.4} roughness={0.3} />
			</mesh>
		</group>
	);
}

interface RecordPlayerSceneProps {
	albumArt: string | null;
	isPlaying: boolean;
	onPlayPause: () => void;
	onSkipNext: () => void;
	onSkipPrevious: () => void;
	onNavigate?: (path: string) => void;
	trackName?: string | null;
	artistName?: string | null;
	progress?: number;
	duration?: number;
	searchTracks?: (query: string) => Promise<SpotifyTrack[]>;
	createPlaylist?: (name: string, tracks: SpotifyTrack[], description?: string) => Promise<string>;
	getPlaylists?: () => Promise<{ items: PlaylistDetails[] }>;
	playPlaylistById?: (playlistId: string) => Promise<void>;
	getPlaylistTracks?: (playlistId: string) => Promise<SpotifyTrack[]>;
	playTrackInPlaylist?: (playlistUri: string, trackUri: string) => Promise<void>;
	onLikeTrack?: () => Promise<void>;
	isLiked?: boolean;
	isReceiverMode?: boolean;
	receiverPlaylistName?: string | null;
	receiverPlaylistTracks?: SpotifyTrack[];
	receiverPlaylistId?: string | null;
	receiverPlaylistImage?: string | null;
	receiverPlaylistDescription?: string | null;
	isCurrentTrackInPlaylist?: boolean;
}

export function RecordPlayerScene({
	albumArt,
	isPlaying,
	onPlayPause,
	onSkipNext,
	onSkipPrevious,
	onNavigate,
	trackName,
	artistName,
	progress = 0,
	duration = 0,
	searchTracks,
	createPlaylist,
	getPlaylists,
	playPlaylistById,
	getPlaylistTracks,
	playTrackInPlaylist,
	onLikeTrack,
	isLiked,
	isReceiverMode,
	receiverPlaylistName,
	receiverPlaylistTracks,
	receiverPlaylistId,
	receiverPlaylistImage,
	receiverPlaylistDescription,
	isCurrentTrackInPlaylist,
}: RecordPlayerSceneProps) {
	const [contextLost, setContextLost] = useState(false);
	const [optimisticPlaying, setOptimisticPlaying] = useState<boolean | null>(
		null,
	);
	const [monitorFocused, setMonitorFocused] = useState(false);
	const [monitorHovered, setMonitorHovered] = useState(false);
	const [currentPlaylistName, setCurrentPlaylistName] = useState<string | null>(
		null,
	);
	const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
	const [postItFocused, setPostItFocused] = useState(false);

	// Track mouse position for camera movement
	useEffect(() => {
		const handleMouseMove = (e: MouseEvent) => {
			// Normalize mouse position to -1 to 1 range
			const x = (e.clientX / window.innerWidth) * 2 - 1;
			const y = -((e.clientY / window.innerHeight) * 2 - 1); // Invert Y
			setMousePosition({ x, y });
		};

		window.addEventListener("mousemove", handleMouseMove);
		return () => window.removeEventListener("mousemove", handleMouseMove);
	}, []);

	const displayPlaying =
		optimisticPlaying !== null ? optimisticPlaying : isPlaying;

	useEffect(() => {
		setOptimisticPlaying(null);
	}, [isPlaying]);

	const handlePlayPause = useCallback(() => {
		setOptimisticPlaying((prev) => !(prev !== null ? prev : isPlaying));
		onPlayPause();
	}, [isPlaying, onPlayPause]);

	const handleMonitorClick = useCallback(() => {
		setMonitorFocused(true);
	}, []);

	const handleMonitorClose = useCallback(() => {
		setMonitorFocused(false);
	}, []);

	// Keyboard controls - spacebar for play/pause, Escape to close focused elements
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.code === "Escape") {
				if (monitorFocused) {
					e.preventDefault();
					handleMonitorClose();
					return;
				}
				if (postItFocused) {
					e.preventDefault();
					setPostItFocused(false);
					return;
				}
			}
			if (e.code === "Space" && e.target === document.body && !monitorFocused && !postItFocused) {
				e.preventDefault();
				handlePlayPause();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [handlePlayPause, monitorFocused, postItFocused, handleMonitorClose]);

	if (contextLost) {
		return (
			<div className="w-full h-screen flex items-center justify-center bg-zinc-900">
				<div className="text-center">
					<p className="text-zinc-400">WebGL context lost</p>
					<button
						onClick={() => setContextLost(false)}
						className="mt-4 px-4 py-2 bg-spotify-green rounded text-white"
					>
						Reload
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="w-full h-screen relative">
			<Canvas
				shadows={false}
				camera={{ position: [0.535, 7.161, 18.605], fov: 40 }}
				gl={{
					antialias: true,
					toneMapping: THREE.ACESFilmicToneMapping,
					powerPreference: "default",
					failIfMajorPerformanceCaveat: false,
				}}
				onCreated={({ gl }) => {
					gl.outputColorSpace = THREE.SRGBColorSpace;
					gl.setPixelRatio(Math.min(window.devicePixelRatio, 2));
					const canvas = gl.domElement;
					canvas.addEventListener("webglcontextlost", (e) => {
						e.preventDefault();
						setContextLost(true);
					});
					canvas.addEventListener("webglcontextrestored", () => {
						setContextLost(false);
					});
				}}
			>
				<WebGLCleanup />
				<color attach="background" args={["#050505"]} />
				<Lighting />

				{/* Blender scene — static environment, furniture, decorations */}
				<Suspense fallback={null}>
					<BakedScene
						interactiveMeshes={[
							"Laptop_Screen",
							"Turntable_Platter",
							"Vinyl_Record",
							"Spindle",
							"Record_Label",
						]}
						onMeshClick={(name) => {
							if (name === "Laptop_Screen") {
								handleMonitorClick();
							} else {
								handlePlayPause();
							}
						}}
					/>
				</Suspense>


				{/* Post-it note for playlist description in receiver mode - outside main group for proper rendering */}
				{isReceiverMode && receiverPlaylistDescription && (
					<PostItNote
						description={receiverPlaylistDescription}
						isFocused={postItFocused}
						onClick={() => setPostItFocused(true)}
						onClose={() => setPostItFocused(false)}
					/>
				)}

				<CameraController
					monitorFocused={monitorFocused}
					mousePosition={mousePosition}
				/>
			</Canvas>

			{/* Laptop screen UI overlay — appears when laptop is clicked */}
			{monitorFocused && (
				<div className="absolute inset-0 z-30 flex flex-col bg-black/70 backdrop-blur-sm">
					<button
						type="button"
						onClick={handleMonitorClose}
						className="absolute top-4 right-4 z-10 bg-black/60 hover:bg-black/80 text-white text-xs border border-white/20 rounded-md px-3 py-2 cursor-pointer"
					>
						Close (esc)
					</button>
					<div className="flex-1 overflow-auto p-6">
						<MonitorScreenContent
							onNavigate={onNavigate || (() => {})}
							searchTracks={searchTracks || (async () => [])}
							createPlaylist={createPlaylist || (async () => "")}
							getPlaylists={getPlaylists || (async () => ({ items: [] }))}
							playPlaylistById={playPlaylistById || (async () => {})}
							onPlaylistSelect={(_id, name) => setCurrentPlaylistName(name)}
							getPlaylistTracks={getPlaylistTracks || (async () => [])}
							playTrackInPlaylist={playTrackInPlaylist || (async () => {})}
							currentTrackName={trackName}
							currentArtistName={artistName}
							currentAlbumArt={albumArt}
							isPlaying={displayPlaying}
							onPlayPause={onPlayPause}
							onSkipNext={onSkipNext}
							onSkipPrevious={onSkipPrevious}
							onLikeTrack={onLikeTrack}
							isLiked={isLiked}
							isReceiverMode={isReceiverMode}
							receiverPlaylistName={receiverPlaylistName}
							receiverPlaylistTracks={receiverPlaylistTracks}
							receiverPlaylistId={receiverPlaylistId}
							receiverPlaylistImage={receiverPlaylistImage}
							isCurrentTrackInPlaylist={isCurrentTrackInPlaylist}
						/>
					</div>
				</div>
			)}

			{/* Now playing indicator */}
			{!monitorFocused && (trackName || currentPlaylistName) && (
				<div className="absolute bottom-4 left-4 text-xs bg-black/40 backdrop-blur-sm rounded-lg px-3 py-2">
					{trackName && (
						<div className="flex items-center gap-2 mb-1">
							<span className="text-[#1db954]">♫</span>
							<div className="flex flex-col">
								<span className="text-zinc-200 truncate max-w-[180px] font-medium">
									{trackName}
								</span>
								{artistName && (
									<span className="text-zinc-400 truncate max-w-[180px] text-[10px]">
										{artistName}
									</span>
								)}
							</div>
						</div>
					)}
					{currentPlaylistName && (
						<div className="flex items-center gap-1 text-zinc-500">
							<span className="text-[10px]">from</span>
							<span className="text-zinc-400 truncate max-w-[150px] text-[10px]">
								{currentPlaylistName}
							</span>
						</div>
					)}
				</div>
			)}

			{/* Post-it focused overlay - click anywhere to close */}
			{postItFocused && receiverPlaylistDescription && (
				<>
					<button
						type="button"
						className="absolute inset-0 z-10 cursor-pointer"
						onClick={() => setPostItFocused(false)}
						aria-label="Close note"
						style={{ background: "transparent" }}
					/>
					<div className="absolute bottom-4 right-4 text-xs bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2 z-20">
						<p className="text-zinc-300">Press <span className="text-white font-medium">ESC</span> or click anywhere to close</p>
					</div>
				</>
			)}
		</div>
	);
}
