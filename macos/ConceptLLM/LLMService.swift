import Foundation
import os.log

private let logger = Logger(subsystem: "com.dromologue.ConceptLLM", category: "LLM")

/// Handles HTTP calls to LLM providers. Keys never leave Swift.
enum LLMService {

    /// The currently in-flight LLM request task, if any.
    private(set) static var currentTask: URLSessionDataTask?

    /// Cancel any in-flight LLM request.
    static func cancel() {
        currentTask?.cancel()
        currentTask = nil
        logger.info("LLM request cancelled")
        LogService.log("LLM request cancelled by user", level: .info)
    }

    // MARK: - Public API

    /// Send a chat message to the configured LLM provider.
    /// - Parameters:
    ///   - configJSON: JSON string containing LLMConfig (provider, apiKey, model, baseUrl, temperature)
    ///   - messagesJSON: JSON string containing array of {role, content} messages
    ///   - systemPrompt: Optional system prompt
    ///   - completion: Returns the assistant's text content or an error
    static func sendMessage(
        configJSON: String,
        messagesJSON: String,
        systemPrompt: String?,
        completion: @escaping (Result<String, Error>) -> Void
    ) {
        guard let configData = configJSON.data(using: .utf8),
              let config = try? JSONSerialization.jsonObject(with: configData) as? [String: Any],
              let provider = config["provider"] as? String,
              let model = config["model"] as? String else {
            completion(.failure(LLMError.invalidConfig("Missing provider or model")))
            return
        }

        guard let messagesData = messagesJSON.data(using: .utf8),
              let messages = try? JSONSerialization.jsonObject(with: messagesData) as? [[String: Any]] else {
            completion(.failure(LLMError.invalidConfig("Invalid messages JSON")))
            return
        }

        let apiKey = config["apiKey"] as? String
        let baseUrl = config["baseUrl"] as? String
        let temperature = config["temperature"] as? Double ?? 0.3

        // Wrap completion to log errors
        let loggingCompletion: (Result<String, Error>) -> Void = { result in
            if case .failure(let error) = result {
                LogService.log("LLM error (\(provider)/\(model)): \(error.localizedDescription)", level: .error)
            }
            completion(result)
        }

        switch provider {
        case "anthropic":
            sendAnthropic(apiKey: apiKey, model: model, messages: messages, systemPrompt: systemPrompt, temperature: temperature, completion: loggingCompletion)
        case "openai":
            sendOpenAI(apiKey: apiKey, model: model, baseUrl: baseUrl, messages: messages, systemPrompt: systemPrompt, temperature: temperature, completion: loggingCompletion)
        case "ollama":
            sendOllama(model: model, baseUrl: baseUrl, messages: messages, systemPrompt: systemPrompt, temperature: temperature, completion: loggingCompletion)
        default:
            loggingCompletion(.failure(LLMError.invalidConfig("Unknown provider: \(provider)")))
        }
    }

    // MARK: - Anthropic

    private static func sendAnthropic(
        apiKey: String?,
        model: String,
        messages: [[String: Any]],
        systemPrompt: String?,
        temperature: Double,
        completion: @escaping (Result<String, Error>) -> Void
    ) {
        guard let apiKey = apiKey, !apiKey.isEmpty else {
            completion(.failure(LLMError.auth("API key required for Anthropic")))
            return
        }

        let url = URL(string: "https://api.anthropic.com/v1/messages")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(apiKey, forHTTPHeaderField: "x-api-key")
        request.setValue("2023-06-01", forHTTPHeaderField: "anthropic-version")
        request.timeoutInterval = 120

        // Anthropic format: system is top-level, messages are user/assistant only
        var body: [String: Any] = [
            "model": model,
            "max_tokens": 4096,
            "temperature": temperature,
        ]

        if let systemPrompt = systemPrompt, !systemPrompt.isEmpty {
            body["system"] = systemPrompt
        }

        // Filter to user/assistant messages only
        let chatMessages = messages.filter { msg in
            let role = msg["role"] as? String ?? ""
            return role == "user" || role == "assistant"
        }.map { msg -> [String: Any] in
            return ["role": msg["role"] ?? "user", "content": msg["content"] ?? ""]
        }
        body["messages"] = chatMessages

        // Debug: log the request body
        if let debugData = try? JSONSerialization.data(withJSONObject: body, options: .prettyPrinted),
           let debugStr = String(data: debugData, encoding: .utf8) {
            logger.info("Anthropic request body: \(debugStr)")
        }

        guard let httpBody = try? JSONSerialization.data(withJSONObject: body) else {
            completion(.failure(LLMError.invalidConfig("Failed to serialize request body")))
            return
        }
        request.httpBody = httpBody

        let task = URLSession.shared.dataTask(with: request) { data, response, error in
            currentTask = nil
            if let error = error {
                completion(.failure(LLMError.network(error.localizedDescription)))
                return
            }

            guard let data = data else {
                completion(.failure(LLMError.network("No data received")))
                return
            }

            let httpResponse = response as? HTTPURLResponse
            let statusCode = httpResponse?.statusCode ?? 0

            guard statusCode == 200 else {
                // Try to extract the human-readable error message from Anthropic JSON
                var friendlyMsg = "HTTP \(statusCode)"
                if let errorJson = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                   let errorObj = errorJson["error"] as? [String: Any],
                   let msg = errorObj["message"] as? String {
                    friendlyMsg = msg
                }
                if statusCode == 401 {
                    completion(.failure(LLMError.auth("Invalid API key")))
                } else if statusCode == 429 {
                    completion(.failure(LLMError.rateLimit("Rate limit exceeded")))
                } else {
                    completion(.failure(LLMError.api(friendlyMsg)))
                }
                return
            }

            guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let content = json["content"] as? [[String: Any]],
                  let firstBlock = content.first,
                  let text = firstBlock["text"] as? String else {
                completion(.failure(LLMError.api("Unexpected response format")))
                return
            }

            completion(.success(text))
        }
        currentTask = task
        task.resume()
    }

    // MARK: - OpenAI-compatible

    private static func sendOpenAI(
        apiKey: String?,
        model: String,
        baseUrl: String?,
        messages: [[String: Any]],
        systemPrompt: String?,
        temperature: Double,
        completion: @escaping (Result<String, Error>) -> Void
    ) {
        guard let apiKey = apiKey, !apiKey.isEmpty else {
            completion(.failure(LLMError.auth("API key required for OpenAI")))
            return
        }

        let endpoint = baseUrl ?? "https://api.openai.com/v1"
        guard let url = URL(string: "\(endpoint)/chat/completions") else {
            completion(.failure(LLMError.invalidConfig("Invalid base URL")))
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        request.timeoutInterval = 120

        // Build messages array with optional system prompt
        var allMessages: [[String: Any]] = []
        if let systemPrompt = systemPrompt, !systemPrompt.isEmpty {
            allMessages.append(["role": "system", "content": systemPrompt])
        }
        for msg in messages {
            let role = msg["role"] as? String ?? "user"
            if role != "system" {
                allMessages.append(["role": role, "content": msg["content"] ?? ""])
            }
        }

        let body: [String: Any] = [
            "model": model,
            "messages": allMessages,
            "temperature": temperature,
            "max_tokens": 4096,
        ]

        guard let httpBody = try? JSONSerialization.data(withJSONObject: body) else {
            completion(.failure(LLMError.invalidConfig("Failed to serialize request body")))
            return
        }
        request.httpBody = httpBody

        let task = URLSession.shared.dataTask(with: request) { data, response, error in
            currentTask = nil
            if let error = error {
                completion(.failure(LLMError.network(error.localizedDescription)))
                return
            }

            guard let data = data else {
                completion(.failure(LLMError.network("No data received")))
                return
            }

            let statusCode = (response as? HTTPURLResponse)?.statusCode ?? 0

            guard statusCode == 200 else {
                let body = String(data: data, encoding: .utf8) ?? "unknown error"
                if statusCode == 401 {
                    completion(.failure(LLMError.auth("Invalid API key")))
                } else if statusCode == 429 {
                    completion(.failure(LLMError.rateLimit("Rate limit exceeded")))
                } else {
                    completion(.failure(LLMError.api("HTTP \(statusCode): \(body)")))
                }
                return
            }

            guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let choices = json["choices"] as? [[String: Any]],
                  let firstChoice = choices.first,
                  let message = firstChoice["message"] as? [String: Any],
                  let content = message["content"] as? String else {
                completion(.failure(LLMError.api("Unexpected response format")))
                return
            }

            completion(.success(content))
        }
        currentTask = task
        task.resume()
    }

    // MARK: - Ollama

    private static func sendOllama(
        model: String,
        baseUrl: String?,
        messages: [[String: Any]],
        systemPrompt: String?,
        temperature: Double,
        completion: @escaping (Result<String, Error>) -> Void
    ) {
        let endpoint = baseUrl ?? "http://localhost:11434"
        guard let url = URL(string: "\(endpoint)/api/chat") else {
            completion(.failure(LLMError.invalidConfig("Invalid Ollama URL")))
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = 300  // Ollama can be slow

        var allMessages: [[String: Any]] = []
        if let systemPrompt = systemPrompt, !systemPrompt.isEmpty {
            allMessages.append(["role": "system", "content": systemPrompt])
        }
        for msg in messages {
            let role = msg["role"] as? String ?? "user"
            allMessages.append(["role": role, "content": msg["content"] ?? ""])
        }

        let body: [String: Any] = [
            "model": model,
            "messages": allMessages,
            "stream": false,
            "options": ["temperature": temperature],
        ]

        guard let httpBody = try? JSONSerialization.data(withJSONObject: body) else {
            completion(.failure(LLMError.invalidConfig("Failed to serialize request body")))
            return
        }
        request.httpBody = httpBody

        let task = URLSession.shared.dataTask(with: request) { data, response, error in
            currentTask = nil
            if let error = error {
                completion(.failure(LLMError.network("Cannot reach Ollama at \(endpoint): \(error.localizedDescription)")))
                return
            }

            guard let data = data else {
                completion(.failure(LLMError.network("No data received from Ollama")))
                return
            }

            let statusCode = (response as? HTTPURLResponse)?.statusCode ?? 0

            guard statusCode == 200 else {
                let body = String(data: data, encoding: .utf8) ?? "unknown error"
                completion(.failure(LLMError.api("Ollama HTTP \(statusCode): \(body)")))
                return
            }

            guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let message = json["message"] as? [String: Any],
                  let content = message["content"] as? String else {
                completion(.failure(LLMError.api("Unexpected Ollama response format")))
                return
            }

            completion(.success(content))
        }
        currentTask = task
        task.resume()
    }

    // MARK: - Errors

    enum LLMError: LocalizedError {
        case invalidConfig(String)
        case auth(String)
        case network(String)
        case rateLimit(String)
        case api(String)

        var errorDescription: String? {
            switch self {
            case .invalidConfig(let msg): return "Config error: \(msg)"
            case .auth(let msg): return "Authentication error: \(msg)"
            case .network(let msg): return "Network error: \(msg)"
            case .rateLimit(let msg): return "Rate limit: \(msg)"
            case .api(let msg): return "API error: \(msg)"
            }
        }
    }
}
