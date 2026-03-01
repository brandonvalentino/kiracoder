# Tau Roadmap

Ideas and planned features. Nothing here is committed — just captured so it doesn't get lost.

## File Preview Panel

Context-aware split pane that displays files the agent is working on.

**File types:**
- Code → syntax highlighted viewer (Monaco/CodeMirror)
- Images → preview (PNG, SVG, generated images)
- HTML → live iframe preview, hot reloads as agent edits
- Markdown → rendered preview or editable with live render

**Desktop layout:**
- Button collapses sidebar and shrinks conversation to narrow mobile-width feed
- Preview panel takes ~60-70% of the width
- Conversation becomes a narrow stream on the left — just enough to follow along
- IDE-like layout where the "editor" is the AI conversation

**Mobile layout:**
- No split pane — tap a file reference in chat to open preview full-screen
- Swipe or back button to return to conversation
- iOS navigation stack feel

**Data source:**
- Tool events already tell us which files are being read/written
- Could auto-show preview when a file gets edited
- Or manually open via file picker / clicking filename in chat

## Bookmarked Sessions

Star/favourite conversations from the sidebar. Bookmarked sessions pinned to the top or filterable. Stored locally (localStorage) or synced to a small JSON file so it persists across devices.

Could extend to bookmarking individual messages within a session too — pin key decisions, useful snippets, important moments.

## Agent Team Awareness

Detect multiple Pi sessions running in tmux (common pattern for parallel agents). Show a `team` tag or grouped section in the sidebar. Could detect via `tmux list-sessions` cross-referenced with running Pi processes — no dependency on any specific extension.

- Visual grouping in sidebar
- Team status overview (which agents are still working)
- Bulk actions (kill all, view all)

## Conversation Fork/Branch Visualization

Pi already has fork support in the RPC. Visualize the conversation as a tree — go back to any point and try a different approach. Like git for conversations.

## Diff Viewer

When the agent edits a file, show a proper side-by-side diff instead of just a tool card. Data is already in tool events.

## Full-Text Session Search

Search across ALL historical sessions, not just the sidebar list. "When did I last work on the auth module?"

## Voice Input

Talk to Pi from mobile/tablet. Web Speech API. Walk around while pair programming.

## Cost Dashboard

Track spending over time, per model, per project. Charts and trends. Data already captured per message.

## Push Notifications

Start a long task on desktop, get a ping on your phone when it's done. Service workers.

## memoryd Dashboard

Standalone viewer for memoryd memory files (session cards, semantic/episodic memory, working memory). Was previously built into Tau, stripped out to keep the core lean. Could be a separate page or a separate pi package.

## Logo & Branding

- Proper logo for README and browser tab
- Fresh screenshots (light mode, mobile, settings without session name field)

## npm Publishing

- `pi install npm:tau-mirror` for cleaner install UX
- Needs npm account setup
