/**
 * Stroke Processor
 * Utilities for processing, normalizing, and transforming stroke data
 */

class StrokeProcessor {
  /**
   * Normalize stroke coordinates to a consistent coordinate system (0-1 range)
   * Supports optional capture metrics so ascender/descender proportions are preserved
   * @param {Array} strokes - Array of stroke objects
   * @param {Object} bounds - Original bounding box
   * @param {Object} [metrics] - Optional metrics {ascender, descender, baseline, xHeight, emHeight, captureWidth}
   * @returns {Array} Normalized strokes
   */
  static normalize(strokes, bounds, metrics) {
    if (!strokes || strokes.length === 0) return [];

    const emHeight = metrics?.emHeight || bounds.height || 1;
    const originY = metrics?.ascender ?? bounds.minY;
    const originX = bounds.minX;

    // Use emHeight for both axes so widths keep the same proportion as heights across glyphs
    const scale = emHeight || 1;

    return strokes.map((stroke) => ({
      ...stroke,
      points: stroke.points.map((point) => ({
        x: (point.x - originX) / scale,
        y: (point.y - originY) / scale,
        pressure: point.pressure || 0.5,
        timestamp: point.timestamp || 0,
      })),
    }));
  }

  /**
   * Calculate bounding box for a set of strokes
   * @param {Array} strokes - Array of stroke objects
   * @returns {Object} Bounding box {minX, minY, maxX, maxY, width, height}
   */
  static calculateBounds(strokes) {
    if (!strokes || strokes.length === 0) {
      return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    strokes.forEach((stroke) => {
      stroke.points.forEach((point) => {
        minX = Math.min(minX, point.x);
        minY = Math.min(minY, point.y);
        maxX = Math.max(maxX, point.x);
        maxY = Math.max(maxY, point.y);
      });
    });

    return {
      minX,
      minY,
      maxX,
      maxY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  /**
   * Simplify stroke by reducing point density using Douglas-Peucker algorithm
   * @param {Array} points - Array of points
   * @param {number} tolerance - Simplification tolerance (default: 1.0)
   * @returns {Array} Simplified points
   */
  static simplifyStroke(points, tolerance = 1.0) {
    if (points.length <= 2) return points;

    // Douglas-Peucker algorithm
    const simplify = (pts, tol) => {
      if (pts.length <= 2) return pts;

      // Find point with maximum distance from line between first and last
      let maxDist = 0;
      let maxIndex = 0;
      const first = pts[0];
      const last = pts[pts.length - 1];

      for (let i = 1; i < pts.length - 1; i++) {
        const dist = StrokeProcessor.perpendicularDistance(pts[i], first, last);
        if (dist > maxDist) {
          maxDist = dist;
          maxIndex = i;
        }
      }

      // If max distance is greater than tolerance, recursively simplify
      if (maxDist > tol) {
        const left = simplify(pts.slice(0, maxIndex + 1), tol);
        const right = simplify(pts.slice(maxIndex), tol);
        return left.slice(0, -1).concat(right);
      } else {
        return [first, last];
      }
    };

    return simplify(points, tolerance);
  }

  /**
   * Calculate perpendicular distance from point to line
   * @param {Object} point - Point object {x, y}
   * @param {Object} lineStart - Line start point
   * @param {Object} lineEnd - Line end point
   * @returns {number} Distance
   */
  static perpendicularDistance(point, lineStart, lineEnd) {
    const dx = lineEnd.x - lineStart.x;
    const dy = lineEnd.y - lineStart.y;

    if (dx === 0 && dy === 0) {
      return Math.hypot(point.x - lineStart.x, point.y - lineStart.y);
    }

    const t =
      ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) /
      (dx * dx + dy * dy);

    let closestX, closestY;
    if (t < 0) {
      closestX = lineStart.x;
      closestY = lineStart.y;
    } else if (t > 1) {
      closestX = lineEnd.x;
      closestY = lineEnd.y;
    } else {
      closestX = lineStart.x + t * dx;
      closestY = lineStart.y + t * dy;
    }

    return Math.hypot(point.x - closestX, point.y - closestY);
  }

  /**
   * Smooth stroke using moving average
   * @param {Array} points - Array of points
   * @param {number} windowSize - Window size for smoothing (default: 3)
   * @returns {Array} Smoothed points
   */
  static smoothStroke(points, windowSize = 3) {
    if (points.length < windowSize) return points;

    const smoothed = [];
    const halfWindow = Math.floor(windowSize / 2);

    for (let i = 0; i < points.length; i++) {
      let sumX = 0,
        sumY = 0,
        count = 0;

      for (
        let j = Math.max(0, i - halfWindow);
        j <= Math.min(points.length - 1, i + halfWindow);
        j++
      ) {
        sumX += points[j].x;
        sumY += points[j].y;
        count++;
      }

      smoothed.push({
        x: sumX / count,
        y: sumY / count,
        pressure: points[i].pressure || 0.5,
        timestamp: points[i].timestamp || 0,
      });
    }

    return smoothed;
  }

  /**
   * Apply natural variation to strokes for realistic appearance
   * @param {Array} strokes - Array of stroke objects
   * @param {Object} config - Variation configuration
   * @returns {Array} Varied strokes
   */
  static applyVariation(strokes, config = {}) {
    const {
      positionJitter = 0.02, // Position variation (normalized units)
      rotationRange = 3, // Rotation in degrees
      scaleRange = 0.05, // Scale variation (0.05 = ±5%)
    } = config;

    // Random variation values
    const rotation =
      (Math.random() - 0.5) * 2 * rotationRange * (Math.PI / 180);
    const scale = 1 + (Math.random() - 0.5) * 2 * scaleRange;
    const offsetX = (Math.random() - 0.5) * 2 * positionJitter;
    const offsetY = (Math.random() - 0.5) * 2 * positionJitter;

    // Calculate center point for rotation
    const bounds = this.calculateBounds(strokes);
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;

    return strokes.map((stroke) => ({
      ...stroke,
      points: stroke.points.map((point) => {
        // Translate to origin
        let x = point.x - centerX;
        let y = point.y - centerY;

        // Apply scale
        x *= scale;
        y *= scale;

        // Apply rotation
        const cos = Math.cos(rotation);
        const sin = Math.sin(rotation);
        const rotatedX = x * cos - y * sin;
        const rotatedY = x * sin + y * cos;

        // Translate back and add offset
        return {
          x: rotatedX + centerX + offsetX,
          y: rotatedY + centerY + offsetY,
          pressure: point.pressure || 0.5,
          timestamp: point.timestamp || 0,
        };
      }),
    }));
  }

  /**
   * Extract entry/exit connector points for cursive joining.
   * Strokes should already be normalized to 0-1 space.
   * @param {Array} strokes - Normalized strokes
   * @returns {Object|null} {entry:{x,y}, exit:{x,y}, width} (width is glyph width in normalized units)
   */
  static extractConnectors(strokes) {
    if (!strokes || strokes.length === 0) return null;

    const firstStroke = strokes[0];
    const lastStroke = strokes[strokes.length - 1];
    if (!firstStroke.points?.length || !lastStroke.points?.length) return null;

    const entry = firstStroke.points[0];
    const exit = lastStroke.points[lastStroke.points.length - 1];
    const bounds = StrokeProcessor.calculateBounds(strokes);

    return {
      entry: { x: entry.x, y: entry.y },
      exit: { x: exit.x, y: exit.y },
      width: bounds.width || 0,
    };
  }

  /**
   * Calculate stroke metrics
   * @param {Object} stroke - Stroke object
   * @returns {Object} Metrics {length, duration, avgSpeed}
   */
  static calculateMetrics(stroke) {
    if (!stroke.points || stroke.points.length < 2) {
      return { length: 0, duration: 0, avgSpeed: 0 };
    }

    let length = 0;
    for (let i = 1; i < stroke.points.length; i++) {
      const dx = stroke.points[i].x - stroke.points[i - 1].x;
      const dy = stroke.points[i].y - stroke.points[i - 1].y;
      length += Math.hypot(dx, dy);
    }

    const duration =
      stroke.points[stroke.points.length - 1].timestamp -
      stroke.points[0].timestamp;
    const avgSpeed = duration > 0 ? length / duration : 0;

    return { length, duration, avgSpeed };
  }

  /**
   * Map pressure to stroke width
   * @param {number} pressure - Pressure value (0-1)
   * @param {number} minWidth - Minimum stroke width
   * @param {number} maxWidth - Maximum stroke width
   * @returns {number} Stroke width
   */
  static mapPressureToWidth(pressure, minWidth = 1, maxWidth = 3) {
    const normalizedPressure = Math.max(0, Math.min(1, pressure));
    return minWidth + (maxWidth - minWidth) * normalizedPressure;
  }

  /**
   * Detect baseline from strokes (useful for text alignment)
   * @param {Array} strokes - Array of stroke objects
   * @returns {number} Baseline Y coordinate
   */
  static detectBaseline(strokes) {
    if (!strokes || strokes.length === 0) return 0;

    // Calculate average of lowest points in each stroke
    let sumY = 0;
    strokes.forEach((stroke) => {
      const maxY = Math.max(...stroke.points.map((p) => p.y));
      sumY += maxY;
    });

    return sumY / strokes.length;
  }
}

// Export for browser environment
if (typeof window !== "undefined") {
  window.StrokeProcessor = StrokeProcessor;
}
