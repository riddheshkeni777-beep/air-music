export type VisualThemeId = 'galaxy' | 'cyberpunk' | 'ocean' | 'forest' | 'geometry';

export interface VisualTheme {
  id: VisualThemeId;
  name: string;
  description: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  bgColor: string;
  particlesCount: number;
}

export interface HandData {
  id: number; // 0 for first, 1 for second
  handedness: 'Left' | 'Right';
  score: number;
  landmarks: { x: number; y: number; z: number }[];
  
  // Computed parameters
  centroid: { x: number; y: number; z: number };
  gesture: 'Open Palm' | 'Closed Fist' | 'Pointing' | 'V-Shape' | 'Unknown';
  wristAngle: number; // in degrees, relative to vertical
  depthIndex: number; // 0 to 1, calculated from hand size
  
  // Specific gesture triggers
  isFist: boolean;
  isOpenPalm: boolean;
  extendedFingers?: number;
  wristRotation: 'Clockwise' | 'CounterClockwise' | 'Neutral';
  horizontalPosition: 'Left' | 'Right' | 'Center';
  verticalPosition: 'Top' | 'Bottom' | 'Middle';
}

export interface SynthLayerState {
  drums: number;       // volume/intensity [0, 1]
  piano: number;       // volume/intensity [0, 1]
  guitar: number;      // volume/intensity [0, 1]
  synth: number;       // volume/intensity [0, 1]
  ambientPad: number;   // volume/intensity [0, 1]
}

export interface AudioEngineParams {
  masterVolume: number; // [0, 1]
  intensity: number;    // [0, 1] (distortion/filter/reverb mix)
  tempo: number;        // BPM [60, 180]
  layers: SynthLayerState;
  isAutopilot?: boolean;
}

export interface PerformanceStats {
  fps: number;
  latencyMs: number;
  handsCount: number;
}
