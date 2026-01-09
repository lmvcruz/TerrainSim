/**
 * Perlin Noise implementation in TypeScript
 * Port of the C++ implementation for API server use
 */

export class PerlinNoise {
  private p: Uint8Array;

  constructor(seed: number = 0) {
    this.p = new Uint8Array(512);
    this.initPermutation(seed);
  }

  private initPermutation(seed: number): void {
    // Initialize with values 0-255
    const permutation = new Uint8Array(256);
    for (let i = 0; i < 256; i++) {
      permutation[i] = i;
    }

    // Simple seeded shuffle (LCG-based)
    let rng = seed;
    const nextRandom = () => {
      rng = (rng * 1664525 + 1013904223) >>> 0;
      return rng / 0x100000000;
    };

    // Fisher-Yates shuffle
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(nextRandom() * (i + 1));
      [permutation[i], permutation[j]] = [permutation[j], permutation[i]];
    }

    // Duplicate the permutation to avoid modulo operations
    for (let i = 0; i < 256; i++) {
      this.p[i] = permutation[i];
      this.p[i + 256] = permutation[i];
    }
  }

  private hash(ix: number, iy: number): number {
    return this.p[this.p[(ix & 255)] + (iy & 255)];
  }

  private grad(ix: number, iy: number, dx: number, dy: number): number {
    const h = this.hash(ix, iy) & 7; // Use lower 3 bits to select from 8 gradients

    switch (h) {
      case 0: return dx + dy;   // ( 1,  1)
      case 1: return dx - dy;   // ( 1, -1)
      case 2: return -dx + dy;  // (-1,  1)
      case 3: return -dx - dy;  // (-1, -1)
      case 4: return dx;        // ( 1,  0)
      case 5: return -dx;       // (-1,  0)
      case 6: return dy;        // ( 0,  1)
      case 7: return -dy;       // ( 0, -1)
      default: return 0.0;
    }
  }

  public static fade(t: number): number {
    // Improved fade function: 6t^5 - 15t^4 + 10t^3
    return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
  }

  public static lerp(t: number, a: number, b: number): number {
    return a + t * (b - a);
  }

  public noise(x: number, y: number): number {
    // Find the integer grid cell containing the point
    const ix0 = Math.floor(x);
    const iy0 = Math.floor(y);
    const ix1 = ix0 + 1;
    const iy1 = iy0 + 1;

    // Calculate the fractional part (position within the cell)
    const fx = x - ix0;
    const fy = y - iy0;

    // Apply fade curves to the fractional parts
    const u = PerlinNoise.fade(fx);
    const v = PerlinNoise.fade(fy);

    // Calculate gradients at the four corners of the cell
    const g00 = this.grad(ix0, iy0, fx, fy);
    const g10 = this.grad(ix1, iy0, fx - 1, fy);
    const g01 = this.grad(ix0, iy1, fx, fy - 1);
    const g11 = this.grad(ix1, iy1, fx - 1, fy - 1);

    // Bilinear interpolation of the gradient values
    const x1 = PerlinNoise.lerp(u, g00, g10);
    const x2 = PerlinNoise.lerp(u, g01, g11);
    const result = PerlinNoise.lerp(v, x1, x2);

    return result;
  }
}
