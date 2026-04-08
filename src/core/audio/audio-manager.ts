/**
 * panda-shot-engine — Audio Manager
 *
 * Web Audio API-based audio manager for preview playback.
 * Features:
 *  - AudioManager class with load, play, stop, sync
 *  - BGM playback with volume and fade-in/out
 *  - SFX one-shot playback
 *  - Audio buffer cache pool
 *  - Time synchronization with timeline
 *  - Master volume control
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CachedAudio {
  buffer: AudioBuffer;
  url: string;
  loadedAt: number;
}

interface ActiveSource {
  id: string;
  source: AudioBufferSourceNode;
  gainNode: GainNode;
  startTime: number;
  duration: number;
  type: 'bgm' | 'sfx';
}

interface FadeState {
  gainNode: GainNode;
  targetVolume: number;
  duration: number;
  startTime: number;
  startVolume: number;
}

// ---------------------------------------------------------------------------
// AudioManager
// ---------------------------------------------------------------------------

export class AudioManager {
  private context: AudioContext;
  private masterGain: GainNode;
  private bgmGain: GainNode;
  private sfxGain: GainNode;

  // Cache pool: url → cached audio
  private cache: Map<string, CachedAudio> = new Map();
  private maxCacheSize: number = 100;

  // Active audio sources
  private activeSources: Map<string, ActiveSource> = new Map();
  private activeBgmId: string | null = null;

  // Fade states
  private activeFades: FadeState[] = [];

  // Timeline sync
  private syncedTime: number = 0;
  private isSyncMode: boolean = false;

  constructor() {
    this.context = new AudioContext();
    this.masterGain = this.context.createGain();
    this.masterGain.connect(this.context.destination);

    this.bgmGain = this.context.createGain();
    this.bgmGain.connect(this.masterGain);

    this.sfxGain = this.context.createGain();
    this.sfxGain.connect(this.masterGain);
  }

  // -----------------------------------------------------------------------
  // Loading
  // -----------------------------------------------------------------------

  /**
   * Load an audio file from a URL and cache the decoded AudioBuffer.
   */
  async loadAudio(url: string): Promise<AudioBuffer> {
    // Return from cache if available
    const cached = this.cache.get(url);
    if (cached) {
      return cached.buffer;
    }

    // Fetch and decode
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load audio: ${url} (${response.status})`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await this.context.decodeAudioData(arrayBuffer);

    // Store in cache
    this.cache.set(url, {
      buffer: audioBuffer,
      url,
      loadedAt: Date.now(),
    });

    // Evict oldest entries if cache is too large
    this.evictCacheIfNeeded();

    return audioBuffer;
  }

  /**
   * Pre-load multiple audio URLs in parallel.
   */
  async preloadAll(urls: string[]): Promise<void> {
    const promises = urls.map(url => this.loadAudio(url).catch(err => {
      console.warn(`Failed to preload audio: ${url}`, err);
      return null;
    }));
    await Promise.all(promises);
  }

  /**
   * Check if a URL is already cached.
   */
  isCached(url: string): boolean {
    return this.cache.has(url);
  }

  // -----------------------------------------------------------------------
  // BGM (Background Music) playback
  // -----------------------------------------------------------------------

  /**
   * Play background music.
   * Stops any currently playing BGM.
   */
  async playBgm(
    track: string,
    volume: number = 0.5,
    fadeIn: number = 0,
  ): Promise<void> {
    // Stop current BGM
    if (this.activeBgmId) {
      await this.stopBgm(0.3);
    }

    // Ensure the audio context is running
    if (this.context.state === 'suspended') {
      await this.context.resume();
    }

    const buffer = await this.loadAudio(track);
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const gainNode = this.context.createGain();
    gainNode.connect(this.bgmGain);

    if (fadeIn > 0) {
      gainNode.gain.setValueAtTime(0, this.context.currentTime);
      gainNode.gain.linearRampToValueAtTime(volume, this.context.currentTime + fadeIn);
    } else {
      gainNode.gain.setValueAtTime(volume, this.context.currentTime);
    }

    source.connect(gainNode);
    source.start(0);

    const bgmId = `bgm_${Date.now()}`;
    this.activeBgmId = bgmId;
    this.activeSources.set(bgmId, {
      id: bgmId,
      source,
      gainNode,
      startTime: this.context.currentTime,
      duration: buffer.duration,
      type: 'bgm',
    });

    // Clean up when the source ends (if not looping)
    source.onended = () => {
      this.activeSources.delete(bgmId);
      if (this.activeBgmId === bgmId) {
        this.activeBgmId = null;
      }
    };
  }

  /**
   * Stop the current BGM with optional fade out.
   */
  async stopBgm(fadeOut: number = 0): Promise<void> {
    if (!this.activeBgmId) return;

    const active = this.activeSources.get(this.activeBgmId);
    if (!active) {
      this.activeBgmId = null;
      return;
    }

    if (fadeOut > 0) {
      const currentVolume = active.gainNode.gain.value;
      active.gainNode.gain.setValueAtTime(currentVolume, this.context.currentTime);
      active.gainNode.gain.linearRampToValueAtTime(0, this.context.currentTime + fadeOut);

      // Schedule stop after fade
      await new Promise<void>(resolve => {
        setTimeout(() => {
          try {
            active.source.stop();
          } catch {
            // Already stopped
          }
          this.activeSources.delete(active.id);
          if (this.activeBgmId === active.id) {
            this.activeBgmId = null;
          }
          resolve();
        }, fadeOut * 1000);
      });
    } else {
      try {
        active.source.stop();
      } catch {
        // Already stopped
      }
      this.activeSources.delete(active.id);
      this.activeBgmId = null;
    }
  }

  /**
   * Set BGM volume (0-1).
   */
  setBgmVolume(volume: number): void {
    this.bgmGain.gain.setValueAtTime(
      Math.max(0, Math.min(1, volume)),
      this.context.currentTime,
    );
  }

  // -----------------------------------------------------------------------
  // SFX (Sound Effects) playback
  // -----------------------------------------------------------------------

  /**
   * Play a one-shot sound effect.
   */
  async playSfx(sound: string, volume: number = 1.0): Promise<void> {
    if (this.context.state === 'suspended') {
      await this.context.resume();
    }

    const buffer = await this.loadAudio(sound);
    const source = this.context.createBufferSource();
    source.buffer = buffer;

    const gainNode = this.context.createGain();
    gainNode.gain.setValueAtTime(Math.max(0, Math.min(1, volume)), this.context.currentTime);
    gainNode.connect(this.sfxGain);
    source.connect(gainNode);

    const sfxId = `sfx_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    this.activeSources.set(sfxId, {
      id: sfxId,
      source,
      gainNode,
      startTime: this.context.currentTime,
      duration: buffer.duration,
      type: 'sfx',
    });

    source.onended = () => {
      this.activeSources.delete(sfxId);
    };

    source.start(0);
  }

  /**
   * Set SFX master volume (0-1).
   */
  setSfxVolume(volume: number): void {
    this.sfxGain.gain.setValueAtTime(
      Math.max(0, Math.min(1, volume)),
      this.context.currentTime,
    );
  }

  // -----------------------------------------------------------------------
  // Global controls
  // -----------------------------------------------------------------------

  /**
   * Stop all currently playing audio.
   */
  stopAll(): void {
    for (const [id, active] of this.activeSources) {
      try {
        active.source.stop();
      } catch {
        // Already stopped
      }
    }
    this.activeSources.clear();
    this.activeBgmId = null;
  }

  /**
   * Set master volume (0-1).
   */
  setMasterVolume(volume: number): void {
    this.masterGain.gain.setValueAtTime(
      Math.max(0, Math.min(1, volume)),
      this.context.currentTime,
    );
  }

  /**
   * Get master volume.
   */
  getMasterVolume(): number {
    return this.masterGain.gain.value;
  }

  /**
   * Pause all audio by suspending the AudioContext.
   */
  async pause(): Promise<void> {
    if (this.context.state === 'running') {
      await this.context.suspend();
    }
  }

  /**
   * Resume audio playback.
   */
  async resume(): Promise<void> {
    if (this.context.state === 'suspended') {
      await this.context.resume();
    }
  }

  // -----------------------------------------------------------------------
  // Timeline synchronization
  // -----------------------------------------------------------------------

  /**
   * Sync the audio manager to the timeline's current time.
   * If BGM is playing, seek it to match the timeline position.
   */
  setTime(t: number): void {
    this.syncedTime = t;

    if (this.activeBgmId) {
      const active = this.activeSources.get(this.activeBgmId);
      if (active) {
        // Stop and restart at the new time
        const currentGain = active.gainNode.gain.value;
        try {
          active.source.stop();
        } catch {
          // Already stopped
        }

        // Recreate the source at the new position
        const newSource = this.context.createBufferSource();
        newSource.buffer = active.source.buffer;
        newSource.loop = true;
        newSource.connect(active.gainNode);

        const offset = t % (active.source.buffer?.duration ?? 1);
        newSource.start(0, offset);

        active.source = newSource;
        active.startTime = this.context.currentTime - t;

        newSource.onended = () => {
          this.activeSources.delete(active.id);
          if (this.activeBgmId === active.id) {
            this.activeBgmId = null;
          }
        };
      }
    }
  }

  /**
   * Get the current synced time.
   */
  getSyncedTime(): number {
    return this.syncedTime;
  }

  // -----------------------------------------------------------------------
  // Cleanup
  // -----------------------------------------------------------------------

  /**
   * Clear the audio buffer cache.
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Destroy the audio manager and release all resources.
   */
  async destroy(): Promise<void> {
    this.stopAll();
    this.clearCache();
    if (this.context.state !== 'closed') {
      await this.context.close();
    }
  }

  /**
   * Get the number of cached audio buffers.
   */
  getCacheSize(): number {
    return this.cache.size;
  }

  /**
   * Get the number of active audio sources.
   */
  getActiveSourceCount(): number {
    return this.activeSources.size;
  }

  // -----------------------------------------------------------------------
  // Internal
  // -----------------------------------------------------------------------

  private evictCacheIfNeeded(): void {
    if (this.cache.size <= this.maxCacheSize) return;

    // Sort by loadedAt and remove oldest
    const entries = [...this.cache.entries()].sort(
      (a, b) => a[1].loadedAt - b[1].loadedAt,
    );

    const toRemove = entries.length - this.maxCacheSize;
    for (let i = 0; i < toRemove; i++) {
      this.cache.delete(entries[i][0]);
    }
  }
}
