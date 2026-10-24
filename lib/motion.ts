/**
 * Client-side motion gate. Draws the video into a tiny grayscale canvas and
 * compares it to the previous sample, so empty rooms cost no model calls.
 */
export class MotionGate {
  private small: HTMLCanvasElement;
  private smallCtx: CanvasRenderingContext2D;
  private capture: HTMLCanvasElement;
  private captureCtx: CanvasRenderingContext2D;
  private prev: Uint8ClampedArray | null = null;

  constructor(
    private width = 64,
    private height = 48,
    private captureWidth = 640,
    private quality = 0.6,
  ) {
    this.small = document.createElement("canvas");
    this.small.width = width;
    this.small.height = height;
    this.smallCtx = this.small.getContext("2d", { willReadFrequently: true })!;
    this.capture = document.createElement("canvas");
    this.captureCtx = this.capture.getContext("2d")!;
  }

  /** Mean absolute grayscale difference vs the previous sample (0 to 255). */
  sample(video: HTMLVideoElement): number {
    this.smallCtx.drawImage(video, 0, 0, this.width, this.height);
    const { data } = this.smallCtx.getImageData(0, 0, this.width, this.height);
    const gray = new Uint8ClampedArray(this.width * this.height);
    for (let i = 0, p = 0; i < data.length; i += 4, p++) {
      gray[p] = (data[i] * 299 + data[i + 1] * 587 + data[i + 2] * 114) / 1000;
    }
    let score = 0;
    if (this.prev) {
      let sum = 0;
      for (let p = 0; p < gray.length; p++) sum += Math.abs(gray[p] - this.prev[p]);
      score = sum / gray.length;
    }
    this.prev = gray;
    return score;
  }

  /** Grab the current frame as a 640-wide JPEG data URL. */
  grab(video: HTMLVideoElement): string {
    const ratio = video.videoHeight / video.videoWidth || 0.75;
    this.capture.width = this.captureWidth;
    this.capture.height = Math.round(this.captureWidth * ratio);
    this.captureCtx.drawImage(video, 0, 0, this.capture.width, this.capture.height);
    return this.capture.toDataURL("image/jpeg", this.quality);
  }

  reset() {
    this.prev = null;
  }
}
