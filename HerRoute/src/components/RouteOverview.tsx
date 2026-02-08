import { Navigation, Clock, MapPin, AlertTriangle, Sparkles, RefreshCw, Shield, Zap, Scale, Star as StarIcon, Loader2 } from 'lucide-react';
import { SafetyCard } from './SafetyCard';
import { SafetyBreakdown } from './SafetyBreakdown';
import { ReportIssueModal } from './ReportIssueModal';
import { EndNavigationModal } from './EndNavigationModal';
import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import type { RouteOption } from '../types/route';

interface RouteOverviewProps {
  nightMode: boolean;
  selectedRoute: RouteOption | null;
  routeOptions: RouteOption[];
  selectedRouteIndex: number;
  onSelectRoute: (index: number) => void;
  onFindSaferRoute: () => void;
  routeLoading: boolean;
  routeError: string | null;
  routeMeta: { candidateCount: number; fastestId: string; safestId: string; recommendedId: string } | null;
}

const TAG_ICONS: Record<string, any> = {
  recommended: StarIcon,
  fastest: Zap,
  safest: Shield,
  balanced: Scale,
  alternative: Navigation,
};

const TAG_COLORS: Record<string, string> = {
  recommended: 'bg-pink-100 text-pink-700 border-pink-200',
  fastest: 'bg-blue-100 text-blue-700 border-blue-200',
  safest: 'bg-green-100 text-green-700 border-green-200',
  balanced: 'bg-purple-100 text-purple-700 border-purple-200',
  alternative: 'bg-gray-100 text-gray-700 border-gray-200',
};

const TAG_COLORS_DARK: Record<string, string> = {
  recommended: 'bg-pink-900/40 text-pink-300 border-pink-700',
  fastest: 'bg-blue-900/40 text-blue-300 border-blue-700',
  safest: 'bg-green-900/40 text-green-300 border-green-700',
  balanced: 'bg-purple-900/40 text-purple-300 border-purple-700',
  alternative: 'bg-gray-700 text-gray-300 border-gray-600',
};

function getSafetyLabel(score: number): { label: string; color: string } {
  if (score >= 80) return { label: 'SAFE', color: 'green' };
  if (score >= 60) return { label: 'MODERATE', color: 'yellow' };
  if (score >= 40) return { label: 'CAUTION', color: 'orange' };
  return { label: 'UNSAFE', color: 'red' };
}

function formatDuration(seconds: number): string {
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  return `${hrs}h ${remMins}m`;
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${meters} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export function RouteOverview({
  nightMode,
  selectedRoute,
  routeOptions,
  selectedRouteIndex,
  onSelectRoute,
  onFindSaferRoute,
  routeLoading,
  routeError,
  routeMeta,
}: RouteOverviewProps) {
  const [navigationStatus, setNavigationStatus] = useState<'idle' | 'navigating'>('idle');
  const [showReportModal, setShowReportModal] = useState(false);
  const [showEndNavModal, setShowEndNavModal] = useState(false);

  const handleStartNavigation = () => {
    setNavigationStatus('navigating');
  };

  const handleEndNavigation = () => {
    setShowEndNavModal(true);
  };

  const handleCompleteNavigation = () => {
    setNavigationStatus('idle');
  };

  const handleReportIssue = (issue: string) => {
    console.log('Reported issue:', issue);
    setShowReportModal(false);
  };

  // Loading state
  if (routeLoading) {
    return (
      <div className="px-4 sm:px-6 py-8 flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-8 h-8 text-pink-500 animate-spin" />
        <p className={`text-sm ${nightMode ? 'text-gray-400' : 'text-gray-500'}`}>
          Calculating safest routes using lighting data...
        </p>
      </div>
    );
  }

  // Error state
  if (routeError) {
    return (
      <div className="px-4 sm:px-6 py-8">
        <div className={`p-4 rounded-lg border ${nightMode ? 'bg-red-900/30 border-red-700 text-red-300' : 'bg-red-50 border-red-200 text-red-700'}`}>
          <AlertTriangle className="w-5 h-5 mb-2" />
          <p className="text-sm font-medium">Could not compute routes</p>
          <p className="text-xs mt-1">{routeError}</p>
        </div>
      </div>
    );
  }

  if (!selectedRoute) return null;

  const safety = getSafetyLabel(selectedRoute.safetyScore);
  const isSafest = routeMeta && selectedRoute.route_id === routeMeta.safestId;

  // Build route nodes for EndNavigationModal from segment data
  const routeNodes = selectedRoute.segments.map((seg, i) => ({
    id: i + 1,
    x: (i / selectedRoute.segments.length) * 80 + 10,
    y: 20 + (i % 2 === 0 ? i * 5 : i * 7),
    safety: seg.safetyScore,
    color: seg.safetyScore >= 70 ? '#22C55E' : seg.safetyScore >= 50 ? '#FACC15' : '#FB923C',
  }));

  return (
    <>
      <div className="px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Route Title */}
        <div>
          <h2 className={`text-xs sm:text-sm font-semibold ${nightMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wide mb-2`}>
            ROUTE OVERVIEW
          </h2>
          <div className={`flex items-center gap-2 ${nightMode ? 'text-white' : 'text-gray-900'} text-sm sm:text-base`}>
            <span className="font-medium truncate">McMaster University</span>
            <span className={`flex-shrink-0 ${nightMode ? 'text-gray-500' : 'text-gray-400'}`}>&rarr;</span>
            <span className="font-medium truncate">Destination</span>
          </div>
        </div>

        {/* Route Options Selector (up to 4 options) */}
        <div>
          <h3 className={`text-xs font-semibold ${nightMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wide mb-3`}>
            {routeOptions.length} ROUTE OPTIONS
          </h3>
          <div className="space-y-2">
            {routeOptions.map((opt, idx) => {
              const isSelected = idx === selectedRouteIndex;
              const Icon = TAG_ICONS[opt.tag] || Navigation;
              const tagColor = nightMode ? TAG_COLORS_DARK[opt.tag] : TAG_COLORS[opt.tag];

              return (
                <button
                  key={opt.route_id}
                  onClick={() => onSelectRoute(idx)}
                  className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                    isSelected
                      ? nightMode
                        ? 'border-pink-500 bg-pink-900/20'
                        : 'border-pink-500 bg-pink-50'
                      : nightMode
                        ? 'border-gray-700 bg-gray-800 hover:border-gray-600'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${tagColor}`}>
                        <Icon className="w-3 h-3" />
                        {opt.label}
                      </span>
                    </div>
                    <span className={`text-xs font-bold ${
                      opt.safetyScore >= 70 ? 'text-green-500' : opt.safetyScore >= 50 ? 'text-yellow-500' : 'text-orange-500'
                    }`}>
                      {opt.safetyScore}/100
                    </span>
                  </div>
                  <div className={`flex items-center gap-3 text-xs ${nightMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    <span>{opt.duration_text || formatDuration(opt.duration_s)}</span>
                    <span>&middot;</span>
                    <span>{opt.distance_text || formatDistance(opt.distance_m)}</span>
                    <span>&middot;</span>
                    <span>{opt.lightingStats.wellLitSegments}/{opt.segments.length} well-lit</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Safety Score Card */}
        <SafetyCard
          score={selectedRoute.safetyScore}
          label={safety.label}
          context={
            isSafest
              ? 'Safest available route'
              : `Safety ranked ${routeOptions.findIndex(o => o.route_id === routeMeta?.safestId) + 1 || '?'} of ${routeOptions.length}`
          }
          color={safety.color}
          nightMode={nightMode}
        />

        {/* Route Stats */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          <div className={`text-center p-2 sm:p-3 ${nightMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg`}>
            <Clock className={`w-4 h-4 sm:w-5 sm:h-5 ${nightMode ? 'text-gray-300' : 'text-gray-600'} mx-auto mb-1`} />
            <div className={`text-base sm:text-lg font-bold ${nightMode ? 'text-white' : 'text-gray-900'}`}>
              {selectedRoute.duration_text || formatDuration(selectedRoute.duration_s)}
            </div>
            <div className={`text-xs ${nightMode ? 'text-gray-400' : 'text-gray-500'}`}>Duration</div>
          </div>
          <div className={`text-center p-2 sm:p-3 ${nightMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg`}>
            <MapPin className={`w-4 h-4 sm:w-5 sm:h-5 ${nightMode ? 'text-gray-300' : 'text-gray-600'} mx-auto mb-1`} />
            <div className={`text-base sm:text-lg font-bold ${nightMode ? 'text-white' : 'text-gray-900'}`}>
              {selectedRoute.distance_text || formatDistance(selectedRoute.distance_m)}
            </div>
            <div className={`text-xs ${nightMode ? 'text-gray-400' : 'text-gray-500'}`}>Distance</div>
          </div>
          <div className={`text-center p-2 sm:p-3 ${nightMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg`}>
            <Navigation className={`w-4 h-4 sm:w-5 sm:h-5 ${nightMode ? 'text-gray-300' : 'text-gray-600'} mx-auto mb-1`} />
            <div className={`text-base sm:text-lg font-bold ${nightMode ? 'text-white' : 'text-gray-900'}`}>
              {selectedRoute.segments.length}
            </div>
            <div className={`text-xs ${nightMode ? 'text-gray-400' : 'text-gray-500'}`}>Segments</div>
          </div>
        </div>

        {/* Safety Breakdown - uses real data */}
        <div>
          <h3 className={`font-semibold ${nightMode ? 'text-white' : 'text-gray-900'} mb-4`}>Safety Breakdown</h3>
          <SafetyBreakdown nightMode={nightMode} lightingStats={selectedRoute.lightingStats} safetyScore={selectedRoute.safetyScore} />
        </div>

        {/* Things to Note */}
        {selectedRoute.lightingStats.darkSegments > 0 && (
          <div className={`${nightMode ? 'bg-yellow-900/30 border-yellow-700' : 'bg-yellow-50 border-yellow-200'} border rounded-lg p-4`}>
            <div className="flex items-start gap-2 mb-2">
              <AlertTriangle className={`w-5 h-5 ${nightMode ? 'text-yellow-400' : 'text-yellow-600'} mt-0.5`} />
              <h4 className={`font-semibold ${nightMode ? 'text-yellow-300' : 'text-yellow-900'}`}>Things to Note</h4>
            </div>
            <ul className={`space-y-1 text-sm ${nightMode ? 'text-yellow-200' : 'text-yellow-800'} ml-7`}>
              <li>- {selectedRoute.lightingStats.darkSegments} poorly lit segment{selectedRoute.lightingStats.darkSegments > 1 ? 's' : ''} on this route</li>
              <li>- Average lighting coverage: {selectedRoute.lightingStats.avgLightingScore}%</li>
              {selectedRoute.lightingStats.totalLamps < 5 && (
                <li>- Limited street lamp coverage detected</li>
              )}
            </ul>
          </div>
        )}

        {/* Route Highlights */}
        {selectedRoute.lightingStats.wellLitSegments > 0 && (
          <div className={`${nightMode ? 'bg-green-900/30 border-green-700' : 'bg-green-50 border-green-200'} border rounded-lg p-4`}>
            <div className="flex items-start gap-2 mb-2">
              <Sparkles className={`w-5 h-5 ${nightMode ? 'text-green-400' : 'text-green-600'} mt-0.5`} />
              <h4 className={`font-semibold ${nightMode ? 'text-green-300' : 'text-green-900'}`}>Route Highlights</h4>
            </div>
            <ul className={`space-y-1 text-sm ${nightMode ? 'text-green-200' : 'text-green-800'} ml-7`}>
              <li>+ {selectedRoute.lightingStats.wellLitSegments} well-lit segment{selectedRoute.lightingStats.wellLitSegments > 1 ? 's' : ''}</li>
              <li>+ {selectedRoute.lightingStats.totalLamps} street lamps along route</li>
              {selectedRoute.safetyScore >= 70 && <li>+ High overall safety score from database</li>}
            </ul>
          </div>
        )}

        {/* Action Buttons */}
        {navigationStatus === 'idle' ? (
          <button
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
            onClick={handleStartNavigation}
          >
            <Navigation className="w-5 h-5" />
            Start Navigation
          </button>
        ) : (
          <button
            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors animate-pulse"
            onClick={handleEndNavigation}
          >
            <Navigation className="w-5 h-5" />
            End Navigation
          </button>
        )}

        {!isSafest && (
          <button
            className="w-full border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50 font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
            onClick={onFindSaferRoute}
          >
            <RefreshCw className="w-5 h-5" />
            Find Safer Route
          </button>
        )}

        {/* Additional Links */}
        <div className={`space-y-2 pt-2 ${nightMode ? 'border-gray-700' : 'border-gray-200'} border-t`}>
          <button className="w-full text-left text-sm text-indigo-600 hover:text-indigo-700 font-medium py-2">
            View Segment Details
          </button>
          <button className="w-full text-left text-sm text-red-600 hover:text-red-700 font-medium py-2" onClick={() => setShowReportModal(true)}>
            Report Issue on Route
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showReportModal && (
          <ReportIssueModal
            nightMode={nightMode}
            onClose={() => setShowReportModal(false)}
            onSubmit={handleReportIssue}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showEndNavModal && (
          <EndNavigationModal
            nightMode={nightMode}
            onClose={() => setShowEndNavModal(false)}
            onComplete={handleCompleteNavigation}
            routeNodes={routeNodes}
          />
        )}
      </AnimatePresence>
    </>
  );
}
