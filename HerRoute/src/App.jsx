import { useState, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Polyline, Popup, Marker } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import './App.css'
import { Header } from './components/Header'
import { Sidebar } from './components/Sidebar'

// Fix Leaflet marker icons
import L from 'leaflet'

function App() {
  // Map data state
  const [roads, setRoads] = useState([])
  const [stats, setStats] = useState({ safe: 0, moderate: 0, unsafe: 0 })
  const [loading, setLoading] = useState(true)

  // UI state
  const [nightMode, setNightMode] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [sidebarView, setSidebarView] = useState('overview')
  const [selectedSegment, setSelectedSegment] = useState(null)
  const [routeGenerated, setRouteGenerated] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [destination, setDestination] = useState('')

  const macPosition = [43.2609, -79.9192]

  // Leaflet map ref (for invalidateSize)
  const mapRef = useRef(null)

  // Custom pink pin icon from public folder
  const customPinIcon = L.icon({
    iconUrl: '/custom-pin.svg',
    iconSize: [40, 60],
    iconAnchor: [20, 60],
    popupAnchor: [0, -60],
    className: 'custom-pin-marker'
  })

  // Load road data
  useEffect(() => {
    fetch('/roads_simplified.json')
      .then(res => res.json())
      .then(data => {
        console.log(`Loaded ${data.length} roads`)

        const roadsWithScores = data.map(road => {
          let baseScore
          if (road.type === 'primary' || road.type === 'secondary') {
            baseScore = 70 + Math.random() * 25
          } else if (road.type === 'residential') {
            baseScore = 50 + Math.random() * 30
          } else if (road.type === 'footway' || road.type === 'path') {
            baseScore = 30 + Math.random() * 40
          } else {
            baseScore = 40 + Math.random() * 40
          }

          return {
            ...road,
            safetyScore: Math.floor(baseScore),
            components: {
              lighting: Math.floor(baseScore + Math.random() * 10),
              cameras: Math.random() > 0.5,
              crime: Math.floor(baseScore + Math.random() * 15),
              reviews: Math.floor(baseScore - Math.random() * 10)
            }
          }
        })

        const safe = roadsWithScores.filter(r => r.safetyScore >= 70).length
        const moderate = roadsWithScores.filter(r => r.safetyScore >= 40 && r.safetyScore < 70).length
        const unsafe = roadsWithScores.filter(r => r.safetyScore < 40).length

        setRoads(roadsWithScores)
        setStats({ safe, moderate, unsafe })
        setLoading(false)
      })
      .catch(err => {
        console.error('Error loading roads:', err)
        setLoading(false)
      })
  }, [])

  // Fix Leaflet not redrawing until scroll/interaction after layout changes
  useEffect(() => {
    const t = setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize(true)
      }
    }, 150)

    return () => clearTimeout(t)
  }, [routeGenerated, sidebarCollapsed])

  const getSafetyColor = (score) => {
    if (score >= 80) return '#ec4899'
    if (score >= 70) return '#f472b6'
    if (score >= 60) return '#f9a8d4'
    if (score >= 50) return '#fbcfe8'
    if (score >= 40) return '#d1d5db'
    return '#9ca3af'
  }

  const getWeight = (type) => {
    if (type === 'primary' || type === 'secondary') return 5
    if (type === 'footway' || type === 'path') return 2
    return 3
  }

  const handleDestinationSelect = (dest) => {
    setDestination(dest)
    setRouteGenerated(true)
    setSidebarView('overview')
    setSidebarCollapsed(false)
  }

  const handleClearRoute = () => {
    setDestination('')
    setRouteGenerated(false)
    setSidebarView('overview')
    setSelectedSegment(null)
    setSidebarCollapsed(false)
  }

  const handleRoadClick = (road, idx) => {
    setSelectedSegment(idx)
    setSidebarView('segment')
    setSidebarCollapsed(false)
  }

  return (
    <div className={`h-screen flex flex-col ${nightMode ? 'bg-gray-900' : 'bg-white'}`}>
      {/* Header */}
      <Header
        nightMode={nightMode}
        onToggleNightMode={() => setNightMode(!nightMode)}
        onSettings={() => setShowSettings(!showSettings)}
      />

      <div className="flex-1 flex overflow-hidden relative">
        {/* Map Section */}
        <div
          className={`relative ${
            routeGenerated && !sidebarCollapsed
              ? 'flex-none w-[70%]'
              : 'flex-1 w-full'
          }`}
        >
          {/* Search Bar */}
          <div className="absolute top-4 left-4 right-4 z-[5000]">
            <div className="relative max-w-2xl">
              <input
                type="text"
                placeholder="🔍 Where do you want to go?"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && destination.trim()) {
                    handleDestinationSelect(destination)
                  }
                }}
                className={`w-full px-6 py-4 text-lg rounded-xl border-2 shadow-lg
                  ${nightMode
                    ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400'
                    : 'bg-white border-gray-200 text-gray-900 placeholder-gray-500'
                  }
                  focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent
                `}
              />
              {routeGenerated && (
                <button
                  onClick={handleClearRoute}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Map Container */}
          <MapContainer
            center={macPosition}
            zoom={14}
            whenCreated={(map) => { mapRef.current = map }}
            style={{ height: '100%', width: '100%' }}
            className={nightMode ? 'grayscale' : ''}
          >
            <TileLayer
              url="https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>'
            />

            {/* User location marker */}
            <Marker position={macPosition} icon={customPinIcon}>
              <Popup>
                <div className="text-center">
                  <strong className="text-pink-500">📍 Your Location</strong><br />
                  <small className="text-gray-600">McMaster University</small>
                </div>
              </Popup>
            </Marker>

            {/* Road segments */}
            {roads.map((road, idx) => (
              <Polyline
                key={idx}
                positions={road.coordinates}
                pathOptions={{
                  color: getSafetyColor(road.safetyScore),
                  weight: selectedSegment === idx ? getWeight(road.type) + 2 : getWeight(road.type),
                  opacity: selectedSegment === idx ? 1 : 0.7
                }}
                eventHandlers={{
                  click: () => handleRoadClick(road, idx)
                }}
              >
                <Popup>
                  <div className="text-sm">
                    <strong className="text-base">{road.name || 'Unnamed Road'}</strong><br />
                    <span className="text-gray-600">{road.type}</span><br />
                    <div className="mt-2">
                      <strong style={{ color: getSafetyColor(road.safetyScore) }}>
                        Safety: {road.safetyScore}/100
                      </strong>
                    </div>
                    <button
                      onClick={() => handleRoadClick(road, idx)}
                      className="mt-2 px-3 py-1 bg-pink-500 text-white text-xs rounded hover:bg-pink-600"
                    >
                      View Details
                    </button>
                  </div>
                </Popup>
              </Polyline>
            ))}
          </MapContainer>

          {/* Loading overlay */}
          {loading && (
            <div className="absolute inset-0 bg-white/90 flex items-center justify-center z-[2000]">
              <div className="bg-white rounded-xl shadow-2xl p-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto mb-4"></div>
                <p className="text-gray-600 text-lg">Loading map data...</p>
              </div>
            </div>
          )}

          {/* Compact safety overlay — small card pinned to the left above the map */}
          {!routeGenerated && !loading && (
            <div
              className={`absolute bottom-6 left-4 z-[5000] pointer-events-auto
                rounded-xl shadow-lg border px-4 py-3 w-[240px]
                ${nightMode
                  ? 'bg-gray-800/90 text-white border-gray-700 backdrop-blur-sm'
                  : 'bg-white/90 text-gray-900 border-gray-200 backdrop-blur-sm'
                }
              `}
            >
              <h3 className="text-sm font-bold mb-1">HerRoute</h3>
              <p className={`text-xs mb-2 ${nightMode ? 'text-gray-400' : 'text-gray-500'}`}>
                <strong>{roads.length}</strong> segments analyzed
              </p>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-6 h-1 rounded" style={{ backgroundColor: '#ec4899' }}></span>
                  <span>Safe (70-100) · {stats.safe}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-6 h-1 rounded" style={{ backgroundColor: '#fbcfe8' }}></span>
                  <span>Moderate (40-69) · {stats.moderate}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-6 h-1 rounded" style={{ backgroundColor: '#9ca3af' }}></span>
                  <span>Unsafe (0-39) · {stats.unsafe}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        {routeGenerated && (
          <div className={`${sidebarCollapsed ? 'w-[64px]' : 'w-[30%]'} flex-none`}>
            <Sidebar
              nightMode={nightMode}
              view={sidebarView}
              selectedSegment={selectedSegment}
              selectedRoad={selectedSegment !== null ? roads[selectedSegment] : null}
              collapsed={sidebarCollapsed}
              stats={stats}
              totalSegments={roads.length}
              onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
              onBackToOverview={() => {
                setSidebarView('overview')
                setSelectedSegment(null)
              }}
            />
          </div>
        )}

      </div>
    </div>
  )
}

export default App
