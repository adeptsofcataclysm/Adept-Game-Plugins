/**
 * @adept-plugins/wheel-of-adepts — server entry
 *
 * Host clicks «Крутить!» → `reveal_and_show_wheel`: cell is marked revealed,
 * `activeCard` cleared, wheel UI continues from `segmentState.wheel_of_adepts_overlay`.
 */

import type {
  ActiveCard,
  Actor,
  CardCtx,
  MutatorResult,
  PluginServerRegistry,
  SessionSnapshot,
} from "@adept/plugin-sdk";
import { WHEEL_OVERLAY_SEGMENT_KEY } from "./constants.js";
import { computeNextRotation, NUM_SEGMENTS, WHEEL_SEGMENTS } from "./segments.js";
import type { WheelOverlaySegment, WheelPluginState, WheelSwapPhase } from "./state.js";

const PLUGIN_ID = "wheel-of-adepts";
const CARD_KIND = "wheel_of_adepts";

function clampScore(n: number): number {
  return Math.max(-999_999, Math.min(999_999, Math.trunc(n)));
}

function normSeat(s: number): number {
  return (((Math.floor(s) % 5) + 5) % 5);
}

function parseParams(raw: unknown): { spinsPerQuestion: 1 | 3 } {
  if (!raw || typeof raw !== "object") return { spinsPerQuestion: 1 };
  const sp = (raw as Record<string, unknown>)["spinsPerQuestion"];
  if (sp === 3) return { spinsPerQuestion: 3 };
  return { spinsPerQuestion: 1 };
}

function readActiveCell(snap: SessionSnapshot, active: ActiveCard) {
  const board =
    active.board === "finalTransition"
      ? snap.finalTransitionBoard
      : active.roundIndex
        ? snap.roundBoard[active.roundIndex]
        : null;
  if (!board) return null;
  return board.questions[active.rowIndex]?.[active.colIndex] ?? null;
}

function getOverlay(snap: SessionSnapshot): WheelOverlaySegment | null {
  const raw = snap.segmentState[WHEEL_OVERLAY_SEGMENT_KEY];
  if (!raw || typeof raw !== "object") return null;
  if (!("anchor" in raw)) return null;
  return raw as WheelOverlaySegment;
}

function setOverlay(snap: SessionSnapshot, next: WheelOverlaySegment | null): void {
  if (next == null) {
    delete snap.segmentState[WHEEL_OVERLAY_SEGMENT_KEY];
  } else {
    snap.segmentState[WHEEL_OVERLAY_SEGMENT_KEY] = next;
  }
}

function actorSeatIndex(actor: Actor, snap: SessionSnapshot): number | null {
  if (actor.role !== "player") return null;
  const me = actor.displayName.trim().toLowerCase();
  if (!me) return null;
  for (let i = 0; i < 5; i++) {
    const slot = (snap.seatNames[i] ?? "").trim().toLowerCase();
    if (slot && me === slot) return i;
  }
  return null;
}

function applyScoreDelta(snap: SessionSnapshot, seat: number, delta: number): void {
  const i = normSeat(seat);
  snap.scores[i] = clampScore(snap.scores[i] + delta);
}

function requireHost(actor: Actor): MutatorResult {
  return actor.role === "host" ? { ok: true } : { ok: false, error: "Host only" };
}

function onOpen(ctx: CardCtx): MutatorResult {
  const { spinsPerQuestion } = parseParams(ctx.cardParams);
  const st: WheelPluginState = {
    fieldVisible: false,
    spinsLeft: spinsPerQuestion,
    displayRotation: 0,
    spinSeq: 0,
    swapPhase: null,
    lastWinIndex: null,
    lastWinLabel: null,
  };
  ctx.setPluginState(st);
  return { ok: true };
}

/**
 * While the wheel overlay is open (`activeCard` is null), all wheel events
 * except `reveal_and_show_wheel` are handled here.
 */
export function handleWheelOverlayPluginEvent(
  snap: SessionSnapshot,
  event: string,
  payload: unknown,
  actor: Actor,
): MutatorResult {
  const ov = getOverlay(snap);
  if (!ov) return { ok: false, error: "Wheel is not open" };

  if (event === "hide_wheel_field") {
    const h = requireHost(actor);
    if (!h.ok) return h;
    setOverlay(snap, null);
    return { ok: true };
  }

  if (event === "host_spin") {
    const h = requireHost(actor);
    if (!h.ok) return h;
    if (!ov.fieldVisible) return { ok: false, error: "Wheel field is hidden" };
    if (ov.spinsLeft <= 0) return { ok: false, error: "No spins left" };
    if (typeof ov.busyUntilMs === "number" && Date.now() < ov.busyUntilMs) {
      return { ok: false, error: "Wheel is still finishing the previous spin" };
    }
    if (ov.swapPhase != null) {
      return { ok: false, error: "Finish or cancel the swap first" };
    }

    const winIndex = Math.floor(Math.random() * NUM_SEGMENTS);
    const seg = WHEEL_SEGMENTS[winIndex];
    if (!seg) return { ok: false, error: "Invalid wheel segment" };

    const nextRotation = computeNextRotation(ov.displayRotation, winIndex);
    const turnSeat = normSeat(snap.currentTurnSeat);
    let nextSwap: WheelSwapPhase | null = null;
    const nextSpinsLeft = ov.spinsLeft - 1;

    switch (seg.action) {
      case "add500":
        applyScoreDelta(snap, turnSeat, 500);
        break;
      case "sub500":
        applyScoreDelta(snap, turnSeat, -500);
        break;
      case "wipe":
        for (let i = 0; i < 5; i++) snap.scores[i] = 0;
        break;
      case "swap":
        nextSwap = { kind: "await_pick", chooserSeat: turnSeat };
        break;
      default:
        break;
    }

    setOverlay(snap, {
      ...ov,
      displayRotation: nextRotation,
      spinSeq: ov.spinSeq + 1,
      spinsLeft: nextSpinsLeft,
      lastWinIndex: winIndex,
      lastWinLabel: seg.label,
      swapPhase: nextSwap,
      busyUntilMs: Date.now() + 5200,
    });
    return { ok: true };
  }

  if (event === "player_pick_swap") {
    if (!ov.swapPhase || ov.swapPhase.kind !== "await_pick") {
      return { ok: false, error: "Swap pick is not expected" };
    }
    const seat = actorSeatIndex(actor, snap);
    if (seat == null) return { ok: false, error: "Players only" };
    if (seat !== ov.swapPhase.chooserSeat) {
      return { ok: false, error: "Only the chooser may pick a swap target" };
    }
    if (!payload || typeof payload !== "object") return { ok: false, error: "Invalid payload" };
    const rawT = (payload as Record<string, unknown>)["targetSeat"];
    const t = typeof rawT === "number" ? rawT : Number(rawT);
    if (!Number.isInteger(t) || t < 0 || t > 4) return { ok: false, error: "targetSeat must be 0–4" };
    if (t === ov.swapPhase.chooserSeat) return { ok: false, error: "Pick a different seat" };

    setOverlay(snap, {
      ...ov,
      swapPhase: { kind: "await_host", chooserSeat: ov.swapPhase.chooserSeat, targetSeat: t },
    });
    return { ok: true };
  }

  if (event === "host_confirm_swap") {
    const h = requireHost(actor);
    if (!h.ok) return h;
    if (!ov.swapPhase || ov.swapPhase.kind !== "await_host") {
      return { ok: false, error: "Nothing to confirm" };
    }
    const a = normSeat(ov.swapPhase.chooserSeat);
    const b = normSeat(ov.swapPhase.targetSeat);
    const sa = snap.scores[a];
    const sb = snap.scores[b];
    snap.scores[a] = sb;
    snap.scores[b] = sa;
    setOverlay(snap, { ...ov, swapPhase: null });
    return { ok: true };
  }

  if (event === "host_cancel_swap") {
    const h = requireHost(actor);
    if (!h.ok) return h;
    if (!ov.swapPhase) return { ok: true };
    setOverlay(snap, { ...ov, swapPhase: null });
    return { ok: true };
  }

  return { ok: false, error: `Unknown event: ${event}` };
}

function onCardEvent(event: string, _payload: unknown, actor: Actor, ctx: CardCtx): MutatorResult {
  const snap = ctx.snapshot as SessionSnapshot;
  const active = snap.activeCard;
  if (!active || active.stage !== "answer") {
    return { ok: false, error: "Wheel is only available on the answer stage" };
  }

  if (event !== "reveal_and_show_wheel") {
    return { ok: false, error: "Use «Крутить!» to reveal the cell and open the wheel" };
  }

  const h = ctx.requireHost(actor);
  if (!h.ok) return h;
  if (!active.cardKinds.includes(CARD_KIND)) {
    return { ok: false, error: "This card has no wheel" };
  }

  const cell = readActiveCell(snap, active);
  const params = parseParams(cell?.cardParams?.[CARD_KIND]);
  const anchor: WheelOverlaySegment["anchor"] =
    active.board === "finalTransition"
      ? { board: "finalTransition", rowIndex: active.rowIndex, colIndex: active.colIndex }
      : {
          board: "round",
          roundIndex: active.roundIndex!,
          rowIndex: active.rowIndex,
          colIndex: active.colIndex,
        };

  const st: WheelOverlaySegment = {
    anchor,
    fieldVisible: true,
    spinsLeft: params.spinsPerQuestion,
    displayRotation: 0,
    spinSeq: 0,
    swapPhase: null,
    lastWinIndex: null,
    lastWinLabel: null,
  };
  snap.segmentState[WHEEL_OVERLAY_SEGMENT_KEY] = st;

  return ctx.closeCard("revealed");
}

export function registerServer(registry: PluginServerRegistry): void {
  registry.registerCardKind({
    pluginId: PLUGIN_ID,
    cardKind: CARD_KIND,
    mode: "replace_field",
    validateParams(raw: unknown): MutatorResult | { ok: true; value: unknown } {
      if (raw === undefined || raw === null) return { ok: true, value: { spinsPerQuestion: 1 } };
      if (typeof raw !== "object") return { ok: false, error: "wheel_of_adepts cardParams must be an object" };
      const o = raw as Record<string, unknown>;
      const sp = o.spinsPerQuestion;
      if (sp !== undefined && sp !== 1 && sp !== 3) {
        return { ok: false, error: "spinsPerQuestion must be 1 or 3" };
      }
      return { ok: true, value: { spinsPerQuestion: sp === 3 ? 3 : 1 } };
    },
    onOpen,
    onCardEvent,
  });
}

export { WHEEL_OVERLAY_SEGMENT_KEY } from "./constants.js";
