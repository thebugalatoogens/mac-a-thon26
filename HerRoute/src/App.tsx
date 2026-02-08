import { useState, useRef } from 'react';
import { Header } from './components/Header';
import { MapSection } from './components/MapSection';
import { Sidebar } from './components/Sidebar';
import { fetchRoutes } from './api/fetchRoutes';
import type { RouteOption, Coord } from './types/route';
import "leaflet/dist/leaflet.css";
import "leaflet-routing-machine/dist/leaflet-routing-machine.css";

export default function App() {
  const [nightMode, setNightMode] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [sidebarView, setSidebarView] = useState<'overview' | 'segment'>('overview');
  const [selectedSegment, setSelectedSegment] = useState<number | null>(null);
  const [routeGenerated, setRouteGenerated] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const resetMapViewRef = useRef<(() => void) | null>(null);

  // Route data from backend
  const [routeOptions, setRouteOptions] = useState<RouteOption[]>([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [routeMeta, setRouteMeta] = useState<{
    candidateCount: number;
    fastestId: string;
    safestId: string;
    recommendedId: string;
  } | null>(null);

  const selectedRoute = routeOptions[selectedRouteIndex] || null;

  const handleDestinationSelect = async (origin: Coord, destination: Coord) => {
    setRouteLoading(true);
    setRouteError(null);
    setRouteGenerated(true);
    setSidebarView('overview');
    setSidebarCollapsed(false);

    try {
      const data = await fetchRoutes(origin, destination);
      if (data.ok && data.options.length > 0) {
        setRouteOptions(data.options);
        const recIdx = data.options.findIndex(
          (o) => o.route_id === data.meta.recommendedId
        );
        setSelectedRouteIndex(recIdx >= 0 ? recIdx : 0);
        setRouteMeta(data.meta);
      } else {
        setRouteError(data.error || 'No routes found');
        setRouteGenerated(false);
      }
    } catch (err: any) {
      setRouteError(err.message || 'Failed to fetch routes');
      setRouteGenerated(false);
    } finally {
      setRouteLoading(false);
    }
  };

  const handleClearRoute = () => {
    setRouteGenerated(false);
    setSidebarView('overview');
    setSelectedSegment(null);
    setSidebarCollapsed(false);
    setRouteOptions([]);
    setSelectedRouteIndex(0);
    setRouteMeta(null);
    setRouteError(null);
  };

  const handleBackToOverview = () => {
    setSidebarView('overview');
    if (resetMapViewRef.current) {
      resetMapViewRef.current();
    }
  };

  const handleSelectRoute = (index: number) => {
    setSelectedRouteIndex(index);
    setSidebarView('overview');
  };

  const handleFindSaferRoute = () => {
    if (!routeMeta) return;
    const safestIdx = routeOptions.findIndex(
      (o) => o.route_id === routeMeta.safestId
    );
    if (safestIdx >= 0 && safestIdx !== selectedRouteIndex) {
      setSelectedRouteIndex(safestIdx);
    }
  };

  return (
    <div className={`h-screen flex flex-col ${nightMode ? 'bg-gray-900' : 'bg-white'}`}>
      <Header
        nightMode={nightMode}
        onToggleNightMode={() => setNightMode(!nightMode)}
        onSettings={() => setShowSettings(!showSettings)}
      />

      <div className="flex-1 flex overflow-hidden relative">
        <MapSection
          nightMode={nightMode}
          routeGenerated={routeGenerated}
          routeLoading={routeLoading}
          selectedRoute={selectedRoute}
          allRoutes={routeOptions}
          selectedRouteIndex={selectedRouteIndex}
          onDestinationSelect={handleDestinationSelect}
          onClearRoute={handleClearRoute}
          onNodeClick={(nodeId) => {
            setSelectedSegment(nodeId);
            setSidebarView('segment');
            setSidebarCollapsed(false);
          }}
          onResetView={(resetFn) => {
            return resetMapViewRef.current = resetFn;
          }}
        />

        {routeGenerated && (
          <Sidebar
            nightMode={nightMode}
            view={sidebarView}
            selectedSegment={selectedSegment}
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
            onBackToOverview={handleBackToOverview}
            selectedRoute={selectedRoute}
            routeOptions={routeOptions}
            selectedRouteIndex={selectedRouteIndex}
            onSelectRoute={handleSelectRoute}
            onFindSaferRoute={handleFindSaferRoute}
            routeLoading={routeLoading}
            routeError={routeError}
            routeMeta={routeMeta}
          />
        )}
      </div>
    </div>
  );
}
