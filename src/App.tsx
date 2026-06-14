import { useEffect, useMemo, useRef } from "react"
import { DetailPanel } from "./components/DetailPanel"
import { EmptyState } from "./components/EmptyState"
import { InboxList } from "./components/InboxList"
import { SampleDataControls } from "./components/SampleDataControls"
import { SummaryCard } from "./components/SummaryCard"
import { ManualImportPanel } from "./components/ManualImportPanel"
import { Toolbar } from "./components/Toolbar"
import { useLocalAutomationConfig } from "./hooks/useLocalAutomationConfig"
import { useReviewDashboard } from "./hooks/useReviewDashboard"

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  return target.isContentEditable || target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT"
}

export function App(): React.JSX.Element {
  const localAutomationConfig = useLocalAutomationConfig()
  const dashboard = useReviewDashboard(localAutomationConfig.ruleConfig, localAutomationConfig.templateConfig)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const selectedIndex = useMemo(
    () => dashboard.filteredEvents.findIndex((item) => item.event.id === dashboard.visibleSelectedId),
    [dashboard.filteredEvents, dashboard.visibleSelectedId],
  )

  useEffect(() => {
    function selectRelativeMessage(offset: number): void {
      if (dashboard.filteredEvents.length === 0) {
        return
      }

      const baseIndex = selectedIndex === -1 ? 0 : selectedIndex
      const nextIndex = (baseIndex + offset + dashboard.filteredEvents.length) % dashboard.filteredEvents.length
      const nextItem = dashboard.filteredEvents[nextIndex]
      if (nextItem !== undefined) {
        dashboard.setSelectedId(nextItem.event.id)
      }
    }

    function handleKeyDown(event: KeyboardEvent): void {
      const key = event.key.toLowerCase()
      const isEditable = isEditableTarget(event.target)

      if (isEditable) {
        return
      }

      if (key === "/" && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault()
        searchInputRef.current?.focus()
        return
      }

      if ((key === "j" || event.key === "ArrowDown") && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault()
        selectRelativeMessage(1)
        return
      }

      if ((key === "k" || event.key === "ArrowUp") && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault()
        selectRelativeMessage(-1)
        return
      }

      if (key === "a" && dashboard.selectedItem !== null) {
        event.preventDefault()
        dashboard.updateSelectedStatus("approved")
        return
      }

      if (key === "h" && dashboard.selectedItem !== null) {
        event.preventDefault()
        dashboard.updateSelectedStatus("hold")
        return
      }

      if ((event.metaKey || event.ctrlKey) && key === "e") {
        event.preventDefault()
        dashboard.exportReviewJson()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [dashboard, selectedIndex])

  return (
    <main className="appShell">
      <header className="hero">
        <div>
          <p className="eyebrow">친구 베타 · 로컬 검토 데스크</p>
          <h1>인스타 문의 답장 작업대</h1>
          <p>
            DM·댓글을 한 화면에서 분류하고, 누락 정보를 확인한 뒤 사람이 승인하는 한국어 답장 초안 워크플로입니다.
          </p>
        </div>
        <aside className="connectionNotice">
          <strong>실전 전송 OFF</strong>
          <span>Meta API·토큰·자동 발송 없이 브라우저 안에서만 돌아가는 목업입니다.</span>
        </aside>
      </header>

      <Toolbar
        query={dashboard.query}
        workspacePreset={dashboard.preferences.workspacePreset}
        replyTone={dashboard.preferences.replyTone}
        quickReplies={dashboard.quickReplies}
        classificationFilter={dashboard.classificationFilter}
        statusFilter={dashboard.statusFilter}
        activeFilterPresetId={dashboard.activeFilterPresetId}
        searchInputRef={searchInputRef}
        onQueryChange={dashboard.setQuery}
        onWorkspacePresetChange={dashboard.updateWorkspacePreset}
        onReplyToneChange={dashboard.updateReplyTone}
        onClassificationChange={dashboard.setClassificationFilter}
        onStatusChange={dashboard.setStatusFilter}
        onFilterPresetChange={dashboard.applyFilterPreset}
      />

      <section className="summaryGrid" aria-label="승인 큐 요약">
        <SummaryCard label="신규" value={dashboard.queueSummary.newCount} detail="아직 처리 전" />
        <SummaryCard label="정보 필요" value={dashboard.queueSummary.needsInfoCount} detail="누락 필드 있음" />
        <SummaryCard label="높은 우선순위" value={dashboard.queueSummary.highPriorityCount} detail="긴급/스팸 신호" tone="alert" />
        <SummaryCard label="승인됨" value={dashboard.queueSummary.approvedCount} detail="목업 승인 완료" tone="positive" />
      </section>

      <section className="quickStartDeck" aria-label="바로 써보기">
        <ManualImportPanel />
        <SampleDataControls
          sampleScenario={dashboard.sampleScenario}
          eventCount={dashboard.sampleEventCount}
          onSampleScenarioChange={dashboard.updateSampleScenario}
        />
      </section>

      <section className="workspace">
        <InboxList
          events={dashboard.filteredEvents}
          selectedId={dashboard.visibleSelectedId}
          selectedBatchIds={dashboard.selectedBatchIds}
          onSelect={dashboard.setSelectedId}
          onToggleBatch={dashboard.toggleBatchSelection}
          onSelectAllVisible={dashboard.selectAllVisible}
          onClearBatch={dashboard.clearBatchSelection}
          onBatchStatusChange={dashboard.updateBatchStatus}
          emptyTitle={dashboard.hasActiveFilters ? "조건에 맞는 문의가 없습니다." : "샘플 문의가 없습니다."}
          emptyBody={
            dashboard.hasActiveFilters
              ? "검색어, 분류, 상태 필터를 조정하거나 다른 샘플 시나리오를 선택해 보세요."
              : "다른 샘플 시나리오를 선택하면 번들 목업 문의를 다시 볼 수 있습니다."
          }
        />
        {dashboard.selectedItem === null ? (
          <section className="detail">
            <EmptyState
              title="선택된 문의가 없습니다."
              body="왼쪽 인박스에서 문의를 선택하거나 필터를 조정하면 상세 검토 패널이 표시됩니다."
            />
          </section>
        ) : (
          <DetailPanel
            item={dashboard.selectedItem}
            knowledgeSuggestions={dashboard.knowledgeSuggestions}
            onDraftChange={dashboard.updateSelectedDraft}
            onStatusChange={dashboard.updateSelectedStatus}
            onRegenerateDraft={dashboard.regenerateSelectedDraft}
            onMockSend={dashboard.appendMockSendLog}
          />
        )}
      </section>
    </main>
  )
}
