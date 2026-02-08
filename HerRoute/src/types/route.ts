export interface Coord {
  lat: number;
  lng: number;
}

export interface RouteSegment {
  segmentIndex: number;
  startCoord: Coord;
  endCoord: Coord;
  coords: Coord[];
  safetyScore: number;
  lightingScore: number;
  avgLampCount: number;
  pointCount: number;
}

export interface LightingStats {
  avgLightingScore: number;
  totalLamps: number;
  darkSegments: number;
  wellLitSegments: number;
}

export interface RouteOption {
  route_id: string;
  label: string;
  tag: "recommended" | "fastest" | "safest" | "balanced" | "alternative";
  distance_m: number;
  duration_s: number;
  distance_text: string;
  duration_text: string;
  polyline: string;
  coords: Coord[];
  safetyScore: number;
  segments: RouteSegment[];
  lightingStats: LightingStats;
  steps: RouteStep[];
  balancedScore?: number;
}

export interface RouteStep {
  instruction: string;
  distance_m: number;
  duration_s: number;
  start: Coord;
  end: Coord;
  polyline: string;
}

export interface RoutesResponse {
  ok: boolean;
  recommended: RouteOption;
  options: RouteOption[];
  meta: {
    candidateCount: number;
    fastestId: string;
    safestId: string;
    recommendedId: string;
  };
  error?: string;
}
