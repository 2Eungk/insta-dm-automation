import type { Ref } from "react"
import { CLASSIFICATION_LABELS, REPLY_TONE_LABELS, STATUS_LABELS, WORKSPACE_PRESET_LABELS } from "../domain/labels"
import { FILTER_PRESETS, type FilterPresetId } from "../domain/filterPresets"
import {
  CLASSIFICATIONS,
  REPLY_TONES,
  STATUSES,
  WORKSPACE_PRESETS,
  type Classification,
  type ReplyTone,
  type Status,
  type WorkspacePreset,
} from "../domain/types"

type ToolbarProps = {
  readonly query: string
  readonly workspacePreset: WorkspacePreset
  readonly replyTone: ReplyTone
  readonly quickReplies: readonly string[]
  readonly classificationFilter: Classification | "all"
  readonly statusFilter: Status | "all"
  readonly activeFilterPresetId: FilterPresetId
  readonly searchInputRef: Ref<HTMLInputElement>
  readonly onQueryChange: (query: string) => void
  readonly onWorkspacePresetChange: (workspacePreset: WorkspacePreset) => void
  readonly onReplyToneChange: (replyTone: ReplyTone) => void
  readonly onClassificationChange: (classification: Classification | "all") => void
  readonly onStatusChange: (status: Status | "all") => void
  readonly onFilterPresetChange: (filterPresetId: FilterPresetId) => void
}

function parseClassificationFilter(value: string): Classification | "all" {
  if (value === "all") {
    return "all"
  }

  return CLASSIFICATIONS.find((classification) => classification === value) ?? "all"
}

function parseStatusFilter(value: string): Status | "all" {
  if (value === "all") {
    return "all"
  }

  return STATUSES.find((status) => status === value) ?? "all"
}

function parseWorkspacePreset(value: string): WorkspacePreset {
  return WORKSPACE_PRESETS.find((workspacePreset) => workspacePreset === value) ?? "generic"
}

function parseReplyTone(value: string): ReplyTone {
  return REPLY_TONES.find((replyTone) => replyTone === value) ?? "friendly"
}

export function Toolbar({
  query,
  workspacePreset,
  replyTone,
  quickReplies,
  classificationFilter,
  statusFilter,
  activeFilterPresetId,
  searchInputRef,
  onQueryChange,
  onWorkspacePresetChange,
  onReplyToneChange,
  onClassificationChange,
  onStatusChange,
  onFilterPresetChange,
}: ToolbarProps): React.JSX.Element {
  return (
    <section className="toolbar" aria-label="워크스페이스 설정과 필터">
      <label className="searchBox">
        <span>검색</span>
        <input
          ref={searchInputRef}
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="이름, 핸들, 메시지 검색"
          aria-label="이름, 핸들, 메시지로 검색"
        />
      </label>
      <label>
        <span>프리셋</span>
        <select
          value={workspacePreset}
          onChange={(event) => onWorkspacePresetChange(parseWorkspacePreset(event.target.value))}
          aria-label="워크스페이스 프리셋 선택"
        >
          {WORKSPACE_PRESETS.map((preset) => (
            <option key={preset} value={preset}>
              {WORKSPACE_PRESET_LABELS[preset]}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>답장 톤</span>
        <select
          value={replyTone}
          onChange={(event) => onReplyToneChange(parseReplyTone(event.target.value))}
          aria-label="답장 톤 선택"
        >
          {REPLY_TONES.map((tone) => (
            <option key={tone} value={tone}>
              {REPLY_TONE_LABELS[tone]}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>분류</span>
        <select
          value={classificationFilter}
          onChange={(event) => onClassificationChange(parseClassificationFilter(event.target.value))}
          aria-label="분류 필터 선택"
        >
          <option value="all">전체 분류</option>
          {CLASSIFICATIONS.map((classification) => (
            <option key={classification} value={classification}>
              {CLASSIFICATION_LABELS[classification]}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>상태</span>
        <select
          value={statusFilter}
          onChange={(event) => onStatusChange(parseStatusFilter(event.target.value))}
          aria-label="상태 필터 선택"
        >
          <option value="all">전체 상태</option>
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </label>
      <div className="filterPresetStrip" aria-label="저장된 필터 보기">
        <span>저장된 보기</span>
        <div>
          {FILTER_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className={preset.id === activeFilterPresetId ? "active" : undefined}
              onClick={() => onFilterPresetChange(preset.id)}
              title={preset.detail}
              aria-pressed={preset.id === activeFilterPresetId}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>
      <div className="quickReplyHints" aria-label="프리셋 빠른 답장 예시">
        <span>빠른 답장 힌트</span>
        <div>
          {quickReplies.map((reply) => (
            <em key={reply}>{reply}</em>
          ))}
        </div>
      </div>
    </section>
  )
}
