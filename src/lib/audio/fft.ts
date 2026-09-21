/** In-place radix-2 Cooley–Tukey FFT. Length must be a power of two. */
export function fft(real: Float32Array, imag: Float32Array, inverse = false): void {
  const n = real.length;
  if (n !== imag.length || n < 2 || (n & (n - 1)) !== 0) {
    throw new Error("FFT length must be a power of two");
  }

  let j = 0;
  for (let i = 0; i < n; i++) {
    if (i < j) {
      const tr = real[i]!;
      const ti = imag[i]!;
      real[i] = real[j]!;
      imag[i] = imag[j]!;
      real[j] = tr;
      imag[j] = ti;
    }
    let m = n >> 1;
    while (m >= 1 && j >= m) {
      j -= m;
      m >>= 1;
    }
    j += m;
  }

  for (let size = 2; size <= n; size <<= 1) {
    const half = size >> 1;
    const theta = ((inverse ? 2 : -2) * Math.PI) / size;
    const wrStep = Math.cos(theta);
    const wiStep = Math.sin(theta);
    for (let i = 0; i < n; i += size) {
      let wr = 1;
      let wi = 0;
      for (let k = 0; k < half; k++) {
        const even = i + k;
        const odd = even + half;
        const br = real[odd]!;
        const bi = imag[odd]!;
        const tr = wr * br - wi * bi;
        const ti = wr * bi + wi * br;
        const ar = real[even]!;
        const ai = imag[even]!;
        real[even] = ar + tr;
        imag[even] = ai + ti;
        real[odd] = ar - tr;
        imag[odd] = ai - ti;
        const nwr = wr * wrStep - wi * wiStep;
        wi = wr * wiStep + wi * wrStep;
        wr = nwr;
      }
    }
  }

  if (inverse) {
    const inv = 1 / n;
    for (let i = 0; i < n; i++) {
      real[i]! *= inv;
      imag[i]! *= inv;
    }
  }
}

export function hann(n: number): Float32Array {
  const w = new Float32Array(n);
  if (n < 2) return w;
  for (let i = 0; i < n; i++) {
    w[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (n - 1)));
  }
  return w;
}

export function nextPow2(n: number): number {
  let p = 1;
  while (p < n) p <<= 1;
  return p;
}
