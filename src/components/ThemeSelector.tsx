import React from 'react';
import { VisualThemeId, VisualTheme } from '../types';
import { Sparkles, Zap, Waves, TreePine, Box, Check } from 'lucide-react';

interface ThemeSelectorProps {
  currentThemeId: VisualThemeId;
  onThemeSelect: (id: VisualThemeId) => void;
}

export const VISUAL_THEMES: VisualTheme[] = [
  {
    id: 'galaxy',
    name: 'Cosmic Galaxy',
    description: 'Swirling deep violet star fields, planetary orbits, and high-frequency stellar flares.',
    primaryColor: '#8b5cf6', // Violet
    secondaryColor: '#ec4899', // Pink
    accentColor: '#6366f1', // Indigo
    bgColor: '#08060c',
    particlesCount: 150,
  },
  {
    id: 'cyberpunk',
    name: 'Neon Cyberpunk',
    description: 'Perspective retro floors, bright cyans and magentas, grid meshes, and scanline glitches.',
    primaryColor: '#06b6d4', // Cyan
    secondaryColor: '#f43f5e', // Hot Pink
    accentColor: '#a855f7', // Purple
    bgColor: '#050409',
    particlesCount: 200,
  },
  {
    id: 'ocean',
    name: 'Deep Ocean',
    description: 'Sub-sea aquamarine glows, organic rising air bubbles, and underwater fluid current swells.',
    primaryColor: '#38bdf8', // Light Blue
    secondaryColor: '#2dd4bf', // Teal
    accentColor: '#1e40af', // Deep Blue
    bgColor: '#040c1a',
    particlesCount: 100,
  },
  {
    id: 'forest',
    name: 'Emerald Forest',
    description: 'Moss green organic canopies, floating golden spores, and rays of filtered sunlight.',
    primaryColor: '#10b981', // Emerald
    secondaryColor: '#f59e0b', // Amber
    accentColor: '#047857', // Dark Green
    bgColor: '#021008',
    particlesCount: 120,
  },
  {
    id: 'geometry',
    name: 'Abstract Geometry',
    description: 'High-contrast monochrome, rotating wireframe 3D cubes, and sharp, interconnected polygons.',
    primaryColor: '#ffffff', // White
    secondaryColor: '#9ca3af', // Gray
    accentColor: '#374151', // Dark Gray
    bgColor: '#0c0c0f',
    particlesCount: 80,
  },
];

const getThemeIcon = (id: VisualThemeId, className: string) => {
  switch (id) {
    case 'galaxy': return <Sparkles className={className} />;
    case 'cyberpunk': return <Zap className={className} />;
    case 'ocean': return <Waves className={className} />;
    case 'forest': return <TreePine className={className} />;
    case 'geometry': return <Box className={className} />;
  }
};

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({
  currentThemeId,
  onThemeSelect,
}) => {
  return (
    <div className="flex flex-col gap-3 w-full" id="theme-selector-panel">
      <h3 className="font-display text-sm font-semibold text-gray-400 tracking-wider uppercase mb-1">
        Aesthetic Landscapes
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 w-full">
        {VISUAL_THEMES.map((theme) => {
          const isActive = theme.id === currentThemeId;
          return (
            <button
              key={theme.id}
              onClick={() => onThemeSelect(theme.id)}
              className={`relative flex flex-col text-left p-3 rounded-lg border transition-all duration-300 group cursor-pointer ${
                isActive
                  ? 'bg-white/5 border-white/25 shadow-[0_4px_20px_rgba(255,255,255,0.02)]'
                  : 'bg-black/25 border-white/5 hover:bg-white/[0.02] hover:border-white/10'
              }`}
              id={`theme-btn-${theme.id}`}
            >
              {/* Top Row: Icon + Badge */}
              <div className="flex items-center justify-between mb-2 w-full">
                <div
                  className="p-1.5 rounded-md transition-transform group-hover:scale-110"
                  style={{
                    backgroundColor: isActive ? `${theme.primaryColor}20` : 'rgba(255,255,255,0.03)',
                    color: theme.primaryColor,
                  }}
                >
                  {getThemeIcon(theme.id, 'w-4 h-4')}
                </div>
                
                {isActive && (
                  <span
                    className="flex items-center justify-center w-4 h-4 rounded-full text-black"
                    style={{ backgroundColor: theme.primaryColor }}
                  >
                    <Check className="w-2.5 h-2.5 stroke-[3.5]" />
                  </span>
                )}
              </div>

              {/* Title */}
              <span className="font-display font-medium text-xs text-white mb-1 group-hover:text-gray-200">
                {theme.name}
              </span>
              
              {/* Description */}
              <span className="text-[10px] text-gray-500 leading-normal line-clamp-2">
                {theme.description}
              </span>

              {/* Active Theme Underline */}
              <div
                className={`absolute bottom-0 left-3 right-3 h-0.5 rounded-full transition-all duration-300 ${
                  isActive ? 'opacity-100' : 'opacity-0 scale-x-75 group-hover:opacity-40'
                }`}
                style={{ backgroundColor: theme.primaryColor }}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
};
export default ThemeSelector;
