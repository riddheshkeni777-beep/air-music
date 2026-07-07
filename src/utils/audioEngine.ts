import { AudioEngineParams } from '../types';

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private isPlaying = false;
  // Audio Nodes
  private masterGain: GainNode | null = null;
  private delayNode: DelayNode | null = null;
  private delayGain: GainNode | null = null;
  private delayLevelGain: GainNode | null = null;
  private filterNode: BiquadFilterNode | null = null;
  private reverbNode: ConvolverNode | null = null;
  private reverbGain: GainNode | null = null;
  private pannerNode: StereoPannerNode | null = null;
  public analyser: AnalyserNode | null = null;

  // Play Mode (Procedural Synth vs Song Stems Player)
  private playMode: 'synth' | 'song' = 'synth';
  private loadedAudioBuffer: AudioBuffer | null = null;
  private songSourceNode: AudioBufferSourceNode | null = null;
  
  // Stems DSP Crossover Filters
  private drumsFilter: BiquadFilterNode | null = null;
  private pianoFilter: BiquadFilterNode | null = null;
  private guitarFilter: BiquadFilterNode | null = null;
  private synthFilter: BiquadFilterNode | null = null;
  private bassFilter: BiquadFilterNode | null = null;
  private padFilter: BiquadFilterNode | null = null;

  private droneOscillators: OscillatorNode[] = [];

  // Track Gains
  private drumsGain: GainNode | null = null;
  private pianoGain: GainNode | null = null;
  private guitarGain: GainNode | null = null;
  private synthGain: GainNode | null = null;
  private padGain: GainNode | null = null;
  private bassGain: GainNode | null = null;

  // Active state parameters
  private params: AudioEngineParams = {
    masterVolume: 0.8,
    intensity: 0.5,
    tempo: 120,
    layers: {
      drums: 0,
      piano: 0,
      guitar: 0,
      synth: 0,
      ambientPad: 0,
      bass: 0,
    },
    pan: 0,
    reverb: 0,
    delay: 0,
  };

  // Sequencer Variables
  private timerId: number | null = null;
  private nextNoteTime = 0.0;
  private currentStep = 0;
  private lookaheadMs = 25.0;
  private scheduleAheadTime = 0.1; // seconds

  // Lead Synth active voice
  private leadOsc1: OscillatorNode | null = null;
  private leadOsc2: OscillatorNode | null = null;
  private leadVoiceGain: GainNode | null = null;
  private activeLeadFreq = 0;

  // Chord Progression: A minor, F major, C major, G major
  private chords = [
    [110.00, 220.00, 261.63, 329.63], // Am: A2, A3, C4, E4
    [87.31, 174.61, 220.00, 261.63],  // F:  F2, F3, A3, C4
    [130.81, 261.63, 329.63, 392.00], // C:  C3, C4, E4, G4
    [98.00, 196.00, 246.94, 293.66],  // G:  G2, G3, B3, D4
  ];

  constructor() {
    // Lazy initialisation on user start click
  }

  private createReverbNode(seconds: number, decay: number): ConvolverNode | null {
    if (!this.ctx) return null;
    try {
      const rate = this.ctx.sampleRate;
      const len = rate * seconds;
      const impulse = this.ctx.createBuffer(2, len, rate);
      const left = impulse.getChannelData(0);
      const right = impulse.getChannelData(1);
      for (let i = 0; i < len; i++) {
        const decayValue = Math.exp(-i / (rate * decay));
        left[i] = (Math.random() * 2 - 1) * decayValue;
        right[i] = (Math.random() * 2 - 1) * decayValue;
      }
      const convolver = this.ctx.createConvolver();
      convolver.buffer = impulse;
      return convolver;
    } catch (e) {
      console.error("Failed to create convolver reverb", e);
      return null;
    }
  }

  public init() {
    if (this.ctx) return;
    console.log("AudioEngine: Initializing AudioContext and routing nodes...");
    
    // Create audio context
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) {
      console.error('Web Audio API is not supported in this browser.');
      return;
    }
    
    this.ctx = new AudioContextClass();
    
    // Initialize Master chain
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.params.masterVolume, this.ctx.currentTime);
    
    this.filterNode = this.ctx.createBiquadFilter();
    this.filterNode.type = 'lowpass';
    this.filterNode.Q.value = 4.0;
    this.filterNode.frequency.setValueAtTime(1200, this.ctx.currentTime);
    
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 512;
    
    // Build Panner node
    this.pannerNode = this.ctx.createStereoPanner();
    this.pannerNode.pan.setValueAtTime(this.params.pan || 0, this.ctx.currentTime);

    // Build Delay line and delay send gain
    this.delayNode = this.ctx.createDelay(1.0);
    this.delayNode.delayTime.value = 0.333; // Triplets/eighth delay
    this.delayGain = this.ctx.createGain();
    this.delayGain.gain.value = 0.35; // feedback level
    
    this.delayLevelGain = this.ctx.createGain();
    this.delayLevelGain.gain.value = 0.0; // initially off

    // Feedback loop
    this.delayNode.connect(this.delayGain);
    this.delayGain.connect(this.delayNode);

    // Build Reverb send chain
    this.reverbNode = this.createReverbNode(2.5, 1.5);
    this.reverbGain = this.ctx.createGain();
    this.reverbGain.gain.value = 0.0; // initially off

    // Initialize track gains
    this.drumsGain = this.ctx.createGain();
    this.pianoGain = this.ctx.createGain();
    this.guitarGain = this.ctx.createGain();
    this.synthGain = this.ctx.createGain();
    this.padGain = this.ctx.createGain();
    this.bassGain = this.ctx.createGain();

    // Set initial gains smoothly
    this.drumsGain.gain.value = 0;
    this.pianoGain.gain.value = 0;
    this.guitarGain.gain.value = 0;
    this.synthGain.gain.value = 0;
    this.padGain.gain.value = 0;
    this.bassGain.gain.value = 0;

    // CONNECTIONS
    // Tracks go to Filter Node
    this.drumsGain.connect(this.filterNode);
    this.pianoGain.connect(this.filterNode);
    this.guitarGain.connect(this.filterNode);
    this.synthGain.connect(this.filterNode);
    this.padGain.connect(this.filterNode);
    this.bassGain.connect(this.filterNode);

    // Build Stems DSP Crossover Filters
    this.bassFilter = this.ctx.createBiquadFilter();
    this.bassFilter.type = 'lowpass';
    this.bassFilter.frequency.value = 150; // sub bass

    this.drumsFilter = this.ctx.createBiquadFilter();
    this.drumsFilter.type = 'bandpass';
    this.drumsFilter.frequency.value = 3000;
    this.drumsFilter.Q.value = 0.5; // rhythm transient range

    this.pianoFilter = this.ctx.createBiquadFilter();
    this.pianoFilter.type = 'bandpass';
    this.pianoFilter.frequency.value = 1000; // mid range (lyrics/vocals/piano)
    this.pianoFilter.Q.value = 1.0;

    this.guitarFilter = this.ctx.createBiquadFilter();
    this.guitarFilter.type = 'bandpass';
    this.guitarFilter.frequency.value = 2200; // mid-high instruments
    this.guitarFilter.Q.value = 1.0;

    this.synthFilter = this.ctx.createBiquadFilter();
    this.synthFilter.type = 'highpass';
    this.synthFilter.frequency.value = 3500; // lead highs

    this.padFilter = this.ctx.createBiquadFilter();
    this.padFilter.type = 'bandpass';
    this.padFilter.frequency.value = 500; // mid-low pads
    this.padFilter.Q.value = 1.0;

    // Connect crossover filters to track gains
    this.drumsFilter.connect(this.drumsGain);
    this.pianoFilter.connect(this.pianoGain);
    this.guitarFilter.connect(this.guitarGain);
    this.synthFilter.connect(this.synthGain);
    this.bassFilter.connect(this.bassGain);
    this.padFilter.connect(this.padGain);

    this.filterNode.connect(this.masterGain);
    
    if (this.reverbNode && this.reverbGain) {
      this.filterNode.connect(this.reverbNode);
      this.reverbNode.connect(this.reverbGain);
      this.reverbGain.connect(this.masterGain);
    }

    this.filterNode.connect(this.delayLevelGain);
    this.delayLevelGain.connect(this.delayNode);
    this.delayNode.connect(this.masterGain);

    // Master goes to Panner, then Analyser, then Destination
    this.masterGain.connect(this.pannerNode);
    this.pannerNode.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);

    // Start Ambient Drone Pad
    this.startAmbientDrone();
    console.log("AudioEngine: initialization complete.");
  }

  public start() {
    console.log("AudioEngine: start() called. playMode:", this.playMode, "isPlaying:", this.isPlaying);
    this.init();
    if (this.isPlaying) {
      console.log("AudioEngine: already playing, start() ignored.");
      return;
    }
    
    if (this.ctx && this.ctx.state === 'suspended') {
      console.log("AudioContext is suspended, calling resume()...");
      this.ctx.resume().then(() => {
        console.log("AudioContext resumed successfully. State:", this.ctx?.state);
      }).catch(err => {
        console.error("Failed to resume AudioContext:", err);
      });
    }

    this.isPlaying = true;
    this.currentStep = 0;
    if (this.ctx) {
      if (this.playMode === 'song' && this.loadedAudioBuffer) {
        console.log("Starting songSourceNode playback...");
        this.songSourceNode = this.ctx.createBufferSource();
        this.songSourceNode.buffer = this.loadedAudioBuffer;
        this.songSourceNode.loop = true;

        if (this.drumsFilter) this.songSourceNode.connect(this.drumsFilter);
        if (this.pianoFilter) this.songSourceNode.connect(this.pianoFilter);
        if (this.guitarFilter) this.songSourceNode.connect(this.guitarFilter);
        if (this.synthFilter) this.songSourceNode.connect(this.synthFilter);
        if (this.bassFilter) this.songSourceNode.connect(this.bassFilter);
        if (this.padFilter) this.songSourceNode.connect(this.padFilter);

        this.songSourceNode.start(0);
        console.log("songSourceNode playback started.");
      }

      this.updateParams(this.params);
      console.log("AudioEngine: parameters updated on start:", this.params);
      this.nextNoteTime = this.ctx.currentTime + 0.1;
      this.scheduler();
      console.log("AudioEngine: sequencer scheduler started.");
    }
  }

  public stop() {
    console.log("AudioEngine: stop() called.");
    this.isPlaying = false;
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    
    // Smoothly ramp down lead synth if active
    if (this.leadVoiceGain && this.ctx) {
      this.leadVoiceGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
    }

    // Stop song playback
    if (this.songSourceNode) {
      try {
        this.songSourceNode.stop();
      } catch (e) {
        // already stopped
      }
      this.songSourceNode.disconnect();
      this.songSourceNode = null;
    }

    // Stop drone oscillators
    this.stopAmbientDrone();
  }

  public destroy() {
    console.log("AudioEngine: destroy() called.");
    this.stop();
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
  }

  public isEngineActive(): boolean {
    return this.isPlaying;
  }

  public setPlayMode(mode: 'synth' | 'song') {
    console.log("AudioEngine: setPlayMode() called. Mode:", mode);
    const wasPlaying = this.isPlaying;
    if (wasPlaying) {
      this.stop();
    }
    this.playMode = mode;
    if (wasPlaying) {
      this.start();
    }
  }

  public getPlayMode(): 'synth' | 'song' {
    return this.playMode;
  }

  public loadSong(file: File): Promise<string> {
    console.log("AudioEngine: loadSong() called for file:", file.name);
    this.init();
    return new Promise((resolve, reject) => {
      if (!this.ctx) {
        reject(new Error('AudioContext not initialized'));
        return;
      }

      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          if (!arrayBuffer) {
            reject(new Error('Failed to read file buffer'));
            return;
          }
          console.log("AudioEngine: audio file buffer loaded, decoding...");
          this.ctx!.decodeAudioData(
            arrayBuffer,
            (buffer) => {
              this.loadedAudioBuffer = buffer;
              console.log("AudioEngine: decoding complete! Duration:", buffer.duration, "Sample Rate:", buffer.sampleRate);
              resolve(file.name);
            },
            (err) => {
              console.error("AudioEngine: decodeAudioData error callback:", err);
              reject(err || new Error('Error decoding audio data'));
            }
          );
        } catch (err) {
          console.error("AudioEngine: loadSong exception:", err);
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('File reader error'));
      reader.readAsArrayBuffer(file);
    });
  }

  public getSongDuration(): number {
    return this.loadedAudioBuffer ? this.loadedAudioBuffer.duration : 0;
  }

  public updateParams(newParams: AudioEngineParams) {
    this.params = newParams;
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    // Ensure all parameters are valid numbers and fallback if NaN
    const masterVol = isNaN(this.params.masterVolume) ? 0.8 : this.params.masterVolume;
    const intensityVal = isNaN(this.params.intensity) ? 0.5 : this.params.intensity;
    const panVal = isNaN(this.params.pan) ? 0 : this.params.pan;
    const reverbVal = isNaN(this.params.reverb) ? 0 : this.params.reverb;
    const delayVal = isNaN(this.params.delay) ? 0 : this.params.delay;

    // 1. Master Volume
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(masterVol, now, 0.1);
    }

    // 2. Filter Cutoff (Intensity/Bass mapping)
    if (this.filterNode) {
      const targetCutoff = 250 + (intensityVal * 5750);
      this.filterNode.frequency.setTargetAtTime(targetCutoff, now, 0.15);
      this.filterNode.Q.setTargetAtTime(1.0 + (intensityVal * 8.0), now, 0.15);
    }

    // 3. Stereo Panning
    if (this.pannerNode && panVal !== undefined) {
      this.pannerNode.pan.setTargetAtTime(panVal, now, 0.15);
    }

    // 4. Reverb send gain
    if (this.reverbGain && reverbVal !== undefined) {
      this.reverbGain.gain.setTargetAtTime(reverbVal * 0.7, now, 0.15);
    }

    // 5. Delay send gain
    if (this.delayLevelGain && delayVal !== undefined) {
      this.delayLevelGain.gain.setTargetAtTime(delayVal * 0.6, now, 0.15);
    }

    // 6. Update track gains with target ramps to prevent clicking
    const dVol = isNaN(this.params.layers.drums) ? 0 : this.params.layers.drums;
    const pVol = isNaN(this.params.layers.piano) ? 0 : this.params.layers.piano;
    const gVol = isNaN(this.params.layers.guitar) ? 0 : this.params.layers.guitar;
    const sVol = isNaN(this.params.layers.synth) ? 0 : this.params.layers.synth;
    const padVol = isNaN(this.params.layers.ambientPad) ? 0 : this.params.layers.ambientPad;
    const bVol = isNaN(this.params.layers.bass) ? 0 : this.params.layers.bass;

    if (this.drumsGain) this.drumsGain.gain.setTargetAtTime(dVol, now, 0.1);
    if (this.pianoGain) this.pianoGain.gain.setTargetAtTime(pVol * 0.7, now, 0.1);
    if (this.guitarGain) this.guitarGain.gain.setTargetAtTime(gVol * 0.6, now, 0.1);
    if (this.synthGain) this.synthGain.gain.setTargetAtTime(sVol * 0.5, now, 0.05);
    if (this.padGain) this.padGain.gain.setTargetAtTime(padVol * 0.8, now, 0.15);
    if (this.bassGain) this.bassGain.gain.setTargetAtTime(bVol * 0.7, now, 0.1);
  }

  // Ambient Pad: Detuned Drone Synthesis
  private startAmbientDrone() {
    if (!this.ctx || !this.padGain || this.playMode === 'song') return;

    // Clear any existing active drone oscillators
    this.stopAmbientDrone();

    const createDroneVoice = (freq: number, detune: number) => {
      if (!this.ctx || !this.padGain) return;
      
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      osc.detune.setValueAtTime(detune, this.ctx.currentTime);
      
      gain.gain.setValueAtTime(0.08, this.ctx.currentTime); // low volume voice
      
      osc.connect(gain);
      gain.connect(this.padGain);
      osc.start();
      this.droneOscillators.push(osc);
    };

    // A minor background pad chords (A2 and E3 detuned)
    createDroneVoice(110.0, -10);
    createDroneVoice(110.0, 10);
    createDroneVoice(164.81, -5); // Fifth
    createDroneVoice(220.0, 5);    // Octave
  }

  private stopAmbientDrone() {
    this.droneOscillators.forEach(osc => {
      try {
        osc.stop();
      } catch (e) {
        // already stopped
      }
      try {
        osc.disconnect();
      } catch (e) {
        // already disconnected
      }
    });
    this.droneOscillators = [];
  }

  // Lead Synthesizer Note Triggering (Continuous Pitch)
  public setLeadSynthPitch(freq: number, active: boolean) {
    if (!this.ctx || !this.synthGain || this.playMode === 'song') return;

    const now = this.ctx.currentTime;

    if (!active) {
      if (this.leadVoiceGain) {
        this.leadVoiceGain.gain.setTargetAtTime(0, now, 0.1);
      }
      return;
    }

    // Create the synthesizers voices if not existing
    if (!this.leadOsc1 || !this.leadOsc2 || !this.leadVoiceGain) {
      this.leadOsc1 = this.ctx.createOscillator();
      this.leadOsc2 = this.ctx.createOscillator();
      this.leadVoiceGain = this.ctx.createGain();

      this.leadOsc1.type = 'sawtooth';
      this.leadOsc2.type = 'triangle';

      this.leadVoiceGain.gain.setValueAtTime(0.0, now);

      // detune them for fat chorus effect
      this.leadOsc1.detune.setValueAtTime(-15, now);
      this.leadOsc2.detune.setValueAtTime(15, now);

      // connect to master
      this.leadOsc1.connect(this.leadVoiceGain);
      this.leadOsc2.connect(this.leadVoiceGain);
      this.leadVoiceGain.connect(this.synthGain);

      this.leadOsc1.start(now);
      this.leadOsc2.start(now);
    }

    // Smooth slide (portamento)
    this.leadOsc1.frequency.setTargetAtTime(freq, now, 0.08);
    this.leadOsc2.frequency.setTargetAtTime(freq, now, 0.08);

    // Ramp up gain
    this.leadVoiceGain.gain.setTargetAtTime(0.35, now, 0.05);
    this.activeLeadFreq = freq;
  }

  // --- PROCEDURAL SCHEDULER & SEQUENCER ---

  private scheduler() {
    if (!this.isPlaying || !this.ctx) return;

    while (this.nextNoteTime < this.ctx.currentTime + this.scheduleAheadTime) {
      this.scheduleStep(this.currentStep, this.nextNoteTime);
      this.advanceStep();
    }

    // Schedule next polling
    this.timerId = window.setTimeout(() => this.scheduler(), this.lookaheadMs);
  }

  private advanceStep() {
    if (!this.ctx) return;
    const secondsPerBeat = 60.0 / this.params.tempo;
    const stepDuration = secondsPerBeat / 4; // 16th notes
    
    this.nextNoteTime += stepDuration;
    this.currentStep = (this.currentStep + 1) % 16;
  }

  private scheduleStep(step: number, time: number) {
    if (!this.ctx || this.playMode === 'song') return;

    const bar = Math.floor(step / 16);
    const chordIndex = Math.floor(this.currentStep / 4) % 4; // Cycles Amin -> Fmaj -> Cmaj -> Gmaj

    // 1. DRUMS SEQUENCER (Volume scaled in master via drumsGain)
    const drumsVol = this.params.layers.drums;
    if (drumsVol > 0.05) {
      // Kick drum scheduling (Steps 0, 8, 10)
      if (step === 0 || step === 8 || step === 10) {
        this.synthesizeKick(time);
      }
      
      // Snare drum scheduling (Steps 4, 12)
      if (step === 4 || step === 12) {
        this.synthesizeSnare(time);
      } else if (step === 15 && Math.random() > 0.5) {
        // Random double snare fill
        this.synthesizeSnare(time);
      }

      // Hi-hat scheduling (Even steps)
      if (step % 2 === 0) {
        const volumeFactor = step % 4 === 0 ? 1.0 : 0.6; // accented
        this.synthesizeHihat(time, volumeFactor);
      }
    }

    // 2. PIANO CHORDS SEQUENCER (Triggered on step 0, 8)
    const pianoVol = this.params.layers.piano;
    if (pianoVol > 0.05) {
      if (step === 0 || step === 8) {
        this.synthesizeChord(this.chords[chordIndex], time, 0.4);
      }
    }

    // 3. ARPEGGIATOR / GUITAR STRINGS (Triggered on steps 0, 3, 6, 9, 12, 14)
    const guitarVol = this.params.layers.guitar;
    if (guitarVol > 0.05) {
      const arpNotes = this.chords[chordIndex];
      const arpIndices = [1, 2, 3, 2]; // Arpeggiate through middle voices
      const noteToPlay = arpNotes[arpIndices[Math.floor(step / 2) % arpIndices.length]] * 2; // play an octave higher!
      
      if (step % 2 === 0) {
        this.synthesizePluck(noteToPlay, time, 0.35);
      }
    }

    // 3.5. BASS SEQUENCER
    const bassVol = this.params.layers.bass;
    if (bassVol > 0.05) {
      const chordNotes = this.chords[chordIndex];
      const baseNote = chordNotes[0] / 2; // Play bass root octave lower
      // Play root note on steps 0, 4, 8, 12, and a short syncopated note on step 10
      if (step === 0 || step === 4 || step === 8 || step === 12) {
        this.synthesizeBass(baseNote, time, 0.45);
      } else if (step === 10) {
        this.synthesizeBass(baseNote, time, 0.2);
      }
    }

    // 4. AUTOPILOT MELODY SYNTH (Triggered when autopilot is active and synth volume is up)
    if (this.params.isAutopilot && this.params.layers.synth > 0.05) {
      if (step === 2 || step === 6 || step === 10 || step === 14 || (step % 2 === 1 && Math.random() > 0.65)) {
        const melodyScale = [220.00, 261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25, 783.99, 880.00];
        const chordNotes = this.chords[chordIndex];
        let freqToPlay = melodyScale[Math.floor(Math.random() * melodyScale.length)];
        if (Math.random() > 0.5) {
          const chordBaseNote = chordNotes[Math.floor(Math.random() * chordNotes.length)];
          freqToPlay = chordBaseNote * 2;
          if (Math.random() > 0.5) freqToPlay *= 2;
        }
        this.synthesizeAutopilotLead(freqToPlay, time);
      }
    }
  }

  // --- KICK DRUM PROCEDURAL SYNTHESIS ---
  private synthesizeKick(time: number) {
    if (!this.ctx || !this.drumsGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.drumsGain);

    osc.type = 'sine';
    
    // Pitch envelope: Rapid sweep from 150Hz down to 0.01Hz
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.3);

    // Amplitude envelope: fast attack, quick decay
    gain.gain.setValueAtTime(1.0, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.3);

    osc.start(time);
    osc.stop(time + 0.3);
  }

  // --- SNARE DRUM PROCEDURAL SYNTHESIS ---
  private synthesizeSnare(time: number) {
    if (!this.ctx || !this.drumsGain) return;

    // 1. Snare tone (triangle wave sweep)
    const toneOsc = this.ctx.createOscillator();
    const toneGain = this.ctx.createGain();
    toneOsc.type = 'triangle';
    toneOsc.frequency.setValueAtTime(180, time);
    toneOsc.frequency.exponentialRampToValueAtTime(100, time + 0.15);
    toneGain.gain.setValueAtTime(0.5, time);
    toneGain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);
    toneOsc.connect(toneGain);
    toneGain.connect(this.drumsGain);

    // 2. Snare rattle (high-passed noise)
    const bufferSize = this.ctx.sampleRate * 0.2; // 0.2 seconds
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noiseNode = this.ctx.createBufferSource();
    noiseNode.buffer = buffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 1000;

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.7, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);

    noiseNode.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.drumsGain);

    toneOsc.start(time);
    toneOsc.stop(time + 0.15);

    noiseNode.start(time);
    noiseNode.stop(time + 0.2);
  }

  // --- HI-HAT PROCEDURAL SYNTHESIS ---
  private synthesizeHihat(time: number, volFactor: number) {
    if (!this.ctx || !this.drumsGain) return;

    const bufferSize = this.ctx.sampleRate * 0.05; // very short decay
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 8000;
    filter.Q.value = 3.0;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.25 * volFactor, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.drumsGain);

    noise.start(time);
    noise.stop(time + 0.05);
  }

  // --- PIANO CHORD SYNTHESIS ---
  private synthesizeChord(frequencies: number[], time: number, vol: number) {
    if (!this.ctx || !this.pianoGain) return;

    frequencies.forEach((freq) => {
      if (!this.ctx || !this.pianoGain) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, time);

      // Low pass filter individual notes for warmer piano feel
      const noteFilter = this.ctx.createBiquadFilter();
      noteFilter.type = 'lowpass';
      noteFilter.frequency.setValueAtTime(450, time);

      // Slow soft attack, decay to zero
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(vol * 0.25, time + 0.05); // soft pluck
      gain.gain.exponentialRampToValueAtTime(0.001, time + 2.0); // long resonance

      osc.connect(noteFilter);
      noteFilter.connect(gain);
      gain.connect(this.pianoGain);

      osc.start(time);
      osc.stop(time + 2.1);
    });
  }

  // --- PLUCKED STRING SYNTHESIS ---
  private synthesizePluck(freq: number, time: number, vol: number) {
    if (!this.ctx || !this.guitarGain) return;

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(freq, time);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq * 1.002, time); // detuned

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1500, time);
    filter.frequency.exponentialRampToValueAtTime(200, time + 0.4); // sweep cutoff down

    // Instant attack, rapid decay for pluck shape
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(vol * 0.35, time + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.6);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.guitarGain);

    osc1.start(time);
    osc1.stop(time + 0.7);
    osc2.start(time);
    osc2.stop(time + 0.7);
  }

  // --- AUTOPILOT MELODY SYNTH ---
  private synthesizeAutopilotLead(freq: number, time: number) {
    if (!this.ctx || !this.synthGain) return;

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(freq, time);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq * 1.003, time);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1800, time);
    filter.frequency.exponentialRampToValueAtTime(450, time + 0.3);

    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(0.12, time + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.35);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.synthGain);

    osc1.start(time);
    osc1.stop(time + 0.4);
    osc2.start(time);
    osc2.stop(time + 0.4);
  }

  // --- BASS PROCEDURAL SYNTHESIS ---
  private synthesizeBass(freq: number, time: number, duration: number) {
    if (!this.ctx || !this.bassGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(200, time); // warm bass tone

    // Envelope
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(0.5, time + 0.02); // quick attack
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration); // decay

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.bassGain);

    osc.start(time);
    osc.stop(time + duration + 0.1);
  }
}

export const audioEngineInstance = new AudioEngine();
