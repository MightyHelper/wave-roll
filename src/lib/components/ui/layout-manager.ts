import { UIComponentDependencies, UIElements } from "@/lib/components/ui";

/**
 * Provides layout & sidebar rendering for the Multi-MIDI demo.
 */
export class UILayoutManager {
  static setupLayout(
    container: HTMLElement,
    elements: UIElements,
    dependencies: UIComponentDependencies
  ): void {
    // Clear container first
    container.innerHTML = "";

    /* ---------- base flex layout ---------- */
    elements.mainContainer.style.cssText = `
      position: relative;
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 600px;
      overflow: visible;
    `;

    /* player column (piano-roll + controls) */
    elements.playerContainer.style.cssText = `
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      padding: 16px;
    `;

    elements.mainContainer.appendChild(elements.playerContainer);
    container.appendChild(elements.mainContainer);

    /* ---------- window resize -> resize PixiJS canvas ---------- */
    const handleWindowResize = () => dependencies.pianoRoll?.resize?.(elements.playerContainer.clientWidth);

    window.addEventListener("resize", handleWindowResize);
    // Call once to ensure correct initial sizing if layout differs from default.
    handleWindowResize();
  }
}
