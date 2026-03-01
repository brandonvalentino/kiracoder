import Foundation

enum ServerState: Equatable {
    case stopped
    case starting
    case running
    case error(String)

    static func == (lhs: ServerState, rhs: ServerState) -> Bool {
        switch (lhs, rhs) {
        case (.stopped, .stopped), (.starting, .starting), (.running, .running):
            return true
        case (.error(let a), .error(let b)):
            return a == b
        default:
            return false
        }
    }
}

class ServerManager {
    static let shared = ServerManager()

    private var process: Process?
    private var outputPipe: Pipe?
    private var errorPipe: Pipe?

    private(set) var state: ServerState = .stopped {
        didSet {
            NotificationCenter.default.post(name: .serverStateChanged, object: nil)
        }
    }

    let port: Int = 3000

    /// Path to the pi-web-ui project
    private var projectPath: String {
        // Look for the project relative to the app or use a fixed path
        let home = FileManager.default.homeDirectoryForCurrentUser.path
        return "\(home)/Projects/pi-web-ui"
    }

    private var nodePath: String {
        // Common node locations
        let candidates = [
            "/opt/homebrew/bin/node",
            "/usr/local/bin/node",
            "\(FileManager.default.homeDirectoryForCurrentUser.path)/.nvm/versions/node/\(findNvmVersion())/bin/node"
        ]
        return candidates.first { FileManager.default.fileExists(atPath: $0) } ?? "/opt/homebrew/bin/node"
    }

    private func findNvmVersion() -> String {
        let nvmDir = FileManager.default.homeDirectoryForCurrentUser.appendingPathComponent(".nvm/versions/node")
        if let contents = try? FileManager.default.contentsOfDirectory(atPath: nvmDir.path) {
            // Pick the latest version
            return contents.sorted().last ?? ""
        }
        return ""
    }

    func start() {
        guard state != .running && state != .starting else { return }

        let serverScript = "\(projectPath)/dist/backend/server.js"

        guard FileManager.default.fileExists(atPath: serverScript) else {
            state = .error("server.js not found — run npm run build first")
            return
        }

        state = .starting

        let proc = Process()
        proc.executableURL = URL(fileURLWithPath: nodePath)
        proc.arguments = [serverScript]
        proc.currentDirectoryURL = URL(fileURLWithPath: projectPath)

        // Inherit PATH so node can find `pi`
        var env = ProcessInfo.processInfo.environment
        let extraPaths = ["/opt/homebrew/bin", "/usr/local/bin", "\(FileManager.default.homeDirectoryForCurrentUser.path)/.local/bin"]
        let existingPath = env["PATH"] ?? "/usr/bin:/bin"
        env["PATH"] = (extraPaths + [existingPath]).joined(separator: ":")
        env["PORT"] = String(port)
        proc.environment = env

        let outPipe = Pipe()
        let errPipe = Pipe()
        proc.standardOutput = outPipe
        proc.standardError = errPipe

        outputPipe = outPipe
        errorPipe = errPipe

        // Watch stdout for the "listening" signal
        outPipe.fileHandleForReading.readabilityHandler = { [weak self] handle in
            let data = handle.availableData
            guard !data.isEmpty, let line = String(data: data, encoding: .utf8) else { return }

            print("[Tau] \(line)", terminator: "")

            if line.contains("http://localhost:") {
                DispatchQueue.main.async {
                    self?.state = .running
                }
            }
        }

        errPipe.fileHandleForReading.readabilityHandler = { handle in
            let data = handle.availableData
            if let line = String(data: data, encoding: .utf8), !line.isEmpty {
                print("[Tau stderr] \(line)", terminator: "")
            }
        }

        proc.terminationHandler = { [weak self] process in
            DispatchQueue.main.async {
                if self?.state == .running || self?.state == .starting {
                    let code = process.terminationStatus
                    self?.state = code == 0 ? .stopped : .error("Exited with code \(code)")
                }
                self?.process = nil
            }
        }

        do {
            try proc.run()
            process = proc
        } catch {
            state = .error(error.localizedDescription)
        }
    }

    func stop() {
        guard let proc = process, proc.isRunning else {
            state = .stopped
            return
        }

        // Clean up pipe handlers
        outputPipe?.fileHandleForReading.readabilityHandler = nil
        errorPipe?.fileHandleForReading.readabilityHandler = nil

        proc.terminate()

        // Give it a moment, then force kill if needed
        DispatchQueue.global().asyncAfter(deadline: .now() + 2) { [weak self] in
            if proc.isRunning {
                proc.interrupt()
            }
            DispatchQueue.main.async {
                self?.state = .stopped
            }
        }

        state = .stopped
    }
}
