// Club-colour utilities. The design depends on real club colours (brief §8).

export function relativeLuminance(hex: string): number {
  const h = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Readable foreground (ink or white) for a club-colour background. */
export function fgOn(hex: string): string {
  return relativeLuminance(hex) > 0.45 ? "#1a1e1c" : "#fbfaf6";
}

/** Very light club colours (e.g. Real Madrid white) get an ink edge so the split still reads. */
export function needsEdge(hex: string): boolean {
  return relativeLuminance(hex) > 0.8;
}
