/** Pitch overrides are keyed by `…/Pitches/<Slug>.zip?pitch=<weather>` URLs (see features/pitches). */
export function isPitchUrl(url: string): boolean {
  return url.includes("/Pitches/");
}

/** "C:\Users\me\very\long\path\cache" -> "C:\Users\me…\path\cache": keeps both ends of a path readable. */
export function truncateMiddle(text: string, max: number): string {
  if (text.length <= max) return text;
  const keep = max - 1;
  const head = Math.ceil(keep * 0.4);
  return `${text.slice(0, head)}…${text.slice(text.length - (keep - head))}`;
}
