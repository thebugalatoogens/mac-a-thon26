import { useState } from "react";
import { Search, X, Loader2 } from "lucide-react";
import HerRouteMap from "./HerRouteMap";
import type { RouteOption, Coord } from "../types/route";

// McMaster campus locations with real coordinates
const LOCATIONS: Record<string, Coord> = {
  "Wilson Hall": { lat: 43.26230, lng: -79.91706 },
  "Ron Joyce Stadium": { lat: 43.26625, lng: -79.91703 },
  "Mills Library": { lat: 43.26220, lng: -79.91950 },
  "Tim Hortons - Campus": { lat: 43.26310, lng: -79.91860 },
};

// Default user origin (McMaster University center)
const DEFAULT_ORIGIN: Coord = { lat: 43.2609, lng: -79.9192 };

interface MapSectionProps {
  nightMode: boolean;
  routeGenerated: boolean;
  routeLoading: boolean;
  selectedRoute: RouteOption | null;
  allRoutes: RouteOption[];
  selectedRouteIndex: number;
  onDestinationSelect: (origin: Coord, destination: Coord) => void;
  onClearRoute: () => void;
  onNodeClick: (nodeId: number) => void;
  onResetView: (resetFn: () => void) => void;
}

export function MapSection({
  nightMode,
  routeGenerated,
  routeLoading,
  selectedRoute,
  allRoutes,
  selectedRouteIndex,
  onDestinationSelect,
  onClearRoute,
  onNodeClick,
  onResetView,
}: MapSectionProps) {
  const [searchValue, setSearchValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const suggestions = [
    { icon: '🏛️', name: 'Wilson Hall', distance: '0 km' },
    { icon: '🏟️', name: 'Ron Joyce Stadium', distance: '0.5 km' },
    { icon: '📚', name: 'Mills Library', distance: '0.3 km' },
    { icon: '☕', name: 'Tim Hortons - Campus', distance: '0.2 km' },
  ];

  const handleSelect = (name: string) => {
    const destination = LOCATIONS[name];
    if (destination) {
      setSearchValue(name);
      setShowSuggestions(false);
      onDestinationSelect(DEFAULT_ORIGIN, destination);
    }
  };

  return (
    <div
      className="flex-1 relative h-full"
      style={{ position: 'relative', width: '100%', height: '100%' }}
    >
      {/* Search Bar */}
      <div
        style={{
          position: 'absolute',
          top: '1.5rem',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1000,
          width: '90%',
          maxWidth: '600px',
          pointerEvents: 'none',
        }}
      >
        <div
          className={`rounded-xl shadow-2xl border ${nightMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
            }`}
          style={{ pointerEvents: 'auto' }}
        >
          {/* Search Input */}
          <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3">
            {routeLoading ? (
              <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 text-pink-500 animate-spin" />
            ) : (
              <Search className={`w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 ${nightMode ? 'text-gray-400' : 'text-gray-400'}`} />
            )}
            <input
              type="text"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onFocus={() => setShowSuggestions(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchValue.trim()) {
                  handleSelect(searchValue.trim());
                }
              }}
              placeholder="Where do you want to go?"
              className={`flex-1 outline-none text-sm sm:text-base bg-transparent ${nightMode ? 'text-white placeholder-gray-500' : 'text-gray-900 placeholder-gray-400'
                }`}
              disabled={routeLoading}
            />
            {(searchValue || routeGenerated) && (
              <button
                onClick={() => {
                  if (routeGenerated) {
                    onClearRoute();
                  }
                  setSearchValue('');
                  setShowSuggestions(false);
                }}
                className={`p-1 rounded hover:bg-opacity-80 flex-shrink-0 ${nightMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                  }`}
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>

          {/* Suggestions Dropdown */}
          {showSuggestions && !routeGenerated && (
            <div className={`border-t ${nightMode ? 'border-gray-700' : 'border-gray-100'}`}>
              {suggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelect(suggestion.name)}
                  className={`w-full text-left px-3 sm:px-4 py-2 sm:py-3 flex items-center gap-2 sm:gap-3 transition-colors ${nightMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                    } ${idx === suggestions.length - 1 ? '' : `border-b ${nightMode ? 'border-gray-700' : 'border-gray-100'}`}`}
                >
                  <span className="text-xl sm:text-2xl flex-shrink-0">{suggestion.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className={`text-xs sm:text-sm font-medium truncate ${nightMode ? 'text-white' : 'text-gray-900'
                      }`}>
                      {suggestion.name}
                    </div>
                    <div className="text-xs">
                      <span className={nightMode ? 'text-gray-400' : 'text-gray-500'}>
                        {suggestion.distance}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Leaflet Map */}
      <div style={{ width: '100%', height: '100%', position: 'relative', zIndex: 1 }}>
        <HerRouteMap
          nightMode={nightMode}
          routeGenerated={routeGenerated}
          selectedRoute={selectedRoute}
          allRoutes={allRoutes}
          selectedRouteIndex={selectedRouteIndex}
          onSegmentClick={(segmentId) => {
            onNodeClick(segmentId);
          }}
          onMapReady={(resetFn) => {
            onResetView(resetFn);
          }}
        />
      </div>
    </div>
  );
}
