# Pi Web UI - Usage Guide

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Build the project:**
   ```bash
   npm run build
   ```

3. **Start the server:**
   ```bash
   npm start
   ```

4. **Open in browser:**
   ```
   http://localhost:3000
   ```

## Interface Overview

### Header
- **Title**: "Pi Chat" with accent color
- **Status Indicator**: 
  - 🟢 Connected (green) - WebSocket connected
  - 🔵 Streaming (blue, pulsing) - Agent is working
  - 🔴 Disconnected (red) - Connection lost

### Messages Area
The main chat area displays:
- **User messages** - Right-aligned in green
- **Assistant messages** - Left-aligned in blue
- **Tool execution cards** - Showing tool calls with arguments and results
- **Streaming text** - Real-time updates as Pi generates responses

### Input Area
- **Message input** - Type your message here
- **Send button** - Click to send (or press Enter)
- **Abort button** - Appears when streaming, stops the agent

## Features in Detail

### 1. Streaming Responses

When Pi generates a response, you'll see:
- A blinking cursor (▋) indicating streaming is active
- Text appearing token by token in real-time
- The cursor disappears when the response is complete

### 2. Tool Execution Visualization

When Pi uses tools, you'll see tool cards with status indicators:
- **PENDING** - Tool queued but not started
- **STREAMING** - Tool executing, output updating
- **COMPLETE** - Tool finished successfully
- **ERROR** - Tool execution failed

### 3. Extension UI Dialogs

Extensions can request user interaction via dialogs:
- **Select** - Choose from a list of options
- **Confirm** - Yes/No prompts
- **Input** - Free-form text input
- **Editor** - Multi-line text editing

### 4. Notifications

Extensions can show toast-style notifications that auto-dismiss after 5 seconds.

## Example Usage

### Basic Chat
```
You: Hello! Can you help me read a file?