import { createWaveRollPlayer, WaveRollPlayer } from "@/lib/components/player/wave-roll/player";
import { InputFileFormat } from "@/core/file";

/**
 * WaveRoll Web Component
 *
 * Usage:
 * <wave-roll
 *   files='[{"path": "file.mid", "name": "File Name", "type": "midi"}]'
 *   style="width: 100%
 * ></wave-roll>
 *
 * Note:
 * - The component accepts `name` for user-facing labels.
 */
class WaveRollElement extends HTMLElement {
  private player: WaveRollPlayer | null = null;
  private container: HTMLDivElement | null = null;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  // noinspection JSUnusedGlobalSymbols (Called by HTMLElement)
  connectedCallback() {
    this.render();
    this.initializePlayer();
  }

  // noinspection JSUnusedGlobalSymbols (Called by HTMLElement)
  disconnectedCallback() {
    this.player?.dispose()
  }

  // noinspection JSUnusedGlobalSymbols (Called by HTMLElement)
  static get observedAttributes() {
    return ['files', 'readonly'];
  }

  // noinspection JSUnusedGlobalSymbols (Called by HTMLElement)
  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    if (oldValue === newValue) return;
    ({
      [name]: () => {
      },
      "files": () => this.initializePlayer(),
      "readonly": () => {
        const ro = this.hasAttribute?.('readonly') ?? !!newValue;
        this.player?.setPermissions?.({ canAddFiles: !ro, canRemoveFiles: !ro });
      }
    }[name])()
  }

  private render() {
    if (!this.shadowRoot) return;

    // Create styles
    const style = document.createElement('style');
    style.textContent = `
      :host {
        display: block;
        width: 100%;
        height: 100%;
      }
      .wave-roll-container {
        width: 100%;
        height: 100%;
        position: relative;
      }
    `;

    // Create container
    this.container = document.createElement('div');
    this.container.className = 'wave-roll-container';

    // Clear and append
    this.shadowRoot.innerHTML = '';
    this.shadowRoot.appendChild(style);
    this.shadowRoot.appendChild(this.container);
  }

  private parseFilesAttr(value: string | null): InputFileFormat[] {
    if (value === null) return [];
    let files: any;
    try {
      files = JSON.parse(value);
    } catch (e: any) {
      if (e instanceof SyntaxError) {
        console.error('Invalid files attribute:', e);
        return [];
      }
    }
    if (!Array.isArray(files)) return [];
    // Normalize incoming items: use `name` as the primary property
    let parsedFiles = files
      .filter((f: any) => typeof f?.path === 'string')
      .map((f: InputFileFormat) => ({
          path: f.path,
          name: f?.name ?? f.path,
          type: f?.type ?? "audio",
          color: f?.color
        }
      ));
    if (parsedFiles.length !== files.length) console.warn('Some files could not be parsed:', files);
    return parsedFiles;
  }

  // Note: This also is called when the value for `files` changes on the dom node...
  //       Ideally we would just send the updated info, but for now we re-create the element from scratch
  private async initializePlayer() {
    if (!this.container) return console.warn("[WaveRollElement] Tried to initialize player before render");

    // Clean up existing player [Because we might re-create the element from scratch]
    this.player?.dispose?.();
    this.player = null;

    // Parse files attribute
    const normalized = this.parseFilesAttr(this.getAttribute('files'));
    this.player = await createWaveRollPlayer(this.container, normalized);
    if (this.hasAttribute('readonly')) {
      this.player.setPermissions({ canAddFiles: false, canRemoveFiles: false });
    }
    // Notify listeners the component has finished initialization
    this.dispatchEvent(new Event('load'));
  }

  // Expose minimal control API for tests/integration

  // noinspection JSUnusedGlobalSymbols (External API)
  public async play(): Promise<void> {
    await this.player?.play?.();
  }

  // noinspection JSUnusedGlobalSymbols (External API)
  public pause(): void {
    this.player?.pause?.();
  }

  // noinspection JSUnusedGlobalSymbols (External API)
  public get isPlaying(): boolean {
    return !!this.player?.isPlaying;
  }

  /**
   * Seek to a specific time (seconds).
   * Provided for E2E/manual testing via index.html.
   */
  // noinspection JSUnusedGlobalSymbols (External API)
  public seek(time: number): void {
    this.player?.seek?.(time);
  }

  /**
   * Return lightweight state for assertions in tests.
   */
  // noinspection JSUnusedGlobalSymbols (External API)
  public getState(): any {
    return this.player?.pianoRollManager?.getPianoRollInstance()?.getState?.();
  }
}

// Register the custom element
if (!customElements.get('wave-roll')) customElements.define('wave-roll', WaveRollElement);

export { WaveRollElement };
