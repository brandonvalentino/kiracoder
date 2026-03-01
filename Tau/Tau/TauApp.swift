import SwiftUI

@main
struct TauApp: App {
    @NSApplicationDelegateAdaptor(AppDelegate.self) var appDelegate

    var body: some Scene {
        Settings {
            EmptyView()
        }
    }
}

class AppDelegate: NSObject, NSApplicationDelegate {
    var statusItem: NSStatusItem!
    var serverManager = ServerManager.shared

    func applicationDidFinishLaunching(_ notification: Notification) {
        // Hide dock icon
        NSApp.setActivationPolicy(.accessory)

        // Create menu bar item
        statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)

        if let button = statusItem.button {
            let attrs: [NSAttributedString.Key: Any] = [
                .foregroundColor: NSColor.white,
                .font: NSFont.systemFont(ofSize: 16, weight: .medium)
            ]
            button.attributedTitle = NSAttributedString(string: "τ", attributes: attrs)
        }

        updateMenu()

        // Observe server state changes
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(serverStateChanged),
            name: .serverStateChanged,
            object: nil
        )

        // Auto-start the server
        serverManager.start()
    }

    @objc func serverStateChanged() {
        DispatchQueue.main.async {
            self.updateMenu()
            self.updateIcon()
        }
    }

    func updateIcon() {
        if let button = statusItem.button {
            let attrs: [NSAttributedString.Key: Any] = [
                .foregroundColor: NSColor.white,
                .font: NSFont.systemFont(ofSize: 16, weight: .medium)
            ]
            button.attributedTitle = NSAttributedString(string: "τ", attributes: attrs)
        }
    }

    func updateMenu() {
        let menu = NSMenu()

        // Status line
        let stateText: String
        switch serverManager.state {
        case .stopped:
            stateText = "Server Stopped"
        case .starting:
            stateText = "Starting..."
        case .running:
            stateText = "Running on port \(serverManager.port)"
        case .error(let msg):
            stateText = "Error: \(msg)"
        }

        let statusMenuItem = NSMenuItem(title: stateText, action: nil, keyEquivalent: "")
        statusMenuItem.isEnabled = false

        if case .running = serverManager.state {
            let attrs: [NSAttributedString.Key: Any] = [
                .foregroundColor: NSColor.systemGreen,
                .font: NSFont.menuFont(ofSize: 13)
            ]
            statusMenuItem.attributedTitle = NSAttributedString(string: "● " + stateText, attributes: attrs)
        }

        menu.addItem(statusMenuItem)
        menu.addItem(.separator())

        // Open in Browser
        let openItem = NSMenuItem(title: "Open in Browser", action: #selector(openBrowser), keyEquivalent: "o")
        openItem.target = self
        openItem.isEnabled = serverManager.state == .running
        menu.addItem(openItem)

        menu.addItem(.separator())

        // Start / Stop
        switch serverManager.state {
        case .running, .starting:
            let stopItem = NSMenuItem(title: "Stop Server", action: #selector(stopServer), keyEquivalent: "")
            stopItem.target = self
            menu.addItem(stopItem)
        case .stopped, .error:
            let startItem = NSMenuItem(title: "Start Server", action: #selector(startServer), keyEquivalent: "")
            startItem.target = self
            menu.addItem(startItem)
        }

        // Restart
        if serverManager.state == .running {
            let restartItem = NSMenuItem(title: "Restart Server", action: #selector(restartServer), keyEquivalent: "")
            restartItem.target = self
            menu.addItem(restartItem)
        }

        menu.addItem(.separator())

        // Quit
        let quitItem = NSMenuItem(title: "Quit Tau", action: #selector(quitApp), keyEquivalent: "q")
        quitItem.target = self
        menu.addItem(quitItem)

        self.statusItem.menu = menu
    }

    @objc func openBrowser() {
        let url = URL(string: "http://localhost:\(serverManager.port)")!
        NSWorkspace.shared.open(url)
    }

    @objc func startServer() {
        serverManager.start()
    }

    @objc func stopServer() {
        serverManager.stop()
    }

    @objc func restartServer() {
        serverManager.stop()
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            self.serverManager.start()
        }
    }

    @objc func quitApp() {
        serverManager.stop()
        NSApp.terminate(nil)
    }
}

extension Notification.Name {
    static let serverStateChanged = Notification.Name("serverStateChanged")
}
