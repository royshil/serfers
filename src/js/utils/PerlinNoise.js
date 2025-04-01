// A simple implementation of Perlin noise for JavaScript
// Adapted from https://github.com/josephg/noisejs

export class PerlinNoise {
    constructor(seed) {
        this.seed = seed || Math.random();
        this.gradients = {};
        this.memory = {};
    }

    _random() {
        let s = this.seed + 1;
        s = Math.sin(s) * 10000;
        return s - Math.floor(s);
    }

    _dotProductI(ix, iy, x, y) {
        // Get cached gradient or compute it
        const key = ix + ',' + iy;
        let gradient;

        if (key in this.gradients) {
            gradient = this.gradients[key];
        } else {
            // Random angle
            const theta = 2 * Math.PI * this._random();
            gradient = {
                x: Math.cos(theta),
                y: Math.sin(theta)
            };
            this.gradients[key] = gradient;
        }

        // Calculate dot product
        const dx = x - ix;
        const dy = y - iy;
        return dx * gradient.x + dy * gradient.y;
    }

    // Smoothing function
    _smootherstep(t) {
        return t * t * t * (t * (t * 6 - 15) + 10);
    }

    // Linear interpolation
    _lerp(a, b, t) {
        return a + t * (b - a);
    }

    noise(x, y) {
        // Unit square coordinates
        const x0 = Math.floor(x);
        const y0 = Math.floor(y);
        const x1 = x0 + 1;
        const y1 = y0 + 1;

        // Get dot products for each corner
        const n0 = this._dotProductI(x0, y0, x, y);
        const n1 = this._dotProductI(x1, y0, x, y);
        const n2 = this._dotProductI(x0, y1, x, y);
        const n3 = this._dotProductI(x1, y1, x, y);

        // Apply smoothing to coordinates
        const sx = this._smootherstep(x - x0);
        const sy = this._smootherstep(y - y0);

        // Interpolate along x
        const nx0 = this._lerp(n0, n1, sx);
        const nx1 = this._lerp(n2, n3, sx);

        // Interpolate along y
        const result = this._lerp(nx0, nx1, sy);

        // Return a value between -1 and 1
        return result;
    }

    // Generate noise at multiple frequencies
    fbm(x, y, octaves = 6, lacunarity = 2, persistence = 0.5) {
        let value = 0;
        let amplitude = 1;
        let frequency = 1;
        let max = 0;

        // Sum multiple noise values at different frequencies
        for (let i = 0; i < octaves; i++) {
            value += this.noise(x * frequency, y * frequency) * amplitude;
            max += amplitude;
            amplitude *= persistence;
            frequency *= lacunarity;
        }

        // Normalize to [0, 1]
        return (value / max + 1) / 2;
    }
}