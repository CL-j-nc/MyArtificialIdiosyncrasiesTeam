
import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Canvas, useFrame, ThreeElements, useLoader } from '@react-three/fiber';
import { 
    OrbitControls, 
    Environment, 
    ContactShadows, 
    Float, 
    Grid,
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

const AgentAvatar: React.FC<AgentProps> = ({ name, role, style, position, isTalking, isGlitched, onClick, scale = 1, speechText, delayIndex = 0, theme }) => {
  const group = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Mesh>(null);
  const bodyRef = useRef<THREE.Mesh>(null);
  const leftArmRef = useRef<THREE.Mesh>(null);
  const rightArmRef = useRef<THREE.Mesh>(null);
  
  const [spawned, setSpawned] = useState(false);
  const [isSpawning, setIsSpawning] = useState(false);
  const animationTime = useRef(0);
  
  // Spring physics state
  const velocity = useRef(new THREE.Vector3(0, 0, 0));
  
  const targetPos = useMemo(() => new THREE.Vector3(...position), [position]);
  const initialPos = useMemo(() => new THREE.Vector3(position[0], position[1] - 8, position[2]), [position]); 

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
        
        const hoverY = Math.sin(t * 1.5 + position[0]) * 0.05;
        const currentTargetY = targetPos.y + hoverY;

        const dispY = currentTargetY - group.current.position.y;
        const accelY = (dispY * k) - (velocity.current.y * d);
        velocity.current.y += accelY * delta;
        group.current.position.y += velocity.current.y * delta;

        // Smooth Lerp for X and Z
        group.current.position.x = THREE.MathUtils.lerp(group.current.position.x, targetPos.x, 0.1);
        group.current.position.z = THREE.MathUtils.lerp(group.current.position.z, targetPos.z, 0.1);
        
        // --- Scale Animation using Bezier ---
        const baseScale = easeVal * scale;
        const targetScaleVal = isSpawning ? baseScale * 1.3 : baseScale;
        
        group.current.scale.lerp(new THREE.Vector3(targetScaleVal, targetScaleVal, targetScaleVal), 0.15);
        
        // Rotation alignment
        group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, state.mouse.x * 0.25, 0.1);
    }
    
    if (headRef.current && spawned) {
        const flicker = isSpawning ? (Math.random() > 0.5 ? 1.2 : 0.8) : 1;
        
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
        } else {
            headRef.current.rotation.x = THREE.MathUtils.lerp(headRef.current.rotation.x, 0, 0.1);
            headRef.current.rotation.y = THREE.MathUtils.lerp(headRef.current.rotation.y, 0, 0.1);
        }
    }

    if (leftArmRef.current && rightArmRef.current && spawned) {
        const armWave = isTalking ? Math.sin(t * 8) * 0.3 : Math.sin(t * 2) * 0.05;
        leftArmRef.current.rotation.z = armWave - 0.2;
        rightArmRef.current.rotation.z = -armWave + 0.2;
    }

    if (bodyRef.current && spawned) {
        const opacity = isSpawning ? (Math.random() > 0.5 ? 0.8 : 0.3) : (isGlitched ? 0.6 : 1);
        if (bodyRef.current.material instanceof THREE.MeshStandardMaterial) {
          bodyRef.current.material.opacity = opacity;
        }
    }
  });

  const renderHeadGeometry = () => {
      switch(style.shape) {
          case 'box': return <boxGeometry args={[0.5, 0.5, 0.5]} />;
          case 'octahedron': return <octahedronGeometry args={[0.3]} />;
          case 'dodecahedron': return <dodecahedronGeometry args={[0.3]} />;
          case 'sphere': 
          default: return <sphereGeometry args={[0.25, 32, 32]} />;
      }
  };

  // Determine material properties based on theme
  const getMaterialProps = () => {
    switch (theme) {
        case AppTheme.REALISTIC: return { metalness: 0.9, roughness: 0.1, envMapIntensity: 1 };
        case AppTheme.OIL_PAINTING: return { metalness: 0.0, roughness: 1.0, envMapIntensity: 0.2, flatShading: true };
        case AppTheme.CLASSIC: return { metalness: 0.1, roughness: 0.5 };
        case AppTheme.RENAISSANCE: return { metalness: 0.8, roughness: 0.3, envMapIntensity: 1.5 };
        default: return { metalness: 0.8, roughness: 0.1 };
    }
  };

  const matProps = getMaterialProps();
  const isHumanFace = style.faceType === 'human';
  const skinTone = style.skinTone || '#f1c7a8';
  const hairColor = style.hairColor || '#312e81';
  const baseColor = theme === AppTheme.CLASSIC ? '#444' : style.color;
  const headColor = isGlitched ? '#ff2222' : (isHumanFace ? skinTone : baseColor);

  return (
    <group ref={group} onClick={(e) => { e.stopPropagation(); onClick(); }} scale={0}>
      <SpawnBeam active={isSpawning} color={style.color} />
      
      <Float speed={isTalking ? 5 : 2} rotationIntensity={0.2} floatIntensity={0.2}>
          {/* Head */}
          <mesh ref={headRef} position={[0, 0.65, 0]}>
            {renderHeadGeometry()}
            <MeshDistortMaterial 
                color={headColor} 
                distort={isHumanFace ? (isSpawning ? 0.25 : (isTalking ? 0.12 : 0)) : (isSpawning ? 0.8 : (isTalking ? 0.4 : 0))} 
                speed={isSpawning ? 6 : (isTalking ? 4 : 2)} 
                {...matProps}
            />
            {isHumanFace && (
                <group position={[0, 0.02, 0.23]}>
                    <mesh position={[-0.07, 0.05, 0.02]}>
                        <sphereGeometry args={[0.03, 16, 16]} />
                        <meshStandardMaterial color="#fffaf5" />
                    </mesh>
                    <mesh position={[0.07, 0.05, 0.02]}>
                        <sphereGeometry args={[0.03, 16, 16]} />
                        <meshStandardMaterial color="#fffaf5" />
                    </mesh>
                    <mesh position={[-0.07, 0.05, 0.045]}>
                        <sphereGeometry args={[0.014, 12, 12]} />
                        <meshStandardMaterial color="#111827" />
                    </mesh>
                    <mesh position={[0.07, 0.05, 0.045]}>
                        <sphereGeometry args={[0.014, 12, 12]} />
                        <meshStandardMaterial color="#111827" />
                    </mesh>
                    <mesh position={[0, -0.02, 0.04]}>
                        <sphereGeometry args={[0.011, 12, 12]} />
                        <meshStandardMaterial color="#d9a98d" />
                    </mesh>
                    <mesh position={[0, -0.08, 0.03]} rotation={[Math.PI * 0.1, 0, 0]}>
                        <torusGeometry args={[0.035, 0.006, 8, 18, Math.PI]} />
                        <meshStandardMaterial color="#7f1d1d" />
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
          
          {/* Body */}
          {style.hasBody && (
            <mesh ref={bodyRef} position={[0, 0.1, 0]}>
                <capsuleGeometry args={[0.18, 0.5, 4, 12]} />
                <meshStandardMaterial 
                    color={isHumanFace ? style.color : (theme === AppTheme.CLASSIC ? '#555' : "#0a0a0f")} 
                    roughness={isHumanFace ? 0.85 : (theme === AppTheme.REALISTIC ? 0.2 : 0.1)} 
                    metalness={isHumanFace ? 0.2 : 0.9} 
                    transparent 
                    opacity={theme === AppTheme.CLASSIC ? 0.8 : 1}
                />
            </mesh>
          )}

          {style.hasBody && isHumanFace && (
            <>
              <mesh position={[-0.09, -0.34, 0]}>
                  <capsuleGeometry args={[0.05, 0.35, 4, 8]} />
                  <meshStandardMaterial color="#334155" roughness={0.8} metalness={0.2} />
              </mesh>
              <mesh position={[0.09, -0.34, 0]}>
                  <capsuleGeometry args={[0.05, 0.35, 4, 8]} />
                  <meshStandardMaterial color="#334155" roughness={0.8} metalness={0.2} />
              </mesh>
            </>
          )}

          {/* Arms */}
          {style.hasArms && (
            <>
                <mesh ref={leftArmRef} position={[-0.25, 0.3, 0]}>
                    <capsuleGeometry args={[0.04, 0.3, 4, 8]} />
                    <meshStandardMaterial color={isHumanFace ? skinTone : baseColor} {...matProps} />
                </mesh>
                <mesh ref={rightArmRef} position={[0.25, 0.3, 0]}>
                    <capsuleGeometry args={[0.04, 0.3, 4, 8]} />
                    <meshStandardMaterial color={isHumanFace ? skinTone : baseColor} {...matProps} />
                </mesh>
            </>
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
                    <span className="opacity-50">|</span>
                    <span className="text-[8px] font-mono opacity-80">{role}</span>
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
}

const EnvironmentManager: React.FC<{ theme: AppTheme }> = ({ theme }) => {
    switch (theme) {
        case AppTheme.CLASSIC:
            return (
                <>
                    <color attach="background" args={['#e0e0e0']} />
                    <ambientLight intensity={1.5} />
                    <directionalLight position={[10, 10, 5]} intensity={2} castShadow />
                    <ContactShadows resolution={1024} scale={50} blur={2} opacity={0.4} far={10} color="#000" />
                    <Grid infiniteGrid cellSize={0.5} sectionSize={2} sectionColor="#999" cellColor="#ccc" fadeDistance={30} position={[0, -0.5, 0]} />
                </>
            );
        case AppTheme.RENAISSANCE:
             return (
                 <>
                    <color attach="background" args={['#1a1008']} />
                    <ambientLight intensity={0.5} color="#d4a373" />
                    <spotLight position={[5, 10, 5]} angle={0.5} penumbra={1} intensity={4} color="#ffd700" castShadow />
                    <pointLight position={[-5, 2, -5]} intensity={1} color="#ff6b6b" />
                    <Environment preset="sunset" blur={0.8} background={false} />
                    <Stars radius={100} depth={50} count={2000} factor={4} saturation={0} fade speed={0.5} />
                    <ContactShadows resolution={1024} scale={50} blur={2.5} opacity={0.6} far={10} color="#000" />
                 </>
             );
        case AppTheme.REALISTIC:
            return (
                <>
                    <Environment preset="city" background blur={0.6} />
                    <ambientLight intensity={0.5} />
                    <directionalLight position={[-5, 5, 5]} intensity={2} castShadow />
                    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
                        <planeGeometry args={[50, 50]} />
                        <MeshReflectorMaterial
                            blur={[300, 100]}
                            resolution={2048}
                            mixBlur={1}
                            mixStrength={60}
                            roughness={0.5}
                            depthScale={1.2}
                            minDepthThreshold={0.4}
                            maxDepthThreshold={1.4}
                            color="#202020"
                            metalness={0.5}
                            mirror={1}
                        />
                    </mesh>
                </>
            );
        case AppTheme.OIL_PAINTING:
            return (
                <>
                     <color attach="background" args={['#2c1810']} />
                     <Environment preset="park" blur={1} />
                     <ambientLight intensity={1.2} color="#fff8e1" />
                     <spotLight position={[0, 10, 0]} intensity={3} color="#fff8e1" castShadow />
                     <mesh position={[0, 0, -10]} scale={[20, 10, 1]}>
                        <planeGeometry />
                        <meshBasicMaterial color="#3e2723" />
                     </mesh>
                     <ContactShadows resolution={512} scale={20} blur={3} opacity={0.8} color="#1a0f0a" />
                </>
            );
        case AppTheme.CYBERPUNK:
        default:
            return (
                <>
                    <color attach="background" args={['#010103']} />
                    <fog attach="fog" args={['#010103', 6, 25]} />
                    <ambientLight intensity={0.2} />
                    <pointLight position={[10, 15, 10]} intensity={1.5} color="#38bdf8" />
                    <spotLight position={[-5, 12, 5]} intensity={2.5} angle={0.3} penumbra={1} color="#38bdf8" castShadow />
                    <Grid infiniteGrid cellSize={1} sectionSize={4} sectionColor="#1e293b" cellColor="#020205" fadeDistance={25} position={[0, -0.5, 0]} />
                    <ContactShadows resolution={1024} scale={20} blur={2.5} opacity={0.6} far={10} color="#000" />
                </>
            );
    }
};

const AgentScene: React.FC<SceneProps> = ({ 
    onAgentClick, 
    isProcessing, 
    isGlitched, 
    activeAgent,
    agentSpeech,
    agentStyles = [],
    theme
}) => {
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

  return (
    <div className="w-full h-full">
        <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 2, 7], fov: 40 }}>
            <EnvironmentManager theme={theme} />

            {AGENT_PROFILES.map(profile => (
              <AgentAvatar
                key={profile.id}
                name={`${profile.codename} · ${profile.displayName}`}
                role={`${profile.role} // ${profile.quirk}`}
                style={getStyle(profile.id)}
                position={profile.scenePosition}
                isTalking={isProcessing && activeAgentId === profile.id}
                isGlitched={isGlitched}
                speechText={activeAgentId === profile.id ? agentSpeech : null}
                scale={profile.scale}
                onClick={() => onAgentClick(profile.id)}
                delayIndex={profile.delayIndex}
                theme={theme}
              />
            ))}

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
  );
};

export default AgentScene;
