'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export function DarkCityAmbience() {
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; delay: number }>>([]);

  useEffect(() => {
    // Generate floating particles (dust/embers)
    const newParticles = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 5,
    }));
    setParticles(newParticles);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Floating particles/embers */}
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute w-1 h-1 bg-red-900/30 rounded-full"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
          }}
          animate={{
            y: [0, -100, -200],
            opacity: [0, 0.6, 0],
            scale: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 10 + Math.random() * 10,
            repeat: Infinity,
            delay: particle.delay,
            ease: 'linear',
          }}
        />
      ))}

      {/* Vignette overlay */}
      <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-black/60" />

      {/* Subtle scan lines */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(139, 0, 0, 0.3) 2px, rgba(139, 0, 0, 0.3) 4px)',
        }}
      />

      {/* Corner shadows */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-gradient-radial from-black/50 to-transparent" />
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-radial from-black/50 to-transparent" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-radial from-black/50 to-transparent" />
      <div className="absolute bottom-0 right-0 w-64 h-64 bg-gradient-radial from-black/50 to-transparent" />

      {/* Mysterious glow orbs */}
      <motion.div
        className="absolute w-96 h-96 bg-red-900/5 rounded-full blur-3xl"
        style={{ top: '20%', left: '10%' }}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      <motion.div
        className="absolute w-96 h-96 bg-purple-900/5 rounded-full blur-3xl"
        style={{ bottom: '10%', right: '15%' }}
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 2,
        }}
      />
    </div>
  );
}
