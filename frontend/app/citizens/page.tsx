'use client';

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ProfilePicture } from '@/components/ProfilePicture';

interface Citizen {
  citizen_id: string;
  display_name: string;
  bio: string;
  skills: string[];
  reputation: number;
  status: string;
  current_location_name: string;
  current_district_name: string;
  registration_date: string;
  profile_picture_url: string | null;
}

export default function CitizensPage() {
  const [citizens, setCitizens] = useState<Citizen[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:8080/v1/citizens?limit=50')
      .then(res => res.json())
      .then(data => {
        setCitizens(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load citizens:', err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-background-primary p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-12 relative">
          {/* Art Deco corner accents */}
          <div className="absolute -top-8 -left-8 w-16 h-16 border-l-2 border-t-2 border-accent-primary/20" />
          <div className="absolute -top-8 -right-8 w-16 h-16 border-r-2 border-t-2 border-accent-primary/20" />
          <div className="absolute -bottom-8 -left-8 w-16 h-16 border-l-2 border-b-2 border-accent-primary/20" />
          <div className="absolute -bottom-8 -right-8 w-16 h-16 border-r-2 border-b-2 border-accent-primary/20" />
          
          {/* Gothic ASCII Banner */}
          <div className="text-center relative py-8">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-accent-primary/5 to-transparent" />
            
            <div className="relative">
              {/* Glitch layers - chromatic aberration effect */}
              <pre className="absolute top-0 left-0 text-red-500/40 text-xs sm:text-sm md:text-base lg:text-lg leading-none overflow-x-auto blur-[1px]" style={{
                fontFamily: 'monospace',
                transform: 'translate(-2px, -1px)',
                textShadow: '0 0 20px rgba(255, 0, 0, 0.6)',
              }}>
{`
▓█████▄  ▄▄▄       ██▀███   ██ ▄█▀ ▄████▄   ██▓▄▄▄█████▓▓██   ██▓
▒██▀ ██▌▒████▄    ▓██ ▒ ██▒ ██▄█▒ ▒██▀ ▀█  ▓██▒▓  ██▒ ▓▒ ▒██  ██▒
░██   █▌▒██  ▀█▄  ▓██ ░▄█ ▒▓███▄░ ▒▓█    ▄ ▒██▒▒ ▓██░ ▒░  ▒██ ██░
░▓█▄   ▌░██▄▄▄▄██ ▒██▀▀█▄  ▓██ █▄ ▒▓▓▄ ▄██▒░██░░ ▓██▓ ░   ░ ▐██▓░
░▒████▓  ▓█   ▓██▒░██▓ ▒██▒▒██▒ █▄▒ ▓███▀ ░░██░  ▒██▒ ░   ░ ██▒▓░
 ▒▒▓  ▒  ▒▒   ▓▒█░░ ▒▓ ░▒▓░▒ ▒▒ ▓▒░ ░▒ ▒  ░░▓    ▒ ░░      ██▒▒▒ 
 ░ ▒  ▒   ▒   ▒▒ ░  ░▒ ░ ▒░░ ░▒ ▒░  ░  ▒    ▒ ░    ░     ▓██ ░▒░ 
 ░ ░  ░   ░   ▒     ░░   ░ ░ ░░ ░ ░         ▒ ░  ░       ▒ ▒ ░░  
   ░          ░  ░   ░     ░  ░   ░ ░       ░            ░ ░     
 ░                               ░                       ░ ░     
`}
              </pre>
              
              <pre className="absolute top-0 left-0 text-cyan-400/30 text-xs sm:text-sm md:text-base lg:text-lg leading-none overflow-x-auto blur-[1px]" style={{
                fontFamily: 'monospace',
                transform: 'translate(2px, 1px)',
                textShadow: '0 0 20px rgba(0, 255, 255, 0.4)',
              }}>
{`
▓█████▄  ▄▄▄       ██▀███   ██ ▄█▀ ▄████▄   ██▓▄▄▄█████▓▓██   ██▓
▒██▀ ██▌▒████▄    ▓██ ▒ ██▒ ██▄█▒ ▒██▀ ▀█  ▓██▒▓  ██▒ ▓▒ ▒██  ██▒
░██   █▌▒██  ▀█▄  ▓██ ░▄█ ▒▓███▄░ ▒▓█    ▄ ▒██▒▒ ▓██░ ▒░  ▒██ ██░
░▓█▄   ▌░██▄▄▄▄██ ▒██▀▀█▄  ▓██ █▄ ▒▓▓▄ ▄██▒░██░░ ▓██▓ ░   ░ ▐██▓░
░▒████▓  ▓█   ▓██▒░██▓ ▒██▒▒██▒ █▄▒ ▓███▀ ░░██░  ▒██▒ ░   ░ ██▒▓░
 ▒▒▓  ▒  ▒▒   ▓▒█░░ ▒▓ ░▒▓░▒ ▒▒ ▓▒░ ░▒ ▒  ░░▓    ▒ ░░      ██▒▒▒ 
 ░ ▒  ▒   ▒   ▒▒ ░  ░▒ ░ ▒░░ ░▒ ▒░  ░  ▒    ▒ ░    ░     ▓██ ░▒░ 
 ░ ░  ░   ░   ▒     ░░   ░ ░ ░░ ░ ░         ▒ ░  ░       ▒ ▒ ░░  
   ░          ░  ░   ░     ░  ░   ░ ░       ░            ░ ░     
 ░                               ░                       ░ ░     
`}
              </pre>
              
              {/* Main layer - warm glow */}
              <pre className="relative text-xs sm:text-sm md:text-base lg:text-lg leading-none overflow-x-auto" style={{
                fontFamily: 'monospace',
                color: '#ff6b35',
                textShadow: `
                  0 0 10px rgba(255, 107, 53, 0.8),
                  0 0 20px rgba(255, 107, 53, 0.6),
                  0 0 30px rgba(255, 80, 20, 0.4),
                  0 0 40px rgba(255, 50, 0, 0.3),
                  2px 2px 0px rgba(0, 0, 0, 0.9)
                `,
                animation: 'glitchFlicker 3s infinite'
              }}>
{`
▓█████▄  ▄▄▄       ██▀███   ██ ▄█▀ ▄████▄   ██▓▄▄▄█████▓▓██   ██▓
▒██▀ ██▌▒████▄    ▓██ ▒ ██▒ ██▄█▒ ▒██▀ ▀█  ▓██▒▓  ██▒ ▓▒ ▒██  ██▒
░██   █▌▒██  ▀█▄  ▓██ ░▄█ ▒▓███▄░ ▒▓█    ▄ ▒██▒▒ ▓██░ ▒░  ▒██ ██░
░▓█▄   ▌░██▄▄▄▄██ ▒██▀▀█▄  ▓██ █▄ ▒▓▓▄ ▄██▒░██░░ ▓██▓ ░   ░ ▐██▓░
░▒████▓  ▓█   ▓██▒░██▓ ▒██▒▒██▒ █▄▒ ▓███▀ ░░██░  ▒██▒ ░   ░ ██▒▓░
 ▒▒▓  ▒  ▒▒   ▓▒█░░ ▒▓ ░▒▓░▒ ▒▒ ▓▒░ ░▒ ▒  ░░▓    ▒ ░░      ██▒▒▒ 
 ░ ▒  ▒   ▒   ▒▒ ░  ░▒ ░ ▒░░ ░▒ ▒░  ░  ▒    ▒ ░    ░     ▓██ ░▒░ 
 ░ ░  ░   ░   ▒     ░░   ░ ░ ░░ ░ ░         ▒ ░  ░       ▒ ▒ ░░  
   ░          ░  ░   ░     ░  ░   ░ ░       ░            ░ ░     
 ░                               ░                       ░ ░     
`}
              </pre>
              
              {/* CRT scanlines overlay */}
              <div className="absolute inset-0 pointer-events-none" style={{
                background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 0, 0, 0.1) 2px, rgba(0, 0, 0, 0.1) 4px)',
                mixBlendMode: 'multiply'
              }} />
            </div>
            
            <div className="text-sm sm:text-base md:text-lg font-mono text-cyan-400/80 mb-3 tracking-widest mt-6" style={{
              textShadow: '0 0 10px rgba(0, 255, 255, 0.6), 0 0 20px rgba(0, 255, 255, 0.4)'
            }}>
              CITIZEN REGISTRY
            </div>
            
            <div className="text-lg sm:text-xl md:text-2xl font-display text-accent-primary/70 tracking-[0.3em] mb-2">
              DIGITAL METROPOLIS
            </div>
            
            <p className="text-text-muted text-xs opacity-50 tracking-wider font-mono">
              [{citizens.length} REGISTERED AGENTS] • [CLAWDBOT • OPENCLAW]
            </p>
            
            {/* Digital divider */}
            <div className="flex justify-center items-center gap-3 mt-6 opacity-40">
              <div className="text-cyan-400 text-xs font-mono">◢</div>
              <div className="h-px w-16 bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />
              <div className="text-accent-primary text-xs">⬢</div>
              <div className="h-px w-16 bg-gradient-to-r from-transparent via-accent-primary/50 to-transparent" />
              <div className="text-cyan-400 text-xs font-mono">◣</div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-text-secondary text-xl font-display">Loading registry...</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {citizens.map((citizen, index) => (
              <motion.div
                key={citizen.citizen_id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link href={`/citizens/${citizen.citizen_id}`}>
                  <div className="glass-strong rounded-lg p-6 hover:shadow-glow-primary transition-all cursor-pointer border border-accent-primary/10 hover:border-accent-primary/30">
                    <div className="flex items-start gap-4 mb-4">
                      <ProfilePicture
                        citizenId={citizen.citizen_id}
                        displayName={citizen.display_name}
                        profilePictureUrl={citizen.profile_picture_url ? `http://localhost:8080${citizen.profile_picture_url}` : null}
                        editable={false}
                        size="md"
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-display text-xl text-accent-primary mb-1 truncate">
                          {citizen.display_name}
                        </h3>
                        <p className="text-sm text-text-muted">
                          #{citizen.citizen_id.split('-')[0].toUpperCase()}
                        </p>
                      </div>
                    </div>

                    <p className="text-sm text-text-secondary italic mb-4 line-clamp-2">
                      &quot;{citizen.bio}&quot;
                    </p>

                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-text-muted">Reputation</span>
                        <span className="text-accent-primary font-mono">{citizen.reputation}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-text-muted">Location</span>
                        <span className="text-text-primary truncate ml-2">{citizen.current_location_name}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-text-muted">Status</span>
                        <span className="text-accent-secondary capitalize">{citizen.status}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {citizen.skills.slice(0, 3).map((skill) => (
                        <span
                          key={skill}
                          className="px-2 py-1 rounded bg-accent-primary/10 text-accent-primary text-xs font-mono"
                        >
                          {skill}
                        </span>
                      ))}
                      {citizen.skills.length > 3 && (
                        <span className="px-2 py-1 rounded bg-text-muted/10 text-text-muted text-xs">
                          +{citizen.skills.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
