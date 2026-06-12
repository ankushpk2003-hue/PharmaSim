import React, { useRef, useEffect, useState } from 'react';

interface Body3DProps {
  isPlaying: boolean;
  progress: number; // 0 to 100
  speed: number; // 1, 2, 5
  activeOrgan: string | null;
  onOrganClick: (organ: string) => void;
  onProgressUpdate: (progress: number) => void;
  hideHUD?: boolean;
}

interface NodeInfo {
  name: string;
  label: string;
  x: number;
  y: number;
  color: string;
  glowColor: string;
  process: string;
}

const NODES: NodeInfo[] = [
  { name: 'Mouth', label: '💊 Mouth', x: 200, y: 45, color: '#00f2fe', glowColor: 'rgba(0, 242, 254, 0.4)', process: 'Ingestion' },
  { name: 'Esophagus', label: '🫁 Esophagus', x: 200, y: 125, color: '#3b82f6', glowColor: 'rgba(59, 130, 246, 0.4)', process: 'Transit' },
  { name: 'Stomach', label: '🟢 Stomach', x: 160, y: 215, color: '#ff3b30', glowColor: 'rgba(255, 59, 48, 0.4)', process: 'Dissolution' },
  { name: 'Small Intestine', label: '🟡 Small Intestine', x: 200, y: 305, color: '#ff9500', glowColor: 'rgba(255, 149, 0, 0.4)', process: 'Absorption' },
  { name: 'Bloodstream', label: '🔴 Bloodstream', x: 200, y: 395, color: '#ff2a6d', glowColor: 'rgba(255, 42, 109, 0.4)', process: 'Distribution' },
  { name: 'Liver', label: '🟠 Liver', x: 240, y: 485, color: '#ff5e36', glowColor: 'rgba(255, 94, 54, 0.4)', process: 'Metabolism' },
  { name: 'Kidneys', label: '🟣 Kidneys', x: 160, y: 550, color: '#a020f0', glowColor: 'rgba(160, 32, 240, 0.4)', process: 'Excretion' }
];

export default function Body3D({
  isPlaying,
  progress,
  speed,
  activeOrgan,
  onOrganClick,
  onProgressUpdate,
  hideHUD = false
}: Body3DProps) {
  const pathRef = useRef<SVGPathElement>(null);
  const [particlePos, setParticlePos] = useState({ x: 200, y: 45 });
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // Bezier curve connecting all nodes:
  const pathD = "M 200 45 C 200 85, 200 85, 200 125 C 200 170, 160 170, 160 215 C 160 260, 200 260, 200 305 C 200 350, 200 350, 200 395 C 200 440, 240 440, 240 485 C 240 520, 160 520, 160 550";

  // Trigger tick updates
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();

    const tick = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      if (isPlaying) {
        let nextProg = progress + dt * 4.5 * speed;
        if (nextProg >= 100) {
          nextProg = 0;
        }
        onProgressUpdate(nextProg);
      }
      animationFrameId = requestAnimationFrame(tick);
    };

    animationFrameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isPlaying, progress, speed, onProgressUpdate]);

  // Interpolate particle coordinates along the SVG path
  useEffect(() => {
    if (pathRef.current) {
      try {
        const totalLength = pathRef.current.getTotalLength();
        // Limit progress to [0, 99.9] to prevent overflow at end of path
        const clampedProg = Math.max(0, Math.min(99.9, progress));
        const point = pathRef.current.getPointAtLength(totalLength * (clampedProg / 100));
        setParticlePos({ x: point.x, y: point.y });
      } catch (e) {
        console.error("Error interpolating path length:", e);
      }
    }
  }, [progress]);

  // Determine active organ based on progress
  const getActiveNodeIndex = () => {
    const rangeSize = 100 / NODES.length;
    return Math.min(NODES.length - 1, Math.floor(progress / rangeSize));
  };

  const activeNodeIdx = getActiveNodeIndex();
  const currentActiveNode = NODES[activeNodeIdx];

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950/20 p-4 relative">
      {/* Sci-Fi GRID Backdrop */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(6,182,212,0.08),transparent_70%)] pointer-events-none"></div>

      {/* Futuristic Dashboard Header HUD */}
      {!hideHUD && (
        <div className="absolute top-4 left-4 pointer-events-none bg-slate-950/80 backdrop-blur-md border border-cyan-500/20 p-4 rounded-2xl shadow-xl shadow-cyan-950/35">
          <p className="text-[8px] text-cyan-400 font-bold uppercase tracking-widest font-mono">FLOW CONDUIT: ACTIVE</p>
          <p className="text-xs text-white font-extrabold mt-0.5 tracking-tight">Anatomical Pathway Viewport</p>
          <div className="flex items-center gap-1.5 mt-2">
            <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-ping"></span>
            <span className="text-[9px] text-slate-400 font-bold font-mono">GRAPH ENGINE</span>
          </div>
        </div>
      )}

      {/* SVG Canvas Container */}
      <svg 
        viewBox="0 0 400 600" 
        className="w-full max-h-[420px] drop-shadow-[0_0_15px_rgba(6,182,212,0.1)] relative z-10"
      >
        <defs>
          {/* Neon line gradient */}
          <linearGradient id="neonPathGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00f2fe" stopOpacity={0.8} />
            <stop offset="30%" stopColor="#3b82f6" stopOpacity={0.6} />
            <stop offset="50%" stopColor="#ff3b30" stopOpacity={0.6} />
            <stop offset="70%" stopColor="#ff9500" stopOpacity={0.6} />
            <stop offset="100%" stopColor="#a020f0" stopOpacity={0.8} />
          </linearGradient>

          {/* Node shadow glow filter */}
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Particle neon glow filter */}
          <filter id="particleGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* 1. Underlying Glowing Connection Lines */}
        <path
          ref={pathRef}
          d={pathD}
          fill="none"
          stroke="url(#neonPathGrad)"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray="8,6"
          className="animate-flow"
          style={{
            strokeDashoffset: isPlaying ? -progress * 2 : 0,
            transition: 'stroke-dashoffset 0.1s linear'
          }}
        />

        {/* 2. Renders Node Circles and HUD Details */}
        {NODES.map((node, idx) => {
          const isActive = activeOrgan ? (activeOrgan === node.name) : (idx === activeNodeIdx);
          const isHovered = hoveredNode === node.name;
          const labelOffset = node.x > 200 ? 55 : -55;

          return (
            <g
              key={node.name}
              transform={`translate(${node.x}, ${node.y})`}
              className="cursor-pointer select-none"
              onClick={() => onOrganClick(node.name)}
              onMouseEnter={() => setHoveredNode(node.name)}
              onMouseLeave={() => setHoveredNode(null)}
            >
              {/* Outer pulsing ring for active nodes */}
              {isActive && (
                <circle
                  r="24"
                  fill="none"
                  stroke={node.color}
                  strokeWidth="1.5"
                  className="animate-ping"
                  opacity={0.3}
                />
              )}

              {/* Spinning dashed HUD ring */}
              <circle
                r="20"
                fill="none"
                stroke={isActive || isHovered ? node.color : '#334155'}
                strokeWidth="1"
                strokeDasharray="5,3"
                className={isActive ? 'animate-spin' : ''}
                style={{
                  transformOrigin: 'center',
                  animationDuration: '10s'
                }}
              />

              {/* Central node capsule circle */}
              <circle
                r="15"
                fill={isActive ? node.color : '#0f172a'}
                stroke={isActive || isHovered ? node.color : '#475569'}
                strokeWidth="2.5"
                filter={isActive || isHovered ? 'url(#glow)' : ''}
                opacity={isActive ? 1.0 : 0.6}
                className="transition-all duration-300"
              />

              {/* Neon core indicator */}
              <circle
                r="4"
                fill="#ffffff"
                opacity={isActive ? 1.0 : 0.3}
              />

              {/* HUD Brackets or Labels */}
              <text
                x={node.x > 200 ? 25 : -25}
                y="4"
                textAnchor={node.x > 200 ? 'start' : 'end'}
                fill={isActive || isHovered ? '#ffffff' : '#64748b'}
                fontSize="10"
                fontWeight="bold"
                fontFamily="monospace"
                letterSpacing="0.5"
                className="transition-colors duration-200 uppercase"
              >
                {node.label}
              </text>
            </g>
          );
        })}

        {/* 3. The Animated Medicine Drug Particle */}
        <circle
          cx={particlePos.x}
          cy={particlePos.y}
          r="7"
          fill="#ffffff"
          stroke="#00f2fe"
          strokeWidth="3.5"
          filter="url(#particleGlow)"
          className="transition-all duration-75"
        />
      </svg>
    </div>
  );
}
