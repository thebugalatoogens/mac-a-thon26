import express from "express";
import axios from "axios";
import polyline from "@mapbox/polyline";
import { scoreRouteSafety } from "../routing/scoreRouteSafety.js";
import { scoreRouteSegments } from "../routing/scoreRouteSegments.js";

const router = express.Router();

/**
 * POST /api/routes
 * Body: { origin: { lat, lng }, destination: { lat, lng } }
 *
 * 1. Fetches up to 4 walking routes from Google Maps Directions API
 * 2. Scores each route for safety using lighting data from MongoDB
 * 3. Identifies: fastest, safest, balanced, and the optimized recommended route
 * 4. Returns all options to the frontend
 */
router.post("/routes", async (req, res) => {
  try {
    const mapsKey = process.env.GOOGLE_MAPS_KEY;
    if (!mapsKey) {
      return res.status(500).json({ ok: false, error: "Missing GOOGLE_MAPS_KEY" });
    }

    const { origin, destination } = req.body || {};
    if (!origin?.lat || !origin?.lng || !destination?.lat || !destination?.lng) {
      return res.status(400).json({
        ok: false,
        error: "Send origin and destination as { lat, lng }",
      });
    }

    // Fetch walking directions with alternatives from Google Maps
    const gRes = await axios.get(
      "https://maps.googleapis.com/maps/api/directions/json",
      {
        params: {
          origin: `${origin.lat},${origin.lng}`,
          destination: `${destination.lat},${destination.lng}`,
          mode: "walking",
          alternatives: true,
          key: mapsKey,
        },
      }
    );

    if (gRes.data.status !== "OK") {
      return res.status(502).json({
        ok: false,
        status: gRes.data.status,
        error_message: gRes.data.error_message || null,
      });
    }

    // Parse all routes from Google Maps
    const rawRoutes = gRes.data.routes.map((route, i) => {
      const leg = route.legs?.[0];
      const decoded = polyline.decode(route.overview_polyline.points);
      const steps = leg?.steps?.map((step) => ({
        instruction: step.html_instructions?.replace(/<[^>]*>/g, "") || "",
        distance_m: step.distance?.value,
        duration_s: step.duration?.value,
        start: { lat: step.start_location.lat, lng: step.start_location.lng },
        end: { lat: step.end_location.lat, lng: step.end_location.lng },
        polyline: step.polyline?.points,
      }));

      return {
        route_id: `route_${i}`,
        distance_m: leg?.distance?.value,
        duration_s: leg?.duration?.value,
        distance_text: leg?.distance?.text,
        duration_text: leg?.duration?.text,
        polyline: route.overview_polyline.points,
        coords: decoded.map(([lat, lng]) => ({ lat, lng })),
        steps: steps || [],
      };
    });

    // Score every route for overall safety + per-segment breakdown using DB lighting data
    for (const route of rawRoutes) {
      const overallScore = await scoreRouteSafety(route.coords);
      route.safetyScore = Math.round((overallScore || 0.3) * 100);

      // Per-segment safety scoring from database lighting nodes
      const segments = await scoreRouteSegments(route.coords);
      route.segments = segments;

      // Lighting-specific stats from the segment data
      const totalLamps = segments.reduce((sum, s) => sum + s.avgLampCount, 0);
      route.lightingStats = {
        avgLightingScore: Math.round(
          (segments.reduce((sum, s) => sum + s.lightingScore, 0) / segments.length) * 100
        ),
        totalLamps: Math.round(totalLamps),
        darkSegments: segments.filter((s) => s.lightingScore < 0.4).length,
        wellLitSegments: segments.filter((s) => s.lightingScore >= 0.7).length,
      };
    }

    // --- ROUTE SELECTION LOGIC ---

    // 1. FASTEST: Sort by duration ascending
    const byDuration = [...rawRoutes].sort((a, b) => a.duration_s - b.duration_s);
    const fastest = byDuration[0];
    fastest.label = "Fastest";
    fastest.tag = "fastest";

    // 2. SAFEST: Sort by safetyScore descending (uses lighting DB data)
    const bySafety = [...rawRoutes].sort((a, b) => b.safetyScore - a.safetyScore);
    const safest = bySafety[0];
    safest.label = "Safest";
    safest.tag = "safest";

    // 3. BALANCED: Weighted combination (40% speed, 60% safety)
    const maxDuration = Math.max(...rawRoutes.map((r) => r.duration_s));
    const minDuration = Math.min(...rawRoutes.map((r) => r.duration_s));
    const durationRange = maxDuration - minDuration || 1;

    const withBalanced = rawRoutes.map((r) => {
      const speedScore = 1 - (r.duration_s - minDuration) / durationRange;
      const safetyNorm = r.safetyScore / 100;
      return {
        ...r,
        balancedScore: speedScore * 0.4 + safetyNorm * 0.6,
      };
    });
    withBalanced.sort((a, b) => b.balancedScore - a.balancedScore);
    const balanced = withBalanced[0];
    balanced.label = "Balanced";
    balanced.tag = "balanced";

    // 4. RECOMMENDED: Take the fastest route, then re-evaluate using lighting data.
    //    If the fastest has poor safety, recommend the safest instead.
    //    If the fastest is already safe, recommend it. Otherwise pick balanced.
    let recommended;
    if (fastest.safetyScore >= 70) {
      // Fastest is safe enough, recommend it
      recommended = { ...fastest };
    } else if (safest.route_id !== fastest.route_id && safest.safetyScore >= 60) {
      // Fastest is unsafe, recommend the safest
      recommended = { ...safest };
    } else {
      // Fall back to balanced
      recommended = { ...balanced };
    }
    recommended.label = "Recommended";
    recommended.tag = "recommended";

    // Build the 4 options (deduplicate by route_id, fill up to 4)
    const optionsMap = new Map();
    for (const opt of [recommended, fastest, safest, balanced]) {
      if (!optionsMap.has(opt.route_id)) {
        optionsMap.set(opt.route_id, opt);
      }
    }
    // If Google only returned < 4 routes, some options share the same route_id.
    // Add remaining raw routes to fill up to 4 if possible.
    for (const r of rawRoutes) {
      if (optionsMap.size >= 4) break;
      if (!optionsMap.has(r.route_id)) {
        r.label = "Alternative";
        r.tag = "alternative";
        optionsMap.set(r.route_id, r);
      }
    }

    const allOptions = Array.from(optionsMap.values());

    // Ensure labels are applied even on shared routes
    const labeledOptions = allOptions.map((opt, i) => {
      if (!opt.label) {
        opt.label = `Option ${i + 1}`;
        opt.tag = "alternative";
      }
      return opt;
    });

    res.json({
      ok: true,
      recommended,
      options: labeledOptions,
      meta: {
        candidateCount: rawRoutes.length,
        fastestId: fastest.route_id,
        safestId: safest.route_id,
        recommendedId: recommended.route_id,
      },
    });
  } catch (e) {
    console.error("Route computation error:", e);
    res.status(500).json({ ok: false, error: String(e.message || e) });
  }
});

export default router;
