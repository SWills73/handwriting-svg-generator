/**
 * Handwriting Capture Tool
 * Captures handwriting strokes using p5.js
 */

// Global variables
let fontData;
let currentChar = 'a';
let currentStrokes = [];
let currentStroke = null;
let isDrawing = false;
let showGrid = true;
let showPressure = true;
let canvasWidth = 800;
let canvasHeight = 600;

// Character set
const CHAR_SET = [];

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
    CHAR_SET.push(' ', '.', ',', '!', '?', ';', ':', '-', '(', ')', '"', "'");
}

// p5.js setup
function setup() {
    const canvas = createCanvas(canvasWidth, canvasHeight);
    canvas.parent('canvasContainer');
    canvas.touchStarted(handleTouchStart);
    canvas.touchMoved(handleTouchMove);
    canvas.touchEnded(handleTouchEnd);
    
    // Set canvas style to prevent scrolling/zooming during drawing
    const canvasElement = canvas.elt;
    canvasElement.style.touchAction = 'none';
    canvasElement.style.userSelect = 'none';
    canvasElement.style.webkitUserSelect = 'none';
    
    // Add pointer event handlers for pen/touch support
    canvasElement.addEventListener('pointerdown', handlePointerDown);
    canvasElement.addEventListener('pointermove', handlePointerMove);
    canvasElement.addEventListener('pointerup', handlePointerEnd);
    canvasElement.addEventListener('pointercancel', handlePointerEnd);
    canvasElement.addEventListener('pointerleave', handlePointerEnd);
    
    background(255);
    
    // Initialize
    fontData = new FontData();
    initCharacterSet();
    
    // Try to load from localStorage
    if (fontData.loadFromLocalStorage()) {
        console.log('Loaded existing data from localStorage');
    }
    
    // Setup UI
    setupUI();
    updateUI();
    renderCharacterGrid();
}

// p5.js draw loop
function draw() {
    background(255);
    
    // Draw grid if enabled
    if (showGrid) {
        drawGrid();
    }
    
    // Draw center guides
    drawGuides();
    
    // Draw saved strokes
    drawStrokes(currentStrokes);
    
    // Draw current stroke being drawn
    if (currentStroke && currentStroke.points.length > 0) {
        drawStrokes([currentStroke]);
    }
}

// Draw background grid
function drawGrid() {
    stroke(220);
    strokeWeight(1);
    
    const gridSize = 50;
    for (let x = 0; x < canvasWidth; x += gridSize) {
        line(x, 0, x, canvasHeight);
    }
    for (let y = 0; y < canvasHeight; y += gridSize) {
        line(0, y, canvasWidth, y);
    }
}

// Draw center guides
function drawGuides() {
    stroke(200, 200, 255, 150);
    strokeWeight(2);
    line(canvasWidth / 2, 0, canvasWidth / 2, canvasHeight);
    line(0, canvasHeight / 2, canvasWidth, canvasHeight / 2);
}

// Draw strokes
function drawStrokes(strokes) {
    strokes.forEach(stroke => {
        if (stroke.points.length < 2) return;
        
        noFill();
        strokeCap(ROUND);
        strokeJoin(ROUND);
        
        for (let i = 1; i < stroke.points.length; i++) {
            const prev = stroke.points[i - 1];
            const curr = stroke.points[i];
            
            // Apply pressure to stroke width if enabled
            const pressure = showPressure ? (curr.pressure || 0.5) : 0.5;
            const sw = map(pressure, 0, 1, 2, 6);
            
            stroke(0);
            strokeWeight(sw);
            line(prev.x, prev.y, curr.x, curr.y);
        }
    });
}

// Mouse/touch handlers
function mousePressed() {
    if (mouseX < 0 || mouseX > canvasWidth || mouseY < 0 || mouseY > canvasHeight) {
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
        startDrawing(touch.x, touch.y);
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

// Pointer event handlers for pen/touch support
function handlePointerDown(event) {
    event.preventDefault();
    const rect = event.target.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    if (x >= 0 && x <= canvasWidth && y >= 0 && y <= canvasHeight) {
        startDrawing(x, y);
    }
}

function handlePointerMove(event) {
    if (!isDrawing) return;
    event.preventDefault();
    const rect = event.target.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    continueDrawing(x, y);
}

function handlePointerEnd(event) {
    event.preventDefault();
    if (isDrawing) {
        endDrawing();
    }
}

// Drawing logic
function startDrawing(x, y) {
    isDrawing = true;
    currentStroke = {
        points: [],
        startTime: Date.now()
    };
    // Use provided coordinates if available, otherwise use mouseX/mouseY
    const drawX = x !== undefined ? x : mouseX;
    const drawY = y !== undefined ? y : mouseY;
    addPoint(drawX, drawY);
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
    document.getElementById('charInput').value = currentChar;
    document.getElementById('charInput').addEventListener('input', (e) => {
        if (e.target.value.length > 0) {
            loadCharacter(e.target.value[0]);
        }
    });
    
    // Next button
    document.getElementById('nextChar').addEventListener('click', () => {
        const currentIndex = CHAR_SET.indexOf(currentChar);
        const nextIndex = (currentIndex + 1) % CHAR_SET.length;
        loadCharacter(CHAR_SET[nextIndex]);
    });
    
    // Clear button
    document.getElementById('clearBtn').addEventListener('click', () => {
        currentStrokes = [];
        updateUI();
    });
    
    // Undo button
    document.getElementById('undoBtn').addEventListener('click', () => {
        if (currentStrokes.length > 0) {
            currentStrokes.pop();
            updateUI();
        }
    });
    
    // Save character button
    document.getElementById('saveChar').addEventListener('click', saveCurrentCharacter);
    
    // Grid checkbox
    document.getElementById('showGrid').addEventListener('change', (e) => {
        showGrid = e.target.checked;
    });
    
    // Pressure checkbox
    document.getElementById('showPressure').addEventListener('change', (e) => {
        showPressure = e.target.checked;
    });
    
    // Export button
    document.getElementById('exportJSON').addEventListener('click', exportData);
    
    // Import button
    document.getElementById('importJSON').addEventListener('click', () => {
        document.getElementById('fileInput').click();
    });
    
    document.getElementById('fileInput').addEventListener('change', importData);
}

// Save current character
function saveCurrentCharacter() {
    if (currentStrokes.length === 0) {
        alert('Please draw something first!');
        return;
    }
    
    const bounds = StrokeProcessor.calculateBounds(currentStrokes);
    const baseline = StrokeProcessor.detectBaseline(currentStrokes);
    
    // Store with simplified strokes
    const simplifiedStrokes = currentStrokes.map(stroke => ({
        points: StrokeProcessor.simplifyStroke(stroke.points, 2)
    }));
    
    fontData.setCharacter(currentChar, simplifiedStrokes, bounds, baseline);
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
    document.getElementById('charInput').value = char;
    
    // Load existing strokes if available
    const charData = fontData.getCharacter(char);
    currentStrokes = charData ? JSON.parse(JSON.stringify(charData.strokes)) : [];
    
    updateUI();
    renderCharacterGrid();
}

// Update UI elements
function updateUI() {
    document.getElementById('strokeCount').textContent = currentStrokes.length;
    
    const stats = fontData.getStatistics();
    document.getElementById('capturedCount').textContent = stats.capturedCount;
    document.getElementById('totalChars').textContent = CHAR_SET.length;
    
    const progress = (stats.capturedCount / CHAR_SET.length) * 100;
    document.getElementById('progressFill').style.width = progress + '%';
}

// Render character grid
function renderCharacterGrid() {
    const grid = document.getElementById('charGrid');
    grid.innerHTML = '';
    
    CHAR_SET.forEach(char => {
        const button = document.createElement('button');
        button.className = 'char-button';
        button.textContent = char === ' ' ? '␣' : char;
        button.title = char === ' ' ? 'Space' : char;
        
        if (fontData.hasCharacter(char)) {
            button.classList.add('captured');
        }
        
        if (char === currentChar) {
            button.classList.add('current');
        }
        
        button.addEventListener('click', () => loadCharacter(char));
        
        grid.appendChild(button);
    });
}

// Export data
function exportData() {
    const jsonData = fontData.exportJSON();
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
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
            alert('Data imported successfully!');
            fontData.saveToLocalStorage();
            updateUI();
            renderCharacterGrid();
        } else {
            alert('Error importing data. Please check the file format.');
        }
    };
    reader.readAsText(file);
    
    // Reset file input
    event.target.value = '';
}

// Window resize handler
function windowResized() {
    // Keep canvas size fixed for consistency
    resizeCanvas(canvasWidth, canvasHeight);
}
