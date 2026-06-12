export type MockWebhookFixture = {
  readonly id: string
  readonly label: string
  readonly description: string
  readonly payload: unknown
}

export const MOCK_WEBHOOK_PAYLOADS: readonly MockWebhookFixture[] = [
  {
    id: "dm-message",
    label: "DM message",
    description: "Inbound Instagram DM that can become one local inbox event.",
    payload: {
      object: "instagram",
      entry: [
        {
          id: "17841400000000000",
          messaging: [
            {
              sender: { id: "ig_user_100", username: "hana.shop" },
              recipient: { id: "ig_business_1" },
              timestamp: 1_781_257_920_000,
              message: {
                mid: "wamid.mock.dm.1",
                text: "안녕하세요. 린넨 셔츠 베이지 M 사이즈 재고와 가격 궁금합니다.",
              },
            },
          ],
          time: 1_781_257_920,
        },
      ],
    },
  },
  {
    id: "comment-message",
    label: "Comment",
    description: "Comment webhook shape that maps to a local comment review item.",
    payload: {
      object: "instagram",
      entry: [
        {
          id: "17841400000000000",
          time: 1_781_261_040,
          changes: [
            {
              field: "comments",
              value: {
                comment_id: "ig_comment_mock_1",
                from: { id: "ig_user_200", username: "min.book" },
                media: { id: "ig_media_1" },
                text: "다음 주 금요일 클래스 2명 예약 가능한가요?",
              },
            },
          ],
        },
      ],
    },
  },
  {
    id: "message-echo",
    label: "Message echo",
    description: "Outgoing echo from a business reply. It should warn and stay out of the inbox.",
    payload: {
      object: "instagram",
      entry: [
        {
          id: "17841400000000000",
          messaging: [
            {
              sender: { id: "ig_business_1", username: "brand.account" },
              recipient: { id: "ig_user_100" },
              timestamp: 1_781_262_100_000,
              message: {
                is_echo: true,
                mid: "wamid.mock.echo.1",
                text: "문의 감사합니다. 운영자가 확인 후 안내드리겠습니다.",
              },
            },
          ],
        },
      ],
    },
  },
  {
    id: "app-review-edge",
    label: "App review edge",
    description: "Malformed review fixture with a missing sender and comment text to expose validation errors.",
    payload: {
      object: "instagram",
      entry: [
        {
          id: "17841400000000000",
          time: 1_781_262_300,
          changes: [
            {
              field: "comments",
              value: {
                comment_id: "ig_comment_review_gap",
                from: { id: "ig_user_review" },
              },
            },
          ],
        },
      ],
    },
  },
  {
    id: "permission-denied",
    label: "Permission denied",
    description: "Meta-style permission failure. It must never create a local inbox event.",
    payload: {
      error: {
        code: 200,
        message: "Permissions error: instagram_manage_messages has not been granted for this app.",
        type: "OAuthException",
      },
    },
  },
]
