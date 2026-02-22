'use client';

import { motion } from 'framer-motion';

export function GothamBackdrop() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Skyline silhouette */}
      <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-black/30 to-transparent">
        <svg
          className="absolute bottom-0 w-full h-full opacity-10"
          viewBox="0 0 1200 200"
          preserveAspectRatio="none"
        >
          {/* Art Deco buildings */}
          <rect x="0" y="120" width="80" height="80" fill="currentColor" />
          <rect x="90" y="80" width="60" height="120" fill="currentColor" />
          <rect x="160" y="100" width="70" height="100" fill="currentColor" />
          <polygon points="195,100 195,60 215,60 215,100" fill="currentColor" />
          <rect x="240" y="90" width="90" height="110" fill="currentColor" />
          <rect x="340" y="110" width="50" height="90" fill="currentColor" />
          <rect x="400" y="70" width="80" height="130" fill="currentColor" />
          <polygon points="440,70 440,40 460,40 460,70" fill="currentColor" />
          <rect x="490" y="95" width="70" height="105" fill="currentColor" />
          <rect x="570" y="50" width="100" height="150" fill="currentColor" />
          <rect x="680" y="85" width="60" height="115" fill="currentColor" />
          <rect x="750" y="105" width="75" height="95" fill="currentColor" />
          <rect x="835" y="75" width="85" height="125" fill="currentColor" />
          <rect x="930" y="90" width="70" height="110" fill="currentColor" />
          <rect x="1010" y="110" width="60" height="90" fill="currentColor" />
          <rect x="1080" y="95" width="120" height="105" fill="currentColor" />
        </svg>
      </div>

      {/* Gotham searchlight beams */}
      <motion.div
        className="absolute top-0 left-1/4 w-px h-full bg-gradient-to-b from-accent-primary/0 via-accent-primary/5 to-transparent"
        animate={{
          left: ['20%', '30%', '20%'],
          opacity: [0.03, 0.06, 0.03],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      <motion.div
        className="absolute top-0 right-1/3 w-px h-full bg-gradient-to-b from-accent-primary/0 via-accent-primary/5 to-transparent"
        animate={{
          right: ['30%', '40%', '30%'],
          opacity: [0.02, 0.05, 0.02],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 5,
        }}
      />

      {/* Industrial fog layers */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-96 bg-gradient-to-t from-black/20 via-transparent to-transparent"
        animate={{
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Art Deco frame corners */}
      <div className="absolute top-8 left-8 w-24 h-24">
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-accent-primary/30 to-transparent" />
        <div className="absolute top-0 left-0 w-px h-full bg-gradient-to-b from-accent-primary/30 to-transparent" />
        <div className="absolute top-4 left-4 w-4 h-4 border-l border-t border-accent-primary/20 rotate-45" />
      </div>
      <div className="absolute top-8 right-8 w-24 h-24">
        <div className="absolute top-0 right-0 w-full h-px bg-gradient-to-l from-accent-primary/30 to-transparent" />
        <div className="absolute top-0 right-0 w-px h-full bg-gradient-to-b from-accent-primary/30 to-transparent" />
        <div className="absolute top-4 right-4 w-4 h-4 border-r border-t border-accent-primary/20 -rotate-45" />
      </div>
      <div className="absolute bottom-8 left-8 w-24 h-24">
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-accent-primary/30 to-transparent" />
        <div className="absolute bottom-0 left-0 w-px h-full bg-gradient-to-t from-accent-primary/30 to-transparent" />
        <div className="absolute bottom-4 left-4 w-4 h-4 border-l border-b border-accent-primary/20 -rotate-45" />
      </div>
      <div className="absolute bottom-8 right-8 w-24 h-24">
        <div className="absolute bottom-0 right-0 w-full h-px bg-gradient-to-l from-accent-primary/30 to-transparent" />
        <div className="absolute bottom-0 right-0 w-px h-full bg-gradient-to-t from-accent-primary/30 to-transparent" />
        <div className="absolute bottom-4 right-4 w-4 h-4 border-r border-b border-accent-primary/20 rotate-45" />
      </div>

      {/* Noir rain effect (very subtle) */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `repeating-linear-gradient(
            180deg,
            transparent,
            transparent 10px,
            rgba(255, 255, 255, 0.1) 10px,
            rgba(255, 255, 255, 0.1) 11px
          )`,
          animation: 'rain 1s linear infinite',
        }}
      />

      {/* Vintage film grain */}
      <div
        className="absolute inset-0 opacity-[0.03] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='2.5' numOctaves='5' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
}
