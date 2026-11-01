import Foundation

// What the Shortcuts actions read, written by the web app, and how they reach a light.

struct MirrorLight: Codable {
    let id: String
    let name: String
    let address: String
    let lookName: String?
}

struct MirrorRoom: Codable {
    let id: String
    let name: String
    let lightIds: [String]
}

struct MirrorCommand: Codable {
    let lightId: String
    let body: String
}

struct MirrorScene: Codable {
    let id: String
    let name: String
    let commands: [MirrorCommand]
}

struct MirrorLook: Codable {
    let id: String
    let name: String
    let animation: String
}

struct ShortcutData: Codable {
    var lights: [MirrorLight] = []
    var rooms: [MirrorRoom] = []
    var scenes: [MirrorScene] = []
    var looks: [MirrorLook] = []
    var favourites: [String] = []

    private static var url: URL {
        let folder = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        return folder.appendingPathComponent("shortcut-mirror.json")
    }

    /// Readable while the phone is locked, because that is when a message arrives.
    static func save(_ json: String) throws {
        try FileManager.default.createDirectory(
            at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
        try Data(json.utf8).write(
            to: url, options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
        Remembered.lookNames = [:]
    }

    static func load() -> ShortcutData {
        guard let data = try? Data(contentsOf: url),
              let mirror = try? JSONDecoder().decode(ShortcutData.self, from: data) else {
            return ShortcutData()
        }
        return mirror
    }

    func light(_ id: String) -> MirrorLight? {
        lights.first { $0.id == id }
    }
}

/// What the actions keep between runs. All of it is about the look a light had or has.
enum Remembered {
    private static let defaults = UserDefaults.standard

    /// The look an action chose last. A light does not keep a look's name.
    static var lookNames: [String: String] {
        get { defaults.dictionary(forKey: "shortcutLookNames") as? [String: String] ?? [:] }
        set { defaults.set(newValue, forKey: "shortcutLookNames") }
    }

    /// The body that puts a light back, by light id.
    static var earlier: [String: String] {
        get { defaults.dictionary(forKey: "shortcutEarlier") as? [String: String] ?? [:] }
        set { defaults.set(newValue, forKey: "shortcutEarlier") }
    }

    /// How far along the favourites each set of lights is.
    static var favouritePlace: [String: Int] {
        get { defaults.dictionary(forKey: "shortcutFavouritePlace") as? [String: Int] ?? [:] }
        set { defaults.set(newValue, forKey: "shortcutFavouritePlace") }
    }
}

struct LightFailure: LocalizedError {
    let reasons: [String]
    var errorDescription: String? { reasons.joined(separator: ". ") }
}

struct LightState: Decodable {
    let on: Bool
    let bri: Int
    let locked: Bool
    let timed: Bool?
}

enum LightClient {
    private static let session: URLSession = {
        let configuration = URLSessionConfiguration.ephemeral
        configuration.timeoutIntervalForRequest = 5
        configuration.timeoutIntervalForResource = 12
        return URLSession(configuration: configuration)
    }()

    private static func url(_ light: MirrorLight, _ path: String) -> URL? {
        URL(string: "http://\(light.address)\(path)")
    }

    private static func explain(_ data: Data, _ status: Int, _ light: MirrorLight) -> String {
        if status == 423 { return "\(light.name) is locked" }
        if status == 404 { return "\(light.name) needs newer firmware, or does not know that look" }
        let answer = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
        let reason = answer?["error"] as? String ?? "answered \(status)"
        return "\(light.name): \(reason)"
    }

    private static func post(_ light: MirrorLight, _ body: String) async -> String? {
        guard let url = url(light, "/json/state") else { return "\(light.name) has no address" }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = Data(body.utf8)
        do {
            let (data, response) = try await session.data(for: request)
            let status = (response as? HTTPURLResponse)?.statusCode ?? 0
            return status == 200 ? nil : explain(data, status, light)
        } catch {
            return "\(light.name) did not answer. Open the app once if its address changed"
        }
    }

    static func get(_ light: MirrorLight, _ path: String) async -> Data? {
        guard let url = url(light, path),
              let (data, response) = try? await session.data(from: url),
              (response as? HTTPURLResponse)?.statusCode == 200 else { return nil }
        return data
    }

    static func state(_ light: MirrorLight) async -> LightState? {
        guard let data = await get(light, "/json/state") else { return nil }
        return try? JSONDecoder().decode(LightState.self, from: data)
    }

    /// Every light at once, each with its own body. Throws what went wrong after all have answered.
    static func send(_ commands: [(MirrorLight, String)]) async throws {
        let failures = await withTaskGroup(of: String?.self) { group -> [String] in
            for (light, body) in commands {
                group.addTask { await post(light, body) }
            }
            var found: [String] = []
            for await failure in group {
                if let failure { found.append(failure) }
            }
            return found
        }
        if !failures.isEmpty { throw LightFailure(reasons: failures) }
    }

    static func send(_ body: String, to lights: [MirrorLight]) async throws {
        if lights.isEmpty {
            throw LightFailure(reasons: ["No lights known yet. Open the Illumigoon app once"])
        }
        try await send(lights.map { ($0, body) })
    }

    /// Keeps what each light shows now, so Go Back can put it back.
    static func rememberLooks(of lights: [MirrorLight]) async {
        for light in lights {
            guard let state = await state(light),
                  let look = await get(light, "/json/look"),
                  let text = String(data: look, encoding: .utf8) else { continue }
            Remembered.earlier[light.id] = "{\"on\":\(state.on),\"bri\":\(max(state.bri, 1)),\"animation\":\(text)}"
        }
    }
}
