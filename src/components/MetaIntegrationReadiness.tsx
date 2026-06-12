import { useMemo, useState } from "react"
import { MOCK_WEBHOOK_PAYLOADS } from "../data/mockWebhookPayloads"
import {
  MOCK_META_CONNECTION_CONTRACT,
  normalizeMockMetaWebhookPayload,
} from "../domain/metaReadiness"

const EMPTY_NORMALIZATION = {
  events: [],
  issues: [
    {
      code: "missing-fixture",
      message: "No bundled webhook fixture is available for the dry run.",
      severity: "error",
    },
  ],
} as const

function issueClassName(severity: "error" | "warning"): string {
  switch (severity) {
    case "error":
      return "dryRunIssue error"
    case "warning":
      return "dryRunIssue warning"
  }
}

export function MetaIntegrationReadiness(): React.JSX.Element {
  const defaultFixtureId = MOCK_WEBHOOK_PAYLOADS[0]?.id ?? ""
  const [selectedFixtureId, setSelectedFixtureId] = useState(defaultFixtureId)
  const selectedFixture =
    MOCK_WEBHOOK_PAYLOADS.find((fixture) => fixture.id === selectedFixtureId) ?? MOCK_WEBHOOK_PAYLOADS[0]
  const normalization = useMemo(
    () =>
      selectedFixture === undefined
        ? EMPTY_NORMALIZATION
        : normalizeMockMetaWebhookPayload(selectedFixture.payload, selectedFixture.id),
    [selectedFixture],
  )
  const errorCount = normalization.issues.filter((issue) => issue.severity === "error").length
  const warningCount = normalization.issues.filter((issue) => issue.severity === "warning").length

  return (
    <section className="metaReadiness" aria-labelledby="meta-readiness-title">
      <header>
        <div>
          <p className="eyebrow">Meta pre-integration package</p>
          <h2 id="meta-readiness-title">Mock connection contract and webhook dry run</h2>
          <p>{MOCK_META_CONNECTION_CONTRACT.boundary}</p>
        </div>
        <span>Dry run only · no OAuth · no API calls</span>
      </header>

      <div className="adapterContractGrid" aria-label="Mock Meta adapter contract">
        <article>
          <strong>Required environment variables</strong>
          {MOCK_META_CONNECTION_CONTRACT.requiredEnvironmentVariables.map((item) => (
            <p key={item.name}>
              <code>{item.name}</code>
              {item.detail}
            </p>
          ))}
        </article>
        <article>
          <strong>Permissions to justify</strong>
          {MOCK_META_CONNECTION_CONTRACT.permissions.map((item) => (
            <p key={item.name}>
              <code>{item.name}</code>
              {item.detail}
            </p>
          ))}
        </article>
        <article>
          <strong>Webhook event shapes</strong>
          {MOCK_META_CONNECTION_CONTRACT.webhookEventShapes.map((item) => (
            <p key={item.name}>
              <code>{item.name}</code>
              {item.detail}
            </p>
          ))}
        </article>
        <article>
          <strong>Token lifecycle</strong>
          {MOCK_META_CONNECTION_CONTRACT.tokenLifecycle.map((item) => (
            <p key={item.name}>
              <code>{item.name}</code>
              {item.detail}
            </p>
          ))}
        </article>
      </div>

      <div className="dryRunPanel" aria-label="Webhook fixture dry run">
        <div className="dryRunFixtureList" role="tablist" aria-label="Bundled webhook payload fixtures">
          {MOCK_WEBHOOK_PAYLOADS.map((fixture) => (
            <button
              aria-selected={fixture.id === selectedFixture?.id}
              key={fixture.id}
              onClick={() => setSelectedFixtureId(fixture.id)}
              role="tab"
              type="button"
            >
              {fixture.label}
            </button>
          ))}
        </div>

        <div className="dryRunResult">
          <div className="dryRunSummary">
            <div>
              <span>Selected fixture</span>
              <strong>{selectedFixture?.label ?? "Unavailable"}</strong>
              <p>{selectedFixture?.description ?? "Fixture loading failed."}</p>
            </div>
            <dl>
              <div>
                <dt>Normalized events</dt>
                <dd>{normalization.events.length}</dd>
              </div>
              <div>
                <dt>Errors</dt>
                <dd>{errorCount}</dd>
              </div>
              <div>
                <dt>Warnings</dt>
                <dd>{warningCount}</dd>
              </div>
            </dl>
          </div>

          <div className="dryRunColumns">
            <section aria-label="Normalized inbox preview">
              <h3>Inbox normalization preview</h3>
              {normalization.events.length === 0 ? (
                <p className="dryRunEmpty">No inbox item would be created from this fixture.</p>
              ) : (
                normalization.events.map((event) => (
                  <article className="normalizedEvent" key={event.id}>
                    <span>{event.channel.toUpperCase()}</span>
                    <strong>{event.senderName}</strong>
                    <em>{event.senderHandle}</em>
                    <p>{event.message}</p>
                    <time dateTime={event.receivedAt}>{event.receivedAt}</time>
                  </article>
                ))
              )}
            </section>

            <section aria-label="Dry run validation output">
              <h3>Validation output</h3>
              {normalization.issues.length === 0 ? (
                <p className="dryRunEmpty">No dry-run validation issues for this fixture.</p>
              ) : (
                normalization.issues.map((issue) => (
                  <article className={issueClassName(issue.severity)} key={`${issue.code}-${issue.message}`}>
                    <strong>{issue.severity}</strong>
                    <code>{issue.code}</code>
                    <p>{issue.message}</p>
                  </article>
                ))
              )}
            </section>
          </div>

          <details className="fixturePayload">
            <summary>View bundled fixture payload</summary>
            <pre>{JSON.stringify(selectedFixture?.payload ?? {}, null, 2)}</pre>
          </details>
        </div>
      </div>
    </section>
  )
}
