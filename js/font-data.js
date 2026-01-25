/**
 * Font Data Model
 * Manages character data storage and retrieval for handwriting font
 */

class FontData {
  constructor() {
    this.characters = {};
    this.metadata = {
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
      version: "1.0",
    };
  }

  /**
   * Add or update character data
   * @param {string} char - The character (single character)
   * @param {Array} strokes - Array of stroke objects
   * @param {Object} bounds - Bounding box {minX, minY, maxX, maxY, width, height}
   * @param {number} baseline - Baseline position
   * @param {Object} [metrics] - Optional capture metrics (ascender, descender, xHeight, emHeight, captureWidth)
   */
   setCharacter(char, strokes, bounds, baseline, metrics, connectors) {
    this.characters[char] = {
      strokes: strokes,
      bounds: bounds,
      baseline: baseline || 0,
      metrics: metrics || null,
      connectors: connectors || null,
      timestamp: new Date().toISOString(),
    };
    this.metadata.modified = new Date().toISOString();
  }

  /**
   * Retrieve character data
   * @param {string} char - The character to retrieve
   * @returns {Object|null} Character data or null if not found
   */
  getCharacter(char) {
    return this.characters[char] || null;
  }

  /**
   * Check if character exists
   * @param {string} char - The character to check
   * @returns {boolean}
   */
  hasCharacter(char) {
    return char in this.characters;
  }

  /**
   * Remove character data
   * @param {string} char - The character to remove
   */
  removeCharacter(char) {
    if (this.hasCharacter(char)) {
      delete this.characters[char];
      this.metadata.modified = new Date().toISOString();
    }
  }

  /**
   * Get all captured characters
   * @returns {Array} Array of character strings
   */
  getCapturedCharacters() {
    return Object.keys(this.characters);
  }

  /**
   * Get statistics about captured data
   * @returns {Object} Statistics object
   */
  getStatistics() {
    const captured = this.getCapturedCharacters();
    const totalStrokes = captured.reduce((sum, char) => {
      return sum + (this.characters[char].strokes?.length || 0);
    }, 0);

    return {
      capturedCount: captured.length,
      totalStrokes: totalStrokes,
      characters: captured,
      modified: this.metadata.modified,
    };
  }

  /**
   * Get list of missing characters from standard set
   * @returns {Array} Array of missing character strings
   */
  getMissingCharacters() {
    const standardSet = this.getStandardCharacterSet();
    return standardSet.filter((char) => !this.hasCharacter(char));
  }

  /**
   * Get standard character set (a-z, A-Z, 0-9, common punctuation)
   * @returns {Array} Array of standard characters
   */
  getStandardCharacterSet() {
    const chars = [];

    // Lowercase a-z
    for (let i = 97; i <= 122; i++) {
      chars.push(String.fromCharCode(i));
    }

    // Uppercase A-Z
    for (let i = 65; i <= 90; i++) {
      chars.push(String.fromCharCode(i));
    }

    // Numbers 0-9
    for (let i = 48; i <= 57; i++) {
      chars.push(String.fromCharCode(i));
    }

    // Common punctuation
    const punctuation = [
      " ",
      ".",
      ",",
      "!",
      "?",
      ";",
      ":",
      "-",
      "(",
      ")",
      '"',
      "'",
    ];
    chars.push(...punctuation);

    return chars;
  }

  /**
   * Export all data as JSON string
   * @returns {string} JSON string of all data
   */
  exportJSON() {
    const exportData = {
      metadata: this.metadata,
      characters: this.characters,
    };
    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Import data from JSON string
   * @param {string} jsonString - JSON string to import
   * @returns {boolean} Success status
   */
  importJSON(jsonString) {
    try {
      const data = JSON.parse(jsonString);

      // Validate structure
      if (!data.characters || typeof data.characters !== "object") {
        throw new Error("Invalid data structure: missing characters object");
      }

      // Import data
      this.characters = data.characters;
      this.metadata = data.metadata || {
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
        version: "1.0",
      };

      return true;
    } catch (error) {
      console.error("Error importing JSON:", error);
      return false;
    }
  }

  /**
   * Clear all character data
   */
  clear() {
    this.characters = {};
    this.metadata.modified = new Date().toISOString();
  }

  /**
   * Export to localStorage
   * @param {string} key - Storage key (default: 'handwritingData')
   */
  saveToLocalStorage(key = "handwritingData") {
    try {
      localStorage.setItem(key, this.exportJSON());
      return true;
    } catch (error) {
      console.error("Error saving to localStorage:", error);
      return false;
    }
  }

  /**
   * Import from localStorage
   * @param {string} key - Storage key (default: 'handwritingData')
   * @returns {boolean} Success status
   */
  loadFromLocalStorage(key = "handwritingData") {
    try {
      const data = localStorage.getItem(key);
      if (data) {
        return this.importJSON(data);
      }
      return false;
    } catch (error) {
      console.error("Error loading from localStorage:", error);
      return false;
    }
  }
}

// Create global instance if in browser environment
if (typeof window !== "undefined") {
  window.FontData = FontData;
}
