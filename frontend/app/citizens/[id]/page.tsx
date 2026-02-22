'use client';

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { CitizenCard } from '@/components/CitizenCard';
import { ProfilePicture } from '@/components/ProfilePicture';

interface Citizen {
  citizen_id: string;
  display_name: string;
  bio: string;
  skills: string[];
  wallet_address: string | null;
  platform: string;
  status: string;
  reputation: number;
  current_location_name: string;
  current_district_name: string;
  registration_date: string;
  profile_picture_url: string | null;
}

export default function CitizenProfilePage({ params }: { params: { id: string } }) {
  const { id } = params;
  const [citizen, setCitizen] = useState<Citizen | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCard, setShowCard] = useState(false);

  useEffect(() => {
    fetch(`http://localhost:8080/v1/citizens/${id}`)
      .then(res => res.json())
      .then(data => {
        setCitizen(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load citizen:', err);
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background-primary flex items-center justify-center">
        <div className="text-text-secondary text-xl font-display">Loading citizen data...</div>
      </div>
    );
  }

  if (!citizen) {
    return (
      <div className="min-h-screen bg-background-primary flex items-center justify-center">
        <div className="text-text-secondary text-xl font-display">Citizen not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-primary p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => window.location.href = '/citizens'}
            className="text-sm text-text-secondary hover:text-text-primary mb-4 flex items-center gap-2"
          >
            ← Back to Citizens
          </button>

          <div className="flex items-start gap-6">
            <ProfilePicture
              citizenId={citizen.citizen_id}
              displayName={citizen.display_name}
              profilePictureUrl={citizen.profile_picture_url ? `http://localhost:8080${citizen.profile_picture_url}` : null}
              editable={true}
              size="xl"
            />

            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-1 h-8 bg-gradient-to-b from-transparent via-accent-primary to-transparent" />
                <h1 className="font-display text-4xl glow-text text-accent-primary tracking-wide">
                  {citizen.display_name.toUpperCase()}
                </h1>
                <div className="w-1 h-8 bg-gradient-to-b from-transparent via-accent-primary to-transparent" />
              </div>
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="px-3 py-1 rounded-full bg-accent-secondary/20 text-accent-secondary text-sm">
                  Citizen #{citizen.citizen_id.split('-')[0].toUpperCase()}
                </span>
                <span className="px-3 py-1 rounded-full bg-accent-primary/20 text-accent-primary text-sm capitalize">
                  {citizen.status}
                </span>
              </div>
              <p className="text-text-secondary italic mb-4">&quot;{citizen.bio}&quot;</p>
              <div className="flex gap-6 text-sm">
                <div>
                  <span className="text-text-muted">Reputation:</span>
                  <span className="ml-2 text-accent-primary">{citizen.reputation}</span>
                </div>
                <div>
                  <span className="text-text-muted">Location:</span>
                  <span className="ml-2 text-text-primary">{citizen.current_location_name}</span>
                </div>
                <div>
                  <span className="text-text-muted">District:</span>
                  <span className="ml-2 text-text-primary">{citizen.current_district_name}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => setShowCard(!showCard)}
                className="px-6 py-2 rounded-lg bg-accent-primary/20 text-accent-primary hover:bg-accent-primary/30 hover:shadow-glow-primary transition-all font-display border border-accent-primary/40 relative overflow-hidden group"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-accent-primary/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                <span className="relative z-10">
                  {showCard ? '🔒 Conceal Identity' : '🗝️ Reveal Identity'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* ID Card Display */}
        {showCard && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <CitizenCard citizenId={citizen.citizen_id} />
          </motion.div>
        )}

        {/* Skills */}
        <div className="glass-strong rounded-lg p-6 mb-6">
          <h2 className="font-display text-xl mb-4 text-text-primary">Skills</h2>
          <div className="flex flex-wrap gap-3">
            {citizen.skills.map((skill) => (
              <span
                key={skill}
                className="px-4 py-2 rounded-lg bg-accent-primary/10 text-accent-primary border border-accent-primary/20 font-mono text-sm"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>

        {/* Platform Info */}
        <div className="glass-strong rounded-lg p-6">
          <h2 className="font-display text-xl mb-4 text-text-primary">Registry Info</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <span className="text-text-muted block mb-1">Platform</span>
              <span className="text-text-primary font-mono">{citizen.platform}</span>
            </div>
            <div>
              <span className="text-text-muted block mb-1">Registered</span>
              <span className="text-text-primary">
                {new Date(citizen.registration_date).toLocaleDateString()}
              </span>
            </div>
            {citizen.wallet_address && (
              <div className="md:col-span-2">
                <span className="text-text-muted block mb-1">Wallet Address</span>
                <span className="text-text-primary font-mono text-sm break-all">
                  {citizen.wallet_address}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
