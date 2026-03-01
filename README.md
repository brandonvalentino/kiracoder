# Pi Web UI

A web-based chat interface for Pi coding agent using the RPC protocol.

## Features

- 💬 Real-time chat interface with streaming responses
- 🔧 Tool execution visualization with live output
- 📡 WebSocket communication for instant updates
- 🎨 Clean, dark-themed UI
- 🔄 Automatic reconnection handling
- 🪟 Extension UI dialog support (select, confirm, input, editor)

## Architecture

```
Browser (WebSocket) ↔ Express Server ↔ Pi subprocess (RPC mode)
```

- **Backend**: Node.js with Express and WebSocket server
- **Frontend**: Vanilla JavaScript (ES modules)
- **Pi Integration**: Spawns `pi --mode rpc --no-session` subprocess
- **Protocol**: JSON-lines over stdin/stdout

## Installation

```bash
npm install
```

## Development

Build TypeScript and run server:

```bash
npm run dev
```

Or build and run separately:

```bash
npm run build
npm start
```

## Usage

1. Start the server: `npm run dev`
2. Open browser: http://localhost:3000
3. Start chatting with Pi!

The interface will show:
- Your messages in green on the right
- Pi's responses in blue on the left
- Tool executions as expandable cards showing arguments and results
- Streaming text as it's generated token by token

## Key Bindings

- **Enter** - Send message
- **Abort button** (when streaming) - Stop the agent

## Extension UI Support

The interface handles extension UI requests from Pi:
- **Select dialogs** - Choose from a list of options
- **Confirm dialogs** - Yes/No prompts
- **Input dialogs** - Free-form text input
- **Editor dialogs** - Multi-line text editing
- **Notifications** - Toast-style messages

## Project Structure

```
pi-web-ui/
├── src/
│   └── backend/
│       ├── types.ts          # TypeScript types for RPC protocol
│       ├── rpc-manager.ts    # Spawns and manages Pi subprocess
│       ├── websocket-handler.ts  # WebSocket connection management
│       └── server.ts         # Express server entry point
├── public/
│   ├── index.html           # HTML shell
│   ├── style.css            # Styling
│   ├── app.js               # Main application logic
│   ├── websocket-client.js  # WebSocket client
│   ├── state.js             # State management
│   ├── message-renderer.js  # Message rendering
│   ├── tool-card.js         # Tool execution cards
│   └── dialogs.js           # Extension UI dialogs
├── dist/                    # Compiled TypeScript
├── package.json
├── tsconfig.json
└── README.md
```

## Configuration

The server listens on port 3000 by default. Change this with the `PORT` environment variable:

```bash
PORT=8080 npm start
```

## Troubleshooting

**Pi process exits immediately:**
- Make sure `pi` is in your PATH
- Check stderr output in the server logs

**WebSocket connection fails:**
- Ensure the server is running on the expected port
- Check browser console for connection errors

**No messages appearing:**
- Open browser DevTools console to check for JavaScript errors
- Verify WebSocket connection in Network tab

## Development Notes

- Frontend uses vanilla JavaScript (ES modules) - no build step needed
- Backend is TypeScript compiled to CommonJS
- WebSocket messages use JSON format
- RPC events are forwarded directly to connected clients
- Tool executions are tracked by `toolCallId`

## Future Enhancements

- [ ] Session persistence (save/load conversations)
- [ ] Model selector in UI
- [ ] Message history limits/compaction triggers
- [ ] Syntax highlighting for code in messages
- [ ] File upload support for images
- [ ] Export conversation as HTML/markdown
- [ ] Theme customization
- [ ] Multiple conversation threads
