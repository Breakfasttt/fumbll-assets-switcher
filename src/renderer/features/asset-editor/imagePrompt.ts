export interface PromptContext {
  rosterName: string;
  positionName: string;
  positionType: string;
}

/**
 * Builds a descriptive prompt for a generative image AI (Midjourney, DALL-E,
 * Stable Diffusion, ...), tailored to the exact asset being replaced: a
 * portrait (single character art) or an iconset sprite sheet (4 tactical
 * poses used on the pitch).
 */
export function buildPortraitPrompt(ctx: PromptContext, width: number, height: number): string {
  return [
    `Fantasy football (Blood Bowl-style) character portrait of a "${ctx.positionName}" from the "${ctx.rosterName}" team${ctx.positionType === "Star" ? " (a named star player)" : ""}.`,
    `Bust/upper-body shot, facing forward or three-quarter view, dramatic sports-card style lighting, painted illustration style consistent with tabletop miniature game art.`,
    `Portrait orientation, plain or subtly textured background so the character reads clearly at small size.`,
    `Target output size: ${width}x${height} pixels (portrait aspect ratio ${width}:${height}).`,
  ].join(" ");
}

export function buildIconsetPrompt(ctx: PromptContext, cellSize: number, rows: number): string {
  return [
    `Top-down tactical sprite sheet for a "${ctx.positionName}" from the "${ctx.rosterName}" team${ctx.positionType === "Star" ? " (a named star player)" : ""}, in the style of the Blood Bowl / FUMBBL pitch icon set.`,
    `Sprite sheet layout: exactly 4 columns of equal-size square cells, each ${cellSize}x${cellSize} pixels, arranged left to right as: (1) home team color, standing/idle pose, (2) home team color, moving/running pose, (3) away team color, standing/idle pose, (4) away team color, moving/running pose.`,
    `Same character design across all 4 cells, only the pose and team color accent changing.`,
    rows > 1
      ? `${rows} rows total (one row per alternate look/variant of this position); keep every row visually consistent with the same style.`
      : `Single row (no alternate variants needed for this position).`,
    `Flat-colored pixel-art or simplified icon style, clear silhouette readable at ~30x30 px in-game, transparent or solid background outside the character.`,
    `Total sheet size: ${cellSize * 4}x${cellSize * rows} pixels.`,
  ].join(" ");
}
