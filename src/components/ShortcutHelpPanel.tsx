type ShortcutHelpPanelProps = {
  readonly isOpen: boolean
  readonly onToggle: () => void
  readonly onClose: () => void
}

const SHORTCUTS = [
  { keys: "/", label: "검색 포커스" },
  { keys: "J / ↓", label: "다음 문의" },
  { keys: "K / ↑", label: "이전 문의" },
  { keys: "A", label: "선택 문의 승인" },
  { keys: "H", label: "선택 문의 보류" },
  { keys: "⌘/Ctrl + E", label: "JSON 내보내기" },
  { keys: "?", label: "도움말 열기" },
] as const

export function ShortcutHelpPanel({ isOpen, onToggle, onClose }: ShortcutHelpPanelProps): React.JSX.Element {
  return (
    <section className="shortcutHelp" aria-label="키보드 단축키">
      <button type="button" className="shortcutToggle" onClick={onToggle} aria-expanded={isOpen}>
        단축키
      </button>
      {isOpen ? (
        <div className="shortcutPanel">
          <div className="shortcutPanelHeader">
            <strong>운영자 단축키</strong>
            <button type="button" onClick={onClose} aria-label="단축키 도움말 닫기">
              닫기
            </button>
          </div>
          <dl>
            {SHORTCUTS.map((shortcut) => (
              <div key={shortcut.keys}>
                <dt>{shortcut.keys}</dt>
                <dd>{shortcut.label}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}
    </section>
  )
}
