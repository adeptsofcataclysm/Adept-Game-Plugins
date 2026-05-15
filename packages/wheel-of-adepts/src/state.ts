import type { RoundIndex } from "@adept/plugin-sdk";

export type WheelSwapPhase =
  | { kind: "await_pick"; chooserSeat: number }
  | { kind: "await_host"; chooserSeat: number; targetSeat: number };

export type WheelPluginState = {
  fieldVisible: boolean;
  spinsLeft: number;
  displayRotation: number;
  spinSeq: number;
  swapPhase: WheelSwapPhase | null;
  lastWinIndex: number | null;
  lastWinLabel: string | null;
  /** Server-side guard against double-spin while clients animate. */
  busyUntilMs?: number;
};

export type WheelOverlayAnchor =
  | { board: "round"; roundIndex: RoundIndex; rowIndex: number; colIndex: number }
  | { board: "finalTransition"; rowIndex: number; colIndex: number };

/** Lives in `snapshot.segmentState[WHEEL_OVERLAY_SEGMENT_KEY]` after reveal. */
export type WheelOverlaySegment = WheelPluginState & {
  anchor: WheelOverlayAnchor;
};
