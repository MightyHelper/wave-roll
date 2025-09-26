/**
 * Text cache utility to avoid creating duplicate PIXI.Text objects in loops
 */
import * as PIXI from "pixi.js";
class TextCache {
  private cache = new Map<string, PIXI.Text>();

  /**
   * Get or create a cached PIXI.Text object
   * @param text - The text content
   * @param style - The text style configuration
   * @returns A PIXI.Text object, either from cache or newly created
   */
  getText(text: string, style: Partial<PIXI.TextStyle>): PIXI.Text {
    const key = this.createKey(text, style);

    if (!this.cache.has(key)) {
      console.log(`New entry in text cache: ${text}`)
        this.cache.set(key, new PIXI.Text({ text, style }));
    }

    const cachedText = this.cache.get(key)!;
    // Update the text content in case it changed
    cachedText.text = text;
    return cachedText;
  }

  /**
   * Create a unique cache key from text and style
   */
  private createKey(text: string, style: Partial<PIXI.TextStyle>): string {
    const styleKey = JSON.stringify(style);
    return `${text}:${styleKey}`;
  }

  /**
   * Clear the cache to free memory
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Global text cache instance
export const textCache = new TextCache();
