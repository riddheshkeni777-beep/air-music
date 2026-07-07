import React from 'react';
import { VisualTheme, HandData, AudioEngineParams } from '../types';
import { Play, Square, Video, ShieldAlert, Cpu, Music, Sparkles, Sliders, Volume2, Maximize2, Upload, RefreshCw, ChevronUp, ChevronDown } from 'lucide-react';

interface InstrumentControlsProps {
  currentTheme: VisualTheme;
  isPlaying: boolean;
  onStart: () => void;
  onStop: () => void;
  hands: HandData[];
  audioParams: AudioEngineParams;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  cameraActive: boolean;
  fps: number;
  playMode: 'synth' | 'song';
  onPlayModeChange: (mode: 'synth' | 'song') => void;
  songName: string | null;
  isAnalyzing: boolean;
  songLoaded: boolean;
  onSongUpload: (file: File) => void;
}

export const InstrumentControls: React.FC<InstrumentControlsProps> = ({
  currentTheme,
  isPlaying,
  onStart,
  onStop,
  hands,
  audioParams,
  videoRef,
  cameraActive,
  fps,
  playMode,
  onPlayModeChange,
  songName,
  isAnalyzing,
  songLoaded,
  onSongUpload,
}) => {
  const primaryColor = currentTheme.primaryColor;
  const [isConsoleExpanded, setIsConsoleExpanded] = React.useState(false);
  const [isDragging, setIsDragging] = React.useState(false);
  const shouldMinimize = isPlaying && !isConsoleExpanded;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 w-full h-full" id="instrument-controls-console">
      {/* LEFT COLUMN: WEBCAM PREVIEW + TRACKING STATUS */}
      <div className={`${shouldMinimize ? 'lg:col-span-12 flex flex-col items-center justify-center' : 'lg:col-span-5'} flex flex-col gap-4`}>
        {/* WEBCAM PREVIEW PANEL */}
        <div className={`relative rounded-xl border border-white/5 bg-black/40 backdrop-blur-md overflow-hidden flex items-center justify-center group shadow-2xl transition-all duration-300 ${shouldMinimize ? 'w-full max-w-md lg:max-w-lg aspect-[4/3]' : 'w-full flex-1 h-full min-h-[420px]'}`}>
          {/* Mirrored webcam stream */}
          <video
            ref={videoRef}
            className="w-full h-full object-cover scale-x-[-1]"
            playsInline
            muted
            autoPlay
            style={{ display: cameraActive ? 'block' : 'none' }}
          />

          {!cameraActive && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10 animate-pulse-slow">
              <div className="p-4 rounded-full bg-white/5 border border-white/10 mb-3 text-cyan-400">
                <Video className="w-8 h-8" />
              </div>
              <p className="font-display font-medium text-sm text-gray-200">Webcam Inactive</p>
              <p className="text-[11px] text-gray-500 mt-1 max-w-[240px]">
                Click the start button to grant camera permissions and begin gesture tracking.
              </p>
            </div>
          )}

          {/* Core Webcam HUD Layer */}
          {cameraActive && (
            <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/75 backdrop-blur-md px-2 py-1 rounded border border-white/10 text-[10px] font-mono font-medium z-10 text-emerald-400 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
              LIVE FEED
            </div>
          )}

          {cameraActive && !shouldMinimize && (
            <div className="absolute bottom-3 right-3 bg-black/75 backdrop-blur-md px-2 py-1 rounded border border-white/10 text-[10px] font-mono text-gray-400 z-10">
              640x480 mirrored
            </div>
          )}

          {/* Active Landmark Tracker Overlay */}
          {cameraActive && hands.length > 0 && (
            <div className="absolute top-3 right-3 flex items-center gap-1 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] font-mono px-2 py-1 rounded z-10">
              <Sparkles className="w-3 h-3" />
              HAND DETECTED
            </div>
          )}

          {/* Translucent HUD Mixer Overlay inside the webcam feed */}
          {shouldMinimize && (
            <div className="absolute bottom-0 left-0 right-0 bg-black/85 backdrop-blur-md border-t border-white/10 p-3.5 flex flex-col gap-2 z-10 text-left">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-cyan-400 font-mono font-bold tracking-wider uppercase flex items-center gap-1">
                  <Sliders className="w-3 h-3 text-cyan-400" /> Live Channel Levels
                </span>
                <span className="text-[9px] text-gray-400 font-mono">
                  Master Vol: {Math.round(audioParams.masterVolume * 100)}%
                </span>
              </div>
              <div className="grid grid-cols-6 gap-2.5 h-16 items-end mt-1">
                {/* Drums */}
                <div className="flex flex-col items-center gap-1.5 h-full justify-end">
                  <div className="w-full bg-white/5 border border-white/5 rounded flex-1 flex flex-col justify-end overflow-hidden">
                    <div
                      className="w-full transition-all duration-150 shadow-[0_0_8px_rgba(236,72,153,0.3)]"
                      style={{
                        height: `${audioParams.layers.drums * 100}%`,
                        backgroundColor: currentTheme.secondaryColor,
                      }}
                    />
                  </div>
                  <span className="text-[8px] text-gray-400 font-mono scale-90 origin-bottom truncate w-full text-center">DRUM</span>
                </div>

                {/* Piano / Vocals */}
                <div className="flex flex-col items-center gap-1.5 h-full justify-end">
                  <div className="w-full bg-white/5 border border-white/5 rounded flex-1 flex flex-col justify-end overflow-hidden">
                    <div
                      className="w-full transition-all duration-150 shadow-[0_0_8px_rgba(139,92,246,0.3)]"
                      style={{
                        height: `${audioParams.layers.piano * 100}%`,
                        backgroundColor: currentTheme.primaryColor,
                      }}
                    />
                  </div>
                  <span className="text-[8px] text-gray-400 font-mono scale-90 origin-bottom truncate w-full text-center">
                    {playMode === 'song' ? 'VOCL' : 'PIAN'}
                  </span>
                </div>

                {/* Guitar */}
                <div className="flex flex-col items-center gap-1.5 h-full justify-end">
                  <div className="w-full bg-white/5 border border-white/5 rounded flex-1 flex flex-col justify-end overflow-hidden">
                    <div
                      className="w-full transition-all duration-150 shadow-[0_0_8px_rgba(6,182,212,0.3)]"
                      style={{
                        height: `${audioParams.layers.guitar * 100}%`,
                        backgroundColor: '#06b6d4',
                      }}
                    />
                  </div>
                  <span className="text-[8px] text-gray-400 font-mono scale-90 origin-bottom truncate w-full text-center">
                    {playMode === 'song' ? 'GUIT' : 'PLUC'}
                  </span>
                </div>

                {/* Lead Synth */}
                <div className="flex flex-col items-center gap-1.5 h-full justify-end">
                  <div className="w-full bg-white/5 border border-white/5 rounded flex-1 flex flex-col justify-end overflow-hidden">
                    <div
                      className="w-full transition-all duration-150 shadow-[0_0_8px_rgba(245,158,11,0.3)]"
                      style={{
                        height: `${audioParams.layers.synth * 100}%`,
                        backgroundColor: '#f59e0b',
                      }}
                    />
                  </div>
                  <span className="text-[8px] text-gray-400 font-mono scale-90 origin-bottom truncate w-full text-center">LEAD</span>
                </div>

                {/* Ambient Drone / Pad */}
                <div className="flex flex-col items-center gap-1.5 h-full justify-end">
                  <div className="w-full bg-white/5 border border-white/5 rounded flex-1 flex flex-col justify-end overflow-hidden">
                    <div
                      className="w-full transition-all duration-150 shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                      style={{
                        height: `${audioParams.layers.ambientPad * 100}%`,
                        backgroundColor: '#10b981',
                      }}
                    />
                  </div>
                  <span className="text-[8px] text-gray-400 font-mono scale-90 origin-bottom truncate w-full text-center">
                    {playMode === 'song' ? 'PAD' : 'DRON'}
                  </span>
                </div>

                {/* Bass */}
                <div className="flex flex-col items-center gap-1.5 h-full justify-end">
                  <div className="w-full bg-white/5 border border-white/5 rounded flex-1 flex flex-col justify-end overflow-hidden">
                    <div
                      className="w-full transition-all duration-150 shadow-[0_0_8px_rgba(225,29,72,0.3)]"
                      style={{
                        height: `${audioParams.layers.bass * 100}%`,
                        backgroundColor: '#e11d48',
                      }}
                    />
                  </div>
                  <span className="text-[8px] text-gray-400 font-mono scale-90 origin-bottom truncate w-full text-center">BASS</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CENTER & RIGHT COLUMN: SYNTH METERS + GESTURE INSTRUCTIONS */}
      <div className={`${shouldMinimize ? 'lg:col-span-12 flex flex-col items-center justify-center' : 'lg:col-span-7'} flex flex-col gap-4`}>
        {/* PLAYBACK CONTROLS BANNER */}
        {shouldMinimize ? (
          <div className="rounded-xl border border-white/5 bg-black/40 backdrop-blur-md px-4 py-2.5 flex items-center justify-between gap-4 transition-all duration-300 w-full max-w-md lg:max-w-lg">
            <div className="flex items-center gap-2">
              <div className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </div>
              <span className="font-display font-semibold text-xs text-white uppercase tracking-wider">
                Synth Active ({playMode === 'synth' ? 'Synthesizer Mode' : 'Song Player Mode'})
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsConsoleExpanded(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 transition-all cursor-pointer hover:scale-102 active:scale-98"
              >
                <Sliders className="w-3.5 h-3.5" />
                Show Settings
              </button>

              <button
                onClick={onStop}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold bg-rose-500/20 hover:bg-rose-500 border border-rose-500/30 text-rose-200 hover:text-white transition-all cursor-pointer hover:scale-102 active:scale-98"
              >
                <Square className="w-3 h-3 fill-current" />
                Mute
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-white/5 bg-black/40 backdrop-blur-md p-4 flex flex-col md:flex-row items-center justify-between gap-4 transition-all duration-300">
            <div className="flex items-center gap-3">
              <div
                className={`p-2.5 rounded-xl border transition-all ${isPlaying ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-white/5 border-white/10 text-gray-400'
                  }`}
              >
                <Music className="w-5 h-5" />
              </div>
              <div className="text-left">
                <h1 className="font-display font-bold text-base text-white tracking-tight leading-tight">
                  Air Music Synthesizer
                </h1>
                <p className="text-[11px] text-gray-400">
                  A gesture-controlled sound synthesis station
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 w-full md:w-auto">
              {isPlaying && (
                <button
                  onClick={() => setIsConsoleExpanded(false)}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 transition-all cursor-pointer w-full md:w-auto hover:scale-102 active:scale-98"
                >
                  <ChevronUp className="w-4 h-4" />
                  Minimize Settings
                </button>
              )}
              {!isPlaying ? (
                <button
                  onClick={onStart}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-[0_4px_12px_rgba(16,185,129,0.15)] text-black cursor-pointer hover:scale-102 active:scale-98 w-full md:w-auto"
                  style={{ backgroundColor: currentTheme.primaryColor }}
                >
                  <Play className="w-4 h-4 fill-black" />
                  Start Console
                </button>
              ) : (
                <button
                  onClick={onStop}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-rose-500 hover:bg-rose-600 text-white transition-all shadow-[0_4px_12px_rgba(239,68,68,0.2)] cursor-pointer hover:scale-102 active:scale-98 w-full md:w-auto"
                >
                  <Square className="w-4 h-4 fill-white" />
                  Mute Synthesizer
                </button>
              )}
            </div>
          </div>
        )}

        {/* REST OF CONTROLS PANEL (CONDITIONAL RENDERING) */}
        {!shouldMinimize && (
          <>

            {/* SONG UPLOADER & STEMS DEMUX PANEL */}
            <div className="rounded-xl border border-white/5 bg-black/40 backdrop-blur-md p-4 flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-purple-400" />
                  <span className="font-display font-semibold text-xs text-white uppercase tracking-wider">
                    Sound Mode Selector
                  </span>
                </div>

                <div className="flex bg-white/5 rounded-lg p-0.5 border border-white/5">
                  <button
                    onClick={() => onPlayModeChange('synth')}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${playMode === 'synth'
                        ? 'bg-purple-500 text-white shadow-md'
                        : 'text-gray-400 hover:text-white'
                      }`}
                  >
                    Synthesizer Mode
                  </button>
                  <button
                    onClick={() => onPlayModeChange('song')}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${playMode === 'song'
                        ? 'bg-purple-500 text-white shadow-md'
                        : 'text-gray-400 hover:text-white'
                      }`}
                  >
                    Song Player Mode
                  </button>
                </div>
              </div>

              {playMode === 'song' && (
                <div className="flex flex-col gap-3">
                  {!songLoaded && !isAnalyzing ? (
                    <label 
                      className={`flex flex-col items-center justify-center p-6 border border-dashed rounded-lg cursor-pointer transition-all ${
                        isDragging 
                          ? 'scale-[1.02]' 
                          : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.04]'
                      }`}
                      style={isDragging ? { 
                        borderColor: currentTheme.primaryColor,
                        backgroundColor: `${currentTheme.primaryColor}15`,
                        boxShadow: `0 0 15px ${currentTheme.primaryColor}30`
                      } : {}}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragging(true);
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault();
                        setIsDragging(false);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDragging(false);
                        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                          const file = e.dataTransfer.files[0];
                          const acceptedExtensions = ['.mp3', '.wav', '.ogg', '.mpeg', '.mpg', '.m4a'];
                          const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
                          if (file.type.startsWith('audio/') || acceptedExtensions.includes(fileExtension)) {
                            onSongUpload(file);
                          }
                        }
                      }}
                    >
                      <Upload className={`w-6 h-6 mb-2 transition-colors duration-200 ${isDragging ? 'text-white' : 'text-gray-500'}`} style={isDragging ? { color: currentTheme.primaryColor } : {}} />
                      <span className="text-xs text-gray-300 font-semibold">
                        {isDragging ? 'Drop file here to upload!' : 'Upload Song File (.mp3, .wav, .ogg, .mpeg)'}
                      </span>
                      <span className="text-[10px] text-gray-500 mt-1">
                        {isDragging ? 'Release to begin stem separation' : 'Drag and drop or click to upload (crossover separation will be applied)'}
                      </span>
                      <input
                        type="file"
                        accept=".mp3,.wav,.ogg,.mpeg,.mpg,audio/mpeg,audio/mp3,audio/wav,audio/ogg"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            onSongUpload(e.target.files[0]);
                          }
                        }}
                        className="hidden"
                      />
                    </label>
                  ) : isAnalyzing ? (
                    <div className="flex flex-col items-center justify-center p-6 border border-dashed border-purple-500/20 bg-purple-500/5 rounded-lg animate-pulse">
                      <RefreshCw className="w-6 h-6 text-purple-400 animate-spin mb-2" />
                      <span className="text-xs text-purple-300 font-semibold">Analyzing & Separating Audio Stems...</span>
                      <span className="text-[10px] text-purple-500 font-mono mt-1">Isolating Vocals | Tuning Drum transients | Filtering Bass</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between bg-purple-500/10 border border-purple-500/20 p-3 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Music className="w-5 h-5 text-purple-400" />
                        <div className="text-left">
                          <p className="text-xs text-white font-semibold truncate max-w-[200px] md:max-w-md">{songName}</p>
                          <p className="text-[10px] text-purple-400 font-mono">Separated into: Vocals, Drums, Guitar, Bass, Lead</p>
                        </div>
                      </div>
                      <label className="text-[10px] text-purple-300 font-semibold border border-purple-500/30 px-2 py-1 rounded bg-purple-500/10 hover:bg-purple-500/20 cursor-pointer transition-all">
                        Change Song
                        <input
                          type="file"
                          accept=".mp3,.wav,.ogg,.mpeg,.mpg,audio/mpeg,audio/mp3,audio/wav,audio/ogg"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              onSongUpload(e.target.files[0]);
                            }
                          }}
                          className="hidden"
                        />
                      </label>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ACTIVE SYNTH CHANNEL METERS */}
            <div className="rounded-xl border border-white/5 bg-black/40 backdrop-blur-md p-4 flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-purple-400" />
                  <span className="font-display font-semibold text-xs text-white uppercase tracking-wider">
                    Sound Channels Mixer
                  </span>
                </div>

                {/* Master Volume Indicator */}
                <div className="flex items-center gap-1.5 text-xs text-gray-400 font-mono">
                  <Volume2 className="w-3.5 h-3.5" />
                  Vol: {Math.round(audioParams.masterVolume * 100)}%
                </div>
              </div>

              {/* Mixing grid columns */}
              <div className="grid grid-cols-6 gap-3 h-28 items-end">
                {/* Drum track */}
                <div className="flex flex-col items-center justify-end h-full gap-2 group">
                  <div className="relative w-full bg-white/5 rounded-md overflow-hidden flex-1 border border-white/5 flex flex-col justify-end">
                    <div
                      className="w-full transition-all duration-150 shadow-[0_0_12px_rgba(236,72,153,0.3)]"
                      style={{
                        height: `${audioParams.layers.drums * 100}%`,
                        backgroundColor: currentTheme.secondaryColor,
                      }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-400 font-medium uppercase font-mono tracking-tighter">Drums</span>
                  <span className="text-[9px] text-gray-600 font-mono">{Math.round(audioParams.layers.drums * 100)}%</span>
                </div>

                {/* Chord generator */}
                <div className="flex flex-col items-center justify-end h-full gap-2 group">
                  <div className="relative w-full bg-white/5 rounded-md overflow-hidden flex-1 border border-white/5 flex flex-col justify-end">
                    <div
                      className="w-full transition-all duration-150 shadow-[0_0_12px_rgba(139,92,246,0.3)]"
                      style={{
                        height: `${audioParams.layers.piano * 100}%`,
                        backgroundColor: currentTheme.primaryColor,
                      }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-400 font-medium uppercase font-mono tracking-tighter">
                    {playMode === 'song' ? 'Vocals' : 'Piano'}
                  </span>
                  <span className="text-[9px] text-gray-600 font-mono">{Math.round(audioParams.layers.piano * 100)}%</span>
                </div>

                {/* Pluck / Arpeggiator */}
                <div className="flex flex-col items-center justify-end h-full gap-2 group">
                  <div className="relative w-full bg-white/5 rounded-md overflow-hidden flex-1 border border-white/5 flex flex-col justify-end">
                    <div
                      className="w-full transition-all duration-150 shadow-[0_0_12px_rgba(6,182,212,0.3)]"
                      style={{
                        height: `${audioParams.layers.guitar * 100}%`,
                        backgroundColor: '#06b6d4',
                      }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-400 font-medium uppercase font-mono tracking-tighter">
                    {playMode === 'song' ? 'Guitar' : 'Pluck'}
                  </span>
                  <span className="text-[9px] text-gray-600 font-mono">{Math.round(audioParams.layers.guitar * 100)}%</span>
                </div>

                {/* Lead synth */}
                <div className="flex flex-col items-center justify-end h-full gap-2 group">
                  <div className="relative w-full bg-white/5 rounded-md overflow-hidden flex-1 border border-white/5 flex flex-col justify-end">
                    <div
                      className="w-full transition-all duration-150 shadow-[0_0_12px_rgba(245,158,11,0.3)]"
                      style={{
                        height: `${audioParams.layers.synth * 100}%`,
                        backgroundColor: '#f59e0b',
                      }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-400 font-medium uppercase font-mono tracking-tighter">
                    {playMode === 'song' ? 'Lead' : 'Lead'}
                  </span>
                  <span className="text-[9px] text-gray-600 font-mono">{Math.round(audioParams.layers.synth * 100)}%</span>
                </div>

                {/* Ambient Drone */}
                <div className="flex flex-col items-center justify-end h-full gap-2 group">
                  <div className="relative w-full bg-white/5 rounded-md overflow-hidden flex-1 border border-white/5 flex flex-col justify-end">
                    <div
                      className="w-full transition-all duration-150 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                      style={{
                        height: `${audioParams.layers.ambientPad * 100}%`,
                        backgroundColor: '#10b981',
                      }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-400 font-medium uppercase font-mono tracking-tighter">
                    {playMode === 'song' ? 'Pad/Synth' : 'Drone'}
                  </span>
                  <span className="text-[9px] text-gray-600 font-mono">{Math.round(audioParams.layers.ambientPad * 100)}%</span>
                </div>

                {/* Bass Track */}
                <div className="flex flex-col items-center justify-end h-full gap-2 group">
                  <div className="relative w-full bg-white/5 rounded-md overflow-hidden flex-1 border border-white/5 flex flex-col justify-end">
                    <div
                      className="w-full transition-all duration-150 shadow-[0_0_12px_rgba(225,29,72,0.3)]"
                      style={{
                        height: `${audioParams.layers.bass * 100}%`,
                        backgroundColor: '#e11d48',
                      }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-400 font-medium uppercase font-mono tracking-tighter">Bass</span>
                  <span className="text-[9px] text-gray-600 font-mono">{Math.round(audioParams.layers.bass * 100)}%</span>
                </div>
              </div>

              {/* Master Intensity / Bass filters indicator slider */}
              <div className="flex flex-col gap-1 border-t border-white/5 pt-3 mt-1 text-left">
                <div className="flex items-center justify-between text-xs mb-1">
                  <div className="flex items-center gap-1 text-gray-400 font-medium">
                    <Maximize2 className="w-3.5 h-3.5 text-rose-400" />
                    Resonant Filter Frequency (Distance Depth)
                  </div>
                  <span className="font-mono text-rose-400 font-semibold">{Math.round(audioParams.intensity * 100)}%</span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/5 relative">
                  <div
                    className="h-full bg-gradient-to-r from-violet-600 to-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.35)] transition-all duration-150"
                    style={{ width: `${audioParams.intensity * 100}%` }}
                  />
                </div>
                <span className="text-[9px] text-gray-500">
                  Move your hand closer to the camera to open the filter, adding brightness, feedback reverb, and sub bass intensity!
                </span>
              </div>
            </div>

          </>
        )}
      </div>

      {/* DETAILED GESTURE CHEAT SHEET (FULL WIDTH) */}
      {!shouldMinimize && (
        <div className="lg:col-span-12 w-full mt-2">
          <div className="rounded-xl border border-white/5 bg-black/40 backdrop-blur-md p-4 text-left">
            <div className="flex items-center gap-2 border-b border-white/5 pb-2 mb-3">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="font-display font-semibold text-xs text-white uppercase tracking-wider">
                Gesture Performance Manual
              </span>
            </div>

            {/* NEW DUAL PERFORMANCE MODES INFO */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-white/5 pb-3 mb-3">
              <div className="bg-white/5 rounded-lg p-2.5 border border-white/5">
                <strong className="text-cyan-400 text-xs block mb-1">🖐️ Left Hand – Instrument Selection</strong>
                <p className="text-[10px] text-gray-400">Extend fingers to enable/disable sound channels:</p>
                <ul className="list-none space-y-0.5 mt-1 font-mono text-[9px] text-gray-300">
                  <li>• <span className="text-pink-400">Thumb</span>: Layer Drums</li>
                  <li>• <span className="text-purple-400">Index Finger</span>: Layer Piano Chords</li>
                  <li>• <span className="text-cyan-400">Middle Finger</span>: Layer Plucked Guitar</li>
                  <li>• <span className="text-amber-400">Ring Finger</span>: Layer Lead Synth (move hand X to play pitch)</li>
                  <li>• <span className="text-rose-400">Little Finger</span>: Layer Bass synthesizer</li>
                </ul>
              </div>
              <div className="bg-white/5 rounded-lg p-2.5 border border-white/5">
                <strong className="text-purple-400 text-xs block mb-1">🎭 Right Hand – Musical Expression</strong>
                <p className="text-[10px] text-gray-400">Control performance parameters and state:</p>
                <ul className="list-none space-y-0.5 mt-1 font-mono text-[9px] text-gray-300">
                  <li>• <span className="text-white">Raise Up / Lower Down</span>: Master Volume</li>
                  <li>• <span className="text-white">Tilt Wrist Clockwise</span>: Increase Reverb send</li>
                  <li>• <span className="text-white">Tilt Wrist Anticlockwise</span>: Increase Echo/Delay send</li>
                  <li>• <span className="text-white">Move Left / Right</span>: Pan Audio to Left / Right</li>
                  <li>• <span className="text-white">Push Closer / Pull Away</span>: Filter Cutoff & Intensity</li>
                </ul>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2.5 text-[11px] text-gray-400 leading-relaxed">
              <div className="flex items-start gap-2.5">
                <span className="text-sm">↕️</span>
                <div>
                  <strong className="text-white">Raise / Lower Right Hand</strong>
                  <p>Moves hand up or down to dynamically sweep master volume.</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="text-sm">🔍</span>
                <div>
                  <strong className="text-white">Right Hand Depth (Z-Axis)</strong>
                  <p>Move hand closer to open filter cutoff and away to filter out highs.</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="text-sm">🔄</span>
                <div>
                  <strong className="text-white">Right Wrist Rotation (Tilt)</strong>
                  <p>Rotate clockwise to dial in reverb; rotate anticlockwise for echo/delay repetitions.</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="text-sm">👈👉</span>
                <div>
                  <strong className="text-white">Right Hand X-Axis (Pan)</strong>
                  <p>Position determines stereo balance, panning the mix to left or right speakers.</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="text-sm">🖐️</span>
                <div>
                  <strong className="text-white">Right Open Palm</strong>
                  <p>Triggers playback start / resume state to un-mute audio components.</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="text-sm">✊</span>
                <div>
                  <strong className="text-white">Right Closed Fist</strong>
                  <p>Instantly pauses / stops the audio engine and silences the oscillators.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM ROW: AI DIAGNOSTICS */}
      <div className="lg:col-span-12 w-full mt-2 flex justify-center">
        {/* PERFORMANCE & DIAGNOSTIC METRICS */}
        <div className={`rounded-xl border border-white/5 bg-black/40 backdrop-blur-md p-4 flex flex-col gap-3 w-full transition-all duration-300 ${shouldMinimize ? 'max-w-md lg:max-w-lg' : ''}`}>
          <div className="flex items-center gap-2 border-b border-white/5 pb-2">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <span className="font-display font-semibold text-xs text-white uppercase tracking-wider">AI Diagnostics</span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/5 p-2.5 rounded border border-white/5 text-center">
              <p className="text-[9px] text-gray-500 font-medium uppercase">Webcam FPS</p>
              <p className="text-sm font-semibold text-cyan-400 font-mono mt-1">{cameraActive ? fps : 0}</p>
            </div>
            <div className="bg-white/5 p-2.5 rounded border border-white/5 text-center">
              <p className="text-[9px] text-gray-500 font-medium uppercase">Active Hands</p>
              <p className="text-sm font-semibold text-purple-400 font-mono mt-1">{hands.length}</p>
            </div>
            <div className="bg-white/5 p-2.5 rounded border border-white/5 text-center">
              <p className="text-[9px] text-gray-500 font-medium uppercase">Core Engine</p>
              <p className="text-sm font-semibold text-rose-400 font-mono mt-1 uppercase">
                {isPlaying ? 'Active' : 'Muted'}
              </p>
            </div>
          </div>

          {/* Current Gestures Display */}
          <div className="flex flex-col gap-2 mt-1">
            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Live Gestures Detected:</p>
            {hands.length === 0 ? (
              <div className="text-xs text-gray-500 bg-white/5 p-2 rounded text-center border border-dashed border-white/5">
                No hands in webcam range. Hold hands up!
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {hands.map((hand) => (
                  <div
                    key={hand.id}
                    className="flex items-center justify-between bg-white/[0.03] border border-white/5 p-2 rounded text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full inline-block"
                        style={{ backgroundColor: hand.id === 0 ? currentTheme.primaryColor : currentTheme.secondaryColor }}
                      ></span>
                      <span className="font-semibold text-white">{hand.handedness} Hand:</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="bg-white/5 px-1.5 py-0.5 rounded text-[10px] text-gray-300 font-mono">
                        {hand.gesture}
                      </span>
                      <span className="text-gray-400 text-[10px] font-mono">
                        Rot: {hand.wristAngle}° ({hand.wristRotation})
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
export default InstrumentControls;
