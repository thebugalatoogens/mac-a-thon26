import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import type { Map as LeafletMap } from 'leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { RouteOption } from '../types/route';

// Fix Leaflet default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface HerRouteMapProps {
    nightMode: boolean;
    routeGenerated: boolean;
    selectedRoute: RouteOption | null;
    allRoutes: RouteOption[];
    selectedRouteIndex: number;
    onSegmentClick: (segmentId: number) => void;
    onMapReady: (resetFn: () => void) => void;
}

// McMaster University center
const MCMASTER_CENTER: [number, number] = [43.2609, -79.9192];

// Safety color mapping - ALL PINK SHADES
const getSafetyColor = (score: number): string => {
    if (score >= 80) return '#ec4899'; // Deep pink - very safe
    if (score >= 70) return '#f472b6'; // Pink - safe
    if (score >= 60) return '#f9a8d4'; // Light pink
    if (score >= 50) return '#fbcfe8'; // Very light pink
    if (score >= 40) return '#fce7f3'; // Very very light pink
    return '#fdf2f8'; // Palest pink - unsafe
};

// Custom pink marker for start/end
const createPinkMarker = () => {
    return L.divIcon({
        className: 'custom-pink-marker',
        html: `
      <div style="
        width: 30px;
        height: 30px;
        background: #ec4899;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 3px solid white;
        box-shadow: 0 4px 6px rgba(0,0,0,0.3);
      ">
        <div style="
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(45deg);
          color: white;
          font-size: 16px;
        "></div>
      </div>
    `,
        iconSize: [30, 30],
        iconAnchor: [15, 30],
    });
};

// Custom pin icon for current location
const customLocationIcon = L.icon({
    iconUrl: '/custom-pin.svg',
    iconSize: [40, 60],
    iconAnchor: [20, 60],
    className: 'custom-pin-marker'
});

// Component to handle map reset and auto-fit to route bounds
function MapController({ onMapReady, selectedRoute }: { onMapReady: (resetFn: () => void) => void; selectedRoute: RouteOption | null }) {
    const map = useMap();

    useEffect(() => {
        const resetView = () => {
            map.setView(MCMASTER_CENTER, 15);
        };
        onMapReady(resetView);
    }, [map, onMapReady]);

    // Auto-fit map to route bounds when route changes
    useEffect(() => {
        if (selectedRoute && selectedRoute.coords.length > 0) {
            const bounds = L.latLngBounds(
                selectedRoute.coords.map(c => [c.lat, c.lng] as [number, number])
            );
            map.fitBounds(bounds, { padding: [50, 50] });
        }
    }, [map, selectedRoute?.route_id]);

    return null;
}

export default function HerRouteMap({
    nightMode,
    routeGenerated,
    selectedRoute,
    allRoutes,
    selectedRouteIndex,
    onSegmentClick,
    onMapReady,
}: HerRouteMapProps) {
    const mapRef = useRef<LeafletMap | null>(null);
    const [mapReady, setMapReady] = useState(false);
    const [allRoads, setAllRoads] = useState<any[]>([]);
    const [showAllRoads, setShowAllRoads] = useState(true);
    const [loading, setLoading] = useState(true);

    // Load all roads from JSON
    useEffect(() => {
        fetch('/roads_simplified.json')
            .then(res => res.json())
            .then(data => {
                const roadsWithScores = data.map((road: any) => ({
                    ...road,
                    safetyScore: Math.floor(40 + Math.random() * 55),
                }));
                setAllRoads(roadsWithScores);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    useEffect(() => {
        if (mapRef.current) {
            setTimeout(() => {
                mapRef.current?.invalidateSize();
            }, 100);
        }
    }, [routeGenerated]);

    // Get start/end from selected route
    const startCoord: [number, number] | null = selectedRoute && selectedRoute.coords.length > 0
        ? [selectedRoute.coords[0].lat, selectedRoute.coords[0].lng]
        : null;
    const endCoord: [number, number] | null = selectedRoute && selectedRoute.coords.length > 1
        ? [selectedRoute.coords[selectedRoute.coords.length - 1].lat, selectedRoute.coords[selectedRoute.coords.length - 1].lng]
        : null;

    return (
        <>
            <style>{`
                /* Day/Night Mode - Apply filters ONLY to tile layers, not markers */
                .leaflet-tile-pane {
                    filter: ${nightMode
                    ? `
                            brightness(0.3)
                            contrast(1.1)
                            saturate(3.8)
                            hue-rotate(120deg)
                        `
                    : `
                            saturate(2.5)
                            brightness(1.05)
                            hue-rotate(5deg)
                            saturate(2.1)
                            brightness(1.1)
                            contrast(1.05)
                        `
                };
                    transition: filter 0.3s ease;
                }

                /* Ensure markers are NOT affected by any filters */
                .leaflet-marker-pane,
                .leaflet-popup-pane,
                .custom-pin-marker,
                .custom-pink-marker {
                    filter: none !important;
                }

                /* Ensure polylines (routes) are NOT affected by tile filters */
                .leaflet-overlay-pane svg {
                    filter: none !important;
                }
            `}</style>

            {/* Toggle Button - Bottom Left */}
            <button
                onClick={() => setShowAllRoads(!showAllRoads)}
                className={`fixed bottom-6 left-6 z-[9999] px-4 py-2 rounded-lg shadow-lg font-semibold text-sm transition-all ${showAllRoads
                    ? 'bg-pink-500 text-white hover:bg-pink-600'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                style={{ zIndex: 9999 }}
            >
                {showAllRoads ? 'Hide All Roads' : 'Show All Roads'}
            </button>

            <div style={{ height: '100%', width: '100%' }}>
                <MapContainer
                    center={MCMASTER_CENTER}
                    zoom={15}
                    ref={mapRef}
                    style={{ height: '100%', width: '100%', zIndex: 1 }}
                    zoomControl={true}
                    whenReady={() => setMapReady(true)}
                >
                    <TileLayer
                        url="https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png"
                    />

                    <MapController onMapReady={onMapReady} selectedRoute={selectedRoute} />

                    {/* All roads from JSON - toggleable - ALL PINK */}
                    {showAllRoads && allRoads.map((road, idx) => (
                        <Polyline
                            key={`road-${idx}`}
                            positions={road.coordinates}
                            pathOptions={{
                                color: getSafetyColor(road.safetyScore),
                                weight: 3,
                                opacity: 0.5,
                            }}
                        >
                            <Popup>
                                <div className="text-sm">
                                    <strong>Road Segment {idx + 1}</strong><br />
                                    <div className="mt-1" style={{ color: getSafetyColor(road.safetyScore) }}>
                                        Safety: {road.safetyScore}/100
                                    </div>
                                </div>
                            </Popup>
                        </Polyline>
                    ))}

                    {/* Non-selected route alternatives (shown faded) */}
                    {routeGenerated && allRoutes.map((route, idx) => {
                        if (idx === selectedRouteIndex) return null;
                        const positions = route.coords.map(c => [c.lat, c.lng] as [number, number]);
                        return (
                            <Polyline
                                key={`alt-route-${route.route_id}`}
                                positions={positions}
                                pathOptions={{
                                    color: '#d1d5db',
                                    weight: 5,
                                    opacity: 0.4,
                                    dashArray: '8 6',
                                }}
                            >
                                <Popup>
                                    <div className="text-sm">
                                        <strong>{route.label}</strong><br />
                                        <span className="text-gray-600">{route.duration_text} &middot; {route.distance_text}</span><br />
                                        <div className="mt-1" style={{ color: getSafetyColor(route.safetyScore) }}>
                                            Safety: {route.safetyScore}/100
                                        </div>
                                    </div>
                                </Popup>
                            </Polyline>
                        );
                    })}

                    {/* Selected route - rendered per-segment with safety colors from DB */}
                    {routeGenerated && selectedRoute && selectedRoute.segments && selectedRoute.segments.map((segment, idx) => {
                        const positions = segment.coords.map(c => [c.lat, c.lng] as [number, number]);
                        return (
                            <Polyline
                                key={`seg-${selectedRoute.route_id}-${idx}`}
                                positions={positions}
                                pathOptions={{
                                    color: getSafetyColor(segment.safetyScore),
                                    weight: 8,
                                    opacity: 1,
                                }}
                                eventHandlers={{
                                    click: () => onSegmentClick(segment.segmentIndex),
                                }}
                            >
                                <Popup>
                                    <div className="text-sm">
                                        <strong>Segment {idx + 1}</strong><br />
                                        <div className="mt-1" style={{ color: getSafetyColor(segment.safetyScore) }}>
                                            <strong>Safety: {segment.safetyScore}/100</strong>
                                        </div>
                                        <div className="text-gray-500 text-xs mt-1">
                                            Lighting: {Math.round(segment.lightingScore * 100)}% | Lamps: {Math.round(segment.avgLampCount)}
                                        </div>
                                        <button
                                            onClick={() => onSegmentClick(segment.segmentIndex)}
                                            className="mt-2 px-3 py-1 bg-pink-500 text-white text-xs rounded hover:bg-pink-600"
                                        >
                                            View Details
                                        </button>
                                    </div>
                                </Popup>
                            </Polyline>
                        );
                    })}

                    {/* Start marker */}
                    {routeGenerated && startCoord && (
                        <Marker position={startCoord} icon={createPinkMarker()}>
                            <Popup>
                                <div className="text-center">
                                    <strong className="text-pink-500">Start</strong><br />
                                    <small className="text-gray-600">Your Location</small>
                                </div>
                            </Popup>
                        </Marker>
                    )}

                    {/* End marker */}
                    {routeGenerated && endCoord && (
                        <Marker position={endCoord} icon={createPinkMarker()}>
                            <Popup>
                                <div className="text-center">
                                    <strong className="text-pink-500">Destination</strong>
                                </div>
                            </Popup>
                        </Marker>
                    )}

                    {/* Current location marker - always visible */}
                    <Marker position={MCMASTER_CENTER} icon={customLocationIcon}>
                        <Popup>
                            <div className="text-center">
                                <strong className="text-pink-500">Your Location</strong><br />
                                <small className="text-gray-600">McMaster University</small>
                            </div>
                        </Popup>
                    </Marker>
                </MapContainer>
            </div>
        </>
    );
}
