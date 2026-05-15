/**
 * @adept-plugins/wheel-of-adepts — client entry
 */

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import type {
  CardActionProps,
  CardFullScreenProps,
  CardParamsEditorProps,
  PluginClientRegistry,
  SessionSnapshot,
} from "@adept/plugin-sdk";
import { FortuneWheel, type WheelSpinData } from "./FortuneWheel.js";
import { Mallet, MALLET_HEAD_CENTER_OFFSET_PX } from "./Mallet.js";
import { playMalletGrab, playMalletSwing } from "./malletSounds.js";
import type { WheelPluginState } from "./state.js";
import { useIsMobile } from "./useIsMobile.js";

const CARD_KIND = "wheel_of_adepts";

function parseState(raw: unknown): WheelPluginState {
  if (!raw || typeof raw !== "object") {
    return {
      fieldVisible: false,
      spinsLeft: 1,
      displayRotation: 0,
      spinSeq: 0,
      swapPhase: null,
      lastWinIndex: null,
      lastWinLabel: null,
    };
  }
  return raw as WheelPluginState;
}

function viewerSeatIndex(snapshot: SessionSnapshot, participantId: string): number | null {
  const me = snapshot.participants.find((p) => p.id === participantId)?.displayName.trim().toLowerCase();
  if (!me) return null;
  for (let i = 0; i < 5; i++) {
    const slot = (snapshot.seatNames[i] ?? "").trim().toLowerCase();
    if (slot && me === slot) return i;
  }
  return null;
}

function WheelHostFooterButton(props: CardActionProps) {
  if (props.role !== "host") return null;
  if (props.activeCard.stage !== "answer") return null;
  return (
    <button
      type="button"
      className="adepts-btn adepts-question-modal__host-foot-btn adepts-question-modal__host-foot-btn--secondary"
      title="Показать колесо вместо игрового поля"
      onClick={() => props.send("reveal_and_show_wheel", {})}
    >
      Крутить!
    </button>
  );
}

function WheelParamsEditor({ value, onChange, role }: CardParamsEditorProps) {
  if (role !== "host") return null;
  const v =
    value && typeof value === "object" && (value as Record<string, unknown>)["spinsPerQuestion"] === 3
      ? 3
      : 1;
  return (
    <label className="adepts-field" style={{ marginTop: 8 }}>
      <span className="adepts-field__label">Прокруток за карточку</span>
      <select
        className="adepts-field__input"
        value={v}
        onChange={(e) => onChange({ spinsPerQuestion: e.target.value === "3" ? 3 : 1 })}
      >
        <option value={1}>1</option>
        <option value={3}>3</option>
      </select>
    </label>
  );
}

function WheelFullScreen(props: CardFullScreenProps) {
  const st = parseState(props.pluginState);
  const [spinData, setSpinData] = useState<WheelSpinData | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const prevServerRef = useRef<{ seq: number; rot: number } | null>(null);

  useEffect(() => {
    const prev = prevServerRef.current;
    if (!prev) {
      prevServerRef.current = { seq: st.spinSeq, rot: st.displayRotation };
      return undefined;
    }
    if (st.spinSeq > prev.seq) {
      const fromRot = prev.rot;
      setIsSpinning(true);
      setSpinData({
        fromRotation: fromRot,
        targetRotation: st.displayRotation,
        durationMs: 4800,
        segmentIndex: st.lastWinIndex ?? 0,
      });
      prevServerRef.current = { seq: st.spinSeq, rot: st.displayRotation };
      const t = window.setTimeout(() => {
        setIsSpinning(false);
        setSpinData(null);
      }, 5200);
      return () => window.clearTimeout(t);
    }
    prevServerRef.current = { seq: st.spinSeq, rot: st.displayRotation };
    return undefined;
  }, [st.spinSeq, st.displayRotation, st.lastWinIndex]);

  const mySeat = viewerSeatIndex(props.snapshot, props.participantId);
  const seatNames = props.snapshot.seatNames;

  const swapAwaitPick = st.swapPhase?.kind === "await_pick" ? st.swapPhase : null;
  const swapAwaitHost = st.swapPhase?.kind === "await_host" ? st.swapPhase : null;

  const isMobile = useIsMobile(600);
  const spinBlocked =
    st.spinsLeft <= 0 ||
    st.swapPhase != null ||
    isSpinning ||
    (typeof st.busyUntilMs === "number" && Date.now() < st.busyUntilMs);

  const hostSpin = () => props.send("host_spin", {});

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        padding: "16px 12px 24px",
        background: "#2d3e50",
        color: "#ecf0f1",
        overflow: "auto",
        position: "relative",
      }}
    >
      <div style={{ textAlign: "center", maxWidth: 520 }}>
        <h2 style={{ margin: 0, fontSize: "1.35rem", letterSpacing: "0.06em", color: "#f1c40f" }}>
          Колесо Адептов
        </h2>
        <p style={{ margin: "8px 0 0", fontSize: "0.95rem", opacity: 0.88 }}>
          Осталось прокруток: <strong>{st.spinsLeft}</strong>
        </p>
      </div>

      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 560,
          flexShrink: 0,
          margin: "0 auto",
        }}
      >
        {/* Wheel-only box so mallet `top: 50%` matches wheel center (pointer), not content below. */}
        <div style={{ position: "relative", width: "100%" }}>
          <FortuneWheel spinData={spinData} isSpinning={isSpinning} initialRotation={st.displayRotation} />

          {!isMobile && (
            <div
              style={{
                position: "absolute",
                left: "100%",
                top: "50%",
                marginLeft: 4,
                transform: `translateY(-${MALLET_HEAD_CENTER_OFFSET_PX}px)`,
                zIndex: 20,
                ...(props.role !== "host" ? { pointerEvents: "none" as const, userSelect: "none" as const } : {}),
              }}
            >
              <motion.div
                initial={{ opacity: 0, x: 28 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.45, delay: 0.15 }}
              >
                {props.role === "host" ? (
                  <Mallet
                    onClick={hostSpin}
                    disabled={spinBlocked}
                    onGrab={playMalletGrab}
                    onSwing={playMalletSwing}
                  />
                ) : (
                  <Mallet onClick={() => {}} disabled hideHints />
                )}
              </motion.div>
            </div>
          )}
        </div>

        {!isMobile && (
          <motion.div
            animate={isSpinning ? { opacity: [0.5, 1, 0.5], color: "#f1c40f" } : { opacity: 0 }}
            transition={{ duration: 1, repeat: isSpinning ? Infinity : 0 }}
            style={{
              fontFamily: "monospace",
              fontSize: 12,
              textTransform: "uppercase",
              letterSpacing: "5px",
              marginTop: 12,
              textAlign: "center",
            }}
          >
            ⟳ Крутим…
          </motion.div>
        )}

        {props.role === "host" && isMobile && (
          <motion.button
            type="button"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            onClick={hostSpin}
            disabled={spinBlocked}
            style={{
              marginTop: 16,
              padding: "16px 0",
              width: "100%",
              background: spinBlocked ? "rgba(241,196,15,0.08)" : "rgba(241,196,15,0.12)",
              border: `2px solid ${spinBlocked ? "rgba(241,196,15,0.3)" : "#f1c40f"}`,
              borderRadius: 8,
              color: spinBlocked ? "rgba(241,196,15,0.4)" : "#f1c40f",
              fontFamily: "monospace",
              fontSize: 14,
              letterSpacing: "4px",
              textTransform: "uppercase",
              cursor: spinBlocked ? "not-allowed" : "pointer",
              boxShadow: spinBlocked ? "none" : "0 0 18px rgba(241,196,15,0.25)",
            }}
          >
            {isSpinning ? "⟳ Крутим…" : "⊕ Вращать"}
          </motion.button>
        )}
      </div>

      {swapAwaitPick && props.role === "player" && mySeat === swapAwaitPick.chooserSeat ? (
        <div style={{ width: "100%", maxWidth: 520 }}>
          <p style={{ margin: "0 0 10px", textAlign: "center" }}>Выберите игрока для обмена очками:</p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
              gap: 8,
            }}
          >
            {([0, 1, 2, 3, 4] as const).map((i) => {
              if (i === swapAwaitPick.chooserSeat) return null;
              const label = (seatNames[i] ?? "").trim() ? seatNames[i] : `Игрок ${i + 1}`;
              return (
                <button
                  key={i}
                  type="button"
                  className="adepts-btn"
                  style={{ padding: "10px 12px" }}
                  onClick={() => props.send("player_pick_swap", { targetSeat: i })}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {swapAwaitPick && (props.role === "host" || props.role === "spectator") ? (
        <p style={{ margin: 0, opacity: 0.85, textAlign: "center", maxWidth: 480 }}>
          Игрок на ходу выбирает соперника для свапа очков…
        </p>
      ) : null}

      {swapAwaitHost && props.role === "host" ? (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <span>
            Обмен:{" "}
            <strong>
              {(seatNames[swapAwaitHost.chooserSeat] ?? "").trim() || `Игрок ${swapAwaitHost.chooserSeat + 1}`}
            </strong>{" "}
            ↔{" "}
            <strong>
              {(seatNames[swapAwaitHost.targetSeat] ?? "").trim() || `Игрок ${swapAwaitHost.targetSeat + 1}`}
            </strong>
          </span>
          <button type="button" className="adepts-btn adepts-btn--primary" onClick={() => props.send("host_confirm_swap", {})}>
            Выполнить обмен
          </button>
          <button type="button" className="adepts-btn" onClick={() => props.send("host_cancel_swap", {})}>
            Отмена
          </button>
        </div>
      ) : null}

      {swapAwaitHost && props.role !== "host" ? (
        <p style={{ margin: 0, opacity: 0.85 }}>Ведущий подтверждает обмен очков…</p>
      ) : null}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center", marginTop: 8 }}>
        {props.role === "host" ? (
          <button type="button" className="adepts-btn" onClick={() => props.send("hide_wheel_field", {})}>
            Вернуться к квизу
          </button>
        ) : (
          <p style={{ margin: 0, fontSize: "0.9rem", opacity: 0.8 }}>Крутит ведущий</p>
        )}
      </div>
    </div>
  );
}

export function registerClient(registry: PluginClientRegistry): void {
  registry.registerCardKindClient(CARD_KIND, {
    label: "Колесо Адептов",
    description: "Крутим барабан!!!",
    defaultParams: () => ({ spinsPerQuestion: 1 }),
    ParamsEditor: WheelParamsEditor,
    HostAnswerFooterAction: WheelHostFooterButton,
    FullScreenView: WheelFullScreen,
  });
}
