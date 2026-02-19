
import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { Canvas, useFrame, ThreeElements, useLoader, useThree } from '@react-three/fiber';
import { 
    OrbitControls, 
    Environment, 
    ContactShadows, 
    Float, 
    MeshDistortMaterial,
    MeshWobbleMaterial,
    Html,
    MeshReflectorMaterial,
    Stars,
} from '@react-three/drei';
import * as THREE from 'three';
import { ModelProvider, AgentStyle, AppTheme } from '../types';
import { AGENT_PROFILES, MODEL_TO_AGENT_ID } from '../agentProfiles';

// Augment the JSX namespace to include Three.js elements
declare global {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {}
  }
}

// Cubic Bezier Ease Out Function
const easeOutCubic = (t: number): number => {
    return 1 - Math.pow(1 - t, 3);
};

const AGENT_FUNCTION_SCRIPT: Record<string, string[]> = {
  'AGT-001': ['EXECUTE TASKS', 'PLAN -> PATCH -> VERIFY', 'SHIP WITH CONFIDENCE'],
  'AGT-002': ['PROBE EDGE CASES', 'BREAK INPUT BOUNDARIES', 'HARDEN FAILURE PATHS'],
  'AGT-003': ['GO THROUGH ALL FILES', 'SUMMARIZE CHANGE STORY', 'WRITE CLEAR DOC NOTES'],
  'AGT-004': ['DETECT INCIDENT SIGNALS', 'CONTAIN / MITIGATE / RECOVER', 'RESTORE SERVICE FAST'],
  'AGT-005': ['MAP ARCHITECTURE PATTERNS', 'EXPLORE DEEP OPTIONS', 'DESIGN FUTURE SYSTEMS'],
};

const LEAD_BRAIN_GYRI_PATHS: [number, number, number][][] = [
  [
    [-0.22, 0.87, 0.04],
    [-0.19, 0.92, 0.11],
    [-0.14, 0.89, 0.07],
    [-0.1, 0.93, 0.12],
    [-0.05, 0.89, 0.06],
  ],
  [
    [-0.23, 0.82, -0.03],
    [-0.18, 0.86, 0.04],
    [-0.13, 0.84, -0.01],
    [-0.09, 0.88, 0.05],
    [-0.04, 0.83, -0.02],
  ],
  [
    [-0.22, 0.75, -0.12],
    [-0.17, 0.79, -0.03],
    [-0.12, 0.76, -0.09],
    [-0.07, 0.8, -0.02],
    [-0.03, 0.75, -0.07],
  ],
  [
    [-0.2, 0.7, 0.1],
    [-0.15, 0.74, 0.17],
    [-0.1, 0.72, 0.11],
    [-0.06, 0.76, 0.16],
    [-0.02, 0.71, 0.09],
  ],
];

const LEAD_BRAIN_SULCI_PATHS: [number, number, number][][] = [
  [
    [-0.22, 0.9, 0.02],
    [-0.18, 0.84, 0.09],
    [-0.13, 0.88, 0.02],
    [-0.08, 0.83, 0.08],
    [-0.04, 0.86, 0.02],
  ],
  [
    [-0.22, 0.82, -0.08],
    [-0.17, 0.76, -0.01],
    [-0.12, 0.8, -0.08],
    [-0.08, 0.75, -0.02],
    [-0.04, 0.78, -0.07],
  ],
  [
    [-0.2, 0.74, 0.1],
    [-0.16, 0.68, 0.17],
    [-0.11, 0.72, 0.1],
    [-0.07, 0.67, 0.16],
    [-0.03, 0.7, 0.1],
  ],
];

const LEAD_CURRENT_RINGS: Array<{
  position: [number, number, number];
  rotation: [number, number, number];
  args: [number, number, number, number, number];
}> = [
  { position: [0, 0.79, 0.02], rotation: [Math.PI / 2, 0, 0], args: [0.12, 0.0065, 8, 64, Math.PI * 1.5] },
  { position: [0, 0.79, 0.02], rotation: [Math.PI / 3, Math.PI / 4, 0.3], args: [0.1, 0.006, 8, 64, Math.PI * 1.45] },
  { position: [0, 0.79, 0.02], rotation: [Math.PI / 4, -Math.PI / 3, 0.9], args: [0.085, 0.0055, 8, 64, Math.PI * 1.38] },
];

const LEAD_CURRENT_PATHS: [number, number, number][][] = [
  [
    [-0.12, 0.76, -0.03],
    [-0.06, 0.84, 0.03],
    [0.01, 0.8, -0.01],
    [0.08, 0.86, 0.03],
    [0.12, 0.77, -0.02],
  ],
  [
    [-0.1, 0.71, 0.04],
    [-0.03, 0.77, 0.09],
    [0.05, 0.74, 0.02],
    [0.1, 0.8, 0.05],
  ],
  [
    [-0.11, 0.83, -0.07],
    [-0.05, 0.9, -0.02],
    [0.02, 0.85, -0.05],
    [0.09, 0.9, -0.01],
  ],
];

const createLeadBrainGeometry = (): THREE.BufferGeometry => {
  const geometry = new THREE.SphereGeometry(0.235, 84, 84);
  const position = geometry.attributes.position as THREE.BufferAttribute;
  const vertex = new THREE.Vector3();

  for (let i = 0; i < position.count; i += 1) {
    vertex.fromBufferAttribute(position, i);
    const normal = vertex.clone().normalize();
    const theta = Math.atan2(normal.z, normal.x);
    const phi = Math.acos(THREE.MathUtils.clamp(normal.y, -1, 1));

    const foldPrimary = Math.sin(theta * 7.1 + Math.sin(phi * 3.6) * 1.35) * 0.022;
    const foldSecondary = Math.sin(phi * 10.8 + theta * 1.9) * 0.013;
    const foldTertiary = Math.cos(theta * 13.2 - phi * 2.1) * 0.008;

    const frontalBulge = Math.exp(-Math.pow(normal.z - 0.25, 2) / 0.2) * 0.011;
    const occipitalBulge = Math.exp(-Math.pow(normal.z + 0.52, 2) / 0.24) * 0.01;
    const topBias = Math.max(0, normal.y) * 0.008;

    // Median longitudinal fissure (deep central groove).
    const fissureMask = Math.exp(-Math.pow(normal.x / 0.16, 2)) * (0.62 + Math.max(0, normal.y) * 0.75);
    const fissureDepth = fissureMask * 0.048;

    const radialScale = 1 + foldPrimary + foldSecondary + foldTertiary + frontalBulge + occipitalBulge + topBias - fissureDepth;
    vertex.multiplyScalar(radialScale);

    // Brain proportions (wider, slightly flatter vertically, fuller front/back).
    vertex.x *= 1.22;
    vertex.y *= normal.y < -0.14 ? 0.74 : 0.88;
    vertex.z *= 1.08;

    position.setXYZ(i, vertex.x, vertex.y, vertex.z);
  }

  position.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
};

type OilArtStyle = 'postmodernism' | 'expressionism' | 'eclecticism' | 'structuralism' | 'geometricism';

const AGENT_OIL_STYLE: Record<string, OilArtStyle> = {
  'AGT-001': 'expressionism',
  'AGT-002': 'postmodernism',
  'AGT-003': 'eclecticism',
  'AGT-004': 'structuralism',
  'AGT-005': 'geometricism',
};

const OIL_STYLE_PALETTES: Record<OilArtStyle, string[]> = {
  postmodernism: ['#0ea5e9', '#f43f5e', '#fde047', '#111827', '#f8fafc'],
  expressionism: ['#dc2626', '#f97316', '#facc15', '#312e81', '#1f2937'],
  eclecticism: ['#14b8a6', '#a855f7', '#f59e0b', '#e11d48', '#0f172a'],
  structuralism: ['#334155', '#0f766e', '#22d3ee', '#94a3b8', '#111827'],
  geometricism: ['#2563eb', '#8b5cf6', '#f59e0b', '#10b981', '#0f172a'],
};

const OIL_STYLE_CONFIG: Record<OilArtStyle, { roughness: number; metalness: number; brushCount: number; distort: number }> = {
  postmodernism: { roughness: 0.74, metalness: 0.08, brushCount: 180, distort: 0.16 },
  expressionism: { roughness: 0.86, metalness: 0.04, brushCount: 220, distort: 0.28 },
  eclecticism: { roughness: 0.8, metalness: 0.06, brushCount: 200, distort: 0.21 },
  structuralism: { roughness: 0.7, metalness: 0.14, brushCount: 170, distort: 0.12 },
  geometricism: { roughness: 0.66, metalness: 0.2, brushCount: 150, distort: 0.1 },
};

const createOilBrushTexture = (style: OilArtStyle, accentColor: string): THREE.CanvasTexture => {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    const fallback = new THREE.CanvasTexture(canvas);
    fallback.needsUpdate = true;
    return fallback;
  }

  const palette = OIL_STYLE_PALETTES[style];
  const config = OIL_STYLE_CONFIG[style];
  const [baseA, baseB, baseC] = palette;
  const gradient = ctx.createLinearGradient(0, 0, 256, 256);
  gradient.addColorStop(0, baseA);
  gradient.addColorStop(0.5, baseB);
  gradient.addColorStop(1, baseC);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);

  const strokePalette = [...palette, accentColor, '#ffffff'];
  for (let i = 0; i < config.brushCount; i += 1) {
    const brushColor = strokePalette[Math.floor(Math.random() * strokePalette.length)];
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const w = 14 + Math.random() * 56;
    const h = 4 + Math.random() * 16;
    const angle = Math.random() * Math.PI * 2;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.globalAlpha = 0.08 + Math.random() * 0.22;
    ctx.fillStyle = brushColor;
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.restore();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1.4, 1.4);
  texture.needsUpdate = true;
  return texture;
};

// Holographic beam during spawn
const SpawnBeam: React.FC<{ active: boolean, color: string }> = ({ active, color }) => {
  const mesh = useRef<THREE.Mesh>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (active) {
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [active]);

  useFrame(() => {
    if (mesh.current && visible) {
      mesh.current.scale.x = THREE.MathUtils.lerp(mesh.current.scale.x, 0, 0.05);
      mesh.current.scale.z = THREE.MathUtils.lerp(mesh.current.scale.z, 0, 0.05);
      const material = mesh.current.material as THREE.Material;
      if (material) {
        material.opacity = THREE.MathUtils.lerp(material.opacity, 0, 0.05);
      }
    }
  });

  if (!visible) return null;

  return (
    <mesh ref={mesh} position={[0, 2, 0]}>
      <cylinderGeometry args={[0.5, 0.8, 8, 32]} />
      <meshBasicMaterial color={color} transparent opacity={0.6} side={THREE.DoubleSide} />
    </mesh>
  );
};

const CameraFocusTracker: React.FC<{
  targets: Array<{ id: string; position: [number, number, number] }>;
  onFocusChange: (id?: string) => void;
}> = ({ targets, onFocusChange }) => {
  const { camera } = useThree();
  const lastFocusedIdRef = useRef<string | undefined>(undefined);

  useFrame(() => {
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);

    let bestId: string | undefined;
    let bestScore = -1;
    for (const target of targets) {
      const toTarget = new THREE.Vector3(...target.position).sub(camera.position).normalize();
      const score = forward.dot(toTarget);
      if (score > bestScore) {
        bestScore = score;
        bestId = target.id;
      }
    }

    // Only treat as focused when the agent is close to screen center.
    const nextFocusedId = bestScore > 0.94 ? bestId : undefined;
    if (nextFocusedId !== lastFocusedIdRef.current) {
      lastFocusedIdRef.current = nextFocusedId;
      onFocusChange(nextFocusedId);
    }
  });

  return null;
};

const ReflectionFunctionDisplay: React.FC<{
  active: boolean;
  scripts: string[];
}> = ({ active, scripts }) => {
  const [tick, setTick] = useState(0);
  const safeScripts = scripts.length > 0 ? scripts : ['CORE FUNCTION'];

  useEffect(() => {
    if (!active) {
      setTick(0);
      return;
    }
    const timer = setInterval(() => setTick((prev) => prev + 1), 80);
    return () => clearInterval(timer);
  }, [active]);

  const cycleLength = 96;
  const phraseIndex = active ? Math.floor(tick / cycleLength) % safeScripts.length : 0;
  const phrase = safeScripts[phraseIndex];
  const nextPhrase = safeScripts[(phraseIndex + 1) % safeScripts.length];
  const phase = active ? tick % cycleLength : 0;

  let charCount = phrase.length;
  if (active) {
    if (phase < 36) charCount = Math.max(1, Math.ceil((phase / 36) * phrase.length));
    else if (phase < 58) charCount = phrase.length;
    else if (phase < 82) charCount = Math.max(1, phrase.length - Math.ceil(((phase - 58) / 24) * phrase.length));
    else charCount = 1;
  }

  const text = phrase.slice(0, charCount);
  const scanGlow = active && phase >= 34 && phase <= 62;
  const stepLabel = `STEP ${phraseIndex + 1}/${safeScripts.length}`;
  const progressRatio = active ? (phase % cycleLength) / cycleLength : 0.06;
  const progressWidth = `${Math.max(6, Math.round(progressRatio * 100))}%`;

  return (
    <div
      className={`relative px-2 py-1 rounded-xl border text-[8px] font-black tracking-wider uppercase whitespace-nowrap transition-all ${
        active
          ? 'bg-cyan-400/20 border-cyan-300/70 text-cyan-100'
          : 'bg-slate-900/25 border-white/15 text-white/45'
      }`}
    >
      <div className="flex items-center gap-1">
        <span>{text}</span>
        <span className={`${active ? 'inline-block' : 'hidden'} ${tick % 2 === 0 ? 'opacity-100' : 'opacity-30'}`}>|</span>
      </div>
      <div className="mt-0.5 flex items-center gap-1.5">
        <span className={`${active ? 'opacity-90' : 'opacity-60'} text-[7px] tracking-normal`}>{stepLabel}</span>
        <span className={`relative h-[3px] w-20 overflow-hidden rounded-full ${active ? 'bg-cyan-200/30' : 'bg-white/15'}`}>
          <span
            className={`absolute left-0 top-0 h-full rounded-full ${active ? 'bg-cyan-200/90' : 'bg-white/45'}`}
            style={{ width: progressWidth }}
          />
        </span>
      </div>
      {active && (
        <div className="mt-0.5 text-[6px] font-semibold tracking-normal text-cyan-100/65">
          NEXT: {nextPhrase}
        </div>
      )}
      {scanGlow && (
        <span className="absolute left-0 top-0 h-full w-full rounded-xl bg-cyan-300/10" />
      )}
    </div>
  );
};

interface AgentProps {
  name: string;
  role: string;
  style: AgentStyle;
  position: [number, number, number];
  isTalking: boolean;
  isGlitched?: boolean;
  onClick: () => void;
  scale?: number;
  speechText?: string | null;
  delayIndex?: number;
  theme: AppTheme;
  idleMode?: boolean;
  idleRole?: 'corner' | 'pair' | 'cards' | 'pond' | 'lying' | 'sneak';
  lookTarget?: [number, number, number];
  reflectionActive?: boolean;
  functionScripts?: string[];
}

const CustomTextureFace: React.FC<{ url: string }> = ({ url }) => {
    const texture = useLoader(THREE.TextureLoader, url);
    return (
        <mesh position={[0, 0, 0.26]}>
            <planeGeometry args={[0.4, 0.4]} />
            <meshBasicMaterial map={texture} transparent side={THREE.DoubleSide} />
        </mesh>
    );
}

const AgentAvatar: React.FC<AgentProps> = ({
  name,
  role,
  style,
  position,
  isTalking,
  isGlitched,
  onClick,
  scale = 1,
  speechText,
  delayIndex = 0,
  theme,
  idleMode = false,
  idleRole,
  lookTarget,
  reflectionActive = false,
  functionScripts = [],
}) => {
  const group = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Mesh>(null);
  const leadHeadGroupRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Mesh>(null);
  const leftArmRef = useRef<THREE.Mesh>(null);
  const rightArmRef = useRef<THREE.Mesh>(null);
  const rippleARef = useRef<THREE.Mesh>(null);
  const rippleBRef = useRef<THREE.Mesh>(null);
  const leadCurrentRingRefs = useRef<Array<THREE.Mesh | null>>([]);
  const leadCurrentPathRefs = useRef<Array<THREE.Mesh | null>>([]);
  const leadGyriRefs = useRef<Array<THREE.Mesh | null>>([]);
  const leadSulciRefs = useRef<Array<THREE.Mesh | null>>([]);
  const leadSparkRefs = useRef<Array<THREE.Mesh | null>>([]);
  
  const [spawned, setSpawned] = useState(false);
  const [isSpawning, setIsSpawning] = useState(false);
  const animationTime = useRef(0);
  
  // Spring physics state
  const velocity = useRef(new THREE.Vector3(0, 0, 0));
  
  const targetPos = useMemo(() => new THREE.Vector3(...position), [position]);
  const initialPos = useMemo(() => new THREE.Vector3(position[0], position[1] - 8, position[2]), [position]); 
  const lookTargetVec = useMemo(
    () => (lookTarget ? new THREE.Vector3(...lookTarget) : null),
    [lookTarget]
  );
  const isLeadAgent = style.id === 'AGT-001';
  const artStyle = AGENT_OIL_STYLE[style.id] || 'eclecticism';
  const artConfig = OIL_STYLE_CONFIG[artStyle];
  const oilTexture = useMemo(() => createOilBrushTexture(artStyle, style.color), [artStyle, style.color]);
  const leadBrainGeometry = useMemo(() => createLeadBrainGeometry(), []);
  const leadCurrentCurves = useMemo(
    () =>
      LEAD_CURRENT_PATHS.map((path) =>
        new THREE.CatmullRomCurve3(path.map(([x, y, z]) => new THREE.Vector3(x, y, z)))
      ),
    []
  );
  const leadBrainGyriCurves = useMemo(() => {
    const left = LEAD_BRAIN_GYRI_PATHS.map(
      (path) => new THREE.CatmullRomCurve3(path.map(([x, y, z]) => new THREE.Vector3(x, y, z)))
    );
    const right = LEAD_BRAIN_GYRI_PATHS.map(
      (path) => new THREE.CatmullRomCurve3(path.map(([x, y, z]) => new THREE.Vector3(-x, y, z)))
    );
    return [...left, ...right];
  }, []);
  const leadBrainSulciCurves = useMemo(() => {
    const left = LEAD_BRAIN_SULCI_PATHS.map(
      (path) => new THREE.CatmullRomCurve3(path.map(([x, y, z]) => new THREE.Vector3(x, y, z)))
    );
    const right = LEAD_BRAIN_SULCI_PATHS.map(
      (path) => new THREE.CatmullRomCurve3(path.map(([x, y, z]) => new THREE.Vector3(-x, y, z)))
    );
    return [...left, ...right];
  }, []);

  useEffect(() => {
    return () => {
      oilTexture.dispose();
      leadBrainGeometry.dispose();
    };
  }, [leadBrainGeometry, oilTexture]);

  useEffect(() => {
    if (group.current) {
        // Set initial state
        group.current.position.copy(initialPos);
        group.current.scale.set(0, 0, 0);
        
        // Refined Staggering
        const delay = 200 + (delayIndex * 300);
        
        const timer = setTimeout(() => {
            setSpawned(true);
            setIsSpawning(true);
            setTimeout(() => setIsSpawning(false), 1200);
        }, delay);
        
        return () => clearTimeout(timer);
    }
  }, [initialPos, delayIndex]);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const idlePose = idleMode && !isTalking;
    
    if (group.current && spawned) {
        // --- Cubic Bezier Progress ---
        if (animationTime.current < 1) {
            animationTime.current += delta * 1.0; 
            if (animationTime.current > 1) animationTime.current = 1;
        }
        const easeVal = easeOutCubic(animationTime.current);

        // --- Spring Physics Calculation for Y (Bounce) ---
        const k = 100; 
        const d = 8;
        
        const hoverY = Math.sin(t * (idlePose ? 1.1 : 1.5) + position[0]) * (idlePose ? 0.02 : 0.05);
        const hiddenOffset =
          idlePose && idleRole === 'pond'
            ? -0.56
            : idlePose && idleRole === 'corner'
              ? -0.22
              : idlePose && idleRole === 'lying'
                ? -0.2
                : 0;
        const currentTargetY = targetPos.y + hoverY + hiddenOffset;

        const dispY = currentTargetY - group.current.position.y;
        const accelY = (dispY * k) - (velocity.current.y * d);
        velocity.current.y += accelY * delta;
        group.current.position.y += velocity.current.y * delta;

        // Smooth Lerp for X and Z
        group.current.position.x = THREE.MathUtils.lerp(group.current.position.x, targetPos.x, 0.1);
        group.current.position.z = THREE.MathUtils.lerp(group.current.position.z, targetPos.z, 0.1);
        
        // --- Scale Animation using Bezier ---
        const baseScale = easeVal * scale;
        const targetScaleVal = isSpawning
          ? baseScale * 1.3
          : idlePose && (idleRole === 'corner' || idleRole === 'pond')
            ? baseScale * 0.9
            : idlePose && idleRole === 'lying'
              ? baseScale * 0.94
              : baseScale;
        
        group.current.scale.lerp(new THREE.Vector3(targetScaleVal, targetScaleVal, targetScaleVal), 0.15);
        
        // Rotation alignment
        if (idlePose && lookTargetVec && idleRole !== 'lying') {
          const dx = lookTargetVec.x - group.current.position.x;
          const dz = lookTargetVec.z - group.current.position.z;
          const lookYaw = Math.atan2(dx, dz);
          group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, lookYaw, 0.14);
        } else if (idlePose && idleRole === 'lying') {
          group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, 0.25, 0.1);
        } else {
          group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, state.mouse.x * 0.25, 0.1);
        }

        const targetRoll = idlePose && idleRole === 'lying' ? -1.38 : 0;
        group.current.rotation.z = THREE.MathUtils.lerp(group.current.rotation.z, targetRoll, 0.1);
    }
    
    if (headRef.current && spawned) {
        const flicker = isSpawning ? (Math.random() > 0.5 ? 1.2 : 0.8) : 1;

        if (isLeadAgent) {
            const meditativeLift = Math.sin(t * (isTalking ? 3.2 : 2.2)) * 0.018;
            if (leadHeadGroupRef.current) {
              leadHeadGroupRef.current.position.x = isGlitched ? Math.sin(t * 32) * 0.02 : 0;
              leadHeadGroupRef.current.position.y = meditativeLift;
              const headScale = 1 + Math.sin(t * 1.8) * 0.02 + (isSpawning ? 0.03 : 0);
              leadHeadGroupRef.current.scale.set(headScale, headScale, headScale);
              leadHeadGroupRef.current.rotation.x = THREE.MathUtils.lerp(
                leadHeadGroupRef.current.rotation.x,
                isTalking ? 0.08 : 0.04,
                0.08
              );
              leadHeadGroupRef.current.rotation.y = THREE.MathUtils.lerp(
                leadHeadGroupRef.current.rotation.y,
                Math.sin(t * 0.7) * 0.08,
                0.06
              );
            }

            const leadMaterial = headRef.current.material;
            if (leadMaterial instanceof THREE.MeshStandardMaterial) {
              leadMaterial.emissiveIntensity =
                (isTalking ? 1.5 : 1.05) + Math.sin(t * 5.4) * 0.28 + (isGlitched ? 0.5 : 0);
            }
        } else {
            if (isGlitched) {
                headRef.current.position.x = Math.sin(t * 40) * 0.04;
                headRef.current.scale.setScalar(1 + Math.sin(t * 25) * 0.05);
            } else {
                headRef.current.position.x = 0;
                headRef.current.scale.setScalar(flicker);
            }

            if (isTalking) {
                headRef.current.rotation.x = Math.sin(t * 12) * 0.15;
                headRef.current.rotation.y = Math.sin(t * 8) * 0.1;
            } else if (idlePose && (idleRole === 'pair' || idleRole === 'cards')) {
                headRef.current.rotation.x = THREE.MathUtils.lerp(headRef.current.rotation.x, -0.03, 0.08);
                headRef.current.rotation.y = THREE.MathUtils.lerp(headRef.current.rotation.y, 0, 0.08);
            } else if (idlePose && idleRole === 'pond') {
                headRef.current.rotation.x = THREE.MathUtils.lerp(headRef.current.rotation.x, 0.22, 0.08);
                headRef.current.rotation.y = THREE.MathUtils.lerp(headRef.current.rotation.y, Math.sin(t * 0.8) * 0.2, 0.06);
            } else if (idlePose && idleRole === 'lying') {
                headRef.current.rotation.x = THREE.MathUtils.lerp(headRef.current.rotation.x, 0.35, 0.1);
                headRef.current.rotation.y = THREE.MathUtils.lerp(headRef.current.rotation.y, -0.28, 0.1);
            } else if (idlePose && idleRole === 'sneak') {
                headRef.current.rotation.x = THREE.MathUtils.lerp(headRef.current.rotation.x, -0.08, 0.08);
                headRef.current.rotation.y = THREE.MathUtils.lerp(headRef.current.rotation.y, 0.25, 0.08);
            } else if (idlePose && idleRole === 'corner') {
                headRef.current.rotation.x = THREE.MathUtils.lerp(headRef.current.rotation.x, 0.08, 0.08);
                headRef.current.rotation.y = THREE.MathUtils.lerp(headRef.current.rotation.y, 0.2, 0.08);
            } else {
                headRef.current.rotation.x = THREE.MathUtils.lerp(headRef.current.rotation.x, 0, 0.1);
                headRef.current.rotation.y = THREE.MathUtils.lerp(headRef.current.rotation.y, 0, 0.1);
            }
        }
    }

    if (leftArmRef.current && rightArmRef.current && spawned) {
        if (isLeadAgent) {
            leftArmRef.current.rotation.z = THREE.MathUtils.lerp(leftArmRef.current.rotation.z, -0.42, 0.12);
            rightArmRef.current.rotation.z = THREE.MathUtils.lerp(rightArmRef.current.rotation.z, 0.42, 0.12);
            leftArmRef.current.rotation.x = THREE.MathUtils.lerp(leftArmRef.current.rotation.x, -0.12, 0.12);
            rightArmRef.current.rotation.x = THREE.MathUtils.lerp(rightArmRef.current.rotation.x, -0.12, 0.12);
            leftArmRef.current.rotation.y = THREE.MathUtils.lerp(leftArmRef.current.rotation.y, -0.24, 0.12);
            rightArmRef.current.rotation.y = THREE.MathUtils.lerp(rightArmRef.current.rotation.y, 0.24, 0.12);
        } else if (idlePose && idleRole === 'cards') {
            leftArmRef.current.rotation.z = THREE.MathUtils.lerp(leftArmRef.current.rotation.z, -0.65, 0.12);
            leftArmRef.current.rotation.x = THREE.MathUtils.lerp(leftArmRef.current.rotation.x, -0.3, 0.12);
            rightArmRef.current.rotation.z = THREE.MathUtils.lerp(rightArmRef.current.rotation.z, 0.65, 0.12);
            rightArmRef.current.rotation.x = THREE.MathUtils.lerp(rightArmRef.current.rotation.x, -0.3, 0.12);
        } else if (idlePose && idleRole === 'lying') {
            leftArmRef.current.rotation.z = THREE.MathUtils.lerp(leftArmRef.current.rotation.z, -0.12, 0.12);
            rightArmRef.current.rotation.z = THREE.MathUtils.lerp(rightArmRef.current.rotation.z, 0.12, 0.12);
            leftArmRef.current.rotation.x = THREE.MathUtils.lerp(leftArmRef.current.rotation.x, 0.25, 0.12);
            rightArmRef.current.rotation.x = THREE.MathUtils.lerp(rightArmRef.current.rotation.x, 0.25, 0.12);
        } else if (idlePose && idleRole === 'sneak') {
            leftArmRef.current.rotation.z = THREE.MathUtils.lerp(leftArmRef.current.rotation.z, -0.15, 0.1);
            rightArmRef.current.rotation.z = THREE.MathUtils.lerp(rightArmRef.current.rotation.z, 0.7, 0.1);
            leftArmRef.current.rotation.x = THREE.MathUtils.lerp(leftArmRef.current.rotation.x, -0.05, 0.1);
            rightArmRef.current.rotation.x = THREE.MathUtils.lerp(rightArmRef.current.rotation.x, -0.25, 0.1);
        } else if (idlePose && idleRole === 'corner') {
            leftArmRef.current.rotation.z = THREE.MathUtils.lerp(leftArmRef.current.rotation.z, -0.1, 0.1);
            rightArmRef.current.rotation.z = THREE.MathUtils.lerp(rightArmRef.current.rotation.z, 0.1, 0.1);
            leftArmRef.current.rotation.x = THREE.MathUtils.lerp(leftArmRef.current.rotation.x, 0.1, 0.1);
            rightArmRef.current.rotation.x = THREE.MathUtils.lerp(rightArmRef.current.rotation.x, 0.1, 0.1);
        } else {
            const armWave = isTalking ? Math.sin(t * 8) * 0.3 : Math.sin(t * 2) * 0.05;
            leftArmRef.current.rotation.z = armWave - 0.2;
            rightArmRef.current.rotation.z = -armWave + 0.2;
            leftArmRef.current.rotation.x = THREE.MathUtils.lerp(leftArmRef.current.rotation.x, 0, 0.1);
            rightArmRef.current.rotation.x = THREE.MathUtils.lerp(rightArmRef.current.rotation.x, 0, 0.1);
        }
    }

    if (rippleARef.current && rippleBRef.current) {
      const waveA = 1 + Math.sin(t * 2.2) * 0.12;
      const waveB = 1 + Math.sin(t * 2.2 + Math.PI) * 0.12;
      const baseWave = reflectionActive ? 1.02 : 0.96;
      rippleARef.current.scale.setScalar(baseWave * waveA);
      rippleBRef.current.scale.setScalar(baseWave * waveB);

      const matA = rippleARef.current.material as THREE.MeshBasicMaterial;
      const matB = rippleBRef.current.material as THREE.MeshBasicMaterial;
      matA.opacity = reflectionActive ? 0.5 : 0.12;
      matB.opacity = reflectionActive ? 0.36 : 0.08;
    }

    if (isLeadAgent) {
      leadCurrentRingRefs.current.forEach((ring, index) => {
        if (!ring) return;
        ring.rotation.z += delta * (0.28 + index * 0.07);
        ring.rotation.y += delta * (0.15 + index * 0.05);
        const material = ring.material;
        if (material instanceof THREE.MeshStandardMaterial) {
          material.emissiveIntensity = 1.1 + Math.sin(t * 5.8 + index * 1.3) * 0.4 + (isTalking ? 0.3 : 0);
          material.opacity = 0.48 + Math.sin(t * 3.2 + index) * 0.12;
        }
      });

      leadCurrentPathRefs.current.forEach((path, index) => {
        if (!path) return;
        const material = path.material;
        if (material instanceof THREE.MeshStandardMaterial) {
          material.emissiveIntensity = 1.2 + Math.sin(t * 7 + index * 1.4) * 0.6 + (isTalking ? 0.45 : 0);
          material.opacity = 0.72 + Math.sin(t * 4.6 + index) * 0.18;
        }
      });

      leadGyriRefs.current.forEach((ridge, index) => {
        if (!ridge) return;
        const material = ridge.material;
        if (material instanceof THREE.MeshStandardMaterial) {
          material.emissiveIntensity = 0.36 + Math.sin(t * 4.2 + index * 0.8) * 0.12;
        }
      });

      leadSulciRefs.current.forEach((sulcus, index) => {
        if (!sulcus) return;
        const material = sulcus.material;
        if (material instanceof THREE.MeshStandardMaterial) {
          material.emissiveIntensity = 0.08 + Math.sin(t * 3 + index * 0.7) * 0.03;
        }
      });

      leadSparkRefs.current.forEach((spark, index) => {
        if (!spark) return;
        const angle = t * (1.8 + index * 0.4) + index * 2.15;
        const radius = 0.11 + index * 0.05;
        spark.position.set(
          Math.cos(angle) * radius,
          0.79 + Math.sin(angle * 1.4) * 0.08,
          0.02 + Math.sin(angle) * 0.12
        );
        const sparkMaterial = spark.material;
        if (sparkMaterial instanceof THREE.MeshBasicMaterial) {
          sparkMaterial.opacity = 0.55 + Math.sin(t * 8 + index) * 0.25;
        }
      });
    }

    if (bodyRef.current && spawned) {
        const opacity = isSpawning ? (Math.random() > 0.5 ? 0.8 : 0.3) : (isGlitched ? 0.6 : 1);
        if (bodyRef.current.material instanceof THREE.MeshStandardMaterial) {
          bodyRef.current.material.opacity = opacity;
        }
    }
  });

  const renderHeadGeometry = () => {
      if (!isLeadAgent) {
        if (artStyle === 'geometricism') return <dodecahedronGeometry args={[0.35]} />;
        if (artStyle === 'structuralism') return <boxGeometry args={[0.5, 0.46, 0.44]} />;
        if (artStyle === 'expressionism') return <sphereGeometry args={[0.3, 28, 28]} />;
      }
      switch(style.shape) {
          case 'box': return <boxGeometry args={[0.5, 0.5, 0.5]} />;
          case 'octahedron': return <octahedronGeometry args={[0.32]} />;
          case 'dodecahedron': return <dodecahedronGeometry args={[0.32]} />;
          case 'sphere': 
          default: return <sphereGeometry args={[0.28, 32, 32]} />;
      }
  };

  const isHumanFace = style.faceType === 'human';
  const skinTone = style.skinTone || '#f1c7a8';
  const hairColor = style.hairColor || '#312e81';
  const baseColor = theme === AppTheme.CLASSIC ? '#444' : style.color;
  const headColor = isGlitched ? '#ff2222' : (isHumanFace ? skinTone : baseColor);
  const nonLeadHeadScale: [number, number, number] =
    artStyle === 'expressionism'
      ? [1.02, 1.14, 0.94]
      : artStyle === 'structuralism'
        ? [1.06, 1, 0.9]
        : artStyle === 'geometricism'
          ? [1.08, 1.08, 1.08]
          : [1, 1, 1];

  return (
    <group ref={group} onClick={(e) => { e.stopPropagation(); onClick(); }} scale={0}>
      <SpawnBeam active={isSpawning} color={style.color} />
      
      <Float speed={isTalking ? 5 : 2} rotationIntensity={0.2} floatIntensity={0.2}>
          {/* Head */}
          {isLeadAgent ? (
            <>
              <group ref={leadHeadGroupRef}>
                <mesh ref={headRef} position={[0, 0.79, 0.02]} geometry={leadBrainGeometry}>
                  <meshStandardMaterial
                    map={oilTexture}
                    color={isGlitched ? '#b91c1c' : '#0f172a'}
                    metalness={0.18}
                    roughness={0.58}
                    emissive={isGlitched ? '#ef4444' : '#1d4b77'}
                    emissiveIntensity={0.22}
                  />
                </mesh>
                <mesh position={[0, 0.86, 0.06]} scale={[0.44, 0.63, 0.42]}>
                  <sphereGeometry args={[0.22, 36, 36]} />
                  <meshStandardMaterial
                    map={oilTexture}
                    color="#1f3b5b"
                    roughness={0.48}
                    metalness={0.2}
                    emissive="#60a5fa"
                    emissiveIntensity={0.16}
                  />
                </mesh>
                <mesh position={[0, 0.93, 0.15]}>
                  <sphereGeometry args={[0.035, 20, 20]} />
                  <meshStandardMaterial color="#fde68a" emissive="#f59e0b" emissiveIntensity={2.2} roughness={0.14} metalness={0.3} />
                </mesh>
                <mesh position={[-0.06, 0.87, 0.18]} rotation={[0, -0.2, 0]}>
                  <sphereGeometry args={[0.02, 16, 16]} />
                  <meshStandardMaterial color="#ffffff" emissive="#e0f2fe" emissiveIntensity={1.9} roughness={0.08} metalness={0.22} />
                </mesh>
                <mesh position={[0.06, 0.87, 0.18]} rotation={[0, 0.2, 0]}>
                  <sphereGeometry args={[0.02, 16, 16]} />
                  <meshStandardMaterial color="#ffffff" emissive="#e0f2fe" emissiveIntensity={1.9} roughness={0.08} metalness={0.22} />
                </mesh>
                <mesh position={[0, 0.68, 0.02]} rotation={[0.25, 0, 0]}>
                  <capsuleGeometry args={[0.05, 0.24, 8, 14]} />
                  <meshStandardMaterial map={oilTexture} color="#0b1b32" roughness={0.52} metalness={0.18} />
                </mesh>
                {leadBrainGyriCurves.map((curve, index) => (
                  <mesh
                    key={`lead-gyrus-${index}`}
                    ref={(node) => { leadGyriRefs.current[index] = node; }}
                  >
                    <tubeGeometry args={[curve, 68, 0.0075, 8, false]} />
                    <meshStandardMaterial
                      color="#fde68a"
                      roughness={0.38}
                      metalness={0.2}
                      emissive="#f59e0b"
                      emissiveIntensity={0.74}
                      transparent
                      opacity={0.85}
                    />
                  </mesh>
                ))}
                {leadBrainSulciCurves.map((curve, index) => (
                  <mesh
                    key={`lead-sulcus-${index}`}
                    ref={(node) => { leadSulciRefs.current[index] = node; }}
                  >
                    <tubeGeometry args={[curve, 64, 0.01, 8, false]} />
                    <meshStandardMaterial
                      color="#bfdbfe"
                      roughness={0.3}
                      metalness={0.25}
                      emissive="#60a5fa"
                      emissiveIntensity={0.4}
                      transparent
                      opacity={0.72}
                    />
                  </mesh>
                ))}
                {LEAD_CURRENT_RINGS.map((ring, index) => (
                  <mesh
                    key={`lead-current-ring-${index}`}
                    ref={(node) => { leadCurrentRingRefs.current[index] = node; }}
                    position={ring.position}
                    rotation={ring.rotation}
                  >
                    <torusGeometry args={ring.args} />
                    <meshStandardMaterial
                      color="#fde68a"
                      emissive="#f59e0b"
                      emissiveIntensity={1.5}
                      roughness={0.12}
                      metalness={0.62}
                      transparent
                      opacity={0.56}
                    />
                  </mesh>
                ))}
                {leadCurrentCurves.map((curve, index) => (
                  <mesh
                    key={`lead-current-path-${index}`}
                    ref={(node) => { leadCurrentPathRefs.current[index] = node; }}
                  >
                    <tubeGeometry args={[curve, 56, 0.0065, 8, false]} />
                    <meshStandardMaterial
                      color="#fff7ed"
                      emissive="#fb923c"
                      emissiveIntensity={1.65}
                      roughness={0.16}
                      metalness={0.45}
                      transparent
                      opacity={0.86}
                    />
                  </mesh>
                ))}
                {[0, 1, 2].map((index) => (
                  <mesh
                    key={`lead-spark-${index}`}
                    ref={(node) => { leadSparkRefs.current[index] = node; }}
                    position={[0, 0.79, 0.02]}
                  >
                    <sphereGeometry args={[0.024 - index * 0.004, 14, 14]} />
                    <meshBasicMaterial color="#fcd34d" transparent opacity={0.78} />
                  </mesh>
                ))}
                <mesh position={[0, 0.79, 0.03]} scale={[1.06, 0.96, 1.16]}>
                  <sphereGeometry args={[0.29, 56, 56]} />
                  <meshPhysicalMaterial
                    color="#fef3c7"
                    roughness={0.08}
                    metalness={0.3}
                    transparent
                    opacity={0.14}
                    transmission={0.88}
                    thickness={0.2}
                    clearcoat={1}
                    clearcoatRoughness={0.08}
                  />
                </mesh>
              </group>
            </>
          ) : (
            <mesh ref={headRef} position={[0, 0.72, 0]} scale={nonLeadHeadScale}>
              {renderHeadGeometry()}
              <MeshDistortMaterial 
                  map={oilTexture}
                  color={headColor}
                  distort={isSpawning ? artConfig.distort + 0.24 : (isTalking ? artConfig.distort : artConfig.distort * 0.45)}
                  speed={isSpawning ? 6 : (isTalking ? 4.5 : 2.2)}
                  roughness={artConfig.roughness}
                  metalness={artConfig.metalness}
                  emissive={style.color}
                  emissiveIntensity={isTalking ? 0.16 : 0.05}
              />
              {isHumanFace && (
                  <group position={[0, 0.01, 0.24]}>
                      <mesh position={[-0.075, 0.06, 0.02]}>
                          <sphereGeometry args={[0.032, 16, 16]} />
                          <meshStandardMaterial color="#fffaf5" />
                      </mesh>
                      <mesh position={[0.075, 0.06, 0.02]}>
                          <sphereGeometry args={[0.032, 16, 16]} />
                          <meshStandardMaterial color="#fffaf5" />
                      </mesh>
                      <mesh position={[-0.075, 0.06, 0.047]}>
                          <sphereGeometry args={[0.012, 12, 12]} />
                          <meshStandardMaterial color="#111827" />
                      </mesh>
                      <mesh position={[0.075, 0.06, 0.047]}>
                          <sphereGeometry args={[0.012, 12, 12]} />
                          <meshStandardMaterial color="#111827" />
                      </mesh>
                      <mesh position={[-0.12, -0.005, 0.04]}>
                          <sphereGeometry args={[0.018, 12, 12]} />
                          <meshStandardMaterial color="#f9b4c6" transparent opacity={0.65} />
                      </mesh>
                      <mesh position={[0.12, -0.005, 0.04]}>
                          <sphereGeometry args={[0.018, 12, 12]} />
                          <meshStandardMaterial color="#f9b4c6" transparent opacity={0.65} />
                      </mesh>
                      <mesh position={[0, -0.015, 0.04]}>
                          <sphereGeometry args={[0.009, 12, 12]} />
                          <meshStandardMaterial color="#d9a98d" />
                      </mesh>
                      <mesh position={[0, -0.085, 0.03]} rotation={[Math.PI, 0, 0]}>
                          <torusGeometry args={[0.03, 0.0045, 8, 24, Math.PI]} />
                          <meshStandardMaterial color="#7c2d12" />
                      </mesh>
                      <mesh position={[0, 0.17, 0.02]}>
                          <sphereGeometry args={[0.18, 22, 22, 0, Math.PI * 2, 0, Math.PI / 2]} />
                          <meshStandardMaterial color={hairColor} roughness={0.9} metalness={0.1} />
                      </mesh>
                  </group>
              )}
              {style.faceType === 'visor' && (
                  <mesh position={[0, 0.03, 0.22]}>
                      <boxGeometry args={[0.3, 0.06, 0.05]} />
                      <meshStandardMaterial 
                          color="#000" 
                          emissive={isSpawning || isTalking ? style.color : (isGlitched ? "#f00" : "#fff")} 
                          emissiveIntensity={isSpawning ? 10 : (isTalking ? 5 : 0.5)} 
                      />
                  </mesh>
              )}
              {style.faceType === 'monitor' && (
                  <mesh position={[0, 0, 0.2]}>
                      <planeGeometry args={[0.4, 0.3]} />
                      <meshBasicMaterial color="black" />
                      <Html position={[0,0,0.01]} transform scale={0.2} pointerEvents="none">
                          <div className="w-full h-full flex items-center justify-center">
                              <div className={`text-[40px] font-mono font-bold ${isTalking ? 'animate-pulse' : ''}`} style={{color: style.color}}>
                                  {isTalking ? '^ ^' : '- -'}
                              </div>
                          </div>
                      </Html>
                  </mesh>
              )}
              {style.faceType === 'texture' && style.textureUrl && (
                 <React.Suspense fallback={null}>
                    <CustomTextureFace url={style.textureUrl} />
                 </React.Suspense>
              )}
            </mesh>
          )}
          
          {/* Body */}
          {isLeadAgent ? (
            <group>
              <mesh ref={bodyRef} position={[0, 0.14, 0]} rotation={[0.05, 0, 0]}>
                <capsuleGeometry args={[0.14, 0.52, 8, 20]} />
                <meshStandardMaterial
                  map={oilTexture}
                  color="#0a1225"
                  roughness={0.58}
                  metalness={0.16}
                  emissive="#1d4b77"
                  emissiveIntensity={0.3}
                  transparent
                  opacity={0.98}
                />
              </mesh>
              <mesh position={[0, 0.18, 0.16]}>
                <sphereGeometry args={[0.034, 16, 16]} />
                <meshStandardMaterial color="#fde68a" emissive="#f59e0b" emissiveIntensity={2.2} roughness={0.12} metalness={0.3} />
              </mesh>
              <mesh position={[0, 0.02, 0.14]}>
                <sphereGeometry args={[0.026, 16, 16]} />
                <meshStandardMaterial color="#fdba74" emissive="#fb923c" emissiveIntensity={1.8} roughness={0.16} metalness={0.24} />
              </mesh>
              <mesh position={[-0.11, -0.34, 0.02]} rotation={[0.08, 0.1, 0.08]}>
                <capsuleGeometry args={[0.046, 0.36, 6, 12]} />
                <meshStandardMaterial map={oilTexture} color="#0b1428" roughness={0.62} metalness={0.14} />
              </mesh>
              <mesh position={[0.11, -0.34, 0.02]} rotation={[0.08, -0.1, -0.08]}>
                <capsuleGeometry args={[0.046, 0.36, 6, 12]} />
                <meshStandardMaterial map={oilTexture} color="#0b1428" roughness={0.62} metalness={0.14} />
              </mesh>
              <mesh ref={leftArmRef} position={[-0.19, 0.13, 0.12]}>
                <capsuleGeometry args={[0.034, 0.3, 6, 10]} />
                <meshStandardMaterial map={oilTexture} color="#1e3a5f" roughness={0.6} metalness={0.16} emissive="#1e40af" emissiveIntensity={0.2} />
              </mesh>
              <mesh ref={rightArmRef} position={[0.19, 0.13, 0.12]}>
                <capsuleGeometry args={[0.034, 0.3, 6, 10]} />
                <meshStandardMaterial map={oilTexture} color="#1e3a5f" roughness={0.6} metalness={0.16} emissive="#1e40af" emissiveIntensity={0.2} />
              </mesh>
              <mesh position={[0, -0.24, -0.02]} rotation={[0.14, 0, 0]}>
                <torusGeometry args={[0.24, 0.08, 16, 44, Math.PI * 1.9]} />
                <meshStandardMaterial map={oilTexture} color="#172554" roughness={0.64} metalness={0.14} />
              </mesh>
            </group>
          ) : (
            <>
              {style.hasBody && !(idleMode && idleRole === 'pond') && (
                <mesh ref={bodyRef} position={[0, 0.1, 0]}>
                    <capsuleGeometry args={[0.18, 0.5, 4, 12]} />
                    <meshStandardMaterial 
                        map={oilTexture}
                        color={isHumanFace ? style.color : (theme === AppTheme.CLASSIC ? '#555' : "#0a0a0f")}
                        roughness={artConfig.roughness}
                        metalness={artConfig.metalness}
                        transparent 
                        opacity={theme === AppTheme.CLASSIC ? 0.8 : 1}
                    />
                </mesh>
              )}

              {style.hasBody && isHumanFace && !(idleMode && idleRole === 'pond') && (
                <>
                  <mesh position={[-0.09, -0.34, 0]}>
                      <capsuleGeometry args={[0.05, 0.35, 4, 8]} />
                      <meshStandardMaterial map={oilTexture} color="#334155" roughness={artConfig.roughness} metalness={artConfig.metalness * 0.6} />
                  </mesh>
                  <mesh position={[0.09, -0.34, 0]}>
                      <capsuleGeometry args={[0.05, 0.35, 4, 8]} />
                      <meshStandardMaterial map={oilTexture} color="#334155" roughness={artConfig.roughness} metalness={artConfig.metalness * 0.6} />
                  </mesh>
                </>
              )}

              {/* Arms */}
              {style.hasArms && !(idleMode && idleRole === 'pond') && (
                <>
                    <mesh ref={leftArmRef} position={[-0.25, 0.3, 0]}>
                        <capsuleGeometry args={[0.04, 0.3, 4, 8]} />
                        <meshStandardMaterial map={oilTexture} color={isHumanFace ? skinTone : baseColor} roughness={artConfig.roughness} metalness={artConfig.metalness} />
                    </mesh>
                    <mesh ref={rightArmRef} position={[0.25, 0.3, 0]}>
                        <capsuleGeometry args={[0.04, 0.3, 4, 8]} />
                        <meshStandardMaterial map={oilTexture} color={isHumanFace ? skinTone : baseColor} roughness={artConfig.roughness} metalness={artConfig.metalness} />
                    </mesh>
                </>
              )}
            </>
          )}

          {artStyle === 'postmodernism' && (
            <group position={[0, 0.52, 0.24]}>
              <mesh position={[-0.14, 0.05, 0]} rotation={[0.24, -0.3, 0.2]}>
                <boxGeometry args={[0.18, 0.09, 0.012]} />
                <meshStandardMaterial color="#f43f5e" roughness={0.52} metalness={0.18} />
              </mesh>
              <mesh position={[0.12, -0.02, 0.01]} rotation={[-0.18, 0.22, -0.2]}>
                <boxGeometry args={[0.2, 0.1, 0.012]} />
                <meshStandardMaterial color="#0ea5e9" roughness={0.5} metalness={0.2} />
              </mesh>
            </group>
          )}

          {!isLeadAgent && artStyle === 'expressionism' && (
            <mesh position={[0, 0.46, 0.26]} rotation={[0.12, 0, 0]}>
              <planeGeometry args={[0.38, 0.26]} />
              <meshBasicMaterial color="#f97316" transparent opacity={0.22} />
            </mesh>
          )}

          {!isLeadAgent && artStyle === 'eclecticism' && (
            <group position={[0, 0.52, 0.24]}>
              <mesh position={[-0.08, 0.02, 0]} rotation={[0.1, -0.4, 0.4]}>
                <torusGeometry args={[0.06, 0.016, 8, 20]} />
                <meshStandardMaterial color="#a855f7" roughness={0.52} metalness={0.24} />
              </mesh>
              <mesh position={[0.1, -0.03, 0.01]} rotation={[0.18, 0.4, -0.3]}>
                <octahedronGeometry args={[0.06]} />
                <meshStandardMaterial color="#14b8a6" roughness={0.6} metalness={0.18} />
              </mesh>
            </group>
          )}

          {!isLeadAgent && artStyle === 'structuralism' && (
            <group position={[0, 0.26, 0]}>
              <mesh position={[0, 0.08, 0.22]}>
                <boxGeometry args={[0.36, 0.22, 0.01]} />
                <meshBasicMaterial color="#cbd5e1" transparent opacity={0.1} />
              </mesh>
              <mesh position={[0, 0.08, 0.221]}>
                <ringGeometry args={[0.09, 0.1, 24]} />
                <meshBasicMaterial color="#22d3ee" transparent opacity={0.4} />
              </mesh>
            </group>
          )}

          {!isLeadAgent && artStyle === 'geometricism' && (
            <group position={[0, 0.46, 0.2]}>
              <mesh position={[-0.09, 0.04, 0]} rotation={[0.24, 0.4, 0.2]}>
                <tetrahedronGeometry args={[0.07]} />
                <meshStandardMaterial color="#8b5cf6" roughness={0.52} metalness={0.3} />
              </mesh>
              <mesh position={[0.1, -0.02, 0]} rotation={[-0.2, -0.3, 0.1]}>
                <icosahedronGeometry args={[0.065]} />
                <meshStandardMaterial color="#f59e0b" roughness={0.5} metalness={0.32} />
              </mesh>
            </group>
          )}

          <group position={[0, -0.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <mesh>
              <circleGeometry args={[0.46, 48]} />
              <MeshReflectorMaterial
                blur={[140, 40]}
                resolution={512}
                mixBlur={0.8}
                mixStrength={reflectionActive ? 35 : 15}
                roughness={0.45}
                depthScale={0.2}
                minDepthThreshold={0.4}
                maxDepthThreshold={1.2}
                color={reflectionActive ? '#2dd4bf' : '#17303a'}
                metalness={0.2}
                mirror={0.8}
              />
            </mesh>
            <mesh ref={rippleARef} position={[0, 0.002, 0]}>
              <ringGeometry args={[0.12, 0.17, 48]} />
              <meshBasicMaterial color="#67e8f9" transparent opacity={0.12} side={THREE.DoubleSide} />
            </mesh>
            <mesh ref={rippleBRef} position={[0, 0.003, 0]}>
              <ringGeometry args={[0.22, 0.28, 48]} />
              <meshBasicMaterial color="#22d3ee" transparent opacity={0.08} side={THREE.DoubleSide} />
            </mesh>
          </group>
          {functionScripts.length > 0 && (
            <Html position={[0, -0.44, 0]} center distanceFactor={7.2} pointerEvents="none">
              <ReflectionFunctionDisplay active={reflectionActive} scripts={functionScripts} />
            </Html>
          )}

          {idleMode && idleRole === 'cards' && (
            <group position={[0, 0.18, 0.24]} rotation={[-0.9, 0, 0]}>
              <mesh>
                <boxGeometry args={[0.12, 0.17, 0.008]} />
                <meshStandardMaterial color="#f8fafc" roughness={0.9} metalness={0.05} />
              </mesh>
              <mesh position={[0, 0.01, 0.005]}>
                <planeGeometry args={[0.08, 0.12]} />
                <meshBasicMaterial color="#0ea5e9" transparent opacity={0.75} />
              </mesh>
            </group>
          )}

          {/* Data Halo (Only show in Cyberpunk/Tech themes) */}
          {(theme === AppTheme.CYBERPUNK || theme === AppTheme.REALISTIC) && (
              <group position={[0, 0.65, 0]}>
                <mesh rotation={[Math.PI/2, 0, 0]}>
                    <ringGeometry args={[0.35, 0.37, 48]} />
                    <meshBasicMaterial color={style.color} transparent opacity={0.4} side={THREE.DoubleSide} />
                </mesh>
                {(isTalking || isSpawning) && (
                    <mesh rotation={[Math.PI/2, 0, 0]}>
                    <ringGeometry args={[0.4, 0.42, 48]} />
                    <MeshWobbleMaterial color={style.color} factor={isSpawning ? 2 : 0.8} speed={isSpawning ? 5 : 3} transparent opacity={0.6} />
                    </mesh>
                )}
            </group>
          )}

          {/* Information Tags */}
          <Html position={[0, 1.2, 0]} center distanceFactor={8}>
            <div className={`flex flex-col items-center pointer-events-none select-none transition-all duration-1000 ${spawned && !isSpawning ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                <div className={`px-3 py-1 ${theme === AppTheme.CLASSIC ? 'bg-white border-black text-black' : 'bg-black/90 border-white/20 text-white'} border rounded-full text-[10px] font-bold tracking-tighter whitespace-nowrap shadow-2xl mb-1 flex items-center gap-2 ${isSpawning ? 'animate-pulse' : ''}`} style={theme === AppTheme.CLASSIC ? {} : { color: style.color }}>
                    <span>{name}</span>
                    {!idleMode && (
                      <>
                        <span className="opacity-50">|</span>
                        <span className="text-[8px] font-mono opacity-80 max-w-[170px] truncate">{role}</span>
                      </>
                    )}
                </div>
                {speechText && (
                    <div className={`${theme === AppTheme.CLASSIC ? 'bg-black text-white' : 'bg-white/95 backdrop-blur-md text-black'} px-4 py-2 rounded-2xl rounded-bl-none shadow-2xl animate-bounce-slow border border-white/20`}>
                        <p className="text-[10px] font-bold font-sans leading-tight whitespace-normal w-40">
                           {speechText}
                        </p>
                    </div>
                )}
            </div>
          </Html>
      </Float>
    </group>
  );
};

interface SceneProps {
    onAgentClick: (agentId?: string) => void;
    isProcessing: boolean;
    isGlitched?: boolean;
    activeAgent?: ModelProvider | 'System';
    agentSpeech?: string | null;
    agentStyles?: AgentStyle[];
    theme: AppTheme;
    idleMode?: boolean;
}

interface SceneErrorBoundaryState {
  hasError: boolean;
}

class SceneErrorBoundary extends React.Component<{ children: React.ReactNode }, SceneErrorBoundaryState> {
  state: SceneErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): SceneErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('AgentScene render error:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-[#010103] text-slate-300 text-sm px-4 text-center">
          3D scene unavailable on this device. Core controls remain accessible.
        </div>
      );
    }
    return this.props.children;
  }
}

const SceneFallback: React.FC = () => (
  <div className="w-full h-full flex items-center justify-center bg-[#010103] text-slate-300 text-sm px-4 text-center">
    3D scene unavailable on this device. Core controls remain accessible.
  </div>
);

type SkyPhase = 'sunrise' | 'day' | 'sunset' | 'night';
interface SkyState {
  phase: SkyPhase;
  cycle: number;
}

const SKY_COLOR: Record<SkyPhase, string> = {
  sunrise: '#f9c58f',
  day: '#b8dcff',
  sunset: '#f2a17b',
  night: '#081226',
};

const getSkyState = (now: Date): SkyState => {
  const hour = now.getHours() + now.getMinutes() / 60;
  if (hour >= 5 && hour < 7) {
    return { phase: 'sunrise', cycle: (hour - 5) / 2 };
  }
  if (hour >= 7 && hour < 17) {
    return { phase: 'day', cycle: (hour - 7) / 10 };
  }
  if (hour >= 17 && hour < 19) {
    return { phase: 'sunset', cycle: (hour - 17) / 2 };
  }
  const nightCycle = hour >= 19 ? (hour - 19) / 10 : (hour + 5) / 10;
  return { phase: 'night', cycle: Math.max(0, Math.min(1, nightCycle)) };
};

const SunDeity: React.FC<{ position: [number, number, number]; phase: SkyPhase }> = ({ position, phase }) => {
  const coreColor = phase === 'sunset' ? '#ffad76' : phase === 'sunrise' ? '#ffd58a' : '#ffe07a';
  const auraColor = phase === 'sunset' ? '#ff8c66' : '#ffcf5c';

  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[0.58, 32, 32]} />
        <meshBasicMaterial color={coreColor} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.72, 0.86, 48]} />
        <meshBasicMaterial color={auraColor} transparent opacity={0.8} side={THREE.DoubleSide} />
      </mesh>
      {Array.from({ length: 10 }).map((_, index) => {
        const angle = (index / 10) * Math.PI * 2;
        const x = Math.cos(angle) * 1.02;
        const y = Math.sin(angle) * 1.02;
        return (
          <mesh key={`sun-ray-${index}`} position={[x, y, 0]} rotation={[0, 0, angle - Math.PI / 2]}>
            <coneGeometry args={[0.08, 0.34, 8]} />
            <meshBasicMaterial color={auraColor} />
          </mesh>
        );
      })}

      {/* Sun deity face */}
      <mesh position={[-0.15, 0.09, 0.54]}>
        <sphereGeometry args={[0.055, 12, 12]} />
        <meshBasicMaterial color="#5b3a1d" />
      </mesh>
      <mesh position={[0.15, 0.09, 0.54]}>
        <sphereGeometry args={[0.055, 12, 12]} />
        <meshBasicMaterial color="#5b3a1d" />
      </mesh>
      <mesh position={[0, -0.02, 0.56]}>
        <sphereGeometry args={[0.03, 12, 12]} />
        <meshBasicMaterial color="#8f5a2a" />
      </mesh>
      <mesh position={[0, -0.2, 0.54]} rotation={[Math.PI, 0, 0]}>
        <torusGeometry args={[0.16, 0.018, 8, 20, Math.PI]} />
        <meshBasicMaterial color="#8f5a2a" />
      </mesh>

      {/* Crown */}
      <mesh position={[0, 0.43, 0.52]}>
        <torusGeometry args={[0.24, 0.03, 10, 22]} />
        <meshBasicMaterial color="#fbbf24" />
      </mesh>
      {[-0.16, 0, 0.16].map((x, idx) => (
        <mesh key={`sun-crown-${idx}`} position={[x, 0.6, 0.54]}>
          <coneGeometry args={[0.05, 0.15, 8]} />
          <meshBasicMaterial color="#f59e0b" />
        </mesh>
      ))}
    </group>
  );
};

const TimeSky: React.FC<{ sky: SkyState }> = ({ sky }) => {
  const isNight = sky.phase === 'night';
  const sunPos =
    sky.phase === 'sunrise'
      ? [-9 + sky.cycle * 8, 1 + sky.cycle * 4, -10]
      : sky.phase === 'day'
        ? [-1 + Math.sin(sky.cycle * Math.PI) * 2, 7.5, -11]
        : [0 + sky.cycle * 8, 4.8 - sky.cycle * 3.8, -10];
  const moonPos: [number, number, number] = [7 - sky.cycle * 12, 5 + Math.sin(sky.cycle * Math.PI) * 1.5, -10];

  return (
    <>
      <color attach="background" args={[SKY_COLOR[sky.phase]]} />
      <fog attach="fog" args={[SKY_COLOR[sky.phase], 7, 30]} />
      <ambientLight intensity={isNight ? 0.28 : 0.62} color={isNight ? '#9fb0d1' : '#fff4d6'} />
      <directionalLight
        position={isNight ? [2, 3, 2] : [6, 10, 5]}
        intensity={isNight ? 0.32 : 1.25}
        color={isNight ? '#9ab6ff' : '#ffd58f'}
      />
      {!isNight && (
        <SunDeity position={sunPos as [number, number, number]} phase={sky.phase} />
      )}
      {isNight && (
        <>
          <mesh position={moonPos}>
            <sphereGeometry args={[0.42, 24, 24]} />
            <meshBasicMaterial color="#dbeafe" />
          </mesh>
          <Stars radius={120} depth={70} count={2500} factor={4} saturation={0} fade speed={0.25} />
        </>
      )}
    </>
  );
};

const SHANHAI_MOUNTAINS: Array<{
  position: [number, number, number];
  scale: [number, number, number];
  colorDay: string;
  colorNight: string;
}> = [
  { position: [-10.5, 1.2, -15], scale: [3.6, 5.6, 3.4], colorDay: '#536652', colorNight: '#1b2830' },
  { position: [-6.8, 1.0, -13.5], scale: [2.8, 4.6, 2.6], colorDay: '#607260', colorNight: '#263545' },
  { position: [-2.5, 1.1, -14.2], scale: [3.2, 5.2, 3.1], colorDay: '#4e6150', colorNight: '#1e2d36' },
  { position: [2.8, 1.0, -14.4], scale: [3.1, 4.8, 2.8], colorDay: '#5c6f5a', colorNight: '#273643' },
  { position: [7.2, 1.2, -13.8], scale: [3.3, 5.4, 3.2], colorDay: '#526550', colorNight: '#1d2a35' },
  { position: [11.2, 0.95, -15.2], scale: [2.7, 4.2, 2.6], colorDay: '#61735f', colorNight: '#273746' },
];

const SHANHAI_FLOATING_ISLANDS: Array<{ position: [number, number, number]; rotation: [number, number, number] }> = [
  { position: [-4.8, 3.4, -8], rotation: [0.25, 0.5, 0.2] },
  { position: [0.5, 4.2, -9], rotation: [0.18, -0.4, 0.1] },
  { position: [5.3, 3.6, -8.5], rotation: [0.22, 0.35, -0.18] },
];

const ShanhaiRealm: React.FC<{ sky: SkyState }> = ({ sky }) => {
  const isNight = sky.phase === 'night';
  const mistRefs = useRef<Array<THREE.Mesh | null>>([]);
  const glowRefs = useRef<Array<THREE.Mesh | null>>([]);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    mistRefs.current.forEach((mist, index) => {
      if (!mist) return;
      mist.position.x += Math.sin(t * 0.2 + index) * delta * 0.08;
      mist.position.z += Math.cos(t * 0.16 + index) * delta * 0.05;
      const mat = mist.material;
      if (mat instanceof THREE.MeshBasicMaterial) {
        mat.opacity = (isNight ? 0.2 : 0.16) + Math.sin(t * 0.9 + index) * 0.05;
      }
    });

    glowRefs.current.forEach((glow, index) => {
      if (!glow) return;
      glow.position.y += Math.sin(t * 0.8 + index * 2) * delta * 0.08;
      const mat = glow.material;
      if (mat instanceof THREE.MeshBasicMaterial) {
        mat.opacity = (isNight ? 0.8 : 0.45) + Math.sin(t * 3.2 + index) * 0.2;
      }
    });
  });

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.54, 0]}>
        <circleGeometry args={[24, 96]} />
        <meshStandardMaterial color={isNight ? '#071419' : '#263526'} roughness={0.98} metalness={0.04} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.51, -0.6]}>
        <circleGeometry args={[8.6, 96]} />
        <meshStandardMaterial
          color={isNight ? '#0c2f3a' : '#3b8792'}
          roughness={0.24}
          metalness={0.18}
          transparent
          opacity={0.72}
        />
      </mesh>

      {SHANHAI_MOUNTAINS.map((mountain, index) => (
        <group key={`shanhai-mountain-${index}`} position={mountain.position} scale={mountain.scale}>
          <mesh>
            <coneGeometry args={[1.25, 2.6, 7]} />
            <meshStandardMaterial
              color={isNight ? mountain.colorNight : mountain.colorDay}
              roughness={0.88}
              metalness={0.04}
            />
          </mesh>
          <mesh position={[0, 1.1, 0]}>
            <dodecahedronGeometry args={[0.42, 0]} />
            <meshStandardMaterial color={isNight ? '#2a4152' : '#7f9b7f'} roughness={0.9} metalness={0.05} />
          </mesh>
        </group>
      ))}

      {SHANHAI_FLOATING_ISLANDS.map((island, index) => (
        <group key={`shanhai-island-${index}`} position={island.position} rotation={island.rotation}>
          <mesh>
            <dodecahedronGeometry args={[0.55, 0]} />
            <meshStandardMaterial color={isNight ? '#14202d' : '#3f4f3f'} roughness={0.86} metalness={0.1} />
          </mesh>
          <mesh position={[0, -0.24, 0]}>
            <coneGeometry args={[0.22, 0.54, 6]} />
            <meshStandardMaterial color={isNight ? '#0f172a' : '#475569'} roughness={0.8} metalness={0.12} />
          </mesh>
        </group>
      ))}

      <group position={[5.7, -0.47, -6.4]}>
        <mesh position={[0, 0.64, 0]}>
          <cylinderGeometry args={[0.14, 0.2, 1.28, 12]} />
          <meshStandardMaterial color="#5b4632" roughness={0.92} metalness={0.02} />
        </mesh>
        <mesh position={[0, 1.3, 0]}>
          <sphereGeometry args={[0.46, 20, 20]} />
          <meshStandardMaterial color={isNight ? '#3f6a5f' : '#6f9f7d'} roughness={0.85} metalness={0.04} />
        </mesh>
        {[-0.26, 0.22].map((offset, index) => (
          <mesh key={`tree-branch-${index}`} position={[offset, 1.02, 0]} rotation={[0, 0, offset > 0 ? -0.55 : 0.55]}>
            <capsuleGeometry args={[0.05, 0.48, 4, 8]} />
            <meshStandardMaterial color="#6b523d" roughness={0.9} metalness={0.03} />
          </mesh>
        ))}
      </group>

      <group position={[-5.8, -0.5, -5.6]}>
        <mesh>
          <cylinderGeometry args={[0.19, 0.24, 1.1, 16]} />
          <meshStandardMaterial color="#6b7280" roughness={0.86} metalness={0.08} />
        </mesh>
        <mesh position={[0, 0.58, 0]}>
          <torusGeometry args={[0.26, 0.05, 12, 24]} />
          <meshStandardMaterial color="#9ca3af" roughness={0.68} metalness={0.22} />
        </mesh>
      </group>

      {[
        [-4.5, 0.3, -5.5],
        [-1.7, 0.35, -7.2],
        [1.6, 0.33, -6.8],
        [4.2, 0.3, -5.9],
      ].map((position, index) => (
        <mesh key={`mist-${index}`} ref={(node) => { mistRefs.current[index] = node; }} position={position as [number, number, number]}>
          <sphereGeometry args={[index % 2 === 0 ? 1.1 : 0.9, 24, 24]} />
          <meshBasicMaterial color={isNight ? '#bfdbfe' : '#ecfeff'} transparent opacity={isNight ? 0.2 : 0.16} />
        </mesh>
      ))}

      {(isNight ? [0, 1, 2, 3, 4, 5] : [0, 1, 2]).map((index) => {
        const x = -3 + index * 1.2;
        const z = -4.2 - (index % 2) * 1.1;
        const y = 0.55 + (index % 3) * 0.2;
        return (
          <mesh key={`glow-${index}`} ref={(node) => { glowRefs.current[index] = node; }} position={[x, y, z]}>
            <sphereGeometry args={[0.05, 10, 10]} />
            <meshBasicMaterial color={isNight ? '#fde68a' : '#bae6fd'} transparent opacity={isNight ? 0.8 : 0.45} />
          </mesh>
        );
      })}
    </group>
  );
};

const EnvironmentManager: React.FC<{ theme: AppTheme; sky: SkyState }> = ({ theme, sky }) => {
  const themedLayer = (() => {
    switch (theme) {
      case AppTheme.CLASSIC:
        return (
          <>
            <hemisphereLight args={['#fff7ed', '#1f2937', 0.5]} />
            <ContactShadows resolution={1024} scale={50} blur={2} opacity={0.35} far={10} color="#000" />
          </>
        );
      case AppTheme.RENAISSANCE:
        return (
          <>
            <spotLight position={[5, 10, 5]} angle={0.5} penumbra={1} intensity={2.6} color="#ffd07b" castShadow />
            <pointLight position={[-5, 2, -5]} intensity={0.7} color="#ff8f7a" />
            <Environment preset="sunset" blur={0.8} background={false} />
            <ContactShadows resolution={1024} scale={50} blur={2.5} opacity={0.6} far={10} color="#000" />
          </>
        );
      case AppTheme.REALISTIC:
        return (
          <>
            <Environment preset="city" background={false} blur={0.6} />
            <directionalLight position={[-5, 5, 5]} intensity={1.4} castShadow />
            <ContactShadows resolution={1024} scale={24} blur={2.5} opacity={0.45} far={10} color="#000" />
          </>
        );
      case AppTheme.OIL_PAINTING:
        return (
          <>
            <Environment preset="park" blur={1} background={false} />
            <spotLight position={[0, 10, 0]} intensity={2.4} color="#fff2c4" castShadow />
            <mesh position={[0, 0, -10]} scale={[20, 10, 1]}>
              <planeGeometry />
              <meshBasicMaterial color="#3e2723" transparent opacity={0.45} />
            </mesh>
            <ContactShadows resolution={512} scale={20} blur={3} opacity={0.8} color="#1a0f0a" />
          </>
        );
      case AppTheme.CYBERPUNK:
      default:
        return (
          <>
            <pointLight position={[10, 15, 10]} intensity={1.2} color="#38bdf8" />
            <spotLight position={[-5, 12, 5]} intensity={2.1} angle={0.3} penumbra={1} color="#38bdf8" castShadow />
            <ContactShadows resolution={1024} scale={20} blur={2.5} opacity={0.6} far={10} color="#000" />
          </>
        );
    }
  })();

  return (
    <>
      <TimeSky sky={sky} />
      <ShanhaiRealm sky={sky} />
      {themedLayer}
    </>
  );
};

const AgentScene: React.FC<SceneProps> = ({ 
    onAgentClick, 
    isProcessing, 
    isGlitched, 
    activeAgent,
    agentSpeech,
    agentStyles = [],
    theme,
    idleMode = false
}) => {
  const [webglAvailable, setWebglAvailable] = useState(true);
  const [sky, setSky] = useState<SkyState>(() => getSkyState(new Date()));
  const [cameraFocusedAgentId, setCameraFocusedAgentId] = useState<string | undefined>(undefined);

  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const context =
        canvas.getContext('webgl2') ||
        canvas.getContext('webgl') ||
        canvas.getContext('experimental-webgl');
      if (!context) setWebglAvailable(false);
    } catch (error) {
      console.error('WebGL capability check failed:', error);
      setWebglAvailable(false);
    }
  }, []);

  useEffect(() => {
    const syncSky = () => setSky(getSkyState(new Date()));
    syncSky();
    const timer = setInterval(syncSky, 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  const getStyle = (profileId: string): AgentStyle => {
      const found = agentStyles.find(s => s.id === profileId);
      if (found) return found;
      const profile = AGENT_PROFILES.find(item => item.id === profileId);
      if (!profile) {
        return {
          id: profileId,
          color: '#38bdf8',
          shape: 'sphere',
          hasBody: true,
          hasArms: true,
          faceType: 'human',
          skinTone: '#f1c7a8',
          hairColor: '#312e81'
        };
      }
      return { id: profile.id, ...profile.defaultStyle };
  };

  const activeAgentId = activeAgent && activeAgent !== 'System' ? MODEL_TO_AGENT_ID[activeAgent] : undefined;
  const isIdleStaging = idleMode && !isProcessing;
  const idleStaging = useMemo(
    () => ({
      'AGT-001': { position: [-0.72, 0.38, 1.05] as [number, number, number], role: 'cards' as const, lookTarget: [0.72, 0.38, 1.05] as [number, number, number] },
      'AGT-002': { position: [0.72, 0.38, 1.05] as [number, number, number], role: 'cards' as const, lookTarget: [-0.72, 0.38, 1.05] as [number, number, number] },
      'AGT-003': { position: [-3.05, 0.4, -2.25] as [number, number, number], role: 'pond' as const, lookTarget: [0, 0.2, 1] as [number, number, number] },
      'AGT-004': { position: [2.55, 0.14, -2.05] as [number, number, number], role: 'lying' as const, lookTarget: [1.2, 0.2, -1.4] as [number, number, number] },
      'AGT-005': { position: [-1.9, 0.28, -1.2] as [number, number, number], role: 'sneak' as const, lookTarget: [0, 0.38, 1.05] as [number, number, number] },
    }),
    []
  );
  const renderAgents = useMemo(
    () =>
      AGENT_PROFILES.map((profile) => {
        const idleConfig = isIdleStaging ? idleStaging[profile.id as keyof typeof idleStaging] : undefined;
        return {
          profile,
          idleConfig,
          position: idleConfig?.position || profile.scenePosition,
        };
      }),
    [idleStaging, isIdleStaging]
  );
  const cameraTargets = useMemo(
    () => renderAgents.map((item) => ({ id: item.profile.id, position: item.position })),
    [renderAgents]
  );
  const handleCameraFocusChange = useCallback((id?: string) => {
    setCameraFocusedAgentId((prev) => (prev === id ? prev : id));
  }, []);

  if (!webglAvailable) {
    return <SceneFallback />;
  }

  return (
    <SceneErrorBoundary>
      <div className="w-full h-full">
          <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 2, 7], fov: 40 }}>
              <EnvironmentManager theme={theme} sky={sky} />
              <CameraFocusTracker targets={cameraTargets} onFocusChange={handleCameraFocusChange} />

              {renderAgents.map(({ profile, idleConfig, position }) => {
                const isFocused = cameraFocusedAgentId === profile.id;
                return (
                  <AgentAvatar
                    key={profile.id}
                    name={`${profile.codename} · ${profile.displayName}`}
                    role={profile.role}
                    style={getStyle(profile.id)}
                    position={position}
                    isTalking={isProcessing && activeAgentId === profile.id}
                    isGlitched={isGlitched}
                    speechText={activeAgentId === profile.id ? agentSpeech : null}
                    scale={profile.scale}
                    onClick={() => onAgentClick(profile.id)}
                    delayIndex={profile.delayIndex}
                    theme={theme}
                    idleMode={isIdleStaging}
                    idleRole={idleConfig?.role}
                    lookTarget={idleConfig?.lookTarget}
                    reflectionActive={isFocused || (isProcessing && activeAgentId === profile.id)}
                    functionScripts={AGENT_FUNCTION_SCRIPT[profile.id]}
                  />
                );
              })}

              {isIdleStaging && (
                <>
                  <group position={[0, -0.42, 1.05]}>
                    <mesh position={[0, 0.06, 0]}>
                      <cylinderGeometry args={[0.55, 0.62, 0.12, 28]} />
                      <meshStandardMaterial color="#7c5a3d" roughness={0.8} metalness={0.1} />
                    </mesh>
                    <mesh position={[-0.09, 0.13, 0.02]} rotation={[-Math.PI / 2 + 0.04, 0, 0.2]}>
                      <planeGeometry args={[0.16, 0.24]} />
                      <meshStandardMaterial color="#f8fafc" roughness={0.9} metalness={0.05} />
                    </mesh>
                    <mesh position={[0.08, 0.13, -0.01]} rotation={[-Math.PI / 2 + 0.03, 0, -0.18]}>
                      <planeGeometry args={[0.16, 0.24]} />
                      <meshStandardMaterial color="#f8fafc" roughness={0.9} metalness={0.05} />
                    </mesh>
                  </group>
                  <group position={[-3.05, -0.47, -2.25]}>
                    <mesh>
                      <cylinderGeometry args={[0.7, 0.7, 0.12, 28]} />
                      <meshStandardMaterial color="#324f3b" roughness={1} metalness={0} />
                    </mesh>
                    <mesh position={[0, 0.04, 0]}>
                      <cylinderGeometry args={[0.55, 0.55, 0.04, 28]} />
                      <meshStandardMaterial color="#4cc9f0" transparent opacity={0.7} metalness={0.1} roughness={0.2} />
                    </mesh>
                  </group>
                </>
              )}

              <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
                  <mesh position={[-4, 5, -5]}>
                      <octahedronGeometry args={[0.12]} />
                      <meshStandardMaterial color={theme === AppTheme.CLASSIC ? "#555" : "#38bdf8"} emissive={theme === AppTheme.CLASSIC ? "#000" : "#38bdf8"} emissiveIntensity={theme === AppTheme.CLASSIC ? 0 : 2} />
                  </mesh>
                  <mesh position={[4, 6, -3]}>
                      <octahedronGeometry args={[0.18]} />
                      <meshStandardMaterial color={theme === AppTheme.CLASSIC ? "#555" : "#f59e0b"} emissive={theme === AppTheme.CLASSIC ? "#000" : "#f59e0b"} emissiveIntensity={theme === AppTheme.CLASSIC ? 0 : 2} />
                  </mesh>
              </Float>

              <OrbitControls 
                  enablePan={false} 
                  minPolarAngle={Math.PI/6} 
                  maxPolarAngle={Math.PI/2.15} 
                  minDistance={5} 
                  maxDistance={12} 
                  makeDefault
              />
          </Canvas>
      </div>
    </SceneErrorBoundary>
  );
};

export default AgentScene;
