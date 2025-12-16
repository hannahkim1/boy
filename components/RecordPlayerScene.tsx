"use client";

import { Suspense, useRef, useState, useEffect } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import * as THREE from "three";

interface VinylRecordProps {
  albumArt: string | null;
  isPlaying: boolean;
}

function VinylRecord({ albumArt, isPlaying }: VinylRecordProps) {
  const discRef = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);

  const texture = useLoader(
    THREE.TextureLoader,
    albumArt || "/placeholder.png",
    undefined,
    () => {}
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
        const radius = labelRadius + 0.008 + i * ((vinylRadius - labelRadius - 0.015) / 12);
        return (
          <mesh key={i} position={[0, thickness / 2 + 0.0001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[radius - 0.001, radius, 64]} />
            <meshStandardMaterial color="#0a0a0a" metalness={0.5} roughness={0.4} transparent opacity={0.6} />
          </mesh>
        );
      })}

      {/* Vinyl sheen highlight */}
      <mesh position={[0, thickness / 2 + 0.0002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[labelRadius + 0.01, vinylRadius - 0.005, 64, 1, 0.5, Math.PI / 4]} />
        <meshStandardMaterial color="#ffffff" transparent opacity={0.06} metalness={1} roughness={0} />
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
      <mesh position={[0, thickness / 2 + 0.0006, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.003, 32]} />
        <meshStandardMaterial color="#050505" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* Back side of vinyl */}
      <mesh position={[0, -thickness / 2 - 0.0001, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[vinylRadius, 64]} />
        <meshStandardMaterial color="#111111" metalness={0.4} roughness={0.3} />
      </mesh>
    </group>
  );
}

// Tonearm/Needle component - simplified
function Tonearm({ isPlaying }: { isPlaying: boolean }) {
  const armRef = useRef<THREE.Group>(null);
  const targetRotation = useRef(isPlaying ? 0.35 : -0.15);

  useFrame(() => {
    if (armRef.current) {
      const target = isPlaying ? 0.35 : -0.15;
      targetRotation.current = THREE.MathUtils.lerp(targetRotation.current, target, 0.05);
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
            <meshStandardMaterial color="#333333" metalness={0.8} roughness={0.2} />
          </mesh>

          {/* Counterweight */}
          <mesh position={[0.025, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.008, 0.008, 0.015, 24]} />
            <meshStandardMaterial color="#1a1a1a" metalness={0.6} roughness={0.4} />
          </mesh>

          {/* Headshell */}
          <group position={[-0.115, -0.003, 0]}>
            <mesh>
              <boxGeometry args={[0.02, 0.006, 0.01]} />
              <meshStandardMaterial color="#222222" metalness={0.6} roughness={0.4} />
            </mesh>
            {/* Cartridge */}
            <mesh position={[0.003, -0.005, 0]}>
              <boxGeometry args={[0.012, 0.006, 0.006]} />
              <meshStandardMaterial color="#1a1a1a" metalness={0.5} roughness={0.5} />
            </mesh>
            {/* Stylus/Needle */}
            <mesh position={[-0.004, -0.01, 0]} rotation={[0, 0, 0.2]}>
              <coneGeometry args={[0.001, 0.008, 8]} />
              <meshStandardMaterial color="#888888" metalness={0.9} roughness={0.1} />
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

function ClassicButton({ position, onClick, buttonColor, hoverColor, icon, iconColor = "#888888" }: ClassicButtonProps) {
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

  const currentColor = isHovered ? (hoverColor || "#555555") : buttonColor;

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
          onPointerLeave={() => { setIsPressed(false); setIsHovered(false); }}
          onPointerEnter={() => setIsHovered(true)}
          position={[0, 0, buttonDepth / 2]}
        >
          <boxGeometry args={[buttonSize, buttonSize, buttonDepth]} />
          <meshStandardMaterial color={currentColor} metalness={0.5} roughness={0.4} />
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

function ScreenWidgetContent({ albumArt, progress, duration, isPlaying, baseSize = 0.38, trackName, artistName }: ScreenWidgetProps) {
  const texture = useLoader(THREE.TextureLoader, albumArt || "/placeholder.png", undefined, () => {});

  useEffect(() => {
    if (texture && albumArt) {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.needsUpdate = true;
    }
  }, [texture, albumArt]);

  const progressPercent = duration > 0 ? (progress / duration) : 0;

  // Format time for display
  const formatTime = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  // Screen dimensions
  const screenWidth = 0.12;
  const screenHeight = 0.045;

  // Position flush left on front panel
  const screenX = -baseSize / 2 + screenWidth / 2 + 0.015;

  // Truncate long text
  const displayTrack = trackName ? (trackName.length > 15 ? trackName.slice(0, 14) + '…' : trackName) : 'No Track';
  const displayArtist = artistName ? (artistName.length > 18 ? artistName.slice(0, 17) + '…' : artistName) : '';

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
        {albumArt ? (
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
        <mesh position={[0.02 - 0.026 + (progressPercent * 0.052) / 2, -0.012, 0.0025]} renderOrder={3}>
          <planeGeometry args={[Math.max(0.001, progressPercent * 0.052), 0.002]} />
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

function ScreenWidget(props: ScreenWidgetProps) {
  return (
    <Suspense fallback={null}>
      <ScreenWidgetContent {...props} />
    </Suspense>
  );
}

// Glass lid for the turntable
interface GlassLidProps {
  isOpen?: boolean;
  baseWidth?: number;
  baseDepth?: number;
  baseHeight?: number;
}

function GlassLid({ isOpen = false, baseWidth = 0.38, baseDepth = 0.38, baseHeight = 0.07 }: GlassLidProps) {
  const lidRef = useRef<THREE.Group>(null);
  const targetRotation = useRef(isOpen ? -Math.PI / 3 : 0);

  useFrame(() => {
    if (lidRef.current) {
      const target = isOpen ? -Math.PI / 3 : -0.05;
      targetRotation.current = THREE.MathUtils.lerp(targetRotation.current, target, 0.05);
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
          <meshStandardMaterial color="#2a2a2a" metalness={0.5} roughness={0.5} />
        </mesh>

        {/* Glass lid frame - front */}
        <mesh position={[0, lidHeight, lidDepth - 0.002]}>
          <boxGeometry args={[lidWidth, 0.004, 0.004]} />
          <meshStandardMaterial color="#2a2a2a" metalness={0.5} roughness={0.5} />
        </mesh>

        {/* Glass lid frame - left */}
        <mesh position={[-lidWidth / 2 + 0.002, lidHeight, lidDepth / 2]}>
          <boxGeometry args={[0.004, 0.004, lidDepth]} />
          <meshStandardMaterial color="#2a2a2a" metalness={0.5} roughness={0.5} />
        </mesh>

        {/* Glass lid frame - right */}
        <mesh position={[lidWidth / 2 - 0.002, lidHeight, lidDepth / 2]}>
          <boxGeometry args={[0.004, 0.004, lidDepth]} />
          <meshStandardMaterial color="#2a2a2a" metalness={0.5} roughness={0.5} />
        </mesh>

        {/* Side panels - left */}
        <mesh position={[-lidWidth / 2, lidHeight / 2, lidDepth / 2]}>
          <boxGeometry args={[0.002, lidHeight, lidDepth]} />
          <meshStandardMaterial color="#ffffff" transparent opacity={0.08} metalness={0.9} roughness={0.05} />
        </mesh>

        {/* Side panels - right */}
        <mesh position={[lidWidth / 2, lidHeight / 2, lidDepth / 2]}>
          <boxGeometry args={[0.002, lidHeight, lidDepth]} />
          <meshStandardMaterial color="#ffffff" transparent opacity={0.08} metalness={0.9} roughness={0.05} />
        </mesh>

        {/* Front panel */}
        <mesh position={[0, lidHeight / 2, lidDepth]}>
          <boxGeometry args={[lidWidth, lidHeight, 0.002]} />
          <meshStandardMaterial color="#ffffff" transparent opacity={0.08} metalness={0.9} roughness={0.05} />
        </mesh>

        {/* Connecting bars from hinge to lid - left */}
        <mesh position={[-0.1, lidHeight / 2, 0.01]}>
          <boxGeometry args={[0.004, lidHeight, 0.004]} />
          <meshStandardMaterial color="#2a2a2a" metalness={0.5} roughness={0.5} />
        </mesh>

        {/* Connecting bars from hinge to lid - right */}
        <mesh position={[0.1, lidHeight / 2, 0.01]}>
          <boxGeometry args={[0.004, lidHeight, 0.004]} />
          <meshStandardMaterial color="#2a2a2a" metalness={0.5} roughness={0.5} />
        </mesh>
      </group>

      {/* Hinges */}
      <group position={[-0.1, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <mesh>
          <cylinderGeometry args={[0.004, 0.004, 0.012, 12]} />
          <meshStandardMaterial color="#333333" metalness={0.7} roughness={0.3} />
        </mesh>
      </group>
      <group position={[0.1, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <mesh>
          <cylinderGeometry args={[0.004, 0.004, 0.012, 12]} />
          <meshStandardMaterial color="#333333" metalness={0.7} roughness={0.3} />
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

function Turntable({ isPlaying, onPlayPause, onSkipNext, onSkipPrevious, albumArt, progress, duration, trackName, artistName }: TurntableProps) {
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
      <mesh position={[baseSize / 2 - 0.025, baseHeight + 0.003, baseSize / 2 - 0.025]}>
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
      <GlassLid isOpen={true} baseWidth={baseSize} baseDepth={baseSize} baseHeight={baseHeight} />

      {/* Feet - repositioned for square base */}
      {[[-0.16, -0.16], [0.16, -0.16], [-0.16, 0.16], [0.16, 0.16]].map(([x, z], i) => (
        <mesh key={i} position={[x, -0.003, z]}>
          <cylinderGeometry args={[0.012, 0.015, 0.01, 16]} />
          <meshStandardMaterial color="#1a1a1a" metalness={0.3} roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

function Table() {
  return (
    <group position={[0, -0.3, 0]}>
      <mesh position={[0, 0.28, 0]}>
        <boxGeometry args={[1.0, 0.035, 0.6]} />
        <meshStandardMaterial color="#2a1810" metalness={0.1} roughness={0.8} />
      </mesh>

      {[[-0.4, -0.22], [0.4, -0.22], [-0.4, 0.22], [0.4, 0.22]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.13, z]}>
          <cylinderGeometry args={[0.025, 0.025, 0.26, 16]} />
          <meshStandardMaterial color="#2a1810" metalness={0.1} roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

function Room() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.35, 0]}>
        <planeGeometry args={[8, 8]} />
        <meshStandardMaterial color="#0a0a0a" metalness={0.2} roughness={0.9} />
      </mesh>

      <mesh position={[0, 1.5, -2.5]}>
        <planeGeometry args={[8, 4]} />
        <meshStandardMaterial color="#0d0d0d" roughness={0.95} />
      </mesh>
    </group>
  );
}

function Lighting() {
  return (
    <>
      <ambientLight intensity={0.35} color="#ffffff" />
      <pointLight position={[0, 0.8, 0.4]} intensity={1.5} color="#fff5e6" distance={3} />
      <pointLight position={[0.3, 0.4, 0.2]} intensity={0.8} color="#ffffff" distance={2} />
      <pointLight position={[-0.2, 0.3, 0.3]} intensity={0.5} color="#e6f0ff" distance={1.5} />
    </>
  );
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
        const radius = labelRadius + 0.008 + i * ((vinylRadius - labelRadius - 0.015) / 12);
        return (
          <mesh key={i} position={[0, thickness / 2 + 0.0001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[radius - 0.001, radius, 64]} />
            <meshStandardMaterial color="#0a0a0a" metalness={0.5} roughness={0.4} transparent opacity={0.6} />
          </mesh>
        );
      })}

      <mesh position={[0, labelY, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[labelRadius, 64]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.1} roughness={0.7} />
      </mesh>

      <mesh position={[0, thickness / 2 + 0.0006, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.003, 32]} />
        <meshStandardMaterial color="#050505" metalness={0.9} roughness={0.1} />
      </mesh>

      <mesh position={[0, -thickness / 2 - 0.0001, 0]} rotation={[Math.PI / 2, 0, 0]}>
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
  trackName?: string | null;
  artistName?: string | null;
  progress?: number;
  duration?: number;
}

export function RecordPlayerScene({
  albumArt,
  isPlaying,
  onPlayPause,
  onSkipNext,
  onSkipPrevious,
  trackName,
  artistName,
  progress = 0,
  duration = 0,
}: RecordPlayerSceneProps) {
  const [contextLost, setContextLost] = useState(false);
  const [optimisticPlaying, setOptimisticPlaying] = useState<boolean | null>(null);

  const displayPlaying = optimisticPlaying !== null ? optimisticPlaying : isPlaying;

  useEffect(() => {
    setOptimisticPlaying(null);
  }, [isPlaying]);

  const handlePlayPause = () => {
    setOptimisticPlaying(!displayPlaying);
    onPlayPause();
  };

  // Keyboard controls - spacebar for play/pause
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && e.target === document.body) {
        e.preventDefault();
        handlePlayPause();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [displayPlaying]);

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
        camera={{ position: [0.25, 0.35, 0.5], fov: 45 }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          powerPreference: "default",
          failIfMajorPerformanceCaveat: false,
        }}
        onCreated={({ gl }) => {
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
        <color attach="background" args={["#050505"]} />
        <Lighting />
        <Room />

        <group position={[0, 0, 0]}>
          <Table />
          <Turntable
            isPlaying={displayPlaying}
            onPlayPause={handlePlayPause}
            onSkipNext={onSkipNext}
            onSkipPrevious={onSkipPrevious}
            albumArt={albumArt}
            progress={progress}
            duration={duration}
            trackName={trackName}
            artistName={artistName}
          />
          {/* Vinyl record on platter - moved forward to match platter */}
          <group position={[0, 0.084, 0.03]}>
            <VinylRecordWithFallback albumArt={albumArt} isPlaying={displayPlaying} />
          </group>
        </group>

        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={0.2}
          maxDistance={2}
          minPolarAngle={0.3}
          maxPolarAngle={Math.PI / 2 - 0.1}
          target={[0, 0.02, 0]}
        />
      </Canvas>

      {/* Controls legend */}
      <div className="absolute bottom-4 left-4 text-xs text-zinc-500 bg-black/40 backdrop-blur-sm rounded-lg px-3 py-2 space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-zinc-400">Drag</span>
          <span>Rotate view</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-zinc-400">Scroll</span>
          <span>Zoom</span>
        </div>
      </div>
    </div>
  );
}
