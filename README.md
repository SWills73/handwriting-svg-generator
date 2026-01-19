# ✍️ Handwriting SVG Generator

Convert your handwriting into editable SVG graphics! This tool captures your natural handwriting strokes and allows you to generate text in your own handwriting style as scalable vector graphics.

## 🌟 Features

- **Interactive Handwriting Capture**: Draw characters naturally with mouse or touch input
- **Stroke Analysis**: Captures timing, pressure, and position data for realistic reproduction
- **Natural Variation**: Applies subtle variations to each character instance for authentic handwriting appearance
- **SVG Export**: Generate clean, editable SVG files
- **Data Persistence**: Automatic saving to localStorage - never lose your work
- **Responsive Design**: Works on desktop and mobile devices
- **Character Set**: Full support for a-z, A-Z, 0-9, and common punctuation (74 characters)

## 🚀 Getting Started

### Prerequisites

- Modern web browser (Chrome, Firefox, Safari, Edge)
- Internet connection (for p5.js CDN) or local p5.js library

### Usage

#### Step 1: Capture Your Handwriting

1. Open `capture.html` in your web browser
2. Draw each character in the canvas area
3. Use the controls:
   - **Save Character**: Save the current character
   - **Clear Canvas**: Clear all strokes
   - **Undo Stroke**: Remove the last stroke
   - **Next →**: Move to the next character
4. Track your progress with the character grid and progress bar
5. Export your handwriting data as JSON when complete

#### Step 2: Generate Text

1. Open `index.html` in your web browser
2. Click **Load Handwriting Data** and select your exported JSON file
3. Type your desired text in the text area
4. Adjust parameters:
   - **Size**: Font size (20-200)
   - **Spacing**: Letter spacing (-10 to 50)
   - **Line Height**: Vertical spacing (1.0-3.0)
   - **Variation**: Natural variation amount (0-10)
5. Click **Render Text** to generate SVG
6. Use **Download SVG** to save or **Copy SVG Code** to copy

## 📁 Project Structure

```
handwriting-svg-generator/
├── capture.html          # Handwriting capture interface
├── index.html           # Text rendering interface
├── css/
│   └── styles.css       # Unified stylesheet
├── js/
│   ├── capture.js       # Capture page logic (p5.js)
│   ├── font-data.js     # Data model and storage
│   ├── stroke-processor.js  # Stroke processing utilities
│   ├── svg-generator.js # SVG generation engine
│   └── text-renderer.js # Text rendering logic
└── README.md
```

## 🔧 Technical Details

### Capture System

- Uses **p5.js** for canvas drawing and interaction
- Captures stroke data including:
  - X, Y coordinates
  - Timestamps for natural timing
  - Simulated pressure based on drawing speed
- Stores data in structured JSON format
- Implements Douglas-Peucker algorithm for path simplification

### Rendering Engine

- Normalizes strokes to 0-1 coordinate space
- Applies configurable variation (position, rotation, scale)
- Generates SVG with:
  - Quadratic Bezier curves for smooth paths
  - Pressure-mapped stroke widths
  - Proper viewBox and metadata
- Supports multi-line text with proper spacing

### Data Format

Handwriting data is stored as JSON:

```json
{
  "metadata": {
    "created": "ISO-8601-timestamp",
    "modified": "ISO-8601-timestamp",
    "version": "1.0"
  },
  "characters": {
    "a": {
      "strokes": [/* array of stroke objects */],
      "bounds": {/* bounding box */},
      "baseline": 0,
      "timestamp": "ISO-8601-timestamp"
    }
    /* ... more characters */
  }
}
```

## 🌐 Offline Usage

If you need to use the app without internet access:

1. Download p5.js from [cdnjs.com](https://cdnjs.com/libraries/p5.js)
2. Create a `lib` folder in the project root
3. Save `p5.min.js` to `lib/p5.min.js`
4. Update `capture.html` script tag:
   ```html
   <script src="lib/p5.min.js"></script>
   ```

## 💡 Tips for Best Results

1. **Consistent Size**: Try to draw characters at a similar size
2. **Natural Strokes**: Draw as you normally would - don't try to be perfect
3. **Grid Guide**: Use the grid to help with alignment and consistency
4. **Variation Slider**: Adjust variation for more or less natural appearance
5. **Character Coverage**: Capture all characters you plan to use

## 🛠️ Development

### No Build Process Required

This is a vanilla HTML/CSS/JavaScript project with no build step or dependencies beyond p5.js (loaded via CDN).

### Adding Features

- **New Characters**: Modify `CHAR_SET` in `capture.js` and update `FontData.getStandardCharacterSet()` in `font-data.js`
- **Styling**: Edit `css/styles.css` for visual changes
- **Stroke Processing**: Extend `StrokeProcessor` class for new algorithms

## 📝 Browser Compatibility

- ✅ Chrome/Edge 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

## 🤝 Contributing

Contributions are welcome! Areas for improvement:

- Additional stroke smoothing algorithms
- Character ligature support for cursive writing
- Multiple handwriting styles per project
- Real-time rendering preview
- Advanced SVG optimization

## 📄 License

This project is open source and available for personal and commercial use.

## 🙏 Acknowledgments

- Built with [p5.js](https://p5js.org/) - creative coding library
- Uses Douglas-Peucker algorithm for path simplification
- Inspired by handwriting font creation tools

## 🐛 Troubleshooting

**Canvas not appearing on capture page:**
- Check browser console for p5.js loading errors
- Verify internet connection or use local p5.js copy
- Ensure JavaScript is enabled

**Characters appear too large/small:**
- Adjust the Size slider on the render page
- Characters are normalized during capture for consistency

**Some characters missing in output:**
- Those characters weren't captured - return to capture.html
- Check character grid to see which are captured (green)

**SVG looks pixelated:**
- SVGs are vector graphics - they scale infinitely
- Try opening in a dedicated SVG viewer or editor

---

Made with ✍️ by the community
