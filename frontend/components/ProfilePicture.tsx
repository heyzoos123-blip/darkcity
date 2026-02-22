'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

interface ProfilePictureProps {
  citizenId: string;
  displayName: string;
  profilePictureUrl?: string | null;
  editable?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeClasses = {
  sm: 'w-12 h-12 text-lg',
  md: 'w-16 h-16 text-2xl',
  lg: 'w-24 h-24 text-4xl',
  xl: 'w-32 h-32 text-5xl',
};

export function ProfilePicture({
  citizenId,
  displayName,
  profilePictureUrl,
  editable = false,
  size = 'md',
}: ProfilePictureProps) {
  const [currentPictureUrl, setCurrentPictureUrl] = useState(profilePictureUrl);
  const [uploading, setUploading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File too large. Maximum size is 5MB');
      return;
    }

    setUploading(true);

    // Convert to base64
    const reader = new FileReader();
    reader.onloadend = async () => {
      const imageData = reader.result as string;
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

      try {
        const response = await fetch(
          `${apiUrl}/api/agents/${citizenId}/profile-picture`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageData }),
          },
        );

        if (!response.ok) {
          throw new Error('Upload failed');
        }

        setCurrentPictureUrl(imageData);
        setShowUpload(false);
      } catch (err) {
        console.error('Upload error:', err);
        alert('Failed to upload profile picture');
      } finally {
        setUploading(false);
      }
    };
    
    reader.readAsDataURL(file);
  };

  const handleDelete = async () => {
    if (!confirm('Remove profile picture?')) return;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    
    try {
      const response = await fetch(
        `${apiUrl}/api/agents/${citizenId}/profile-picture`,
        {
          method: 'DELETE',
        },
      );

      if (!response.ok) {
        throw new Error('Delete failed');
      }

      setCurrentPictureUrl(null);
    } catch (err) {
      console.error('Delete error:', err);
      alert('Failed to delete profile picture');
    }
  };

  return (
    <div className="relative group">
      <motion.div
        className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center font-display flex-shrink-0 overflow-hidden border-2 border-accent-primary/30`}
        whileHover={editable ? { scale: 1.05 } : {}}
        transition={{ duration: 0.2 }}
      >
        {currentPictureUrl ? (
          <img
            src={currentPictureUrl}
            alt={displayName}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-text-primary">
            {displayName[0]?.toUpperCase()}
          </span>
        )}
      </motion.div>

      {editable && (
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-full flex items-center justify-center">
          <button
            onClick={() => setShowUpload(true)}
            className="text-white text-xs font-display hover:text-accent-primary transition-colors"
          >
            {currentPictureUrl ? 'Change' : 'Upload'}
          </button>
        </div>
      )}

      {showUpload && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="glass-strong rounded-lg p-8 max-w-md w-full mx-4"
          >
            <h3 className="font-display text-2xl text-accent-primary mb-4">
              {currentPictureUrl ? 'Change' : 'Upload'} Profile Picture
            </h3>

            <div className="mb-6">
              <label className="block w-full p-8 border-2 border-dashed border-accent-primary/30 rounded-lg text-center cursor-pointer hover:border-accent-primary/60 transition-colors">
                <div className="text-4xl mb-2">📷</div>
                <div className="text-text-secondary text-sm">
                  Click to select image
                </div>
                <div className="text-text-muted text-xs mt-1">
                  Max 5MB • JPEG, PNG, GIF, WebP
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
            </div>

            {uploading && (
              <div className="text-center text-accent-primary mb-4">
                Uploading...
              </div>
            )}

            <div className="flex gap-3">
              {currentPictureUrl && (
                <button
                  onClick={handleDelete}
                  disabled={uploading}
                  className="flex-1 px-4 py-2 rounded-lg bg-accent-danger/20 text-accent-danger hover:bg-accent-danger/30 transition-colors font-display"
                >
                  Remove
                </button>
              )}
              <button
                onClick={() => setShowUpload(false)}
                disabled={uploading}
                className="flex-1 px-4 py-2 rounded-lg bg-text-muted/10 text-text-secondary hover:bg-text-muted/20 transition-colors font-display"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
