/**
 * SVG Generator
 * Converts stroke data to SVG markup
 */

class SVGGenerator {
    constructor(config = {}) {
        this.config = {
            strokeColor: config.strokeColor || '#000000',
            backgroundColor: config.backgroundColor || 'transparent',
            strokeLinecap: config.strokeLinecap || 'round',
            strokeLinejoin: config.strokeLinejoin || 'round',
            minStrokeWidth: config.minStrokeWidth || 1.5,
            maxStrokeWidth: config.maxStrokeWidth || 3,
            smoothing: config.smoothing !== false,
            ...config
        };
    }

    /**
     * Convert strokes to SVG path data string
     * @param {Array} strokes - Array of stroke objects
     * @param {number} scale - Scale factor for coordinates
     * @returns {string} SVG path data (d attribute)
     */
    strokesToPath(strokes, scale = 1) {
        if (!strokes || strokes.length === 0) return '';

        let pathData = '';

        strokes.forEach(stroke => {
            if (!stroke.points || stroke.points.length === 0) return;

            const points = stroke.points;

            // Move to first point
            pathData += `M ${points[0].x * scale} ${points[0].y * scale} `;

            if (this.config.smoothing && points.length > 2) {
                // Use quadratic bezier curves for smoothing
                for (let i = 1; i < points.length - 1; i++) {
                    const curr = points[i];
                    const next = points[i + 1];
                    const cpX = curr.x * scale;
                    const cpY = curr.y * scale;
                    const endX = (curr.x + next.x) / 2 * scale;
                    const endY = (curr.y + next.y) / 2 * scale;
                    pathData += `Q ${cpX} ${cpY}, ${endX} ${endY} `;
                }
                // Line to last point
                const last = points[points.length - 1];
                pathData += `L ${last.x * scale} ${last.y * scale} `;
            } else {
                // Simple lines
                for (let i = 1; i < points.length; i++) {
                    pathData += `L ${points[i].x * scale} ${points[i].y * scale} `;
                }
            }
        });

        return pathData.trim();
    }

    /**
     * Convert strokes to SVG path data with variable stroke width based on pressure
     * @param {Array} strokes - Array of stroke objects
     * @param {number} scale - Scale factor
     * @returns {Array} Array of path objects with individual widths
     */
    strokesToPathsWithPressure(strokes, scale = 1) {
        if (!strokes || strokes.length === 0) return [];

        const paths = [];

        strokes.forEach(stroke => {
            if (!stroke.points || stroke.points.length === 0) return;

            // Calculate average pressure for this stroke
            const avgPressure = stroke.points.reduce((sum, p) => sum + (p.pressure || 0.5), 0) / stroke.points.length;
            const strokeWidth = StrokeProcessor.mapPressureToWidth(
                avgPressure,
                this.config.minStrokeWidth,
                this.config.maxStrokeWidth
            );

            const pathData = this.strokeToPathData(stroke.points, scale);
            
            paths.push({
                d: pathData,
                width: strokeWidth
            });
        });

        return paths;
    }

    /**
     * Convert single stroke points to path data
     * @param {Array} points - Array of points
     * @param {number} scale - Scale factor
     * @returns {string} Path data string
     */
    strokeToPathData(points, scale = 1) {
        if (!points || points.length === 0) return '';

        let pathData = `M ${points[0].x * scale} ${points[0].y * scale} `;

        if (this.config.smoothing && points.length > 2) {
            for (let i = 1; i < points.length - 1; i++) {
                const curr = points[i];
                const next = points[i + 1];
                const cpX = curr.x * scale;
                const cpY = curr.y * scale;
                const endX = (curr.x + next.x) / 2 * scale;
                const endY = (curr.y + next.y) / 2 * scale;
                pathData += `Q ${cpX} ${cpY}, ${endX} ${endY} `;
            }
            const last = points[points.length - 1];
            pathData += `L ${last.x * scale} ${last.y * scale}`;
        } else {
            for (let i = 1; i < points.length; i++) {
                pathData += `L ${points[i].x * scale} ${points[i].y * scale} `;
            }
        }

        return pathData.trim();
    }

    /**
     * Create complete SVG document from character strokes
     * @param {Array} strokes - Array of stroke objects
     * @param {Object} options - SVG options {width, height, viewBox}
     * @returns {string} Complete SVG markup
     */
    generateSVG(strokes, options = {}) {
        const {
            width = 800,
            height = 600,
            viewBox = null
        } = options;

        const vb = viewBox || `0 0 ${width} ${height}`;
        const paths = this.strokesToPathsWithPressure(strokes, 1);

        let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${vb}">\n`;
        
        // Add metadata
        svg += `  <metadata>\n`;
        svg += `    <generator>Handwriting SVG Generator</generator>\n`;
        svg += `    <created>${new Date().toISOString()}</created>\n`;
        svg += `  </metadata>\n`;

        // Add background if specified
        if (this.config.backgroundColor !== 'transparent') {
            svg += `  <rect width="100%" height="100%" fill="${this.config.backgroundColor}"/>\n`;
        }

        // Add paths
        svg += `  <g fill="none" stroke="${this.config.strokeColor}" stroke-linecap="${this.config.strokeLinecap}" stroke-linejoin="${this.config.strokeLinejoin}">\n`;
        paths.forEach(path => {
            svg += `    <path d="${path.d}" stroke-width="${path.width}"/>\n`;
        });
        svg += `  </g>\n`;
        
        svg += `</svg>`;

        return svg;
    }

    /**
     * Create SVG group element for a character
     * @param {Array} strokes - Character strokes
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} size - Font size
     * @returns {string} SVG group markup
     */
    createCharacterGroup(strokes, x, y, size) {
        const paths = this.strokesToPathsWithPressure(strokes, size);
        
        let group = `<g transform="translate(${x}, ${y})" fill="none" stroke="${this.config.strokeColor}" stroke-linecap="${this.config.strokeLinecap}" stroke-linejoin="${this.config.strokeLinejoin}">\n`;
        
        paths.forEach(path => {
            group += `  <path d="${path.d}" stroke-width="${path.width}"/>\n`;
        });
        
        group += `</g>\n`;
        
        return group;
    }

    /**
     * Optimize path data by reducing precision
     * @param {string} pathData - Path data string
     * @param {number} precision - Decimal places (default: 2)
     * @returns {string} Optimized path data
     */
    optimizePathData(pathData, precision = 2) {
        const multiplier = Math.pow(10, precision);
        return pathData.replace(/[\d.]+/g, match => {
            const num = parseFloat(match);
            return (Math.round(num * multiplier) / multiplier).toString();
        });
    }

    /**
     * Update configuration
     * @param {Object} config - New configuration options
     */
    updateConfig(config) {
        this.config = { ...this.config, ...config };
    }
}

// Export for browser environment
if (typeof window !== 'undefined') {
    window.SVGGenerator = SVGGenerator;
}
