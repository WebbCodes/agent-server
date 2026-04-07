// ============================================================================
// Claude Code Hook Events — Complete Type Definitions
// ============================================================================

// ----------------------------------------------------------------------------
// Common base payload — every hook event includes these fields
// ----------------------------------------------------------------------------

export interface HookInputBase {
  /** Unique session identifier */
  session_id: string
  /** Absolute path to transcript.jsonl */
  transcript_path: string
  /** Current working directory (absolute path) */
  cwd: string
  /** Active permission mode */
  permission_mode: PermissionMode
  /** Event name discriminant */
  hook_event_name: HookEventName
  /** Present if hook fires within a subagent context */
  agent_id?: string
  /** Subagent type — "Explore" | "Bash" | "Plan" | custom */
  agent_type?: string
}

export type PermissionMode =
  | "default"
  | "plan"
  | "acceptEdits"
  | "auto"
  | "dontAsk"
  | "bypassPermissions"

export type HookEventName =
  | "SessionStart"
  | "SessionEnd"
  | "UserPromptSubmit"
  | "PreToolUse"
  | "PostToolUse"
  | "PostToolUseFailure"
  | "PermissionRequest"
  | "PermissionDenied"
  | "Notification"
  | "SubagentStart"
  | "SubagentStop"
  | "TaskCreated"
  | "TaskCompleted"
  | "Stop"
  | "StopFailure"
  | "TeammateIdle"
  | "InstructionsLoaded"
  | "ConfigChange"
  | "CwdChanged"
  | "FileChanged"
  | "WorktreeCreate"
  | "WorktreeRemove"
  | "PreCompact"
  | "PostCompact"
  | "Elicitation"
  | "ElicitationResult"

// ----------------------------------------------------------------------------
// Tool input types — used by PreToolUse, PostToolUse, Permission* events
// ----------------------------------------------------------------------------

export interface BashToolInput {
  command: string
  description?: string
  timeout?: number
  run_in_background?: boolean
}

export interface WriteToolInput {
  file_path: string
  content: string
}

export interface EditToolInput {
  file_path: string
  old_string: string
  new_string: string
  replace_all?: boolean
}

export interface ReadToolInput {
  file_path: string
  offset?: number
  limit?: number
}

export interface GlobToolInput {
  pattern: string
  path?: string
}

export interface GrepToolInput {
  pattern: string
  path?: string
  glob?: string
  output_mode?: "content" | "files_with_matches" | "count"
  "-i"?: boolean
  multiline?: boolean
  "-A"?: number
  "-B"?: number
  "-C"?: number
  head_limit?: number
  offset?: number
}

export interface WebFetchToolInput {
  url: string
  prompt: string
}

export interface WebSearchToolInput {
  query: string
  allowed_domains?: string[]
  blocked_domains?: string[]
}

export interface AgentToolInput {
  prompt: string
  description?: string
  subagent_type?: string
  model?: string
}

export interface AskUserQuestionToolInput {
  questions: Array<{
    question: string
    header?: string
    options?: Array<{ label: string }>
    multiSelect?: boolean
  }>
  answers?: Record<string, string>
}

export type ToolInput =
  | BashToolInput
  | WriteToolInput
  | EditToolInput
  | ReadToolInput
  | GlobToolInput
  | GrepToolInput
  | WebFetchToolInput
  | WebSearchToolInput
  | AgentToolInput
  | AskUserQuestionToolInput
  | Record<string, unknown>

export type ToolName =
  | "Bash"
  | "Write"
  | "Edit"
  | "Read"
  | "Glob"
  | "Grep"
  | "WebFetch"
  | "WebSearch"
  | "Agent"
  | "AskUserQuestion"
  | string // MCP tools: mcp__serverName__toolName

// ----------------------------------------------------------------------------
// Session lifecycle events
// ----------------------------------------------------------------------------

/** Fires when a session begins or resumes. Can inject env vars via $CLAUDE_ENV_FILE. */
export interface SessionStartInput extends HookInputBase {
  hook_event_name: "SessionStart"
  /** What triggered the session start */
  source: "startup" | "resume" | "clear" | "compact"
  /** Model ID (e.g. "claude-sonnet-4-6") */
  model?: string
}

/** Fires when a session terminates. Observability only. */
export interface SessionEndInput extends HookInputBase {
  hook_event_name: "SessionEnd"
  reason: "clear" | "resume" | "logout" | "prompt_input_exit" | "bypass_permissions_disabled" | "other"
}

// ----------------------------------------------------------------------------
// User input events
// ----------------------------------------------------------------------------

/** Fires before Claude processes a user prompt. Blocking — can prevent submission. */
export interface UserPromptSubmitInput extends HookInputBase {
  hook_event_name: "UserPromptSubmit"
  /** The user's prompt text */
  prompt?: string
}

// ----------------------------------------------------------------------------
// Tool execution events
// ----------------------------------------------------------------------------

/** Fires before any tool executes. Blocking — can allow/deny/ask/defer. */
export interface PreToolUseInput extends HookInputBase {
  hook_event_name: "PreToolUse"
  tool_name: ToolName
  tool_input: ToolInput
  tool_use_id: string
}

/** Fires after a tool executes successfully. Can inject additional context. */
export interface PostToolUseInput extends HookInputBase {
  hook_event_name: "PostToolUse"
  tool_name: ToolName
  tool_input: ToolInput
  tool_response: unknown
  tool_use_id: string
}

/** Fires after a tool fails. Observability only. */
export interface PostToolUseFailureInput extends HookInputBase {
  hook_event_name: "PostToolUseFailure"
  tool_name: ToolName
  tool_input: ToolInput
  tool_use_id: string
  error: string
  is_interrupt: boolean
}

// ----------------------------------------------------------------------------
// Permission events
// ----------------------------------------------------------------------------

export interface PermissionSuggestion {
  type: "addRules" | "replaceRules" | "removeRules" | "setMode" | "addDirectories" | "removeDirectories"
  rules?: Array<{ toolName: string; ruleContent: string }>
  behavior?: "allow" | "deny" | "ask"
  mode?: PermissionMode
  directories?: string[]
  destination?: "session" | "localSettings" | "projectSettings" | "userSettings"
}

/** Fires when a permission prompt would be shown. Blocking — can auto-approve/deny. */
export interface PermissionRequestInput extends HookInputBase {
  hook_event_name: "PermissionRequest"
  tool_name: ToolName
  tool_input: ToolInput
  permission_suggestions?: PermissionSuggestion[]
}

/** Fires when auto mode denies a tool. Observability only. */
export interface PermissionDeniedInput extends HookInputBase {
  hook_event_name: "PermissionDenied"
  tool_name: ToolName
  tool_input: ToolInput
  tool_use_id: string
  reason: string
}

// ----------------------------------------------------------------------------
// Notification event
// ----------------------------------------------------------------------------

export type NotificationType =
  | "permission_prompt"
  | "idle_prompt"
  | "auth_success"
  | "elicitation_dialog"

/** Fires when a notification is generated. Observability only. */
export interface NotificationInput extends HookInputBase {
  hook_event_name: "Notification"
  notification_type: NotificationType
  message: string
  title?: string
}

// ----------------------------------------------------------------------------
// Subagent events
// ----------------------------------------------------------------------------

/** Fires when a subagent is spawned. Observability only. */
export interface SubagentStartInput extends HookInputBase {
  hook_event_name: "SubagentStart"
  agent_id: string
  agent_type: string
}

/** Fires when a subagent finishes. Blocking — can block completion. */
export interface SubagentStopInput extends HookInputBase {
  hook_event_name: "SubagentStop"
  stop_hook_active: boolean
  agent_id: string
  agent_type: string
  agent_transcript_path: string
  last_assistant_message: string
}

// ----------------------------------------------------------------------------
// Task events (agent teams)
// ----------------------------------------------------------------------------

/** Fires when a task is created in an agent team. Blocking. */
export interface TaskCreatedInput extends HookInputBase {
  hook_event_name: "TaskCreated"
  task_id: string
  task_subject: string
  task_description: string
  teammate_name: string
  team_name: string
}

/** Fires when a task is marked complete. Blocking. */
export interface TaskCompletedInput extends HookInputBase {
  hook_event_name: "TaskCompleted"
  task_id: string
  task_subject: string
  task_description: string
  teammate_name: string
  team_name: string
}

// ----------------------------------------------------------------------------
// Stop events
// ----------------------------------------------------------------------------

/** Fires when Claude finishes responding. Blocking — can prevent stop. */
export interface StopInput extends HookInputBase {
  hook_event_name: "Stop"
  stop_reason: "stop" | "end_turn"
}

export type StopFailureErrorType =
  | "rate_limit"
  | "authentication_failed"
  | "billing_error"
  | "invalid_request"
  | "server_error"
  | "max_output_tokens"
  | "unknown"

/** Fires when an API error ends the turn. Observability only. */
export interface StopFailureInput extends HookInputBase {
  hook_event_name: "StopFailure"
  error_type: StopFailureErrorType
  error_message: string
}

/** Fires when a teammate goes idle. Blocking — can keep teammate working. */
export interface TeammateIdleInput extends HookInputBase {
  hook_event_name: "TeammateIdle"
  teammate_name: string
  team_name: string
}

// ----------------------------------------------------------------------------
// Instructions event
// ----------------------------------------------------------------------------

export type InstructionsLoadReason =
  | "session_start"
  | "nested_traversal"
  | "path_glob_match"
  | "include"
  | "compact"

/** Fires when a CLAUDE.md or rules file is loaded. Observability only. */
export interface InstructionsLoadedInput extends HookInputBase {
  hook_event_name: "InstructionsLoaded"
  file_path: string
  memory_type?: "User" | "Project" | "Local" | "Managed"
  load_reason: InstructionsLoadReason
  globs?: string[]
  trigger_file_path?: string
  parent_file_path?: string
}

// ----------------------------------------------------------------------------
// Config event
// ----------------------------------------------------------------------------

export type ConfigSource =
  | "user_settings"
  | "project_settings"
  | "local_settings"
  | "policy_settings"
  | "skills"

/** Fires when a config file changes during session. Blocking. */
export interface ConfigChangeInput extends HookInputBase {
  hook_event_name: "ConfigChange"
  source: ConfigSource
}

// ----------------------------------------------------------------------------
// Directory / file events
// ----------------------------------------------------------------------------

/** Fires when the working directory changes. Can inject env vars. */
export interface CwdChangedInput extends HookInputBase {
  hook_event_name: "CwdChanged"
  old_cwd: string
  new_cwd: string
}

/** Fires when a watched file changes on disk. Can inject env vars. */
export interface FileChangedInput extends HookInputBase {
  hook_event_name: "FileChanged"
  file_path: string
  change_type: "modified" | "created" | "deleted"
}

// ----------------------------------------------------------------------------
// Worktree events
// ----------------------------------------------------------------------------

/** Fires when a worktree is created. Blocking — can override path. */
export interface WorktreeCreateInput extends HookInputBase {
  hook_event_name: "WorktreeCreate"
  reason: "isolation" | "manual" | "subagent"
}

/** Fires when a worktree is removed. Observability only. */
export interface WorktreeRemoveInput extends HookInputBase {
  hook_event_name: "WorktreeRemove"
  worktree_path: string
  reason: "session_end" | "subagent_finish"
}

// ----------------------------------------------------------------------------
// Compaction events
// ----------------------------------------------------------------------------

/** Fires before context compaction. Observability only. */
export interface PreCompactInput extends HookInputBase {
  hook_event_name: "PreCompact"
  reason: "manual" | "auto"
}

/** Fires after context compaction. Observability only. */
export interface PostCompactInput extends HookInputBase {
  hook_event_name: "PostCompact"
  reason: "manual" | "auto"
}

// ----------------------------------------------------------------------------
// MCP elicitation events
// ----------------------------------------------------------------------------

/** Fires when an MCP server requests user input. Blocking — can auto-respond. */
export interface ElicitationInput extends HookInputBase {
  hook_event_name: "Elicitation"
  mcp_server_name: string
  tool_name: string
  elicitation_form: unknown
}

/** Fires when the user responds to an MCP elicitation. Blocking — can override. */
export interface ElicitationResultInput extends HookInputBase {
  hook_event_name: "ElicitationResult"
  mcp_server_name: string
  tool_name: string
  user_action: "accept" | "decline" | "cancel"
  user_input: Record<string, unknown>
}

// ----------------------------------------------------------------------------
// Discriminated union of all hook events
// ----------------------------------------------------------------------------

export type HookEvent =
  | SessionStartInput
  | SessionEndInput
  | UserPromptSubmitInput
  | PreToolUseInput
  | PostToolUseInput
  | PostToolUseFailureInput
  | PermissionRequestInput
  | PermissionDeniedInput
  | NotificationInput
  | SubagentStartInput
  | SubagentStopInput
  | TaskCreatedInput
  | TaskCompletedInput
  | StopInput
  | StopFailureInput
  | TeammateIdleInput
  | InstructionsLoadedInput
  | ConfigChangeInput
  | CwdChangedInput
  | FileChangedInput
  | WorktreeCreateInput
  | WorktreeRemoveInput
  | PreCompactInput
  | PostCompactInput
  | ElicitationInput
  | ElicitationResultInput

// ----------------------------------------------------------------------------
// Recorded event — what gets stored in events.jsonl
// ----------------------------------------------------------------------------

export type RecordedEvent = HookEvent & {
  /** ISO 8601 timestamp when the hook script recorded the event */
  recorded_at: string
}

// ----------------------------------------------------------------------------
// Hook output types — what a hook script can return on stdout
// ----------------------------------------------------------------------------

export interface HookOutputBase {
  continue?: boolean
  stopReason?: string
  suppressOutput?: boolean
  systemMessage?: string
}

export interface PreToolUseOutput extends HookOutputBase {
  hookSpecificOutput?: {
    hookEventName: "PreToolUse"
    permissionDecision: "allow" | "deny" | "ask" | "defer"
    permissionDecisionReason?: string
    updatedInput?: ToolInput
    additionalContext?: string
  }
}

export interface PostToolUseOutput extends HookOutputBase {
  decision?: "block"
  reason?: string
  hookSpecificOutput?: {
    hookEventName: "PostToolUse"
    additionalContext?: string
    updatedMCPToolOutput?: unknown
  }
}

export interface PermissionRequestOutput extends HookOutputBase {
  hookSpecificOutput?: {
    hookEventName: "PermissionRequest"
    decision?: {
      behavior: "allow" | "deny"
      updatedInput?: ToolInput
      updatedPermissions?: PermissionSuggestion[]
      message?: string
    }
  }
}

export interface SessionStartOutput extends HookOutputBase {
  hookSpecificOutput?: {
    hookEventName: "SessionStart"
    additionalContext?: string
  }
}

export interface StopOutput extends HookOutputBase {
  decision?: "block"
  reason?: string
}

export interface WorktreeCreateOutput extends HookOutputBase {
  hookSpecificOutput?: {
    worktreePath: string
  }
}

export interface ElicitationOutput extends HookOutputBase {
  hookSpecificOutput?: {
    hookEventName: "Elicitation"
    action: "accept" | "decline" | "cancel"
    content?: Record<string, unknown>
  }
}

export interface ElicitationResultOutput extends HookOutputBase {
  hookSpecificOutput?: {
    hookEventName: "ElicitationResult"
    action: "accept" | "decline" | "cancel"
    content?: Record<string, unknown>
  }
}

// ----------------------------------------------------------------------------
// Hook configuration types — settings.json shape
// ----------------------------------------------------------------------------

export interface HookHandler {
  type: "command" | "http" | "prompt" | "agent"
  command?: string
  url?: string
  headers?: Record<string, string>
  allowedEnvVars?: string[]
  prompt?: string
  model?: string
  timeout?: number
  async?: boolean
  shell?: string
  statusMessage?: string
}

export interface HookMatcherGroup {
  matcher?: string
  hooks: HookHandler[]
}

export type HooksConfig = Partial<Record<HookEventName, HookMatcherGroup[]>>

// ----------------------------------------------------------------------------
// Metadata about each hook event — for UI display and documentation
// ----------------------------------------------------------------------------

export interface HookEventMeta {
  name: HookEventName
  description: string
  blocking: boolean
  matcherType: string
  category: "session" | "tool" | "permission" | "agent" | "lifecycle" | "config"
}

export const HOOK_EVENT_META: HookEventMeta[] = [
  { name: "SessionStart", description: "Session begins or resumes", blocking: false, matcherType: "startup|resume|clear|compact", category: "session" },
  { name: "SessionEnd", description: "Session terminates", blocking: false, matcherType: "clear|resume|logout|prompt_input_exit|other", category: "session" },
  { name: "UserPromptSubmit", description: "User submits a prompt", blocking: true, matcherType: "none", category: "session" },
  { name: "PreToolUse", description: "Before tool executes", blocking: true, matcherType: "tool name (regex)", category: "tool" },
  { name: "PostToolUse", description: "After tool succeeds", blocking: false, matcherType: "tool name (regex)", category: "tool" },
  { name: "PostToolUseFailure", description: "After tool fails", blocking: false, matcherType: "tool name (regex)", category: "tool" },
  { name: "PermissionRequest", description: "Permission dialog would be shown", blocking: true, matcherType: "tool name", category: "permission" },
  { name: "PermissionDenied", description: "Auto mode denies a tool", blocking: false, matcherType: "tool name", category: "permission" },
  { name: "Notification", description: "Notification generated", blocking: false, matcherType: "notification type", category: "lifecycle" },
  { name: "SubagentStart", description: "Subagent spawned", blocking: false, matcherType: "agent type", category: "agent" },
  { name: "SubagentStop", description: "Subagent finishes", blocking: true, matcherType: "agent type", category: "agent" },
  { name: "TaskCreated", description: "Task created in agent team", blocking: true, matcherType: "none", category: "agent" },
  { name: "TaskCompleted", description: "Task marked complete", blocking: true, matcherType: "none", category: "agent" },
  { name: "Stop", description: "Claude finishes responding", blocking: true, matcherType: "none", category: "session" },
  { name: "StopFailure", description: "API error ends the turn", blocking: false, matcherType: "error type", category: "session" },
  { name: "TeammateIdle", description: "Teammate goes idle", blocking: true, matcherType: "none", category: "agent" },
  { name: "InstructionsLoaded", description: "CLAUDE.md or rules file loaded", blocking: false, matcherType: "load reason", category: "config" },
  { name: "ConfigChange", description: "Config file changes during session", blocking: true, matcherType: "config source", category: "config" },
  { name: "CwdChanged", description: "Working directory changes", blocking: false, matcherType: "none", category: "lifecycle" },
  { name: "FileChanged", description: "Watched file changes on disk", blocking: false, matcherType: "filename (basename)", category: "lifecycle" },
  { name: "WorktreeCreate", description: "Worktree created", blocking: true, matcherType: "none", category: "lifecycle" },
  { name: "WorktreeRemove", description: "Worktree removed", blocking: false, matcherType: "none", category: "lifecycle" },
  { name: "PreCompact", description: "Before context compaction", blocking: false, matcherType: "manual|auto", category: "lifecycle" },
  { name: "PostCompact", description: "After context compaction", blocking: false, matcherType: "manual|auto", category: "lifecycle" },
  { name: "Elicitation", description: "MCP server requests user input", blocking: true, matcherType: "MCP server name", category: "lifecycle" },
  { name: "ElicitationResult", description: "User responds to MCP elicitation", blocking: true, matcherType: "MCP server name", category: "lifecycle" },
]
