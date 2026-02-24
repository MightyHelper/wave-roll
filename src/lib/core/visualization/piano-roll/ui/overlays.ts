/**
 * UI overlays for the piano roll canvas: tooltip and help panel.
 * Kept DOM-only to avoid coupling with Pixi internals.
 */

/** Ensure the parent is positioned for absolute overlay children. */
function ensurePositioned(parent: HTMLElement): void {
  const computedStyle = window.getComputedStyle(parent);
  if (computedStyle.position === "static") {
    parent.style.position = "relative";
  }
}

/**
 * Create and attach the note tooltip overlay to the canvas parent.
 * Returns the created tooltip div.
 */
export function initializeTooltipOverlay(
  canvas: HTMLCanvasElement,
  container?: HTMLElement
): HTMLDivElement {
  const parent = container || canvas.parentElement;
  if (!parent) {
    throw new Error("Tooltip parent element not found");
  }
  ensurePositioned(parent);

  const div = document.createElement("div");
  Object.assign(div.style, {
    position: "absolute",
    zIndex: "1000",
    pointerEvents: "none",
    background: "rgba(0, 0, 0, 0.8)",
    color: "#ffffff",
    padding: "4px 6px",
    borderRadius: "4px",
    fontSize: "12px",
    lineHeight: "1.2",
    whiteSpace: "nowrap",
    display: "none",
  } as CSSStyleDeclaration);

  parent.appendChild(div);
  return div;
}
