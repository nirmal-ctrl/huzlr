import { baseApi } from "@/services/baseApi"

export type MeetingStatus =
  | "not_scheduled"
  | "scheduled"
  | "queued"
  | "starting"
  | "authenticating"
  | "waiting_for_admission"
  | "joined"
  | "leaving"
  | "completed"
  | "failed"
  | "cancelled"

export interface ScrumMeeting {
  id: number
  workspaceId: number
  title: string
  startsAt: string
  endsAt: string
  attendees: number
  meetUrl?: string
  status: MeetingStatus
  botEnabled: boolean
  organizer?: string
  errorCode?: string
  errorMessage?: string
  outputs: Record<string, unknown>
}

export interface ScrumMeetingPage {
  items: ScrumMeeting[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  botScheduledTotal: number
}

export interface ScrumMeetingPageQuery {
  workspaceId: number
  page: number
  pageSize?: number
}

export interface TranscriptSegment {
  id: number
  speakerType: "participant" | "agent"
  speakerId?: string
  text: string
  interrupted: boolean
  createdAt: string
}

export interface ScrumMeetingDetail extends ScrumMeeting {
  transcript: TranscriptSegment[]
}

export interface ScrumMasterSettings {
  workspaceId: number
  botName: string
  botAccountEmail?: string
  autoJoin: boolean
  joinOnlyOrganized: boolean
  requireScrumTag: boolean
  joinBufferMinutes: number
  maxMeetingMinutes: number
  transcriptEnabled: boolean
  summaryEnabled: boolean
  actionItemsEnabled: boolean
}

export interface CalendarConnection {
  id: number
  email: string
  lastSyncedAt?: string
}

export interface CalendarStatus {
  connected: boolean
  connections: CalendarConnection[]
}

interface ApiMeeting {
  id: number
  workspace_id: number
  title: string
  starts_at: string
  ends_at: string
  attendees_count: number
  meet_url?: string
  status: MeetingStatus
  bot_enabled: boolean
  organizer_email?: string
  error_code?: string
  error_message?: string
  outputs: Record<string, unknown>
}

interface ApiMeetingDetail extends ApiMeeting {
  transcript: Array<{
    id: number
    speaker_type: "participant" | "agent"
    speaker_id?: string
    text: string
    interrupted: boolean
    created_at: string
  }>
}

interface ApiMeetingPage {
  items: ApiMeeting[]
  total: number
  page: number
  page_size: number
  total_pages: number
  bot_scheduled_total: number
}

interface ApiSettings {
  workspace_id: number
  bot_name: string
  bot_account_email?: string
  auto_join: boolean
  join_only_organized: boolean
  require_scrum_tag: boolean
  join_buffer_minutes: number
  max_meeting_minutes: number
  transcript_enabled: boolean
  summary_enabled: boolean
  action_items_enabled: boolean
}

const mapMeeting = (meeting: ApiMeeting): ScrumMeeting => ({
  id: meeting.id,
  workspaceId: meeting.workspace_id,
  title: meeting.title,
  startsAt: meeting.starts_at,
  endsAt: meeting.ends_at,
  attendees: meeting.attendees_count,
  meetUrl: meeting.meet_url,
  status: meeting.status,
  botEnabled: meeting.bot_enabled,
  organizer: meeting.organizer_email,
  errorCode: meeting.error_code,
  errorMessage: meeting.error_message,
  outputs: meeting.outputs,
})

const mapSettings = (value: ApiSettings): ScrumMasterSettings => ({
  workspaceId: value.workspace_id,
  botName: value.bot_name,
  botAccountEmail: value.bot_account_email,
  autoJoin: value.auto_join,
  joinOnlyOrganized: value.join_only_organized,
  requireScrumTag: value.require_scrum_tag,
  joinBufferMinutes: value.join_buffer_minutes,
  maxMeetingMinutes: value.max_meeting_minutes,
  transcriptEnabled: value.transcript_enabled,
  summaryEnabled: value.summary_enabled,
  actionItemsEnabled: value.action_items_enabled,
})

const toApiSettings = (value: ScrumMasterSettings) => ({
  bot_name: value.botName,
  bot_account_email: value.botAccountEmail || null,
  auto_join: value.autoJoin,
  join_only_organized: value.joinOnlyOrganized,
  require_scrum_tag: value.requireScrumTag,
  join_buffer_minutes: value.joinBufferMinutes,
  max_meeting_minutes: value.maxMeetingMinutes,
  transcript_enabled: value.transcriptEnabled,
  summary_enabled: value.summaryEnabled,
  action_items_enabled: value.actionItemsEnabled,
})

export const scrumMasterApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getScrumMeetings: builder.query<ScrumMeetingPage, ScrumMeetingPageQuery>({
      query: ({ workspaceId, page, pageSize = 20 }) => ({
        url: "/scrum-master/meetings",
        params: { workspace_id: workspaceId, page, page_size: pageSize },
      }),
      transformResponse: (response: ApiMeetingPage) => ({
        items: response.items.map(mapMeeting),
        total: response.total,
        page: response.page,
        pageSize: response.page_size,
        totalPages: response.total_pages,
        botScheduledTotal: response.bot_scheduled_total,
      }),
      providesTags: ["ScrumMeetings"],
    }),
    getScrumMeeting: builder.query<ScrumMeetingDetail, number>({
      query: (meetingId) => `/scrum-master/meetings/${meetingId}`,
      transformResponse: (response: ApiMeetingDetail) => ({
        ...mapMeeting(response),
        transcript: response.transcript.map((segment) => ({
          id: segment.id,
          speakerType: segment.speaker_type,
          speakerId: segment.speaker_id,
          text: segment.text,
          interrupted: segment.interrupted,
          createdAt: segment.created_at,
        })),
      }),
      providesTags: ["ScrumMeetings"],
    }),
    getScrumMasterSettings: builder.query<ScrumMasterSettings, number>({
      query: (workspaceId) => ({ url: "/scrum-master/settings", params: { workspace_id: workspaceId } }),
      transformResponse: mapSettings,
      providesTags: ["ScrumSettings"],
    }),
    updateScrumMasterSettings: builder.mutation<ScrumMasterSettings, { workspaceId: number; settings: ScrumMasterSettings }>({
      query: ({ workspaceId, settings }) => ({
        url: "/scrum-master/settings",
        method: "PUT",
        params: { workspace_id: workspaceId },
        body: toApiSettings(settings),
      }),
      transformResponse: mapSettings,
      invalidatesTags: ["ScrumSettings"],
    }),
    getCalendarStatus: builder.query<CalendarStatus, number>({
      query: (workspaceId) => ({ url: "/scrum-master/calendar/status", params: { workspace_id: workspaceId } }),
      transformResponse: (response: { connected: boolean; connections: Array<{ id: number; email: string; last_synced_at?: string }> }) => ({
        connected: response.connected,
        connections: response.connections.map((connection) => ({
          id: connection.id,
          email: connection.email,
          lastSyncedAt: connection.last_synced_at,
        })),
      }),
      providesTags: ["CalendarStatus"],
    }),
    connectGoogleCalendar: builder.mutation<{ authorization_url: string }, number>({
      query: (workspaceId) => ({ url: "/scrum-master/calendar/google/connect", params: { workspace_id: workspaceId } }),
    }),
    disconnectGoogleCalendar: builder.mutation<void, { workspaceId: number; connectionId: number }>({
      query: ({ workspaceId, connectionId }) => ({
        url: "/scrum-master/calendar/google/disconnect",
        method: "POST",
        params: { workspace_id: workspaceId, connection_id: connectionId },
      }),
      invalidatesTags: ["CalendarStatus", "ScrumMeetings"],
    }),
    syncGoogleCalendar: builder.mutation<{ synced_count: number; connection_count: number }, number>({
      query: (workspaceId) => ({ url: "/scrum-master/calendar/sync", method: "POST", params: { workspace_id: workspaceId } }),
      invalidatesTags: ["CalendarStatus", "ScrumMeetings"],
    }),
    scheduleMeetingBot: builder.mutation<ScrumMeeting, number>({
      query: (meetingId) => ({ url: `/scrum-master/meetings/${meetingId}/schedule`, method: "POST" }),
      transformResponse: mapMeeting,
      invalidatesTags: ["ScrumMeetings"],
    }),
    joinMeetingBot: builder.mutation<ScrumMeeting, number>({
      query: (meetingId) => ({ url: `/scrum-master/meetings/${meetingId}/join`, method: "POST" }),
      transformResponse: mapMeeting,
      invalidatesTags: ["ScrumMeetings"],
    }),
    cancelMeetingBot: builder.mutation<ScrumMeeting, number>({
      query: (meetingId) => ({ url: `/scrum-master/meetings/${meetingId}/cancel`, method: "POST" }),
      transformResponse: mapMeeting,
      invalidatesTags: ["ScrumMeetings"],
    }),
  }),
})

export const {
  useGetScrumMeetingsQuery,
  useGetScrumMeetingQuery,
  useGetScrumMasterSettingsQuery,
  useUpdateScrumMasterSettingsMutation,
  useGetCalendarStatusQuery,
  useConnectGoogleCalendarMutation,
  useDisconnectGoogleCalendarMutation,
  useSyncGoogleCalendarMutation,
  useScheduleMeetingBotMutation,
  useJoinMeetingBotMutation,
  useCancelMeetingBotMutation,
} = scrumMasterApi
