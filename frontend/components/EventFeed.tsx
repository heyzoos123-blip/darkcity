'use client';

import { motion, AnimatePresence } from 'framer-motion';
import type { Event } from '@/types';
import { formatTime, getEventTypeColor, getEventTypeIcon, cn } from '@/lib/utils';

interface EventFeedProps {
  events: Event[];
  onEventClick?: (event: Event) => void;
  maxEvents?: number;
}

export function EventFeed({ events, onEventClick, maxEvents = 50 }: EventFeedProps) {
  const displayEvents = events.slice(0, maxEvents);

  return (
    <motion.div
      initial={{ x: 300 }}
      animate={{ x: 0 }}
      className="glass-strong rounded-lg flex flex-col h-full"
    >
      {/* Header */}
      <div className="p-4 border-b border-text-muted/20">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg text-text-primary">Live Feed</h2>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-accent-primary animate-pulse" />
            <span className="text-xs text-text-secondary">
              {events.length} events
            </span>
          </div>
        </div>
      </div>

      {/* Event List */}
      <div className="flex-1 overflow-y-auto scrollbar-hide p-4 space-y-3">
        <AnimatePresence initial={false}>
          {displayEvents.map((event, index) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, x: 20, height: 0 }}
              animate={{ opacity: 1, x: 0, height: 'auto' }}
              exit={{ opacity: 0, x: -20, height: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className={cn(
                "p-3 rounded-lg border cursor-pointer transition-all",
                "hover:bg-background-elevated hover:scale-[1.02]"
              )}
              style={{
                borderColor: `${getEventTypeColor(event.type)}40`,
                backgroundColor: `${getEventTypeColor(event.type)}10`,
              }}
              onClick={() => onEventClick?.(event)}
            >
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-lg flex-shrink-0"
                  style={{ backgroundColor: `${getEventTypeColor(event.type)}20` }}
                >
                  {getEventTypeIcon(event.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span
                      className="text-xs font-display uppercase tracking-wider font-semibold"
                      style={{ color: getEventTypeColor(event.type) }}
                    >
                      {event.type.replace(/_/g, ' ')}
                    </span>
                    <span className="text-xs text-text-muted flex-shrink-0">
                      {formatTime(event.startTime)}
                    </span>
                  </div>

                  <p className="text-sm text-text-primary line-clamp-2 mb-2">
                    {event.description}
                  </p>

                  {/* Metadata */}
                  <div className="flex items-center gap-3 text-xs text-text-secondary">
                    <div className="flex items-center gap-1">
                      <span>📍</span>
                      <span className="capitalize">{event.scope.toLowerCase()}</span>
                    </div>

                    {event.duration > 0 && (
                      <div className="flex items-center gap-1">
                        <span>⏱️</span>
                        <span>{Math.round(event.duration / 60)}m</span>
                      </div>
                    )}

                    {event.participants && event.participants.length > 0 && (
                      <div className="flex items-center gap-1">
                        <span>👥</span>
                        <span>{event.participants.length}</span>
                      </div>
                    )}

                    {event.effects && event.effects.length > 0 && (
                      <div className="flex items-center gap-1">
                        <span>✨</span>
                        <span>{event.effects.length} effects</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {events.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="text-4xl mb-4">🌃</div>
            <p className="text-text-secondary text-sm">
              Quiet in the city...
              <br />
              <span className="text-xs text-text-muted">Events will appear here in real-time</span>
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      {events.length > maxEvents && (
        <div className="p-3 border-t border-text-muted/20 text-center">
          <span className="text-xs text-text-muted">
            Showing {maxEvents} of {events.length} events
          </span>
        </div>
      )}
    </motion.div>
  );
}
