/**
 * @adept-plugins/spectator-bet — client entry point
 *
 * Registers a React segment view for spectator_bet.
 * Spectators see a seat-picker; the host sees a lock button.
 */

import type { CSSProperties } from "react";
import type { PluginClientRegistry, Role, SegmentViewProps, SessionSnapshot } from "@adept/plugin-sdk";
import type { SpectatorBetState } from "./state.js";

const PLUGIN_ID = "spectator-bet";
const SEGMENT_ID = "spectator_bet";

const MAIN_FONT =
  'Arial, "Noto Color Emoji", "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif';

/** Same border + shadow as the segment’s outer gold frame — only applied to a spectator’s chosen seat. */
const MAIN_AREA_GOLD_FRAME: CSSProperties = {
  border: "1px solid rgba(234, 179, 8, 0.45)",
  boxShadow:
    "0 0 20px rgba(234,179,8,0.22), 0 0 48px rgba(250,204,21,0.12), inset 0 0 24px rgba(234,179,8,0.06)",
};

function getState(snapshot: SessionSnapshot): SpectatorBetState {
  return (snapshot.segmentState[SEGMENT_ID] ?? { locked: false, bets: {} }) as SpectatorBetState;
}

/** Seat indices in bets/API are 1–5; `seatNames` is indexed 0–4. */
function displaySeatName(snapshot: SessionSnapshot, seat: 1 | 2 | 3 | 4 | 5): string {
  const raw = snapshot.seatNames[seat - 1]?.trim();
  return raw ? raw : `Игрок ${seat}`;
}

function SpectatorBetView({
  snapshot,
  pluginId,
  segmentId,
  role,
  send,
  participantId,
}: SegmentViewProps & { role: Role }) {
  const state = getState(snapshot);
  const seatCount = 5 as const;
  const mySeat = role === "spectator" ? state.bets[participantId] : undefined;

  const seatBtnStyle: CSSProperties = {
    padding: "8px 16px",
    background: "#1a2130",
    border: "1px solid #2a3142",
    borderRadius: 8,
    color: "#e8eef6",
    cursor: "pointer",
  };

  const hostPrimaryBtnStyle: CSSProperties = {
    ...seatBtnStyle,
    padding: "10px 22px",
    border: "1px solid rgba(234, 179, 8, 0.45)",
    fontWeight: 600,
    width: "100%",
    maxWidth: 420,
    boxSizing: "border-box",
  };

  const betCount = Object.keys(state.bets).length;

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        overflow: "hidden",
        boxSizing: "border-box",
      }}>
      <div
        style={{
          width: "100%",
          maxWidth: 980,
          padding: 16,
          background: "transparent",
          borderRadius: 10,
          boxSizing: "border-box",
        }}>
        <div
          style={{
            borderRadius: 18,
            ...MAIN_AREA_GOLD_FRAME,
            padding: 18,
            minHeight: 260,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            gap: 16,
            background: "transparent",
            fontFamily: MAIN_FONT,
          }}>
          {state.locked ? (
            <>
              <p style={{ margin: 0, color: "#9aa3b2", lineHeight: 1.5, maxWidth: 520 }}>
                Ставки закрыты. Зафиксировано: {Object.keys(state.bets).length} ставок.
              </p>
              {role === "spectator" && mySeat != null ? (
                <div
                  style={{
                    padding: "12px 20px",
                    borderRadius: 18,
                    background: "#1a2130",
                    ...MAIN_AREA_GOLD_FRAME,
                    color: "#fef3c7",
                    fontWeight: 600,
                  }}>
                  Ваш выбор: {displaySeatName(snapshot, mySeat)}
                </div>
              ) : null}
            </>
          ) : (
            <>
              {role === "spectator" && (
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                    justifyContent: "center",
                  }}>
                  {Array.from({ length: seatCount }, (_, i) => i + 1).map((seat) => {
                    const seatN = seat as 1 | 2 | 3 | 4 | 5;
                    const chosen = mySeat === seatN;
                    const label = displaySeatName(snapshot, seatN);
                    return (
                      <button
                        key={seat}
                        type="button"
                        title={`Игрок ${seat}`}
                        onClick={() =>
                          send("plugin_event", { pluginId, segmentId, event: "place_bet", payload: { seat } })
                        }
                        style={
                          chosen
                            ? { ...seatBtnStyle, ...MAIN_AREA_GOLD_FRAME, borderRadius: 12, color: "#fef3c7" }
                            : seatBtnStyle
                        }
                        aria-pressed={chosen}>
                        {label}
                      </button>
                    );
                  })}
                </div>
              )}

              {role === "host" && (
                <>
                  <button
                    type="button"
                    onClick={() => send("plugin_event", { pluginId, segmentId, event: "lock_bets", payload: null })}
                    style={{ ...hostPrimaryBtnStyle, ...MAIN_AREA_GOLD_FRAME, borderRadius: 12, color: "#fef3c7" }}>
                    Дальше
                  </button>
                  <p style={{ margin: 0, color: "#9aa3b2", fontSize: "0.95rem" }}>Ставок: {betCount}</p>


                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}


export function registerClient(registry: PluginClientRegistry): void {
  registry.registerSegmentView(PLUGIN_ID, SEGMENT_ID, SpectatorBetView);
}
