import { ActivityTrail } from "./components/ActivityTrail"
import { DetailPanel } from "./components/DetailPanel"
import { EmptyState } from "./components/EmptyState"
import { InboxList } from "./components/InboxList"
import { OnboardingChecklist } from "./components/OnboardingChecklist"
import { RulesPreviewPanel } from "./components/RulesPreviewPanel"
import { SampleDataControls } from "./components/SampleDataControls"
import { SummaryCard } from "./components/SummaryCard"
import { Toolbar } from "./components/Toolbar"
import { useReviewDashboard } from "./hooks/useReviewDashboard"

export function App(): React.JSX.Element {
  const dashboard = useReviewDashboard()

  return (
    <main className="appShell">
      <header className="hero">
        <div>
          <p className="eyebrow">Social Inbox Review Desk</p>
          <h1>Instagram DM·댓글 자동 검토 보드</h1>
          <p>
            작은 비즈니스와 크리에이터가 DM과 댓글을 분류하고, 누락 정보를 확인한 뒤 사람이 최종 승인하는
            답장 초안 워크플로입니다.
          </p>
        </div>
        <aside className="connectionNotice">
          <strong>Meta 전송 미연결</strong>
          <span>실제 Instagram/Meta API, 토큰, 백엔드, 자동 발송은 포함하지 않습니다.</span>
        </aside>
      </header>

      <Toolbar
        query={dashboard.query}
        workspacePreset={dashboard.preferences.workspacePreset}
        replyTone={dashboard.preferences.replyTone}
        quickReplies={dashboard.quickReplies}
        classificationFilter={dashboard.classificationFilter}
        statusFilter={dashboard.statusFilter}
        onQueryChange={dashboard.setQuery}
        onWorkspacePresetChange={dashboard.updateWorkspacePreset}
        onReplyToneChange={dashboard.updateReplyTone}
        onClassificationChange={dashboard.setClassificationFilter}
        onStatusChange={dashboard.setStatusFilter}
      />

      <OnboardingChecklist
        isVisible={dashboard.isOnboardingVisible}
        onToggleVisible={dashboard.setIsOnboardingVisible}
      />

      <SampleDataControls
        sampleScenario={dashboard.sampleScenario}
        eventCount={dashboard.sampleEventCount}
        onSampleScenarioChange={dashboard.updateSampleScenario}
        onResetLocalState={dashboard.resetCurrentSampleState}
        onExportJson={dashboard.exportReviewJson}
        onExportCsv={dashboard.exportReviewCsv}
      />

      <section className="summaryGrid" aria-label="승인 큐 요약">
        <SummaryCard label="신규" value={dashboard.queueSummary.newCount} detail="아직 처리 전" />
        <SummaryCard label="정보 필요" value={dashboard.queueSummary.needsInfoCount} detail="누락 필드 있음" />
        <SummaryCard label="높은 우선순위" value={dashboard.queueSummary.highPriorityCount} detail="긴급/스팸 신호" tone="alert" />
        <SummaryCard label="승인됨" value={dashboard.queueSummary.approvedCount} detail="목업 승인 완료" tone="positive" />
      </section>

      <section className="operatorDeck" aria-label="운영자 컨트롤과 감사 로그">
        <RulesPreviewPanel />
        <ActivityTrail entries={dashboard.auditLog} />
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
