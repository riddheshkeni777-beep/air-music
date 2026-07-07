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

The synthesizer maps hand telemetry data to audio parameters in real-time:

| Gesture / Position | Control Parameter | Description |
| :--- | :--- | :--- |
| **Fist Closed** | Mute / Layer Off | Disables synth audio voices for the corresponding hand. |
| **Open Palm** | Volume Increase | Unmutes/Increases volume for the active synth layer. |
| **Horizontal (X-Axis)** | Pitch / Frequency | Moves through notes of the A-minor Pentatonic Scale. |
| **Vertical (Y-Axis)** | Filter Cutoff / Volume | Modulates the master low-pass filter or layer gain. |
| **Depth (Z-Axis / Hand Size)** | Intensity / Reverb | Controls the feedback level and delay line mix. |

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
