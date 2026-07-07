# 🎵 Air Music - Interactive Gesture-Controlled Web Synthesizer

Air Music is a premium, immersive web-based synthesizer that uses your device's camera to track hands in real-time and translate physical gestures into dynamic musical elements. Combining cutting-edge AI hand-tracking with a robust audio synthesis engine, it allows users to sculpt soundscapes, trigger drums, and play lead synth lines simply by moving their hands in the air.

---

## ✨ Key Features

* **🎥 Real-Time Gesture Tracking**: Powered by Google MediaPipe Hands, mapping fine finger landmarks to synthesizer controls via your webcam.
* **🎹 Adaptive Audio Engine**: Built on the native Web Audio API, featuring a multi-layer generator (Drums, Piano, Guitar, Synth, Ambient Pad) and low-pass filter sweeps, reverb, delay, and tempo controls.
* **🪐 Immersive Particle Visualizer**: High-performance HTML5 Canvas-based visualizers reacting dynamically to hand positions and audio frequencies.
* **🚀 Autopilot & Demo Modes**: Auto-generates music with automated layering or allows mouse simulation as a virtual hand fallback.
* **🎨 Aesthetic Themes**: Choose from multiple curated styling environments:
  * **Galaxy**: Nebula particles reacting to low-frequency hums.
  * **Cyberpunk**: Glowing neon accents and geometric audio waves.
  * **Ocean**: Cool blue, organic water ripple simulations.
  * **Forest**: Natural green floating light rays.
  * **Geometry**: Sharp vector lines morphing to sound waves.
* **⚡ Diagnostics Dashboard**: High-fidelity dashboard displaying webcam FPS, active hand count, and engine latency.

---

## 🛠️ Tech Stack

* **Frontend**: React 19, TypeScript, Vite
* **Styling**: Tailwind CSS v4, Vanilla CSS
* **Gesture Tracking**: MediaPipe Hands (via CDN)
* **Audio**: Native Web Audio API (custom oscillators, biquad filters, delay lines, and gain nodes)
* **Icons**: Lucide React

---

## 🕹️ How It Works (Gesture Mappings)

The synthesizer maps hand pose telemetry to instrument layers and parameters:

### Left Hand – Instrument Selection

* **Left Thumb** → Drums
* **Left Index Finger** → Piano
* **Left Middle Finger** → Guitar
* **Left Ring Finger** → Lead Synth (Pitch mapped to Left Hand X-axis)
* **Left Little Finger** → Bass

### Right Hand – Musical Expression

| Gesture / Position | Control Parameter | Description |
| :--- | :--- | :--- |
| **Open Palm** | Play / Resume | Starts or resumes the audio synthesizer. |
| **Closed Fist** | Pause / Stop | Pauses or stops the audio synthesizer. |
| **Vertical (Y-Axis)** | Master Volume | Raising hand increases volume; lowering hand decreases volume. |
| **Horizontal (X-Axis)** | Stereo Panning | Moving hand left pans left; moving hand right pans right. |
| **Depth (Z-Axis / Size)** | Musical Intensity | Moving hand closer increases intensity; moving hand away decreases it. |
| **Wrist Tilt (Clockwise)** | Reverb Send Level | Tilting wrist clockwise adds spacious feedback reverb. |
| **Wrist Tilt (Anticlockwise)** | Echo/Delay Level | Tilting wrist counter-clockwise adds echo repetitions. |

---

## 🎵 Song Player & DSP Stem Separation

In addition to procedural synthesis, **Air Music** includes a song player mode that lets you upload any audio file (.mp3, .wav, .ogg) and isolate its tracks in real-time.

* **Crossover Filter Bank**: Uses five parallel Web Audio API BiquadFilterNodes (Lowpass, Bandpass, Highpass crossover networks) calibrated to separate different audio stems:
  * **Drums**: Transients & rhythmic band filters.
  * **Vocals/Lyrics**: Midrange bandpass centered at 1000Hz.
  * **Guitar**: Mid-high bandpass centered at 2200Hz.
  * **Lead Melody**: Highpass filter targeting lead treble lines.
  * **Bass**: Sub-bass lowpass filter centered at 150Hz.
* **Interactive Tuning**: Use Left Hand finger extensions to dynamically solo/mute these frequency-isolated stems of your uploaded song in real-time, just like in synth mode!

---

## 🚀 Getting Started

### Prerequisites

* **Node.js** (v18.0.0 or higher recommended)
* A modern web browser with a webcam

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/riddheshkeni777-beep/air-music.git
   cd air-music
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```

4. **Open in browser**:
   Navigate to `http://localhost:3000` (or the port specified in your console).

5. **Start Playing**:
   Click the **Start Engine** button, grant webcam permissions, and raise your hands in front of the camera!
