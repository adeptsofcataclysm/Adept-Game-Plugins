export type OpeningShowState = {
  /** -1 = nothing shown yet; 0..n-1 = current emoji line */
  emojiLineIndex: number;
  spectatorCorrectCounts: Record<string, number>;
};

