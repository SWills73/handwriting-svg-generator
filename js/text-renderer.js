/**
 * Text Renderer
 * Renders text using captured handwriting as SVG
 */

// Global state
let fontData = null;
let svgGenerator = null;
let renderedSVG = "";

// Configuration
const MIN_STROKE_WIDTH = 1.5;
const MAX_STROKE_WIDTH = 3;
let config = {
  fontSize: 60,
  letterSpacing: 5,
  lineHeight: 1.5,
  variation: 2,
  connectCursive: true,
  strokeColor: "#000000",
};

// Initialize on page load
document.addEventListener("DOMContentLoaded", () => {
  initializeRenderer();
});

function initializeRenderer() {
  fontData = new FontData();
  svgGenerator = new SVGGenerator({
    strokeColor: config.strokeColor,
    minStrokeWidth: 1.5,
    maxStrokeWidth: 3,
  });

  // Try to load from localStorage
  if (fontData.loadFromLocalStorage()) {
    updateDataStatus(true);
  }

  setupUI();
}

function setupUI() {
  // Load data button
  document.getElementById("loadData").addEventListener("click", () => {
    document.getElementById("dataFileInput").click();
  });

  document
    .getElementById("dataFileInput")
    .addEventListener("change", handleDataLoad);

  // Text input
  const textInput = document.getElementById("textInput");
  textInput.addEventListener("input", () => {
    // Auto-render could be added here
  });

  // Font size slider
  const fontSizeSlider = document.getElementById("fontSize");
  fontSizeSlider.addEventListener("input", (e) => {
    config.fontSize = parseInt(e.target.value);
    document.getElementById("fontSizeValue").textContent = config.fontSize;
  });

  // Letter spacing slider
  const letterSpacingSlider = document.getElementById("letterSpacing");
  letterSpacingSlider.addEventListener("input", (e) => {
    config.letterSpacing = parseInt(e.target.value);
    document.getElementById("letterSpacingValue").textContent =
      config.letterSpacing;
  });

  // Line height slider
  const lineHeightSlider = document.getElementById("lineHeight");
  lineHeightSlider.addEventListener("input", (e) => {
    config.lineHeight = parseFloat(e.target.value);
    document.getElementById("lineHeightValue").textContent = config.lineHeight;
  });

  // Variation slider
  const variationSlider = document.getElementById("variation");
  variationSlider.addEventListener("input", (e) => {
    config.variation = parseInt(e.target.value);
    document.getElementById("variationValue").textContent = config.variation;
  });

  // Connect cursive checkbox
  document.getElementById("connectCursive").addEventListener("change", (e) => {
    config.connectCursive = e.target.checked;
  });

  // Render button
  document.getElementById("renderBtn").addEventListener("click", renderText);

  // Export buttons
  document.getElementById("exportSVG").addEventListener("click", downloadSVG);
  document
    .getElementById("copySVG")
    .addEventListener("click", copySVGToClipboard);
}

function handleDataLoad(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const success = fontData.importJSON(e.target.result);
    if (success) {
      fontData.saveToLocalStorage();
      updateDataStatus(true);
      alert("Handwriting data loaded successfully!");
    } else {
      alert("Error loading data. Please check the file format.");
    }
  };
  reader.readAsText(file);

  event.target.value = "";
}

function updateDataStatus(loaded) {
  const statusEl = document.getElementById("dataStatus");
  if (loaded) {
    const stats = fontData.getStatistics();
    statusEl.textContent = `${stats.capturedCount} characters loaded`;
    statusEl.classList.add("loaded");
  } else {
    statusEl.textContent = "No data loaded";
    statusEl.classList.remove("loaded");
  }
}

function renderText() {
  const text = document.getElementById("textInput").value;

  if (!text) {
    alert("Please enter some text to render.");
    return;
  }

  if (!fontData || fontData.getStatistics().capturedCount === 0) {
    alert("Please load handwriting data first.");
    return;
  }

  try {
    renderedSVG = generateTextSVG(text);
    displaySVG(renderedSVG);
  } catch (error) {
    console.error("Error rendering text:", error);
    alert("Error rendering text: " + error.message);
  }
}

function generateTextSVG(text) {
  const lines = text.split("\n");
  let svgContent = "";

  // Calculate dimensions
  const lineHeightPx = config.fontSize * config.lineHeight;
  const totalHeight = lines.length * lineHeightPx + 100; // Extra padding

  // Estimate width (rough calculation)
  const maxLineLength = Math.max(...lines.map((line) => line.length));
  const totalWidth =
    maxLineLength * (config.fontSize * 0.6 + config.letterSpacing) + 100;

  // Start SVG with proper viewBox
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${totalHeight}" viewBox="0 0 ${totalWidth} ${totalHeight}">\n`;

  // Add metadata
  svg += `  <metadata>\n`;
  svg += `    <generator>Handwriting SVG Generator</generator>\n`;
  svg += `    <created>${new Date().toISOString()}</created>\n`;
  svg += `  </metadata>\n`;

  // Render each line
  let yPosition = lineHeightPx;

  lines.forEach((line, lineIndex) => {
    const lineResult = renderLine(line, 50, yPosition);
    svgContent += lineResult.svg;
    yPosition += lineHeightPx;
  });

  svg += svgContent;
  svg += `</svg>`;

  return svg;
}

function renderLine(text, startX, startY) {
  let xPosition = startX;
  let svgContent = "";
  const missingChars = [];
  let prevConnector = null;

  for (let i = 0; i < text.length; ) {
    const pairKey = text.slice(i, i + 2);
    const singleKey = text[i];
    const usePair = i + 1 < text.length && fontData.hasCharacter(pairKey);
    const glyphKey = usePair ? pairKey : singleKey;
    const step = usePair ? 2 : 1;

    // Handle space
    if (glyphKey === " ") {
      xPosition += config.fontSize * 0.3;
      i += step;
      continue;
    }

    // Get character data
    const charData = fontData.getCharacter(glyphKey);

    if (!charData) {
      // Character not captured - skip or use placeholder
      missingChars.push(glyphKey);
      xPosition += config.fontSize * 0.5;
      i += step;
      continue;
    }

    // Normalize strokes to 0-1 range based on character bounds
    const normalizedStrokes = StrokeProcessor.normalize(
      JSON.parse(JSON.stringify(charData.strokes)),
      charData.bounds,
      charData.metrics,
    );

    // Apply variation to normalized strokes
    const variationConfig = {
      positionJitter: config.variation * 0.01,
      rotationRange: config.variation * 1.5,
      scaleRange: config.variation * 0.02,
    };

    const variedStrokes = StrokeProcessor.applyVariation(
      normalizedStrokes,
      variationConfig,
    );

    const baselineNorm = getBaselineNorm(charData);
    const yOffset = startY - baselineNorm * config.fontSize;

    // Extract connectors once per character
    const connector = StrokeProcessor.extractConnectors(variedStrokes);

    // If cursive is enabled and we have a previous connector, draw a joining line in absolute space
    if (config.connectCursive && prevConnector && connector?.entry) {
      const startAbsX = xPosition + connector.entry.x * config.fontSize;
      const startAbsY = yOffset + connector.entry.y * config.fontSize;
      svgContent += `  <path d="M ${prevConnector.exitAbsX.toFixed(2)} ${prevConnector.exitAbsY.toFixed(2)} L ${startAbsX.toFixed(2)} ${startAbsY.toFixed(2)}" fill="none" stroke="${config.strokeColor}" stroke-width="${prevConnector.strokeWidth.toFixed(2)}" stroke-linecap="round" stroke-linejoin="round"/>\n`;
    }

    // Render character
    const charSVG = renderCharacter(
      variedStrokes,
      xPosition,
      startY,
      config.fontSize,
      charData,
      prevConnector,
    );
    svgContent += charSVG;

    // Calculate character width for spacing using normalized bounds to preserve proportions
    const normalizedBounds = StrokeProcessor.calculateBounds(variedStrokes);
    const normalizedWidth = normalizedBounds.width || 0.6; // fallback
    const charWidth = normalizedWidth * config.fontSize;
    // Update connector info for next glyph (store absolute exit position)
    if (connector) {
      const exitAbsX = xPosition + connector.exit.x * config.fontSize;
      const exitAbsY = yOffset + connector.exit.y * config.fontSize;
      // Approximate stroke width from first stroke for consistency
      const firstStroke = variedStrokes[0];
      const pointCount = firstStroke?.points?.length || 1;
      const avgPressure =
        firstStroke.points.reduce((sum, p) => sum + (p.pressure || 0.5), 0) /
        pointCount;
      const strokeWidth = StrokeProcessor.mapPressureToWidth(
        avgPressure,
        MIN_STROKE_WIDTH,
        MAX_STROKE_WIDTH,
      );
      prevConnector = { ...connector, exitAbsX, exitAbsY, strokeWidth };
    } else {
      prevConnector = null;
    }
    xPosition += charWidth + config.letterSpacing;
    i += step;
  }

  if (missingChars.length > 0) {
    console.warn("Missing characters:", [...new Set(missingChars)].join(", "));
  }

  return {
    svg: svgContent,
    width: xPosition - startX,
  };
}

function renderCharacter(strokes, x, baselineY, size, charData) {
  const baselineNorm = getBaselineNorm(charData);
  const yOffset = baselineY - baselineNorm * size;

  let svg = `  <g transform="translate(${x.toFixed(2)}, ${yOffset.toFixed(2)})">\n`;

  // Generate paths with pressure-based width
  // Strokes are already normalized to 0-1 range
  strokes.forEach((stroke) => {
    if (!stroke.points || stroke.points.length < 2) return;

    // Calculate average pressure
    const avgPressure =
      stroke.points.reduce((sum, p) => sum + (p.pressure || 0.5), 0) /
      stroke.points.length;
    const strokeWidth = StrokeProcessor.mapPressureToWidth(
      avgPressure,
      MIN_STROKE_WIDTH,
      MAX_STROKE_WIDTH,
    );

    // Generate path data (normalized coordinates scaled by size)
    const pathData = generatePathData(stroke.points, size);

    svg += `    <path d="${pathData}" fill="none" stroke="${config.strokeColor}" stroke-width="${strokeWidth.toFixed(2)}" stroke-linecap="round" stroke-linejoin="round"/>\n`;
  });

  svg += `  </g>\n`;

  return svg;
}

function getBaselineNorm(charData) {
  if (charData?.metrics?.emHeight) {
    const { ascender, baseline, emHeight } = charData.metrics;
    return (baseline - ascender) / emHeight;
  }
  // Fallback matches capture guideline default
  return 0.7;
}

function generatePathData(points, scale) {
  if (!points || points.length === 0) return "";

  let pathData = `M ${(points[0].x * scale).toFixed(2)} ${(points[0].y * scale).toFixed(2)}`;

  if (points.length > 2) {
    // Use quadratic bezier curves for smoothing
    for (let i = 1; i < points.length - 1; i++) {
      const curr = points[i];
      const next = points[i + 1];
      const cpX = (curr.x * scale).toFixed(2);
      const cpY = (curr.y * scale).toFixed(2);
      const endX = (((curr.x + next.x) / 2) * scale).toFixed(2);
      const endY = (((curr.y + next.y) / 2) * scale).toFixed(2);
      pathData += ` Q ${cpX} ${cpY}, ${endX} ${endY}`;
    }
    // Line to last point
    const last = points[points.length - 1];
    pathData += ` L ${(last.x * scale).toFixed(2)} ${(last.y * scale).toFixed(2)}`;
  } else {
    // Simple line
    for (let i = 1; i < points.length; i++) {
      pathData += ` L ${(points[i].x * scale).toFixed(2)} ${(points[i].y * scale).toFixed(2)}`;
    }
  }

  return pathData;
}

function displaySVG(svgString) {
  // Display in container
  const container = document.getElementById("svgContainer");
  container.innerHTML = svgString;

  // Display in code preview
  const codePreview = document.getElementById("svgCode");
  codePreview.textContent = formatSVG(svgString);
}

function formatSVG(svg) {
  // Simple formatting - add line breaks for readability
  return svg.replace(/></g, ">\n<").replace(/\n\s*\n/g, "\n");
}

function downloadSVG() {
  if (!renderedSVG) {
    alert("Please render some text first.");
    return;
  }

  const blob = new Blob([renderedSVG], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `handwriting-${Date.now()}.svg`;
  a.click();
  URL.revokeObjectURL(url);
}

function copySVGToClipboard() {
  if (!renderedSVG) {
    alert("Please render some text first.");
    return;
  }

  navigator.clipboard
    .writeText(renderedSVG)
    .then(() => {
      // Show temporary feedback
      const btn = document.getElementById("copySVG");
      const originalText = btn.textContent;
      btn.textContent = "✓ Copied!";
      setTimeout(() => {
        btn.textContent = originalText;
      }, 2000);
    })
    .catch((err) => {
      console.error("Error copying to clipboard:", err);

      // Fallback: select the text in code preview for manual copying
      const codeEl = document.getElementById("svgCode");
      const range = document.createRange();
      range.selectNodeContents(codeEl);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);

      alert(
        "Could not copy automatically. The SVG code is now selected. Press Ctrl+C (or Cmd+C) to copy.",
      );
    });
}
