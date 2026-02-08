import ngeohash from "ngeohash";
import SafetyNode from "../models/safetyNode.js";

/**
 * Breaks a route into segments and scores each one using lighting data from MongoDB.
 * Returns an array of segments with per-segment safety details derived from the database.
 */
export async function scoreRouteSegments(coords) {
  if (!coords || coords.length < 2) return [];

  // Split coords into segments of ~5 points each
  const segmentSize = Math.max(3, Math.ceil(coords.length / Math.min(coords.length, 8)));
  const segments = [];

  for (let i = 0; i < coords.length; i += segmentSize) {
    const slice = coords.slice(i, Math.min(i + segmentSize + 1, coords.length));
    if (slice.length < 2) continue;

    // Query SafetyNode DB for each point in this segment
    let totalSafety = 0;
    let totalLighting = 0;
    let totalLamps = 0;
    let pointCount = 0;

    for (const point of slice) {
      const hash = ngeohash.encode(point.lat, point.lng, 7);
      const hashes = [hash, ...ngeohash.neighbors(hash)];

      const nodes = await SafetyNode.find({ geohash: { $in: hashes } }).lean();

      if (nodes.length > 0) {
        const avgSafety = nodes.reduce((s, n) => s + n.safetyScore, 0) / nodes.length;
        const avgLighting = nodes.reduce((s, n) => s + n.lightingScore, 0) / nodes.length;
        const avgLamps = nodes.reduce((s, n) => s + n.lampCount, 0) / nodes.length;

        totalSafety += avgSafety;
        totalLighting += avgLighting;
        totalLamps += avgLamps;
      } else {
        totalSafety += 0.3;
        totalLighting += 0.1;
        totalLamps += 0;
      }
      pointCount++;
    }

    const avgSafetyScore = pointCount > 0 ? totalSafety / pointCount : 0.3;
    const avgLightingScore = pointCount > 0 ? totalLighting / pointCount : 0.1;
    const avgLampCount = pointCount > 0 ? totalLamps / pointCount : 0;

    segments.push({
      segmentIndex: segments.length,
      startCoord: slice[0],
      endCoord: slice[slice.length - 1],
      coords: slice,
      safetyScore: Math.round(avgSafetyScore * 100),
      lightingScore: avgLightingScore,
      avgLampCount,
      pointCount,
    });
  }

  return segments;
}
