'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { District, Zone, AgentLocation } from '@/types';
import { getDistrictColor, cn } from '@/lib/utils';

interface CityMapProps {
  districts: District[];
  agentLocations: Map<string, AgentLocation>;
  selectedDistrict?: string;
  onDistrictClick: (districtId: string) => void;
  onZoneClick: (zoneId: string) => void;
}

export function CityMap({
  districts,
  agentLocations,
  selectedDistrict,
  onDistrictClick,
  onZoneClick,
}: CityMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredDistrict, setHoveredDistrict] = useState<string | null>(null);

  // Simplified district layout (grid-based)
  const districtLayout: Record<string, { x: number; y: number; w: number; h: number }> = {
    northside: { x: 0.1, y: 0.1, w: 0.25, h: 0.25 },
    uptown: { x: 0.375, y: 0.1, w: 0.25, h: 0.25 },
    eastgate: { x: 0.65, y: 0.1, w: 0.25, h: 0.25 },
    arts: { x: 0.1, y: 0.4, w: 0.25, h: 0.25 },
    downtown: { x: 0.375, y: 0.4, w: 0.25, h: 0.25 },
    midtown: { x: 0.65, y: 0.4, w: 0.25, h: 0.25 },
    westside: { x: 0.1, y: 0.7, w: 0.25, h: 0.25 },
    industrial: { x: 0.375, y: 0.7, w: 0.25, h: 0.25 },
    docks: { x: 0.65, y: 0.7, w: 0.25, h: 0.25 },
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas.getBoundingClientRect();
    canvas.width = width;
    canvas.height = height;

    // Clear canvas with gothic background
    ctx.fillStyle = '#0a0a14'; // Deep purple-black
    ctx.fillRect(0, 0, width, height);

    // Draw districts
    districts.forEach((district) => {
      const layout = districtLayout[district.name.toLowerCase()] || { x: 0.5, y: 0.5, w: 0.2, h: 0.2 };
      const x = layout.x * width;
      const y = layout.y * height;
      const w = layout.w * width;
      const h = layout.h * height;

      const color = getDistrictColor(district.name);
      const isSelected = district.id === selectedDistrict;
      const isHovered = district.id === hoveredDistrict;

      // District background
      ctx.fillStyle = isSelected ? `${color}40` : `${color}20`;
      ctx.fillRect(x, y, w, h);

      // District border
      ctx.strokeStyle = isSelected || isHovered ? color : `${color}80`;
      ctx.lineWidth = isSelected ? 3 : 1;
      ctx.strokeRect(x, y, w, h);

      // District name with gothic font
      ctx.fillStyle = color;
      ctx.font = '16px Cinzel, serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(district.name.toUpperCase(), x + w / 2, y + h / 2);

      // Agent count in district
      const agentsInDistrict = Array.from(agentLocations.values()).filter(
        (loc) => loc.districtId === district.id
      ).length;

      if (agentsInDistrict > 0) {
        ctx.fillStyle = '#d4af37'; // Antique gold instead of neon green
        ctx.font = '12px EB Garamond, serif';
        ctx.fillText(`${agentsInDistrict} agents`, x + w / 2, y + h / 2 + 20);
      }
    });

    // Draw connections (wrought iron style)
    ctx.strokeStyle = '#3d2a1f'; // Aged iron
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);

    districts.forEach((district) => {
      const fromLayout = districtLayout[district.name.toLowerCase()];
      if (!fromLayout) return;

      const fromX = (fromLayout.x + fromLayout.w / 2) * width;
      const fromY = (fromLayout.y + fromLayout.h / 2) * height;

      district.connections.forEach((connId) => {
        const connDistrict = districts.find((d) => d.id === connId);
        if (!connDistrict) return;

        const toLayout = districtLayout[connDistrict.name.toLowerCase()];
        if (!toLayout) return;

        const toX = (toLayout.x + toLayout.w / 2) * width;
        const toY = (toLayout.y + toLayout.h / 2) * height;

        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        ctx.lineTo(toX, toY);
        ctx.stroke();
      });
    });

    ctx.setLineDash([]);
  }, [districts, agentLocations, selectedDistrict, hoveredDistrict]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const { width, height } = rect;

    // Find clicked district
    for (const district of districts) {
      const layout = districtLayout[district.name.toLowerCase()];
      if (!layout) continue;

      const dx = layout.x * width;
      const dy = layout.y * height;
      const dw = layout.w * width;
      const dh = layout.h * height;

      if (x >= dx && x <= dx + dw && y >= dy && y <= dy + dh) {
        onDistrictClick(district.id);
        return;
      }
    }
  };

  const handleCanvasMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const { width, height } = rect;

    // Find hovered district
    for (const district of districts) {
      const layout = districtLayout[district.name.toLowerCase()];
      if (!layout) continue;

      const dx = layout.x * width;
      const dy = layout.y * height;
      const dw = layout.w * width;
      const dh = layout.h * height;

      if (x >= dx && x <= dx + dw && y >= dy && y <= dy + dh) {
        setHoveredDistrict(district.id);
        return;
      }
    }

    setHoveredDistrict(null);
  };

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-pointer"
        onClick={handleCanvasClick}
        onMouseMove={handleCanvasMove}
        onMouseLeave={() => setHoveredDistrict(null)}
      />
      
      {/* Legend */}
      <div className="absolute bottom-4 left-4 glass p-4 rounded-lg space-y-2">
        <div className="text-xs font-display text-text-secondary">LEGEND</div>
        <div className="flex items-center gap-2 text-xs">
          <div className="w-3 h-3 rounded-full bg-accent-primary" />
          <span>Active Agents</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div className="w-3 h-3 border border-text-secondary" />
          <span>District</span>
        </div>
      </div>

      {/* Hover tooltip */}
      {hoveredDistrict && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-4 right-4 glass-strong p-4 rounded-lg max-w-xs"
        >
          {(() => {
            const district = districts.find((d) => d.id === hoveredDistrict);
            if (!district) return null;

            return (
              <>
                <h3 className="font-display text-lg mb-2" style={{ color: getDistrictColor(district.name) }}>
                  {district.name}
                </h3>
                <p className="text-sm text-text-secondary mb-3">{district.description}</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <div className="text-text-muted">Danger</div>
                    <div className="text-accent-danger">{district.ambiance.dangerLevel}%</div>
                  </div>
                  <div>
                    <div className="text-text-muted">Wealth</div>
                    <div className="text-accent-primary">{district.ambiance.wealthIndex}%</div>
                  </div>
                </div>
              </>
            );
          })()}
        </motion.div>
      )}
    </div>
  );
}
