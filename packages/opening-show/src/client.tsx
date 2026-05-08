/**
 * @adept-plugins/opening-show — client entry point
 *
 * Registers a React segment view for opening_show.
 * Host can advance emoji line, mark spectator answers, and start spectator bets.
 */

import { useMemo, useState } from 'react'
import type { PluginClientRegistry, SegmentViewProps, SessionSnapshot } from '@adept/plugin-sdk'
import type { OpeningShowState } from './state.js'

const PLUGIN_ID = 'opening-show'
const SEGMENT_ID = 'opening_show'

const LOBBY_EMOJI_REVEAL_LINES: readonly string[] = [
  '🫵❌✔️',
  '❄️🧙‍♂️💀🐈‍⬛',
  '🗡🧊👑',
  '🐉 ◼️🧍‍♀️',
  '🐉 🔵 🪄',
  '🧙‍♂️🗡🏹🛡🔪🔨3🧍‍♂️1🧍‍♀️',
  '👨‍🏫2💧🟠🟢',
  '🌌💫🕳',
  '🔥🔨👍',
  '🐕🔥😱',
  '🧟‍♂️⚡️',
  '🎣⛲️💦',
  '🐠👩‍🦱🐍🏹',
  '🤖🚮',
  '🐉🟣➖',
  '💧🚦',
  '🐥🔥🌪',
  '🦂🐅',
  '🕷🕸',
  '🕷🔥',
  '🦵🌋🔥',
  '🪲🥶👑',
  '🐉🧊🥶',
  '🧙‍♂️🤒🪩🕺💃',
  '🍄‍🟫🦠',
  '🪱🔥',
  '👸🩸🦇',
  '💨🌪⚡️',
  '🧊⚡️',
  '🐉◼️🤵‍♂️🔮',
  '🐉◼️🤵‍♂️🔥',
  '🟦🟩🟥🟪 4🐕',
  '🛁❤️',
  '👑👻',
  '🐂💩🪜',
  '🐉🌌⚡️',
  '🐉🌚🌝',
  '🪨💥✈️',
  '🔥💣💥',
  '👩‍🦳💦🙈',
] as const

const LOBBY_EMOJI_REVEAL_LINE_COUNT = LOBBY_EMOJI_REVEAL_LINES.length

function getState(snapshot: SessionSnapshot): OpeningShowState {
  return (snapshot.segmentState[SEGMENT_ID] ?? {
    emojiLineIndex: -1,
    spectatorCorrectCounts: {},
  }) as OpeningShowState
}

export function OpeningShowHostAside({
  snapshot,
  pluginId,
  segmentId,
  send,
}: {
  snapshot: SessionSnapshot
  pluginId: string
  segmentId: string
  send(type: string, payload: unknown): void
}) {
  const state = getState(snapshot)
  const [spectatorKey, setSpectatorKey] = useState('')

  const lineIdx = state.emojiLineIndex
  const emojiAllShown = lineIdx >= LOBBY_EMOJI_REVEAL_LINE_COUNT - 1
  const emojiAtStart = lineIdx < 0

  const sorted = useMemo(() => {
    return Object.entries(state.spectatorCorrectCounts)
      .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
      .slice(0, 20)
  }, [state.spectatorCorrectCounts])

  return (
    <div
      className="card"
      style={{
        height: '100%',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        marginBottom: 0,
      }}>
      <div
        style={{
          flexShrink: 0,
          padding: '0.625rem 1rem',
          borderBottom: '1px solid rgba(42, 49, 66, 0.8)',
        }}>
        <button
          type="button"
          disabled={emojiAtStart}
          onClick={() =>
            send('plugin_event', { pluginId, segmentId, event: 'prev_emoji', payload: null })
          }
          className="game-header__phase-nav-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path
              d="M15 18l-6-6 6-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <span className="chat-panel__title">
          Emoji: {lineIdx + 1} / {LOBBY_EMOJI_REVEAL_LINE_COUNT}
        </span>

        <button
          type="button"
          disabled={emojiAllShown}
          onClick={() =>
            send('plugin_event', { pluginId, segmentId, event: 'next_emoji', payload: null })
          }
          className="game-header__phase-nav-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path
              d="M9 6l6 6-6 6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <input
          value={spectatorKey}
          onChange={e => setSpectatorKey(e.target.value)}
          placeholder="spectatorKey (как в чате)"
          style={{
            flex: 1,
            padding: '10px 12px',
            background: '#0f1320',
            border: '1px solid #2a3142',
            borderRadius: 10,
            color: '#fff',
            minWidth: 0,
          }}
        />
        <button
          type="button"
          onClick={() => {
            const key = spectatorKey.trim()
            if (!key) return
            send('plugin_event', {
              pluginId,
              segmentId,
              event: 'mark_correct',
              payload: { spectatorKey: key },
            })
            setSpectatorKey('')
          }}
          style={{
            padding: '10px 18px',
            background: '#27ae60',
            border: 'none',
            borderRadius: 10,
            color: '#fff',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}>
          Засчитать
        </button>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 12,
        }}>
        <div style={{ color: '#f1c40f', fontWeight: 700 }}>Таблица правильных ответов</div>
        <div style={{ color: '#9aa3b2', fontSize: 12 }}>
          {Object.keys(state.spectatorCorrectCounts).length} зр.
        </div>
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflow: 'auto',
          borderTop: '1px solid rgba(42,49,66,0.8)',
          paddingTop: 10,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}>
        {sorted.length === 0 ? (
          <div style={{ color: '#888' }}>Пока пусто.</div>
        ) : (
          sorted.map(([k, v]) => (
            <div
              key={k}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 12,
                alignItems: 'center',
              }}>
              <span style={{ color: '#ddd', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {k}
              </span>
              <span style={{ color: '#f1c40f', fontVariantNumeric: 'tabular-nums' }}>{v}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function OpeningShowView({ snapshot }: SegmentViewProps) {
  const state = getState(snapshot)
  const lineIdx = state.emojiLineIndex
  const emojiLobbyText =
    lineIdx >= 0 && lineIdx < LOBBY_EMOJI_REVEAL_LINE_COUNT
      ? (LOBBY_EMOJI_REVEAL_LINES[lineIdx] ?? '')
      : ''

  return (
    <div
      style={{ padding: 16, background: '#1a1f2e', borderRadius: 10, border: '1px solid #2a3142' }}>
      <div
        style={{
          borderRadius: 18,
          border: '1px solid rgba(234, 179, 8, 0.45)',
          boxShadow:
            '0 0 20px rgba(234,179,8,0.22), 0 0 48px rgba(250,204,21,0.12), inset 0 0 24px rgba(234,179,8,0.06)',
          padding: 18,
          minHeight: 260,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          background: 'transparent',
          fontFamily:
            'Arial, "Noto Color Emoji", "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif',
        }}>
        {emojiLobbyText ? (
          <div
            style={{
              width: '100%',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              lineHeight: 1.2,
              letterSpacing: '0.02em',
              fontSize: 'clamp(2rem, min(9vmin, 10vw), 5.25rem)',
              wordSpacing: '0.12em',
            }}>
            {emojiLobbyText}
          </div>
        ) : (
          <div style={{ maxWidth: 520, color: '#9aa3b2', lineHeight: 1.5 }}>
            Здесь появятся эмодзи, твоя задача разгадать какой босс зашифрован, ответ пиши в чат.
          </div>
        )}
      </div>
    </div>
  )
}

export function registerClient(registry: PluginClientRegistry): void {
  registry.registerSegmentView(PLUGIN_ID, SEGMENT_ID, OpeningShowView)
}
