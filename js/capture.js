/**
 * Handwriting Capture Tool
 * Captures handwriting strokes using p5.js
 */

// Global variables
let fontData;
let currentChar = "a";
let currentStrokes = [];
let currentStroke = null;
let isDrawing = false;
let showGuides = true;
let showPressure = true;
let canvasWidth = 450;
let canvasHeight = 350;

// Guideline metrics (ascender through descender) to preserve relative scale
const GUIDELINE_METRICS = {
  ascender: 0.18, // top of ascenders
  capHeight: 0.24, // capital letter height
  xHeight: 0.46, // typical lowercase height
  baseline: 0.66, // writing baseline
  descender: 0.82, // bottom of descenders
};

// Character + pair set
const CHAR_SET = [];
const PAIR_SET = [
  "th",
  "ch",
  "sh",
  "wh",
  "ph",
  "qu",
  "oo",
  "ee",
  "ll",
  "tt",
  "or",
  "br",
  "st",
];

// Initialize character set
function initCharacterSet() {
  // Lowercase a-z
  for (let i = 97; i <= 122; i++) {
    CHAR_SET.push(String.fromCharCode(i));
  }
  // Uppercase A-Z
  for (let i = 65; i <= 90; i++) {
    CHAR_SET.push(String.fromCharCode(i));
  }
  // Numbers 0-9
  for (let i = 48; i <= 57; i++) {
    CHAR_SET.push(String.fromCharCode(i));
  }
  // Common punctuation
  CHAR_SET.push(" ", ".", ",", "!", "?", ";", ":", "-", "(", ")", '"', "'");

  // Key letter pairs for smoother ligatures
  CHAR_SET.push(...PAIR_SET);
}

// p5.js setup
function setup() {
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent("canvasContainer");
  canvas.touchStarted(handleTouchStart);
  canvas.touchMoved(handleTouchMove);
  canvas.touchEnded(handleTouchEnd);
  background(255);

  // Prevent touch scrolling and zooming on canvas
  const canvasElement = canvas.elt;
  canvasElement.style.touchAction = "none";
  canvasElement.style.userSelect = "none";
  canvasElement.style.webkitUserSelect = "none";

  // Add pointer event handlers for better pen/touch support
  canvasElement.addEventListener("pointerdown", handlePointerDown);
  canvasElement.addEventListener("pointermove", handlePointerMove);
  canvasElement.addEventListener("pointerup", handlePointerUp);
  canvasElement.addEventListener("pointercancel", handlePointerCancel);
  canvasElement.addEventListener("pointerleave", handlePointerLeave);

  // Initialize
  fontData = new FontData();
  initCharacterSet();

  // Try to load from localStorage
  if (fontData.loadFromLocalStorage()) {
    console.log("Loaded existing data from localStorage");
  }

  // Setup UI
  setupUI();
  updateUI();
  renderCharacterGrid();
}

// p5.js draw loop
function draw() {
  background(255);

  // Draw guidelines if enabled
  if (showGuides) {
    drawGuidelines();
  }

  // Draw saved strokes
  drawStrokes(currentStrokes);

  // Draw current stroke being drawn
  if (currentStroke && currentStroke.points.length > 0) {
    drawStrokes([currentStroke]);
  }
}

// Draw handwriting guidelines: ascender, x-height, baseline, descender
function drawGuidelines() {
  const ascY = GUIDELINE_METRICS.ascender * canvasHeight;
  const capHeightY = GUIDELINE_METRICS.capHeight * canvasHeight;
  const xHeightY = GUIDELINE_METRICS.xHeight * canvasHeight;
  const baselineY = GUIDELINE_METRICS.baseline * canvasHeight;
  const descY = GUIDELINE_METRICS.descender * canvasHeight;

  push();
  strokeWeight(2);

  // Ascender line (dashed)
  stroke(180, 200, 255);
  drawingContext.setLineDash([10, 8]);
  line(0, ascY, canvasWidth, ascY);

  // Cap height line (dashed)
  stroke(160, 180, 255);
  drawingContext.setLineDash([10, 8]);
  line(0, capHeightY, canvasWidth, capHeightY);

  // x-height line (dotted)
  drawingContext.setLineDash([5, 8]);
  line(0, xHeightY, canvasWidth, xHeightY);

  // Baseline (solid)
  drawingContext.setLineDash([]);
  stroke(80, 120, 255);
  line(0, baselineY, canvasWidth, baselineY);

  // Descender line (dashed)
  stroke(200, 180, 255);
  drawingContext.setLineDash([10, 8]);
  line(0, descY, canvasWidth, descY);

  // Vertical center to help with letter width balance
  stroke(220);
  drawingContext.setLineDash([6, 12]);
  line(canvasWidth / 2, 0, canvasWidth / 2, canvasHeight);

  // Labels
  noStroke();
  fill(90);
  textSize(12);
  textAlign(LEFT, BOTTOM);
  text("Ascender", 10, ascY - 4);
  text("Cap Height", 10, capHeightY - 4);
  text("x-height", 10, xHeightY - 4);
  text("Baseline", 10, baselineY - 4);
  text("Descender", 10, descY - 4);
  // Ensure subsequent drawing is solid
  drawingContext.setLineDash([]);
  pop();
}

// Draw strokes
function drawStrokes(strokes) {
  push();
  // Ensure guidelines' dash styles do not affect strokes
  drawingContext.setLineDash([]);
  drawingContext.globalAlpha = 1;
  blendMode(BLEND);
  strokes.forEach((strokeData) => {
    if (strokeData.points.length === 1) {
      const p = strokeData.points[0];
      noStroke();
      fill(30, 30, 30);
      circle(p.x, p.y, 4);
      return;
    }
    if (strokeData.points.length < 2) return;

    noFill();
    strokeCap(ROUND);
    strokeJoin(ROUND);

    for (let i = 1; i < strokeData.points.length; i++) {
      const prev = strokeData.points[i - 1];
      const curr = strokeData.points[i];

      // Apply pressure to stroke width if enabled
      const pressure = showPressure ? curr.pressure || 0.5 : 0.5;
      const sw = map(pressure, 0, 1, 2, 6);

      stroke(30, 30, 30);
      strokeWeight(sw);
      line(prev.x, prev.y, curr.x, curr.y);
    }

    // Fallback visualization: tiny red dots at each point for debugging visibility
    noStroke();
    fill(200, 30, 30, 180);
    strokeWeight(1);
    stroke(200, 30, 30, 180);
    strokeCap(ROUND);
    strokeJoin(ROUND);
    for (let i = 0; i < strokeData.points.length; i++) {
      const p = strokeData.points[i];
      point(p.x, p.y);
    }
  });
  pop();
}

// Mouse/touch handlers
function mousePressed() {
  if (
    mouseX < 0 ||
    mouseX > canvasWidth ||
    mouseY < 0 ||
    mouseY > canvasHeight
  ) {
    return;
  }
  startDrawing();
}

function mouseDragged() {
  if (!isDrawing) return;
  continueDrawing(mouseX, mouseY);
}

function mouseReleased() {
  if (isDrawing) {
    endDrawing();
  }
}

function handleTouchStart() {
  if (touches.length > 0) {
    const touch = touches[0];
    startDrawingAt(touch.x, touch.y);
  }
  return false; // Prevent default
}

function handleTouchMove() {
  if (isDrawing && touches.length > 0) {
    const touch = touches[0];
    continueDrawing(touch.x, touch.y);
  }
  return false; // Prevent default
}

function handleTouchEnd() {
  if (isDrawing) {
    endDrawing();
  }
  return false; // Prevent default
}

// Pointer event handlers for pen/touch with better control
function handlePointerDown(e) {
  e.preventDefault();
  const rect = e.target.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  startDrawingAt(x, y);
}

function handlePointerMove(e) {
  if (!isDrawing) return;
  e.preventDefault();
  const rect = e.target.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  continueDrawing(x, y);
}

function handlePointerUp(e) {
  if (isDrawing) {
    e.preventDefault();
    endDrawing();
  }
}

function handlePointerCancel(e) {
  if (isDrawing) {
    e.preventDefault();
    endDrawing();
  }
}

function handlePointerLeave(e) {
  if (isDrawing) {
    e.preventDefault();
    endDrawing();
  }
}

// Drawing logic
function startDrawing() {
  isDrawing = true;
  currentStroke = {
    points: [],
    startTime: Date.now(),
  };
  addPoint(mouseX, mouseY);
}

function startDrawingAt(x, y) {
  isDrawing = true;
  currentStroke = {
    points: [],
    startTime: Date.now(),
  };
  addPoint(x, y);
}

function continueDrawing(x, y) {
  if (!isDrawing || !currentStroke) return;
  addPoint(x, y);
}

function endDrawing() {
  if (!currentStroke || currentStroke.points.length < 2) {
    currentStroke = null;
    isDrawing = false;
    return;
  }

  currentStrokes.push(currentStroke);
  // Debug: log stroke info for visibility issues
  console.log("Stroke saved", {
    points: currentStroke.points.length,
    first: currentStroke.points[0],
    last: currentStroke.points[currentStroke.points.length - 1],
  });
  currentStroke = null;
  isDrawing = false;
  updateUI();
}

function addPoint(x, y) {
  if (!currentStroke) return;

  const timestamp = Date.now() - currentStroke.startTime;

  // Calculate pressure based on speed (simulate pressure sensitivity)
  let pressure = 0.5;
  if (currentStroke.points.length > 0) {
    const lastPoint = currentStroke.points[currentStroke.points.length - 1];
    const dist = dist2D(x, y, lastPoint.x, lastPoint.y);
    const timeDiff = timestamp - lastPoint.timestamp;
    const speed = timeDiff > 0 ? dist / timeDiff : 0;
    // Slower drawing = more pressure
    pressure = constrain(map(speed, 0, 2, 0.8, 0.3), 0.3, 0.8);
  }

  currentStroke.points.push({ x, y, pressure, timestamp });
}

function dist2D(x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
}

// UI Setup
function setupUI() {
  // Character input
  document.getElementById("charInput").value = currentChar;
  document.getElementById("charInput").addEventListener("input", (e) => {
    if (e.target.value.length > 0) {
      const value = e.target.value.slice(0, 2);
      e.target.value = value;
      loadCharacter(value);
    }
  });

  // Next button
  document.getElementById("nextChar").addEventListener("click", () => {
    const currentIndex = CHAR_SET.indexOf(currentChar);
    const nextIndex = (currentIndex + 1) % CHAR_SET.length;
    loadCharacter(CHAR_SET[nextIndex]);
  });

  // Clear button
  document.getElementById("clearBtn").addEventListener("click", () => {
    currentStrokes = [];
    updateUI();
  });

  // Undo button
  document.getElementById("undoBtn").addEventListener("click", () => {
    if (currentStrokes.length > 0) {
      currentStrokes.pop();
      updateUI();
    }
  });

  // Save character button
  document
    .getElementById("saveChar")
    .addEventListener("click", saveCurrentCharacter);

  // Guidelines checkbox
  document.getElementById("showGrid").addEventListener("change", (e) => {
    showGuides = e.target.checked;
  });

  // Pressure checkbox
  document.getElementById("showPressure").addEventListener("change", (e) => {
    showPressure = e.target.checked;
  });

  // Export button
  document.getElementById("exportJSON").addEventListener("click", exportData);

  // Import button
  document.getElementById("importJSON").addEventListener("click", () => {
    document.getElementById("fileInput").click();
  });

  document.getElementById("fileInput").addEventListener("change", importData);
}

// Save current character
function saveCurrentCharacter() {
  if (currentStrokes.length === 0) {
    alert("Please draw something first!");
    return;
  }

  const bounds = StrokeProcessor.calculateBounds(currentStrokes);
  const baseline = StrokeProcessor.detectBaseline(currentStrokes);
  const metrics = {
    ascender: GUIDELINE_METRICS.ascender * canvasHeight,
    xHeight: GUIDELINE_METRICS.xHeight * canvasHeight,
    baseline: GUIDELINE_METRICS.baseline * canvasHeight,
    descender: GUIDELINE_METRICS.descender * canvasHeight,
    emHeight:
      (GUIDELINE_METRICS.descender - GUIDELINE_METRICS.ascender) * canvasHeight,
    captureWidth: canvasWidth,
  };

  // Store with simplified strokes
  const simplifiedStrokes = currentStrokes.map((stroke) => ({
    points: StrokeProcessor.simplifyStroke(stroke.points, 2),
  }));

  // Precompute normalized connectors for cursive joining
  const normalizedForConnectors = StrokeProcessor.normalize(
    simplifiedStrokes,
    bounds,
    metrics,
  );
  const connectors = StrokeProcessor.extractConnectors(normalizedForConnectors);

  fontData.setCharacter(
    currentChar,
    simplifiedStrokes,
    bounds,
    baseline,
    metrics,
    connectors,
  );
  fontData.saveToLocalStorage();

  updateUI();
  renderCharacterGrid();

  // Move to next character
  const currentIndex = CHAR_SET.indexOf(currentChar);
  if (currentIndex < CHAR_SET.length - 1) {
    loadCharacter(CHAR_SET[currentIndex + 1]);
  }
}

// Load character for editing
function loadCharacter(char) {
  if (!char) return;

  currentChar = char;
  document.getElementById("charInput").value = char;

  // Load existing strokes if available
  const charData = fontData.getCharacter(char);
  currentStrokes = charData ? JSON.parse(JSON.stringify(charData.strokes)) : [];

  updateUI();
  renderCharacterGrid();
}

// Update UI elements
function updateUI() {
  document.getElementById("strokeCount").textContent = currentStrokes.length;

  const stats = fontData.getStatistics();
  document.getElementById("capturedCount").textContent = stats.capturedCount;
  document.getElementById("totalChars").textContent = CHAR_SET.length;

  const progress = (stats.capturedCount / CHAR_SET.length) * 100;
  document.getElementById("progressFill").style.width = progress + "%";
}

// Render character grid
function renderCharacterGrid() {
  const grid = document.getElementById("charGrid");
  grid.innerHTML = "";

  CHAR_SET.forEach((char) => {
    const button = document.createElement("button");
    button.className = "char-button";
    button.textContent = char === " " ? "␣" : char;
    button.title = char === " " ? "Space" : char;

    if (fontData.hasCharacter(char)) {
      button.classList.add("captured");
    }

    if (char === currentChar) {
      button.classList.add("current");
    }

    button.addEventListener("click", () => loadCharacter(char));

    grid.appendChild(button);
  });
}

// Export data
function exportData() {
  const jsonData = fontData.exportJSON();
  const blob = new Blob([jsonData], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `handwriting-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// Import data
function importData(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const success = fontData.importJSON(e.target.result);
    if (success) {
      alert("Data imported successfully!");
      fontData.saveToLocalStorage();
      updateUI();
      renderCharacterGrid();
    } else {
      alert("Error importing data. Please check the file format.");
    }
  };
  reader.readAsText(file);

  // Reset file input
  event.target.value = "";
}

// Window resize handler
function windowResized() {
  // Keep canvas size fixed for consistency
  resizeCanvas(canvasWidth, canvasHeight);
}
