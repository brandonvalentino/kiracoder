# 🚀 Quick Start

## Prerequisites

- Node.js (v18 or later)
- Pi coding agent installed (`pi` command available)

## Installation

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Verify setup
npm test
```

## Running

```bash
# Start the server
npm start
```

Then open your browser to:
**http://localhost:3000**

## What You'll See

1. **Welcome screen** - A dark-themed chat interface
2. **Connection status** - Green indicator showing "Connected"
3. **Input box** - Type a message and press Enter
4. **Streaming responses** - See Pi's responses appear token by token
5. **Tool cards** - Visual display of tool executions with live output

## Example First Message

Try typing:
```
Hello! Can you read the README.md file?
```

You should see:
1. Your message appear on the right in green
2. Pi's response streaming in on the left in blue
3. A tool card showing the `read` tool execution
4. The final response with the file contents

## Stopping

Press `Ctrl+C` in the terminal to stop the server.

## Troubleshooting

**"Pi process exited immediately"**
- Make sure `pi` is in your PATH
- Try running `pi --version` to verify installation

**"Cannot connect to WebSocket"**
- Check that the server is running on port 3000
- Look for error messages in the terminal

**"Page loads but nothing happens"**
- Open browser DevTools (F12)
- Check Console tab for JavaScript errors
- Check Network tab for WebSocket connection

## Next Steps

- Read [README.md](README.md) for full feature list
- Read [USAGE.md](USAGE.md) for detailed usage guide
- Read [IMPLEMENTATION.md](IMPLEMENTATION.md) for technical details

## Development

```bash
# Watch mode (recompile on changes)
npm run watch

# In another terminal, restart server when changes are made
npm start
```

For production deployment, see README.md for environment variable configuration.

---

**Enjoy chatting with Pi!** 💬
