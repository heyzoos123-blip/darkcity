'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface MiniMapProps {
  currentLocation?: { x: number; y: number };
  zoom?: number;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
}

export function MiniMap({ 
  currentLocation = { x: 0.5, y: 0.5 }, 
  zoom = 1,
  onZoomIn,
  onZoomOut,
}: MiniMapProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass-strong rounded-lg p-3 w-48"
    >
      {/* Mini map visualization */}
      <div className="relative w-full aspect-square bg-background-primary rounded mb-2 overflow-hidden">
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-20">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={`h-${i}`}
              className="absolute w-full h-px bg-text-muted"
              style={{ top: `${i * 25}%` }}
            />
          ))}
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={`v-${i}`}
              className="absolute h-full w-px bg-text-muted"
              style={{ left: `${i * 25}%` }}
            />
          ))}
        </div>

        {/* Current location marker */}
        <motion.div
          className="absolute w-3 h-3 rounded-full bg-accent-primary shadow-glow-primary"
          style={{
            left: `calc(${currentLocation.x * 100}% - 6px)`,
            top: `calc(${currentLocation.y * 100}% - 6px)`,
          }}
          animate={{
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        {/* Ambient torch glow effect */}
        <motion.div
          className="absolute inset-0 bg-gradient-radial from-accent-amber/5 to-transparent opacity-40 pointer-events-none"
          animate={{
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs text-text-muted font-mono">
          {(currentLocation.x * 100).toFixed(0)}, {(currentLocation.y * 100).toFixed(0)}
        </div>
        
        <div className="flex gap-1">
          <button
            onClick={onZoomOut}
            className="w-6 h-6 rounded bg-text-muted/10 hover:bg-text-muted/20 flex items-center justify-center text-xs text-text-secondary transition-colors"
            aria-label="Zoom out"
          >
            −
          </button>
          <div className="w-8 h-6 rounded bg-background-primary flex items-center justify-center text-xs text-text-secondary font-mono">
            {zoom.toFixed(1)}x
          </div>
          <button
            onClick={onZoomIn}
            className="w-6 h-6 rounded bg-text-muted/10 hover:bg-text-muted/20 flex items-center justify-center text-xs text-text-secondary transition-colors"
            aria-label="Zoom in"
          >
            +
          </button>
        </div>
      </div>
    </motion.div>
  );
}
