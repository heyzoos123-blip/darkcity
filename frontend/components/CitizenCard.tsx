'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface CitizenCardProps {
  citizenId: string;
}

function getRankColor(reputation: number): { primary: string; glow: string; bg: string } {
  if (reputation >= 901) return { 
    primary: '#d4af37', // gold
    glow: 'rgba(212, 175, 55, 0.8)',
    bg: 'linear-gradient(135deg, rgba(15, 10, 5, 0.98) 0%, rgba(20, 15, 5, 0.98) 50%, rgba(15, 10, 5, 0.98) 100%)'
  };
  if (reputation >= 751) return { 
    primary: '#00ff88', // emerald
    glow: 'rgba(0, 255, 136, 0.8)',
    bg: 'linear-gradient(135deg, rgba(5, 15, 10, 0.98) 0%, rgba(5, 20, 15, 0.98) 50%, rgba(5, 15, 10, 0.98) 100%)'
  };
  if (reputation >= 501) return { 
    primary: '#4169e1', // deep blue
    glow: 'rgba(65, 105, 225, 0.8)',
    bg: 'linear-gradient(135deg, rgba(5, 5, 20, 0.98) 0%, rgba(5, 10, 25, 0.98) 50%, rgba(5, 5, 20, 0.98) 100%)'
  };
  if (reputation >= 201) return { 
    primary: '#9370db', // dark purple
    glow: 'rgba(147, 112, 219, 0.8)',
    bg: 'linear-gradient(135deg, rgba(10, 5, 20, 0.98) 0%, rgba(15, 5, 25, 0.98) 50%, rgba(10, 5, 20, 0.98) 100%)'
  };
  return { 
    primary: '#8b0000', // blood red (newcomer)
    glow: 'rgba(139, 0, 0, 0.8)',
    bg: 'linear-gradient(135deg, rgba(5, 5, 15, 0.98) 0%, rgba(10, 5, 10, 0.98) 50%, rgba(5, 5, 15, 0.98) 100%)'
  };
}

export function CitizenCard({ citizenId }: CitizenCardProps) {
  const [card, setCard] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reputation, setReputation] = useState(0);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    
    // Fetch agent data and card
    fetch(`${apiUrl}/api/agents/${citizenId}`)
      .then(res => res.json())
      .then(agent => {
        setReputation(agent.reputation || 0);
        
        // Fetch card
        return fetch(`${apiUrl}/api/agents/${citizenId}/card`);
      })
      .then(res => res.json())
      .then(data => {
        setCard(data.card);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load card:', err);
        setLoading(false);
      });
  }, [citizenId]);

  const rankColors = getRankColor(reputation);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-text-secondary font-display">Generating ID card...</div>
      </div>
    );
  }

  if (!card) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-accent-danger font-display">Failed to load ID card</div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0, y: 20 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="relative"
    >
      <div 
        className="absolute inset-0 blur-3xl -z-10" 
        style={{ 
          background: `radial-gradient(ellipse at center, ${rankColors.glow.replace('0.8', '0.1')} 0%, transparent 70%)` 
        }}
      />
      
      <div 
        className="rounded-lg p-8 relative overflow-hidden"
        style={{
          background: rankColors.bg,
          borderWidth: '1px',
          borderStyle: 'solid',
          borderColor: rankColors.glow.replace('0.8', '0.4'),
          boxShadow: `inset 0 0 80px ${rankColors.glow.replace('0.8', '0.15')}, inset 0 0 40px rgba(0, 0, 0, 0.8), 0 0 40px ${rankColors.glow.replace('0.8', '0.3')}, 0 4px 20px rgba(0, 0, 0, 0.9)`
        }}
      >
        {/* Corner ornaments */}
        <div className="absolute top-2 left-2 text-2xl" style={{ color: rankColors.glow.replace('0.8', '0.3') }}>⚜</div>
        <div className="absolute top-2 right-2 text-2xl" style={{ color: rankColors.glow.replace('0.8', '0.3') }}>⚜</div>
        <div className="absolute bottom-2 left-2 text-2xl" style={{ color: rankColors.glow.replace('0.8', '0.3') }}>⚜</div>
        <div className="absolute bottom-2 right-2 text-2xl" style={{ color: rankColors.glow.replace('0.8', '0.3') }}>⚜</div>
        
        {/* Mysterious ambient glow */}
        <div 
          className="absolute top-0 left-1/4 w-32 h-32 blur-3xl rounded-full animate-pulse" 
          style={{ backgroundColor: rankColors.glow.replace('0.8', '0.2') }}
        />
        <div 
          className="absolute bottom-0 right-1/4 w-32 h-32 blur-3xl rounded-full animate-pulse" 
          style={{ backgroundColor: rankColors.glow.replace('0.8', '0.2'), animationDelay: '1s' }}
        />
        
        <pre 
          className="citizen-card-gothic overflow-x-auto relative z-10"
          style={{
            color: rankColors.primary,
            textShadow: `0 0 8px ${rankColors.glow}, 0 0 15px ${rankColors.glow.replace('0.8', '0.5')}, 0 0 25px ${rankColors.glow.replace('0.8', '0.3')}, 0 2px 4px rgba(0, 0, 0, 0.9)`
          }}
        >
          {card}
        </pre>
        
        {/* Bottom seal */}
        <div className="flex justify-center mt-4 relative z-10">
          <div 
            className="wax-seal"
            style={{
              background: `radial-gradient(circle, ${rankColors.glow} 0%, ${rankColors.glow.replace('0.8', '1')} 60%, ${rankColors.glow.replace('0.8', '0.8')} 100%)`
            }}
          />
        </div>
      </div>
      
      {/* Noir case file footer */}
      <div className="text-center mt-6 space-y-2">
        <div className="flex justify-center gap-2 mb-2">
          <div className="h-px w-12 bg-accent-primary/20" />
          <div className="text-accent-primary/40 text-xs">⬥</div>
          <div className="h-px w-12 bg-accent-primary/20" />
        </div>
        <div className="text-text-muted text-xs italic opacity-60 tracking-widest">
          CLASSIFIED档案 • DARKCITY RECORDS
        </div>
        <div className="text-text-muted text-xs opacity-40 font-mono">
          &quot;Where shadows think&quot;
        </div>
      </div>
    </motion.div>
  );
}
