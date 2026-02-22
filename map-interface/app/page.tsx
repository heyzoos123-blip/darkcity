'use client'

import dynamic from 'next/dynamic'
import '../styles/map.css'

// Dynamically import DarkCityMap to avoid SSR issues with Leaflet
const DarkCityMap = dynamic(
  () => import('../components/DarkCityMap'),
  { 
    ssr: false,
    loading: () => (
      <div className="map-loading">
        <div className="map-loading-text">Loading DARKCITY...</div>
      </div>
    )
  }
)

export default function MapPage() {
  return (
    <main>
      <DarkCityMap />
    </main>
  )
}
