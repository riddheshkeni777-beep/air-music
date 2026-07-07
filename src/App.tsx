import React, { useState, useEffect, useRef, useTransition } from 'react';
import { VisualThemeId, HandData, AudioEngineParams, PerformanceStats } from './types';
import { audioEngineInstance } from './utils/audioEngine';
import { ThemeSelector, VISUAL_THEMES } from './components/ThemeSelector';
import { InstrumentControls } from './components/InstrumentControls';
import { AudioVisualizer } from './components/AudioVisualizer';
import { Sparkles, Play, ToggleLeft, HelpCircle, AlertCircle, RefreshCw, Layers, ShieldCheck, Heart } from 'lucide-react';

// Pentatonic Scale for A minor lead synth mapping
const PENTATONIC_SCALE = [
  220.00, // A3
  261.63, // C4
  293.66, // D4
  329.63, // E4
  392.00, // G4
  440.00, // A4
  523.25, // C5
  587.33, // D5
  659.25, // E5
  783.99, // G5
  880.00, // A5
];

export default function App() {
  const [currentThemeId, setCurrentThemeId] = useState<VisualThemeId>('galaxy');
  const [isPlaying, setIsPlaying] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [hands, setHands] = useState<HandData[]>([]);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [isAutopilot, setIsAutopilot] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Play Mode and Song Upload States
  const [playMode, setPlayMode] = useState<'synth' | 'song'>('synth');
  const [songName, setSongName] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [songLoaded, setSongLoaded] = useState(false);

  // MediaPipe library load state
  const [mediaPipeLoaded, setMediaPipeLoaded] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);

  // Audio Engine Parameters State for UI display
  const [audioParams, setAudioParams] = useState<AudioEngineParams>({
    masterVolume: 0.8,
    intensity: 0.6,
    tempo: 120,
    layers: { drums: 0.6, piano: 0.7, guitar: 0.5, synth: 0.4, ambientPad: 0.8, bass: 0.6 },
    isAutopilot: true,
    pan: 0,
    reverb: 0,
    delay: 0,
  });

  // Performance FPS Trackers
  const [performanceStats, setPerformanceStats] = useState<PerformanceStats>({
    fps: 0,
    latencyMs: 0,
    handsCount: 0,
  });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cameraHelperRef = useRef<any>(null);
  const handsHelperRef = useRef<any>(null);
  const lastFrameTimeRef = useRef<number>(performance.now());
  const fpsIntervalRef = useRef<number>(0);
  const [trackingFps, setTrackingFps] = useState(0);
  const processResultsRef = useRef<any>(null);

  // Virtual Demo Mouse state
  const [virtualHand, setVirtualHand] = useState<HandData | null>(null);
  const virtualAngleRef = useRef<number>(0);

  const activeTheme = VISUAL_THEMES.find(t => t.id === currentThemeId) || VISUAL_THEMES[0];

  // 1. CHECK MEDIAPIPE CDN LOADED STATUS
  useEffect(() => {
    let checkInterval: number;
    let attempts = 0;

    const checkMediaPipe = () => {
      attempts++;
      if ((window as any).Hands && (window as any).Camera) {
        setMediaPipeLoaded(true);
        clearInterval(checkInterval);
      } else if (attempts > 60) {
        // After 30 seconds of checking, set an error fallback
        setLoadingError('MediaPipe hand tracking scripts took too long to load from CDN. You can still use the Mouse Simulation Demo Mode to play music!');
        clearInterval(checkInterval);
      }
    };

    checkInterval = window.setInterval(checkMediaPipe, 500);
    checkMediaPipe();

    return () => {
      clearInterval(checkInterval);
    };
  }, []);

  // 2. LIFECYCLE: DESTROY AUDIO ON CLOSE
  useEffect(() => {
    return () => {
      audioEngineInstance.destroy();
    };
  }, []);

  // 3. MAIN AUDIO ENGINE INITIALISATION & TOGGLE
  const handleStart = async () => {
    try {
      audioEngineInstance.start();
      setIsPlaying(true);
      
      // Send parameters immediately to trigger audio synth voices
      audioEngineInstance.updateParams(audioParams);

      // Request Webcam if MediaPipe is ready
      if (mediaPipeLoaded && !cameraActive) {
        startWebcamTracking();
      } else if (!mediaPipeLoaded) {
        // fallback to interactive demo
        setIsDemoMode(true);
      }
    } catch (err: any) {
      console.error('Audio start failed', err);
    }
  };

  const handleStop = () => {
    audioEngineInstance.stop();
    setIsPlaying(false);
    // Smoothly clear audio meters
    setAudioParams(prev => ({
      ...prev,
      layers: { drums: 0, piano: 0, guitar: 0, synth: 0, ambientPad: 0, bass: 0 },
      pan: 0,
      reverb: 0,
      delay: 0,
    }));
  };

  const handleSongUpload = async (file: File) => {
    setIsAnalyzing(true);
    setSongName(file.name);
    try {
      await audioEngineInstance.loadSong(file);
      setSongLoaded(true);
      // Automatically switch to song playMode
      setPlayMode('song');
      audioEngineInstance.setPlayMode('song');
    } catch (err: any) {
      console.error('Song load error', err);
      alert('Error decoding audio file. Please try another audio file (like MP3 or WAV).');
      setSongName(null);
      setSongLoaded(false);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handlePlayModeToggle = (mode: 'synth' | 'song') => {
    setPlayMode(mode);
    audioEngineInstance.setPlayMode(mode);
  };

  const handleToggleAutopilot = (forceVal?: boolean) => {
    const newVal = forceVal !== undefined ? forceVal : !isAutopilot;
    setIsAutopilot(newVal);
    
    if (newVal) {
      const autopilotParams: AudioEngineParams = {
        masterVolume: 0.8,
        intensity: 0.6,
        tempo: 120,
        layers: {
          drums: 0.6,
          piano: 0.7,
          guitar: 0.5,
          synth: 0.4,
          ambientPad: 0.8,
          bass: 0.6,
        },
        isAutopilot: true,
        pan: 0,
        reverb: 0,
        delay: 0,
      };
      setAudioParams(autopilotParams);
      audioEngineInstance.updateParams(autopilotParams);
    } else {
      decayAudioParams();
    }
  };

  // 4. WEBCAM AND MEDIAPIPE INITIALISATION
  const startWebcamTracking = () => {
    if (cameraActive || !videoRef.current) return;

    try {
      const HandsLib = (window as any).Hands;
      const CameraLib = (window as any).Camera;

      if (!HandsLib || !CameraLib) {
        setLoadingError('MediaPipe library is not completely loaded in window context.');
        return;
      }

      // Initialize hands model
      const handsModel = new HandsLib({
        locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
      });

      handsModel.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.55,
        minTrackingConfidence: 0.55,
      });

      handsModel.onResults((results: any) => {
        processResultsRef.current?.(results);
      });

      handsHelperRef.current = handsModel;

      // Initialize camera helper
      const cameraHelper = new CameraLib(videoRef.current, {
        onFrame: async () => {
          if (videoRef.current) {
            await handsModel.send({ image: videoRef.current });
          }
          
          // FPS tracking
          const now = performance.now();
          const delta = now - lastFrameTimeRef.current;
          fpsIntervalRef.current++;
          if (delta >= 1000) {
            setTrackingFps(Math.round((fpsIntervalRef.current * 1000) / delta));
            fpsIntervalRef.current = 0;
            lastFrameTimeRef.current = now;
          }
        },
        width: 640,
        height: 480,
      });

      cameraHelper.start()
        .then(() => {
          setCameraActive(true);
          setLoadingError(null);
        })
        .catch((err: any) => {
          console.error('Camera capture failed', err);
          setLoadingError('Could not gain camera permissions. Enabling Mouse Simulation Demo Mode so you can still perform!');
          setIsDemoMode(true);
        });

      cameraHelperRef.current = cameraHelper;

    } catch (err: any) {
      console.error('Failed to configure MediaPipe tracker', err);
      setLoadingError('Internal tracking crash. Switching to Interactive Demo Mode.');
      setIsDemoMode(true);
    }
  };

  // 5. MEDIAPIPE CORE MATHS & PARAMETERS MAPPING
  const processMediaPipeResults = (results: any) => {
    if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
      setHands([]);
      if (!isAutopilot) {
        decayAudioParams();
      }
      return;
    }

    if (isAutopilot) {
      setIsAutopilot(false);
    }

    const detectedHands: HandData[] = [];

    for (let hIndex = 0; hIndex < results.multiHandLandmarks.length; hIndex++) {
      const landmarks = results.multiHandLandmarks[hIndex];
      const handednessInfo = results.multiHandedness[hIndex];
      // Invert the handedness label to correctly match physical hands when mirrored
      const isRightHand = handednessInfo.label === 'Left';

      // 1. Calculate centroid (average)
      let sumX = 0, sumY = 0, sumZ = 0;
      landmarks.forEach((pt: any) => {
        sumX += pt.x;
        sumY += pt.y;
        sumZ += pt.z;
      });
      const centroid = {
        x: sumX / landmarks.length,
        y: sumY / landmarks.length,
        z: sumZ / landmarks.length,
      };

      // Helper function to calculate 3D Euclidean distance
      const get3DDist = (p1: any, p2: any) => {
        return Math.sqrt(
          Math.pow(p1.x - p2.x, 2) +
          Math.pow(p1.y - p2.y, 2) +
          Math.pow(p1.z - p2.z, 2)
        );
      };

      // 2. Normalize hand size / Depth scaling in 3D (perspective and tilt-invariant)
      const wrist = landmarks[0];
      const middleMcp = landmarks[9];
      const normSize = get3DDist(wrist, middleMcp);

      // Depth index [0, 1] -> Hand closer to camera has larger normSize
      // Normalized values: 0.06 is far, 0.18 is very close
      const depthIndex = Math.max(0, Math.min(1, (normSize - 0.06) / 0.12));

      // 3. Wrist Angle (Relative to vertical index 0 to 9 line)
      const dx = middleMcp.x - wrist.x;
      const dy = middleMcp.y - wrist.y;
      const wristAngle = Math.round(Math.atan2(dx, -dy) * (180 / Math.PI));

      let wristRotation: 'Clockwise' | 'CounterClockwise' | 'Neutral' = 'Neutral';
      if (wristAngle > 10) {
        wristRotation = 'Clockwise';
      } else if (wristAngle < -10) {
        wristRotation = 'CounterClockwise';
      }

      // 4. Gesture Classifier (3D Invariant Finger Extensions)
      // A finger is extended if the distance from the wrist to the tip is greater than the distance from the wrist to the PIP joint.
      const isIndexExtended = get3DDist(wrist, landmarks[8]) > get3DDist(wrist, landmarks[6]);
      const isMiddleExtended = get3DDist(wrist, landmarks[12]) > get3DDist(wrist, landmarks[10]);
      const isRingExtended = get3DDist(wrist, landmarks[16]) > get3DDist(wrist, landmarks[14]);
      const isPinkyExtended = get3DDist(wrist, landmarks[20]) > get3DDist(wrist, landmarks[18]);

      // For the thumb, it is extended if it stretches away from the index finger knuckle base (landmark 5)
      const isThumbExtended = get3DDist(landmarks[4], landmarks[5]) > normSize * 0.55;

      let extendedFingers = 0;
      if (isIndexExtended) extendedFingers++;
      if (isMiddleExtended) extendedFingers++;
      if (isRingExtended) extendedFingers++;
      if (isPinkyExtended) extendedFingers++;
      if (isThumbExtended) extendedFingers++;

      let gesture: 'Open Palm' | 'Closed Fist' | 'Pointing' | 'V-Shape' | 'Unknown' = 'Unknown';
      const isOpen = extendedFingers >= 4;
      const isFist = extendedFingers <= 1 && !isIndexExtended && !isMiddleExtended;

      if (isOpen) {
        gesture = 'Open Palm';
      } else if (isFist) {
        gesture = 'Closed Fist';
      } else if (isIndexExtended && isMiddleExtended && !isRingExtended && !isPinkyExtended) {
        gesture = 'V-Shape';
      } else if (isIndexExtended && !isMiddleExtended && !isRingExtended && !isPinkyExtended) {
        gesture = 'Pointing';
      }

      detectedHands.push({
        id: hIndex,
        handedness: isRightHand ? 'Right' : 'Left',
        score: handednessInfo.score,
        landmarks,
        centroid,
        gesture,
        wristAngle,
        depthIndex,
        isFist,
        isOpenPalm: isOpen,
        extendedFingers,
        wristRotation,
        horizontalPosition: centroid.x < 0.4 ? 'Left' : centroid.x > 0.6 ? 'Right' : 'Center',
        verticalPosition: centroid.y < 0.4 ? 'Top' : centroid.y > 0.6 ? 'Bottom' : 'Middle',
        isThumbExtended,
        isIndexExtended,
        isMiddleExtended,
        isRingExtended,
        isPinkyExtended,
      });
    }

    setHands(detectedHands);

    // Playback state toggle (Open Palm -> Resume/Play, Closed Fist -> Stop/Pause) on Right Hand
    const rightHand = detectedHands.find(h => h.handedness === 'Right');
    if (rightHand) {
      if (rightHand.gesture === 'Open Palm' && !isPlaying) {
        handleStart();
      } else if (rightHand.gesture === 'Closed Fist' && isPlaying) {
        handleStop();
      }
    }

    // 6. MAP PHYSICAL HANDS TO SYNTHESIZER SOUND PARAMETERS
    if (isPlaying) {
      mapHandsToSynth(detectedHands);
    }
  };

  processResultsRef.current = processMediaPipeResults;

  // Map hands tracking arrays directly into active Audio Engine
  const mapHandsToSynth = (activeHands: HandData[]) => {
    let masterVolume = 0.8;
    let intensity = 0.5;
    let pan = 0;
    let reverb = 0;
    let delay = 0;
    
    let drumsVol = 0;
    let pianoVol = 0;
    let guitarVol = 0;
    let synthVol = 0;
    let padVol = 0.6; // default ambient pad backing level
    let bassVol = 0;

    const leftHand = activeHands.find(h => h.handedness === 'Left');
    const rightHand = activeHands.find(h => h.handedness === 'Right');

    // --- LEFT HAND: INSTRUMENT SELECTION & MELODY PITCH ---
    if (leftHand) {
      drumsVol = leftHand.isThumbExtended ? 0.8 : 0;
      pianoVol = leftHand.isIndexExtended ? 0.8 : 0;
      guitarVol = leftHand.isMiddleExtended ? 0.8 : 0;
      synthVol = leftHand.isRingExtended ? 0.8 : 0;
      bassVol = leftHand.isPinkyExtended ? 0.8 : 0;

      // If lead synth is active, map Left Hand horizontal coordinate (mirrored) to pitch index in pentatonic scale
      if (synthVol > 0.05) {
        const xNormal = Math.max(0, Math.min(1.0, 1.0 - leftHand.centroid.x)); // user's left-to-right
        const scaleIndex = Math.min(
          PENTATONIC_SCALE.length - 1,
          Math.max(0, Math.floor(xNormal * PENTATONIC_SCALE.length))
        );
        audioEngineInstance.setLeadSynthPitch(PENTATONIC_SCALE[scaleIndex], true);
      } else {
        audioEngineInstance.setLeadSynthPitch(0, false);
      }
    } else {
      // Fallback if no Left Hand is in view: keep last values or moderate defaults so Right Hand can play
      drumsVol = audioParams.layers.drums;
      pianoVol = audioParams.layers.piano;
      guitarVol = audioParams.layers.guitar;
      synthVol = audioParams.layers.synth;
      bassVol = audioParams.layers.bass;
    }

    // --- RIGHT HAND: MUSICAL EXPRESSION ---
    if (rightHand) {
      // 1. Height (Up/Down Y) -> Master Volume
      // Mirrored Y: 0 is top (loud), 1 is bottom (silent). We calculate: 1 - Y
      masterVolume = Math.max(0.05, Math.min(1.0, 1.0 - rightHand.centroid.y));

      // 2. Depth (Closer/Away Z size) -> Musical Intensity
      intensity = rightHand.depthIndex;

      // 3. Wrist Rotation -> Reverb & Echo/Delay
      // Clockwise (positive angle) -> Reverb, Anticlockwise (negative angle) -> Delay
      if (rightHand.wristAngle > 10) {
        reverb = Math.min(1.0, (rightHand.wristAngle - 10) / 35.0);
        delay = 0;
      } else if (rightHand.wristAngle < -10) {
        delay = Math.min(1.0, (-rightHand.wristAngle - 10) / 35.0);
        reverb = 0;
      } else {
        reverb = 0;
        delay = 0;
      }

      // 4. Horizontal (Left/Right X) -> Stereo Panning
      // Mirror X: user left -> physical X is 1.0 (panned left), user right -> physical X is 0.0 (panned right)
      pan = Math.max(-1.0, Math.min(1.0, (0.5 - rightHand.centroid.x) * 2));
    } else {
      // Fallback if no Right Hand: preserve previous expression parameters
      masterVolume = audioParams.masterVolume;
      intensity = audioParams.intensity;
      pan = audioParams.pan || 0;
      reverb = audioParams.reverb || 0;
      delay = audioParams.delay || 0;
    }

    // Pack into parameters structure
    const updatedParams: AudioEngineParams = {
      masterVolume,
      intensity,
      tempo: 120,
      layers: {
        drums: drumsVol,
        piano: pianoVol,
        guitar: guitarVol,
        synth: synthVol,
        ambientPad: padVol,
        bass: bassVol,
      },
      pan,
      reverb,
      delay,
    };

    setAudioParams(updatedParams);
    audioEngineInstance.updateParams(updatedParams);
  };

  // Gently decay audio layers back to silence if hands are pulled away
  const decayAudioParams = () => {
    if (!isPlaying || isAutopilot) return;

    // Decay current layer gain smoothly in State & Engine
    setAudioParams((prev) => {
      const decayed = {
        masterVolume: prev.masterVolume,
        intensity: prev.intensity,
        tempo: prev.tempo,
        pan: prev.pan || 0,
        reverb: Math.max(0, (prev.reverb || 0) - 0.05),
        delay: Math.max(0, (prev.delay || 0) - 0.05),
        layers: {
          drums: Math.max(0, prev.layers.drums - 0.08),
          piano: Math.max(0, prev.layers.piano - 0.08),
          guitar: Math.max(0, prev.layers.guitar - 0.08),
          synth: Math.max(0, prev.layers.synth - 0.15),
          ambientPad: Math.max(0, prev.layers.ambientPad - 0.05),
          bass: Math.max(0, prev.layers.bass - 0.08),
        }
      };

      // Ensure synthesizer knows lead saw voice is off
      if (decayed.layers.synth < 0.05) {
        audioEngineInstance.setLeadSynthPitch(0, false);
      }

      audioEngineInstance.updateParams(decayed);
      return decayed;
    });
  };

  // 6. FALLBACK INTERACTIVE MOUSE DEMO MODE INTERPRETER
  const handleVisualizerMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPlaying) return;

    if (isAutopilot) {
      setIsAutopilot(false);
    }
    if (!isDemoMode && !cameraActive) {
      setIsDemoMode(true);
    }

    if (!isDemoMode) return;

    const bounds = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - bounds.left) / bounds.width; // 0 to 1
    const y = (e.clientY - bounds.top) / bounds.height;  // 0 to 1

    // Map simulated parameters
    let drumsVol = 0.5;
    let pianoVol = 0.6;
    let guitarVol = 0.4;
    let synthVol = 0.3;
    let padVol = 0.6;
    let bassVol = 0.5;

    // Convert angle to simulated Reverb/Delay
    const angle = virtualAngleRef.current;
    let reverb = 0;
    let delay = 0;
    if (angle > 10) {
      reverb = Math.min(1.0, (angle - 10) / 35.0);
    } else if (angle < -10) {
      delay = Math.min(1.0, (-angle - 10) / 35.0);
    }

    if (x > 0.55) {
      const normalScale = (x - 0.55) / 0.45;
      const index = Math.min(PENTATONIC_SCALE.length - 1, Math.max(0, Math.floor(normalScale * PENTATONIC_SCALE.length)));
      audioEngineInstance.setLeadSynthPitch(PENTATONIC_SCALE[index], true);
      synthVol = 0.8;
    } else {
      audioEngineInstance.setLeadSynthPitch(0, false);
    }

    const updatedParams: AudioEngineParams = {
      masterVolume: Math.max(0, Math.min(1, 1 - y)), // volume height
      intensity: 0.5,
      tempo: 120,
      layers: {
        drums: drumsVol,
        piano: pianoVol,
        guitar: guitarVol,
        synth: synthVol,
        ambientPad: padVol,
        bass: bassVol,
      },
      pan: (x - 0.5) * 2,
      reverb,
      delay,
    };

    setAudioParams(updatedParams);
    audioEngineInstance.updateParams(updatedParams);

    // Trigger a single simulated hand on visualizer for feedback
    const simulatedHand: HandData = {
      id: 0,
      handedness: x > 0.5 ? 'Right' : 'Left',
      score: 1.0,
      // Create a mock skeleton center
      landmarks: [
        { x: x, y: y, z: 0 }, // wrist
        { x: x - 0.05, y: y - 0.05, z: 0 }, // index MCP
        { x: x - 0.05, y: y - 0.12, z: 0 }, // index tip
        { x: x, y: y - 0.14, z: 0 }, // middle tip
      ],
      centroid: { x, y, z: 0 },
      gesture: 'Open Palm',
      wristAngle: angle,
      depthIndex: 0.5,
      isFist: false,
      isOpenPalm: true,
      wristRotation: angle > 15 ? 'Clockwise' : angle < -15 ? 'CounterClockwise' : 'Neutral',
      horizontalPosition: x < 0.4 ? 'Left' : x > 0.6 ? 'Right' : 'Center',
      verticalPosition: y < 0.4 ? 'Top' : y > 0.6 ? 'Bottom' : 'Middle',
    };

    setVirtualHand(simulatedHand);
  };

  const handleVisualizerMouseWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!isPlaying || !isDemoMode) return;
    
    // Rotate simulated wrist clockwise/counter-clockwise with mouse scroll wheel!
    virtualAngleRef.current = Math.max(-45, Math.min(45, virtualAngleRef.current + e.deltaY * 0.08));
  };

  const handleVisualizerMouseLeave = () => {
    setVirtualHand(null);
    decayAudioParams();
  };

  const handleThemeSelect = (id: VisualThemeId) => {
    startTransition(() => {
      setCurrentThemeId(id);
    });
  };

  return (
    <div
      className={`relative w-full h-screen overflow-hidden flex flex-col font-sans transition-colors duration-1000 select-none ${
        currentThemeId === 'cyberpunk' ? 'cyber-grid' : ''
      }`}
      style={{
        backgroundColor: currentThemeId === 'cyberpunk' ? undefined : activeTheme.bgColor,
      }}
      id="root-viewport"
      onMouseMove={handleVisualizerMouseMove}
      onWheel={handleVisualizerMouseWheel}
      onMouseLeave={handleVisualizerMouseLeave}
    >
      {/* 1. IMMERSIVE AUDIO-VISUAL CANVAS BACKDROP (FULLSCREEN LAYER) */}
      <div className="absolute inset-0 w-full h-full cursor-crosshair z-0">
        <AudioVisualizer
          themeId={currentThemeId}
          hands={isDemoMode && virtualHand ? [virtualHand] : hands}
          isPlaying={isPlaying}
        />
        
        {/* Subtle background fogging layer */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60 pointer-events-none" />
      </div>

      {/* 2. TOP HEADERS HUD (FLOATING BADGES BAR) */}
      <header className="relative w-full px-6 py-4 flex items-center justify-between z-20 pointer-events-none">
        <div className="flex items-center gap-3 bg-black/40 backdrop-blur-md px-4 py-2 rounded-xl border border-white/5 pointer-events-auto shadow-lg">
          <div className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
          </div>
          <span className="font-display font-bold text-sm tracking-wide text-white uppercase flex items-center gap-1">
            Air Music <span className="text-[10px] text-cyan-400 font-mono font-normal lowercase bg-cyan-500/10 px-1.5 py-0.5 rounded ml-1 border border-cyan-500/20">v1.2</span>
          </span>
        </div>

        {/* Dynamic Mode Notification Indicator Badge */}
        <div className="flex items-center gap-3 pointer-events-auto">
          {isPlaying && (
            <button
              onClick={() => handleToggleAutopilot()}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg border backdrop-blur-md shadow-md text-xs font-semibold transition-all duration-300 cursor-pointer ${
                isAutopilot
                  ? 'bg-cyan-500/20 border-cyan-400/40 text-cyan-300 hover:bg-cyan-500/30'
                  : 'bg-black/40 border-white/10 text-gray-400 hover:text-white hover:border-white/20'
              }`}
            >
              <Sparkles className={`w-4 h-4 ${isAutopilot ? 'animate-pulse text-cyan-400' : ''}`} />
              <span>Autopilot: {isAutopilot ? 'ON' : 'OFF'}</span>
            </button>
          )}

          {isDemoMode ? (
            <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs px-3.5 py-1.5 rounded-lg backdrop-blur-md shadow-md">
              <ToggleLeft className="w-4 h-4 text-amber-500" />
              <span>Simulated Demo Mode active (Move mouse to play!)</span>
              <button
                onClick={() => {
                  setIsDemoMode(false);
                  if (mediaPipeLoaded && !cameraActive) startWebcamTracking();
                }}
                className="ml-2 font-semibold underline text-[10px] hover:text-white cursor-pointer"
              >
                Use Camera
              </button>
            </div>
          ) : (
            mediaPipeLoaded && (
              <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs px-3.5 py-1.5 rounded-lg backdrop-blur-md shadow-md">
                <ShieldCheck className="w-4 h-4" />
                <span>Webcam handpose models loaded</span>
              </div>
            )
          )}
        </div>
      </header>

      {/* 3. CORE INSTRUMENT LAYOUT GRID CONTAINER */}
      <main className="relative flex-1 w-full max-w-7xl mx-auto px-6 pb-6 flex flex-col justify-end gap-5 z-20 overflow-hidden">
        {/* Error notification alert panel */}
        {loadingError && (
          <div className="bg-rose-500/10 border border-rose-500/25 p-3 rounded-xl flex items-start gap-3 text-left backdrop-blur-md animate-float max-w-2xl mx-auto">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-rose-200">Tracking Notification</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{loadingError}</p>
            </div>
          </div>
        )}

        {/* BENTO THEME INTERFACE ACCENT SWITCHER */}
        {!isPlaying && (
          <div className="w-full">
            <ThemeSelector
              currentThemeId={currentThemeId}
              onThemeSelect={handleThemeSelect}
            />
          </div>
        )}

        {/* PHYSICAL WEBCAM HUD AND MIXER METERS */}
        <div className="w-full h-auto max-h-[72vh] overflow-y-auto no-scrollbar">
          <InstrumentControls
            currentTheme={activeTheme}
            isPlaying={isPlaying}
            onStart={handleStart}
            onStop={handleStop}
            hands={isDemoMode && virtualHand ? [virtualHand] : hands}
            audioParams={audioParams}
            videoRef={videoRef}
            cameraActive={cameraActive}
            fps={trackingFps}
            playMode={playMode}
            onPlayModeChange={handlePlayModeToggle}
            songName={songName}
            isAnalyzing={isAnalyzing}
            songLoaded={songLoaded}
            onSongUpload={handleSongUpload}
          />
        </div>

        {/* BOTTOM METADATA CREDITS */}
        <footer className="flex items-center justify-between text-[10px] text-gray-600 border-t border-white/5 pt-3.5 font-mono">
          <div className="flex items-center gap-2">
            <span>PLATFORM: Google AI Studio Run</span>
            <span>•</span>
            <span>PORT: 3000 Ingress</span>
          </div>
          <div className="flex items-center gap-1">
            <span>Synthesized with</span>
            <Heart className="w-2.5 h-2.5 text-rose-500 fill-rose-500" />
            <span>Web Audio API</span>
          </div>
        </footer>
      </main>
    </div>
  );
}
