/**
 * panda-shot-engine — Shot Exporter
 *
 * Features:
 *  - ShotExporter class
 *  - exportFrames: render all frames of a shot to an ImageData array
 *  - exportToImageSequence: export PNG files to a directory
 *  - exportToVideo: encode to MP4 using ffmpeg subprocess
 *  - Progress callback support
 */

import type { Shot } from '../engine/types';
import { SceneRenderer, type AssetLibrary, createEmptyAssetLibrary } from '../engine/renderer';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ExportFrameOptions {
  fps: number;
  width: number;
  height: number;
}

export interface ExportVideoOptions extends ExportFrameOptions {
  /** Video codec (default: 'libx264') */
  codec?: string;
  /** Pixel format (default: 'yuv420p') */
  pixelFormat?: string;
  /** Video quality CRF value (0-51, lower = better, default: 23) */
  crf?: number;
  /** Include audio track */
  includeAudio?: boolean;
  /** Audio file path for muxing */
  audioPath?: string;
}

export interface ExportProgress {
  currentFrame: number;
  totalFrames: number;
  currentShot: number;
  totalShots: number;
  percentage: number;
}

export type ProgressCallback = (progress: ExportProgress) => void;

// ---------------------------------------------------------------------------
// Frame data container
// ---------------------------------------------------------------------------

export interface RenderedFrame {
  index: number;
  imageData: ImageData;
  timestamp: number;
}

// ---------------------------------------------------------------------------
// ShotExporter
// ---------------------------------------------------------------------------

export class ShotExporter {
  private assets: AssetLibrary;

  constructor(assets?: AssetLibrary) {
    this.assets = assets ?? createEmptyAssetLibrary();
  }

  /**
   * Set the asset library for rendering.
   */
  setAssets(assets: AssetLibrary): void {
    this.assets = assets;
  }

  // -----------------------------------------------------------------------
  // Export frames to ImageData array
  // -----------------------------------------------------------------------

  /**
   * Render all frames of a shot and return as an array of ImageData.
   * Uses an OffscreenCanvas (or a regular canvas in environments that
   * don't support OffscreenCanvas).
   */
  async exportFrames(
    shot: Shot,
    options: ExportFrameOptions,
    onProgress?: ProgressCallback,
  ): Promise<RenderedFrame[]> {
    const { fps, width, height } = options;
    const totalFrames = Math.ceil(shot.duration * fps);
    const frames: RenderedFrame[] = [];

    // Create an offscreen canvas for rendering
    const canvas = this.createCanvas(width, height);
    const renderer = new SceneRenderer(canvas as HTMLCanvasElement, fps, this.assets);
    renderer.setShot(shot);

    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

    for (let i = 0; i < totalFrames; i++) {
      renderer.renderFrame(i);

      const imageData = ctx.getImageData(0, 0, width, height);
      frames.push({
        index: i,
        imageData,
        timestamp: i / fps,
      });

      if (onProgress) {
        onProgress({
          currentFrame: i + 1,
          totalFrames,
          currentShot: 1,
          totalShots: 1,
          percentage: ((i + 1) / totalFrames) * 100,
        });
      }

      // Yield to event loop every 5 frames to prevent UI freezing
      if (i % 5 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }

    return frames;
  }

  // -----------------------------------------------------------------------
  // Export to PNG sequence
  // -----------------------------------------------------------------------

  /**
   * Export a shot as a sequence of PNG images to the specified directory.
   * This uses Node.js fs (runs in Electron main process or via IPC).
   */
  async exportToImageSequence(
    shot: Shot,
    outputDir: string,
    options?: Partial<ExportFrameOptions>,
    onProgress?: ProgressCallback,
  ): Promise<string[]> {
    const fps = options?.fps ?? 24;
    const width = options?.width ?? 960;
    const height = options?.height ?? 540;

    const frames = await this.exportFrames(
      shot,
      { fps, width, height },
      onProgress,
    );

    const fs = require('fs');
    const path = require('path');

    // Ensure output directory exists
    await fs.promises.mkdir(outputDir, { recursive: true });

    const filePaths: string[] = [];
    const padLength = String(frames.length).length;

    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];
      const paddedIndex = String(i).padStart(padLength, '0');
      const filename = `frame_${paddedIndex}.png`;
      const filePath = path.join(outputDir, filename);

      // Convert ImageData to PNG buffer
      const pngBuffer = await this.imageDataToPngBuffer(frame.imageData, width, height);
      await fs.promises.writeFile(filePath, pngBuffer);

      filePaths.push(filePath);

      if (onProgress) {
        onProgress({
          currentFrame: i + 1,
          totalFrames: frames.length,
          currentShot: 1,
          totalShots: 1,
          percentage: ((i + 1) / frames.length) * 100,
        });
      }
    }

    return filePaths;
  }

  // -----------------------------------------------------------------------
  // Export to video (MP4) using ffmpeg
  // -----------------------------------------------------------------------

  /**
   * Export one or more shots as an MP4 video using ffmpeg.
   * Renders all frames to a temp directory as PNGs, then invokes ffmpeg
   * to encode them into a video file.
   */
  async exportToVideo(
    shots: Shot[],
    outputPath: string,
    options?: Partial<ExportVideoOptions>,
    onProgress?: ProgressCallback,
  ): Promise<void> {
    const fs = require('fs');
    const path = require('path');
    const os = require('os');
    const { execFile } = require('child_process');

    const fps = options?.fps ?? 24;
    const width = options?.width ?? 960;
    const height = options?.height ?? 540;
    const codec = options?.codec ?? 'libx264';
    const pixelFormat = options?.pixelFormat ?? 'yuv420p';
    const crf = options?.crf ?? 23;

    // Create temp directory for frame images
    const tempDir = path.join(os.tmpdir(), `panda-export-${Date.now()}`);
    await fs.promises.mkdir(tempDir, { recursive: true });

    let globalFrameIndex = 0;
    let totalFramesAllShots = 0;
    for (const shot of shots) {
      totalFramesAllShots += Math.ceil(shot.duration * fps);
    }

    const padLength = String(totalFramesAllShots).length;

    // Render all shots' frames
    for (let shotIdx = 0; shotIdx < shots.length; shotIdx++) {
      const shot = shots[shotIdx];
      const shotTotalFrames = Math.ceil(shot.duration * fps);

      const canvas = this.createCanvas(width, height);
      const renderer = new SceneRenderer(canvas as HTMLCanvasElement, fps, this.assets);
      renderer.setShot(shot);
      const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

      for (let f = 0; f < shotTotalFrames; f++) {
        renderer.renderFrame(f);

        const imageData = ctx.getImageData(0, 0, width, height);
        const pngBuffer = await this.imageDataToPngBuffer(imageData, width, height);

        const paddedIndex = String(globalFrameIndex).padStart(padLength, '0');
        const framePath = path.join(tempDir, `frame_${paddedIndex}.png`);
        await fs.promises.writeFile(framePath, pngBuffer);

        globalFrameIndex++;

        if (onProgress) {
          onProgress({
            currentFrame: globalFrameIndex,
            totalFrames: totalFramesAllShots,
            currentShot: shotIdx + 1,
            totalShots: shots.length,
            percentage: (globalFrameIndex / totalFramesAllShots) * 100,
          });
        }

        if (f % 5 === 0) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }
    }

    // Build ffmpeg command
    const framePattern = path.join(tempDir, `frame_%0${padLength}d.png`);
    const ffmpegArgs = [
      '-y',
      '-framerate', String(fps),
      '-i', framePattern,
      '-c:v', codec,
      '-pix_fmt', pixelFormat,
      '-crf', String(crf),
      '-movflags', '+faststart',
    ];

    // Optionally add audio
    if (options?.includeAudio && options?.audioPath) {
      const audioExists = await fs.promises.access(options.audioPath).then(() => true).catch(() => false);
      if (audioExists) {
        ffmpegArgs.push('-i', options.audioPath, '-c:a', 'aac', '-shortest');
      }
    }

    ffmpegArgs.push(outputPath);

    // Execute ffmpeg
    await new Promise<void>((resolve, reject) => {
      const ffmpegPath = this.findFfmpegPath();
      const proc = execFile(ffmpegPath, ffmpegArgs, (error: Error | null) => {
        if (error) {
          reject(new Error(`ffmpeg failed: ${error.message}`));
        } else {
          resolve();
        }
      });

      proc.stderr?.on('data', (data: string) => {
        // ffmpeg outputs progress info on stderr
        const frameMatch = String(data).match(/frame=\s*(\d+)/);
        if (frameMatch && onProgress) {
          const encodedFrame = parseInt(frameMatch[1], 10);
          onProgress({
            currentFrame: encodedFrame,
            totalFrames: totalFramesAllShots,
            currentShot: shots.length,
            totalShots: shots.length,
            percentage: (encodedFrame / totalFramesAllShots) * 100,
          });
        }
      });
    });

    // Clean up temp directory
    await this.removeDirRecursive(tempDir);
  }

  // -----------------------------------------------------------------------
  // Helper: Create canvas (supports both browser and Node environments)
  // -----------------------------------------------------------------------

  private createCanvas(width: number, height: number): HTMLCanvasElement {
    // In browser / Electron renderer
    if (typeof document !== 'undefined') {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      return canvas;
    }

    // In Node.js with OffscreenCanvas
    if (typeof OffscreenCanvas !== 'undefined') {
      return new OffscreenCanvas(width, height) as unknown as HTMLCanvasElement;
    }

    // Fallback: try to use canvas package (node-canvas)
    try {
      const { createCanvas } = require('canvas');
      return createCanvas(width, height);
    } catch {
      throw new Error(
        'No canvas implementation available. In Node.js, install the "canvas" package.',
      );
    }
  }

  // -----------------------------------------------------------------------
  // Helper: Convert ImageData to PNG buffer
  // -----------------------------------------------------------------------

  private async imageDataToPngBuffer(
    imageData: ImageData,
    width: number,
    height: number,
  ): Promise<Buffer> {
    // Try using the canvas package if available (Node.js)
    try {
      const { createCanvas } = require('canvas');
      const tempCanvas = createCanvas(width, height);
      const tempCtx = tempCanvas.getContext('2d');
      tempCtx.putImageData(imageData, 0, 0);
      return tempCanvas.toBuffer('image/png');
    } catch {
      // Fallback: Manual PNG encoding for minimal environments
      // This creates a valid but uncompressed PNG
      return this.encodeRawPng(imageData.data, width, height);
    }
  }

  /**
   * Minimal PNG encoder. Produces a valid (uncompressed) PNG file from raw RGBA data.
   */
  private encodeRawPng(data: Uint8ClampedArray, width: number, height: number): Buffer {
    // PNG consists of: signature + IHDR + IDAT + IEND
    const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

    // IHDR chunk
    const ihdrData = Buffer.alloc(13);
    ihdrData.writeUInt32BE(width, 0);
    ihdrData.writeUInt32BE(height, 4);
    ihdrData[8] = 8;  // bit depth
    ihdrData[9] = 6;  // color type: RGBA
    ihdrData[10] = 0; // compression
    ihdrData[11] = 0; // filter
    ihdrData[12] = 0; // interlace
    const ihdr = this.createPngChunk('IHDR', ihdrData);

    // Prepare raw image data with filter bytes
    // Each row starts with a filter byte (0 = None)
    const rawRowLength = width * 4 + 1;
    const rawData = Buffer.alloc(rawRowLength * height);
    for (let y = 0; y < height; y++) {
      rawData[y * rawRowLength] = 0; // filter: None
      const rowStart = y * width * 4;
      data.slice(rowStart, rowStart + width * 4).forEach((val, i) => {
        rawData[y * rawRowLength + 1 + i] = val;
      });
    }

    // Compress with zlib (deflate)
    const zlib = require('zlib');
    const compressed = zlib.deflateSync(rawData);
    const idat = this.createPngChunk('IDAT', compressed);

    // IEND chunk
    const iend = this.createPngChunk('IEND', Buffer.alloc(0));

    return Buffer.concat([signature, ihdr, idat, iend]);
  }

  private createPngChunk(type: string, data: Buffer): Buffer {
    const typeBytes = Buffer.from(type, 'ascii');
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length, 0);

    const crcInput = Buffer.concat([typeBytes, data]);
    const crc = this.crc32(crcInput);
    const crcBytes = Buffer.alloc(4);
    crcBytes.writeUInt32BE(crc >>> 0, 0);

    return Buffer.concat([length, typeBytes, data, crcBytes]);
  }

  private crc32(buf: Buffer): number {
    let c = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) {
      c ^= buf[i];
      for (let j = 0; j < 8; j++) {
        if (c & 1) {
          c = (c >>> 1) ^ 0xEDB88320;
        } else {
          c = c >>> 1;
        }
      }
    }
    return c ^ 0xFFFFFFFF;
  }

  // -----------------------------------------------------------------------
  // Helper: Find ffmpeg binary
  // -----------------------------------------------------------------------

  private findFfmpegPath(): string {
    // Check common locations
    const paths = [
      'ffmpeg',                         // system PATH
      '/usr/bin/ffmpeg',
      '/usr/local/bin/ffmpeg',
      '/opt/homebrew/bin/ffmpeg',
    ];

    // On Windows, also check these
    if (process.platform === 'win32') {
      paths.push(
        'C:\\ffmpeg\\bin\\ffmpeg.exe',
        `${process.env.PROGRAMFILES}\\ffmpeg\\bin\\ffmpeg.exe`,
      );
    }

    // Try to find ffmpeg-static package
    try {
      const ffmpegStatic = require('ffmpeg-static');
      if (ffmpegStatic) return ffmpegStatic;
    } catch {
      // Not installed
    }

    // Default to system PATH
    return 'ffmpeg';
  }

  // -----------------------------------------------------------------------
  // Helper: Recursive directory removal
  // -----------------------------------------------------------------------

  private async removeDirRecursive(dirPath: string): Promise<void> {
    const fs = require('fs');
    const path = require('path');

    const exists = await fs.promises.access(dirPath).then(() => true).catch(() => false);
    if (!exists) return;

    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        await this.removeDirRecursive(fullPath);
      } else {
        await fs.promises.unlink(fullPath);
      }
    }
    await fs.promises.rmdir(dirPath);
  }
}
