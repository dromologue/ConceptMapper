import Foundation
import os.log

/// File-based error logging for debugging LLM and file operations.
/// Logs are written to ~/Documents/ConceptMapper/Logs/.
enum LogService {
    enum Level: String {
        case info = "INFO"
        case warning = "WARN"
        case error = "ERROR"
    }

    private static let logger = Logger(subsystem: "com.dromologue.ConceptLLM", category: "LogFile")

    private static var logsFolder: URL {
        let home = FileManager.default.homeDirectoryForCurrentUser
        return home.appendingPathComponent("Documents/ConceptMapper/Logs")
    }

    /// Log a message to today's log file.
    static func log(_ message: String, level: Level = .info) {
        let fm = FileManager.default
        let folder = logsFolder

        // Ensure logs directory exists
        if !fm.fileExists(atPath: folder.path) {
            try? fm.createDirectory(at: folder, withIntermediateDirectories: true)
        }

        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd"
        let filename = "\(dateFormatter.string(from: Date())).log"
        let fileURL = folder.appendingPathComponent(filename)

        let timeFormatter = DateFormatter()
        timeFormatter.dateFormat = "HH:mm:ss"
        let entry = "[\(timeFormatter.string(from: Date()))] [\(level.rawValue)] \(message)\n"

        if fm.fileExists(atPath: fileURL.path) {
            if let handle = try? FileHandle(forWritingTo: fileURL) {
                handle.seekToEndOfFile()
                if let data = entry.data(using: .utf8) {
                    handle.write(data)
                }
                handle.closeFile()
            }
        } else {
            try? entry.write(to: fileURL, atomically: true, encoding: .utf8)
        }

        // Auto-rotate: remove logs older than 7 days
        rotateOldLogs()
    }

    /// Remove log files older than 7 days.
    private static func rotateOldLogs() {
        let fm = FileManager.default
        let folder = logsFolder
        guard let files = try? fm.contentsOfDirectory(at: folder, includingPropertiesForKeys: [.creationDateKey]) else { return }

        let cutoff = Calendar.current.date(byAdding: .day, value: -7, to: Date()) ?? Date()
        for file in files where file.pathExtension == "log" {
            if let attrs = try? fm.attributesOfItem(atPath: file.path),
               let created = attrs[.creationDate] as? Date,
               created < cutoff {
                try? fm.removeItem(at: file)
            }
        }
    }
}
