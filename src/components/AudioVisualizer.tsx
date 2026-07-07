import React, { useRef, useEffect, useState } from 'react';
import { VisualThemeId, HandData } from '../types';
import { audioEngineInstance } from '../utils/audioEngine';

interface AudioVisualizerProps {
  themeId: VisualThemeId;
  hands: HandData[];
  isPlaying: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  shape?: 'circle' | 'square' | 'triangle' | 'star';
  angle?: number;
  spin?: number;
}

interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  alpha: number;
  width: number;
}

// MediaPipe Hand Landmarking connections definition
const HAND_CONNECTIONS = [
  // Thumb
  [0, 1], [1, 2], [2, 3], [3, 4],
  // Index
  [0, 5], [5, 6], [6, 7], [7, 8],
  // Middle
  [0, 9], [9, 10], [10, 11], [11, 12],
  // Ring
  [0, 13], [13, 14], [14, 15], [15, 16],
  // Pinky
  [0, 17], [17, 18], [18, 19], [19, 20],
  // Palm knuckle base connection
  [5, 9], [9, 13], [13, 17]
];

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  themeId,
  hands,
  isPlaying,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const ripplesRef = useRef<Ripple[]>([]);
  const [fps, setFps] = useState(60);

  // Performance/FPS stats
  const lastTimeRef = useRef<number>(performance.now());
  const framesRef = useRef<number>(0);

  // Geometry Theme angle
  const geometryAngleRef = useRef<number>(0);

  // Handle Canvas resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Main Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      const now = performance.now();
      framesRef.current++;
      if (now > lastTimeRef.current + 1000) {
        setFps(Math.round((framesRef.current * 1000) / (now - lastTimeRef.current)));
        framesRef.current = 0;
        lastTimeRef.current = now;
      }

      const width = canvas.width;
      const height = canvas.height;

      // Ensure correct scale context for HighDPI displays
      ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
      const logicalWidth = width / window.devicePixelRatio;
      const logicalHeight = height / window.devicePixelRatio;

      // 1. GET AUDIO ANALYSER DATA
      const analyser = audioEngineInstance.analyser;
      let audioBuffer = new Uint8Array(256);
      let timeBuffer = new Uint8Array(256);
      let avgFreq = 0;
      let bassEnergy = 0;

      if (analyser) {
        audioBuffer = new Uint8Array(analyser.frequencyBinCount);
        timeBuffer = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(audioBuffer);
        analyser.getByteTimeDomainData(timeBuffer);

        // Calculate average volume
        let sum = 0;
        for (let i = 0; i < audioBuffer.length; i++) {
          sum += audioBuffer[i];
          if (i < 8) bassEnergy += audioBuffer[i]; // low frequencies
        }
        avgFreq = sum / audioBuffer.length;
        bassEnergy = bassEnergy / 8;
      }

      const soundScale = 1.0 + (avgFreq / 255) * 0.5;
      const bassScale = 1.0 + (bassEnergy / 255) * 0.8;

      // 2. BACKGROUND RENDER BY THEME
      drawBackground(ctx, logicalWidth, logicalHeight, themeId, avgFreq, bassScale);

      // 3. DRAW AUDIO WAVE / VISUALIZER OVERLAYS
      drawAudioVisualizations(ctx, logicalWidth, logicalHeight, themeId, audioBuffer, timeBuffer, avgFreq);

      // 4. RENDER AND UPDATE RIPPLES
      drawAndUpdateRipples(ctx);

      // 5. PROCESS HAND LANDMARKS & GLOW TRAILS
      if (hands.length > 0) {
        processHands(logicalWidth, logicalHeight, avgFreq, soundScale);
      } else if (isPlaying && avgFreq > 15) {
        // Spawn beautiful ambient beat-reactive visualizer effects during Autopilot mode
        if (Math.random() > 0.94) {
          const rx = Math.random() * logicalWidth;
          const ry = Math.random() * logicalHeight;
          const color = themeId === 'galaxy' ? '#ec4899' : themeId === 'cyberpunk' ? '#06b6d4' : themeId === 'ocean' ? '#38bdf8' : themeId === 'forest' ? '#10b981' : '#ffffff';
          ripplesRef.current.push({
            x: rx,
            y: ry,
            radius: 5,
            maxRadius: 50 + Math.random() * 80 + (avgFreq / 255) * 40,
            color,
            alpha: 0.6,
            width: 1.5 + Math.random() * 2,
          });

          // Burst of beautiful particles at the peak coordinate
          const pShape = themeId === 'galaxy' ? 'circle' : themeId === 'cyberpunk' ? 'square' : themeId === 'forest' ? 'triangle' : 'circle';
          for (let pi = 0; pi < 8; pi++) {
            particlesRef.current.push({
              x: rx,
              y: ry,
              vx: (Math.random() * 2 - 1) * 1.5,
              vy: themeId === 'ocean' ? -Math.random() * 1.0 - 0.2 : (Math.random() * 2 - 1) * 1.5,
              size: 2 + Math.random() * 3,
              color,
              alpha: 1.0,
              life: 0,
              maxLife: 40 + Math.floor(Math.random() * 30),
              shape: pShape,
              angle: Math.random() * Math.PI * 2,
              spin: (Math.random() * 2 - 1) * 0.05,
            });
          }
        }
      }

      // 6. RENDER AND UPDATE PARTICLES
      drawAndUpdateParticles(ctx);

      // 7. DRAW HAND SKELETONS ON TOP
      drawHandSkeletons(ctx, logicalWidth, logicalHeight, themeId);

      animationFrameRef.current = requestAnimationFrame(render);
    };

    // Begin Loop
    animationFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [themeId, hands, isPlaying]);

  // --- BACKGROUND RENDERING MODULE ---
  const drawBackground = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    theme: VisualThemeId,
    avgVolume: number,
    bassScale: number
  ) => {
    ctx.save();
    
    // Theme-specific base clears
    switch (theme) {
      case 'galaxy': {
        // Deep purple to cosmic black gradient with subtle movement trail
        const grad = ctx.createRadialGradient(w/2, h/2, 10, w/2, h/2, Math.max(w, h));
        grad.addColorStop(0, `rgba(24, 12, 44, ${0.15 + (avgVolume / 255) * 0.1})`);
        grad.addColorStop(1, 'rgba(8, 6, 12, 0.2)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        // Draw ambient core cosmic nebula glow
        ctx.beginPath();
        const nebRadius = 150 * bassScale;
        const nebGrad = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, nebRadius);
        nebGrad.addColorStop(0, 'rgba(139, 92, 246, 0.08)');
        nebGrad.addColorStop(1, 'rgba(139, 92, 246, 0)');
        ctx.fillStyle = nebGrad;
        ctx.arc(w/2, h/2, nebRadius, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      
      case 'cyberpunk': {
        // Dark neon void with grid lines
        ctx.fillStyle = 'rgba(5, 4, 8, 0.25)'; // trail ghosting
        ctx.fillRect(0, 0, w, h);

        // Horizontal scan lines
        ctx.strokeStyle = 'rgba(244, 63, 94, 0.02)';
        ctx.lineWidth = 1;
        for (let y = 0; y < h; y += 4) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
          ctx.stroke();
        }

        // Draw grid lines converging into vanishing point (center top)
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.05)';
        ctx.lineWidth = 1;
        const vanishingX = w / 2;
        const vanishingY = h * 0.2;
        const gridSpacing = 40;

        // Radial floor grid lines
        for (let x = -w; x < w * 2; x += gridSpacing) {
          ctx.beginPath();
          ctx.moveTo(vanishingX, vanishingY);
          ctx.lineTo(x, h);
          ctx.stroke();
        }

        // Horizontal perspective lines
        const stepCount = 15;
        for (let i = 0; i < stepCount; i++) {
          const ratio = Math.pow(i / stepCount, 2.5); // non-linear distance for perspective
          const gridY = vanishingY + (h - vanishingY) * ratio;
          ctx.beginPath();
          ctx.moveTo(0, gridY);
          ctx.lineTo(w, gridY);
          ctx.stroke();
        }
        break;
      }

      case 'ocean': {
        // Deep blue underwater fade
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, `rgba(15, 32, 67, 0.2)`);
        grad.addColorStop(1, `rgba(4, 12, 26, 0.25)`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        // Render floating sun light beams (god rays) from top-left
        ctx.fillStyle = 'rgba(14, 165, 233, 0.03)';
        ctx.beginPath();
        ctx.moveTo(w * 0.1, 0);
        ctx.lineTo(w * 0.4, 0);
        ctx.lineTo(w * 0.8, h);
        ctx.lineTo(w * 0.3, h);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(w * 0.5, 0);
        ctx.lineTo(w * 0.65, 0);
        ctx.lineTo(w * 0.95, h);
        ctx.lineTo(w * 0.75, h);
        ctx.closePath();
        ctx.fill();
        break;
      }

      case 'forest': {
        // Organic warm emerald dark canopy
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, 'rgba(6, 40, 24, 0.25)');
        grad.addColorStop(1, 'rgba(2, 16, 8, 0.3)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        // Soft organic moss lights in background
        ctx.beginPath();
        const lightX = w * 0.7;
        const lightY = h * 0.4;
        const mossRadius = 250 * bassScale;
        const lightGrad = ctx.createRadialGradient(lightX, lightY, 0, lightX, lightY, mossRadius);
        lightGrad.addColorStop(0, 'rgba(16, 185, 129, 0.04)');
        lightGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = lightGrad;
        ctx.arc(lightX, lightY, mossRadius, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'geometry': {
        // Absolute minimal deep gray with soft visual clearing
        ctx.fillStyle = 'rgba(12, 12, 15, 0.3)';
        ctx.fillRect(0, 0, w, h);

        // Thin elegant concentric background grid rings
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.015)';
        ctx.lineWidth = 1;
        const circleCount = 5;
        for (let i = 1; i <= circleCount; i++) {
          ctx.beginPath();
          ctx.arc(w / 2, h / 2, i * 100 * bassScale, 0, Math.PI * 2);
          ctx.stroke();
        }
        break;
      }
    }

    ctx.restore();
  };

  // --- AUDIO SPECTRUM & WAVEFORM DRAWER ---
  const drawAudioVisualizations = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    theme: VisualThemeId,
    freqs: Uint8Array,
    time: Uint8Array,
    avgVolume: number
  ) => {
    if (!isPlaying) return;

    ctx.save();

    switch (theme) {
      case 'galaxy': {
        // Circular spiral spectral rings in the center
        const centerX = w / 2;
        const centerY = h / 2;
        const baseRadius = 120;
        const numBars = 120;

        ctx.lineWidth = 1.5;
        
        for (let i = 0; i < numBars; i++) {
          const angle = (i / numBars) * Math.PI * 2;
          const index = Math.floor((i / numBars) * (freqs.length * 0.6));
          const val = freqs[index] || 0;
          const magnitude = (val / 255) * 80;

          const r = baseRadius + magnitude;
          const startX = centerX + Math.cos(angle) * baseRadius;
          const startY = centerY + Math.sin(angle) * baseRadius;
          const endX = centerX + Math.cos(angle) * r;
          const endY = centerY + Math.sin(angle) * r;

          // Color shifts dynamically based on frequency size
          const alpha = 0.2 + (val / 255) * 0.6;
          ctx.strokeStyle = `hsla(${(260 + i) % 360}, 85%, 65%, ${alpha})`;
          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.lineTo(endX, endY);
          ctx.stroke();
        }
        break;
      }

      case 'cyberpunk': {
        // Bar visualizer at the bottom with neon gradient
        const barWidth = w / 40;
        const gap = 4;
        const count = 35;
        const startX = (w - (count * (barWidth + gap))) / 2;

        for (let i = 0; i < count; i++) {
          const index = Math.floor((i / count) * (freqs.length * 0.5));
          const val = freqs[index] || 0;
          const barHeight = (val / 255) * h * 0.35;

          const x = startX + i * (barWidth + gap);
          const y = h - barHeight;

          // Gradient bar
          const grad = ctx.createLinearGradient(x, y, x, h);
          grad.addColorStop(0, 'rgba(244, 63, 94, 0.8)'); // Hot Pink
          grad.addColorStop(0.5, 'rgba(168, 85, 247, 0.5)'); // Purple
          grad.addColorStop(1, 'rgba(6, 182, 212, 0.1)'); // Cyan

          ctx.fillStyle = grad;
          ctx.fillRect(x, y, barWidth, barHeight);

          // Top peak point
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(x, y - 2, barWidth, 2);
        }

        // Horizontal middle laser waveform
        ctx.beginPath();
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(244, 63, 94, 0.3)';
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#f43f5e';
        
        for (let i = 0; i < w; i += 5) {
          const timeIndex = Math.floor((i / w) * time.length);
          const offset = ((time[timeIndex] || 128) - 128) / 128 * 40;
          const y = h * 0.5 + offset;

          if (i === 0) ctx.moveTo(0, y);
          else ctx.lineTo(i, y);
        }
        ctx.stroke();
        break;
      }

      case 'ocean': {
        // Soft flowing wave visualizer representing sea swells
        ctx.beginPath();
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
        
        // Double overlapping waves
        for (let waveNum = 0; waveNum < 2; waveNum++) {
          ctx.beginPath();
          ctx.strokeStyle = waveNum === 0 ? 'rgba(56, 189, 248, 0.45)' : 'rgba(45, 212, 191, 0.3)';
          ctx.lineWidth = waveNum === 0 ? 3 : 2;
          
          for (let x = 0; x < w; x += 10) {
            const timeIndex = Math.floor((x / w) * time.length);
            const val = time[timeIndex] || 128;
            const amp = (val - 128) / 128 * (50 + waveNum * 25);
            
            // Ocean frequency wave offset
            const sineOffset = Math.sin((x / 120) + (performance.now() / 350) + waveNum * Math.PI) * 15;
            const y = h * 0.75 + amp + sineOffset;

            if (x === 0) ctx.moveTo(0, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
        break;
      }

      case 'forest': {
        // High frequency grass-blade ripples or radial nature waves
        ctx.lineWidth = 1.5;
        const count = 48;
        const centerX = w / 2;
        const centerY = h * 0.85;

        for (let i = 0; i < count; i++) {
          const index = Math.floor((i / count) * (freqs.length * 0.4));
          const val = freqs[index] || 0;
          const len = 30 + (val / 255) * 150;
          const angle = -Math.PI + (i / count) * Math.PI; // semi circle

          const endX = centerX + Math.cos(angle) * len;
          const endY = centerY + Math.sin(angle) * len;

          ctx.strokeStyle = `rgba(16, 185, 129, ${0.15 + (val / 255) * 0.45})`;
          ctx.beginPath();
          ctx.moveTo(centerX, centerY);
          ctx.lineTo(endX, endY);
          ctx.stroke();
        }
        break;
      }

      case 'geometry': {
        // Absolute minimal polygon outline mapping
        const centerX = w / 2;
        const centerY = h / 2;
        const vertices = 8;
        const rBase = 110;

        geometryAngleRef.current += 0.005 + (avgVolume / 255) * 0.01;

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();

        for (let i = 0; i <= vertices; i++) {
          const angle = (i / vertices) * Math.PI * 2 + geometryAngleRef.current;
          const index = Math.floor((i % vertices) / vertices * (freqs.length * 0.3));
          const val = freqs[index] || 0;
          const dist = rBase + (val / 255) * 50;

          const px = centerX + Math.cos(angle) * dist;
          const py = centerY + Math.sin(angle) * dist;

          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();

        // 3D Wireframe Cube
        drawWireframeCube(ctx, centerX, centerY, 80 + (avgVolume / 255) * 40, geometryAngleRef.current);
        break;
      }
    }

    ctx.restore();
  };

  const drawWireframeCube = (
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    size: number,
    angle: number
  ) => {
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;

    // Define 8 vertices of a cube
    const nodes = [
      [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
      [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]
    ];

    // Define 12 edges
    const edges = [
      [0, 1], [1, 2], [2, 3], [3, 0], // Back face
      [4, 5], [5, 6], [6, 7], [7, 4], // Front face
      [0, 4], [1, 5], [2, 6], [3, 7]  // Connectors
    ];

    // 3D rotation matrix projections (Rotate Y and X)
    const sinX = Math.sin(angle * 0.6);
    const cosX = Math.cos(angle * 0.6);
    const sinY = Math.sin(angle);
    const cosY = Math.cos(angle);

    const projected: { x: number; y: number }[] = [];

    nodes.forEach(node => {
      // Scale
      let x = node[0] * size;
      let y = node[1] * size;
      let z = node[2] * size;

      // Rotate X
      const y1 = y * cosX - z * sinX;
      const z1 = y * sinX + z * cosX;

      // Rotate Y
      const x2 = x * cosY + z1 * sinY;
      const z2 = -x * sinY + z1 * cosY;

      // Simple perspective projection
      const distance = 300;
      const scale = distance / (distance + z2);
      projected.push({
        x: cx + x2 * scale,
        y: cy + y1 * scale
      });
    });

    // Draw edges
    edges.forEach(edge => {
      ctx.beginPath();
      ctx.moveTo(projected[edge[0]].x, projected[edge[0]].y);
      ctx.lineTo(projected[edge[1]].x, projected[edge[1]].y);
      ctx.stroke();
    });

    ctx.restore();
  };

  // --- HAND PROCESSING & GESTURE TRAIL SPARK GENERATION ---
  const processHands = (
    w: number,
    h: number,
    avgVolume: number,
    soundScale: number
  ) => {
    if (hands.length === 0) return;

    hands.forEach((hand) => {
      // Map hand position coordinates (mirror X as camera feed is mirrored)
      const mappedX = w - (hand.centroid.x * w);
      const mappedY = hand.centroid.y * h;

      // 1. CHOOSE PARTICLE COLOR BY THEME & ACTIVE CHANNEL
      let color = '#a855f7'; // purple default
      let count = 2; // spawn count
      let shape: 'circle' | 'square' | 'triangle' | 'star' = 'circle';

      if (themeId === 'galaxy') {
        color = hand.id === 0 ? '#ec4899' : '#a855f7'; // Pink vs Purple
        count = 3;
        shape = 'circle';
      } else if (themeId === 'cyberpunk') {
        color = hand.id === 0 ? '#06b6d4' : '#f43f5e'; // Cyan vs Hot Pink
        count = 4;
        shape = Math.random() > 0.5 ? 'square' : 'circle';
      } else if (themeId === 'ocean') {
        color = hand.id === 0 ? '#38bdf8' : '#2dd4bf'; // Light blue vs Teal
        count = 1;
        shape = 'circle'; // bubble
      } else if (themeId === 'forest') {
        color = hand.id === 0 ? '#10b981' : '#f59e0b'; // Emerald vs Golden amber
        count = 2;
        shape = 'triangle'; // Leaf/shard
      } else if (themeId === 'geometry') {
        color = '#ffffff';
        count = 2;
        shape = 'star';
      }

      // 2. TRIGGER DYNAMIC RIPPLES
      // Trigger a ripple on fast hand movement or chord strike
      const velocityMag = 1.0; // simple mock scale
      if (Math.random() > 0.94) {
        ripplesRef.current.push({
          x: mappedX,
          y: mappedY,
          radius: 10,
          maxRadius: 80 + Math.random() * 80 + (avgVolume / 255) * 50,
          color,
          alpha: 0.8,
          width: 2 + Math.random() * 3,
        });
      }

      // 3. GENERATE EMITTING PARTICLES ON CORE LANDMARKS (FINGERTIPS & PALM)
      const emitterLandmarks = [
        4,  // Thumb Tip
        8,  // Index Tip
        12, // Middle Tip
        16, // Ring Tip
        20, // Pinky Tip
        0,  // Wrist Centroid
      ];

      emitterLandmarks.forEach((idx) => {
        if (!hand.landmarks[idx]) return;
        const ptX = w - (hand.landmarks[idx].x * w);
        const ptY = hand.landmarks[idx].y * h;

        for (let i = 0; i < count; i++) {
          const sizeFactor = themeId === 'ocean' ? (5 + Math.random() * 10) : (1.5 + Math.random() * 4);
          particlesRef.current.push({
            x: ptX,
            y: ptY,
            // Random scattering velocities
            vx: (Math.random() * 2 - 1) * 2 * soundScale,
            vy: (themeId === 'ocean' ? -Math.random() * 1.5 - 0.5 : (Math.random() * 2 - 1) * 2 * soundScale), // bubbles rise
            size: sizeFactor,
            color,
            alpha: 1.0,
            life: 0,
            maxLife: 30 + Math.floor(Math.random() * 40),
            shape,
            angle: Math.random() * Math.PI * 2,
            spin: (Math.random() * 2 - 1) * 0.1,
          });
        }
      });
    });
  };

  // --- RENDERING PARTICLES ENGINE ---
  const drawAndUpdateParticles = (ctx: CanvasRenderingContext2D) => {
    const particles = particlesRef.current;
    
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life++;

      if (p.life >= p.maxLife) {
        particles.splice(i, 1);
        continue;
      }

      // Apply physics dynamics
      p.x += p.vx;
      p.y += p.vy;

      if (themeId === 'galaxy') {
        // Gravitational swirl toward center
        const dx = (ctx.canvas.width / window.devicePixelRatio / 2) - p.x;
        const dy = (ctx.canvas.height / window.devicePixelRatio / 2) - p.y;
        p.vx += dx * 0.0001;
        p.vy += dy * 0.0001;
        p.vx *= 0.98;
        p.vy *= 0.98;
      } else if (themeId === 'ocean') {
        // Underwater float and sway
        p.vx += Math.sin(performance.now() / 200 + p.y / 100) * 0.05;
      } else {
        // Slow friction damping
        p.vx *= 0.97;
        p.vy *= 0.97;
      }

      p.alpha = 1.0 - (p.life / p.maxLife);

      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.shadowBlur = themeId === 'cyberpunk' ? 8 : 4;
      ctx.shadowColor = p.color;

      // Draw particle shapes
      if (p.shape === 'square') {
        ctx.beginPath();
        ctx.fillRect(p.x - p.size/2, p.y - p.size/2, p.size, p.size);
      } else if (p.shape === 'triangle') {
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - p.size);
        ctx.lineTo(p.x + p.size, p.y + p.size);
        ctx.lineTo(p.x - p.size, p.y + p.size);
        ctx.closePath();
        ctx.fill();
      } else if (p.shape === 'star') {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Standard circle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        
        if (themeId === 'ocean') {
          // Add a shine dot for soap bubble aesthetic
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(p.x - p.size * 0.3, p.y - p.size * 0.3, p.size * 0.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.restore();
    }
  };

  // --- RENDERING DYNAMIC RIPPLES ---
  const drawAndUpdateRipples = (ctx: CanvasRenderingContext2D) => {
    const ripples = ripplesRef.current;
    
    for (let i = ripples.length - 1; i >= 0; i--) {
      const r = ripples[i];
      r.radius += (r.maxRadius - r.radius) * 0.08;
      r.alpha -= 0.02;

      if (r.alpha <= 0 || r.radius >= r.maxRadius - 1) {
        ripples.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.strokeStyle = r.color;
      ctx.globalAlpha = r.alpha;
      ctx.lineWidth = r.width;
      ctx.shadowBlur = themeId === 'cyberpunk' ? 12 : 5;
      ctx.shadowColor = r.color;

      ctx.beginPath();
      ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  };

  // --- RENDERING SKELETON CONNECTIONS OVERLAY ---
  const drawHandSkeletons = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    theme: VisualThemeId
  ) => {
    if (hands.length === 0) return;

    hands.forEach((hand) => {
      ctx.save();

      // Configure skeleton colors by theme
      let boneColor = 'rgba(255, 255, 255, 0.45)';
      let jointColor = '#ffffff';
      let shadowColor = 'transparent';
      let shadowBlur = 0;

      if (theme === 'galaxy') {
        boneColor = 'rgba(139, 92, 246, 0.5)';
        jointColor = '#ec4899';
        shadowColor = '#ec4899';
        shadowBlur = 8;
      } else if (theme === 'cyberpunk') {
        boneColor = 'rgba(6, 182, 212, 0.6)';
        jointColor = '#f43f5e';
        shadowColor = '#f43f5e';
        shadowBlur = 10;
      } else if (theme === 'ocean') {
        boneColor = 'rgba(45, 212, 191, 0.45)';
        jointColor = '#38bdf8';
        shadowColor = '#38bdf8';
        shadowBlur = 6;
      } else if (theme === 'forest') {
        boneColor = 'rgba(16, 185, 129, 0.5)';
        jointColor = '#f59e0b';
        shadowColor = '#f59e0b';
        shadowBlur = 6;
      } else if (theme === 'geometry') {
        boneColor = 'rgba(255, 255, 255, 0.25)';
        jointColor = '#ffffff';
        shadowColor = '#ffffff';
        shadowBlur = 2;
      }

      ctx.strokeStyle = boneColor;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.shadowColor = shadowColor;
      ctx.shadowBlur = shadowBlur;

      // 1. DRAW BONES (CONNECTIONS)
      HAND_CONNECTIONS.forEach((connection) => {
        const startIdx = connection[0];
        const endIdx = connection[1];

        const startPt = hand.landmarks[startIdx];
        const endPt = hand.landmarks[endIdx];

        if (!startPt || !endPt) return;

        // Mirror coordinates for natural reflection
        const x1 = w - (startPt.x * w);
        const y1 = startPt.y * h;
        const x2 = w - (endPt.x * w);
        const y2 = endPt.y * h;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      });

      // 2. DRAW JOINTS (LANDMARKS)
      hand.landmarks.forEach((pt, index) => {
        const x = w - (pt.x * w);
        const y = pt.y * h;

        ctx.fillStyle = jointColor;
        ctx.beginPath();
        // Highlight finger tips and wrist extra
        const radius = [0, 4, 8, 12, 16, 20].includes(index) ? 6 : 4;
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();

        // Extra outer circle glow for core fingers
        if ([4, 8, 12, 16, 20].includes(index)) {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(x, y, radius + 3, 0, Math.PI * 2);
          ctx.stroke();
        }
      });

      // 3. DRAW PALM INFORMATION DISPLAY (Glow ring, gesture text, hand designation)
      const mappedCentroidX = w - (hand.centroid.x * w);
      const mappedCentroidY = hand.centroid.y * h;

      // Centered halo ring
      ctx.strokeStyle = jointColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(mappedCentroidX, mappedCentroidY, 24 + Math.sin(performance.now() / 150) * 4, 0, Math.PI * 2);
      ctx.stroke();

      // Hand text label
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(
        `${hand.handedness} (${hand.gesture})`,
        mappedCentroidX,
        mappedCentroidY - 35
      );

      ctx.restore();
    });
  };

  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none z-10">
      <canvas
        ref={canvasRef}
        id="visualizer-canvas"
        className="w-full h-full block"
      />
      {/* Visual FPS Overlay inside the visualizer box */}
      <div className="absolute bottom-4 left-4 font-mono text-[10px] text-gray-500 bg-black/40 backdrop-blur-md px-2 py-1 rounded border border-white/5 z-20">
        VISUAL PIPELINE: {fps} FPS
      </div>
    </div>
  );
};
export default AudioVisualizer;
