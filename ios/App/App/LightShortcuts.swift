import AppIntents
import Foundation

// The actions the Shortcuts app lists under Illumigoon. Each runs in the background: the phone stays
// on the screen it was on. Defined in the app itself rather than an extension, so no App Group is
// needed, which free signing cannot be relied on for.

private let wholeHouseId = "house"
private let lightPrefix = "light:"
private let briMax = 255.0

@available(iOS 16.0, *)
struct LightsEntity: AppEntity {
    static var typeDisplayRepresentation = TypeDisplayRepresentation(name: "Lights")
    static var defaultQuery = LightsQuery()

    var id: String
    var name: String

    var displayRepresentation: DisplayRepresentation { DisplayRepresentation(title: "\(name)") }

    /// The house, then each room, then each light.
    static func all(in mirror: ShortcutData) -> [LightsEntity] {
        [LightsEntity(id: wholeHouseId, name: "Whole house")]
            + mirror.rooms.map { LightsEntity(id: $0.id, name: $0.name) }
            + mirror.lights.map { LightsEntity(id: lightPrefix + $0.id, name: $0.name) }
    }

    func lights(in mirror: ShortcutData) -> [MirrorLight] {
        if id == wholeHouseId { return mirror.lights }
        if id.hasPrefix(lightPrefix) {
            return mirror.light(String(id.dropFirst(lightPrefix.count))).map { [$0] } ?? []
        }
        let room = mirror.rooms.first { $0.id == id }
        return (room?.lightIds ?? []).compactMap { mirror.light($0) }
    }

    var currentLights: [MirrorLight] { lights(in: ShortcutData.load()) }
}

@available(iOS 16.0, *)
struct LightsQuery: EntityQuery {
    func entities(for identifiers: [String]) async throws -> [LightsEntity] {
        LightsEntity.all(in: ShortcutData.load()).filter { identifiers.contains($0.id) }
    }

    func suggestedEntities() async throws -> [LightsEntity] {
        LightsEntity.all(in: ShortcutData.load())
    }
}

@available(iOS 16.0, *)
struct SceneEntity: AppEntity {
    static var typeDisplayRepresentation = TypeDisplayRepresentation(name: "Scene")
    static var defaultQuery = SceneQuery()

    var id: String
    var name: String

    var displayRepresentation: DisplayRepresentation { DisplayRepresentation(title: "\(name)") }
}

@available(iOS 16.0, *)
struct SceneQuery: EntityQuery {
    private func all() -> [SceneEntity] {
        ShortcutData.load().scenes.map { SceneEntity(id: $0.id, name: $0.name) }
    }

    func entities(for identifiers: [String]) async throws -> [SceneEntity] {
        all().filter { identifiers.contains($0.id) }
    }

    func suggestedEntities() async throws -> [SceneEntity] { all() }
}

@available(iOS 16.0, *)
struct LookEntity: AppEntity {
    static var typeDisplayRepresentation = TypeDisplayRepresentation(name: "Look")
    static var defaultQuery = LookQuery()

    var id: String
    var name: String

    var displayRepresentation: DisplayRepresentation { DisplayRepresentation(title: "\(name)") }
}

@available(iOS 16.0, *)
struct LookQuery: EntityQuery {
    private func all() -> [LookEntity] {
        ShortcutData.load().looks.map { LookEntity(id: $0.id, name: $0.name) }
    }

    func entities(for identifiers: [String]) async throws -> [LookEntity] {
        all().filter { identifiers.contains($0.id) }
    }

    func suggestedEntities() async throws -> [LookEntity] { all() }
}

@available(iOS 16.0, *)
enum LightColour: String, AppEnum {
    case green, red, blue, amber, pink, purple, white

    static var typeDisplayRepresentation = TypeDisplayRepresentation(name: "Colour")
    static var caseDisplayRepresentations: [LightColour: DisplayRepresentation] = [
        .green: "Green", .red: "Red", .blue: "Blue", .amber: "Amber",
        .pink: "Pink", .purple: "Purple", .white: "White",
    ]

    var json: String {
        switch self {
        case .green: return "{\"r\":0,\"g\":255,\"b\":40}"
        case .red: return "{\"r\":255,\"g\":0,\"b\":0}"
        case .blue: return "{\"r\":0,\"g\":60,\"b\":255}"
        case .amber: return "{\"r\":255,\"g\":120,\"b\":0}"
        case .pink: return "{\"r\":255,\"g\":0,\"b\":90}"
        case .purple: return "{\"r\":140,\"g\":0,\"b\":255}"
        case .white: return "{\"r\":255,\"g\":255,\"b\":255}"
        }
    }
}

private func noted(_ lookName: String, on lights: [MirrorLight]) {
    var names = Remembered.lookNames
    for light in lights { names[light.id] = lookName }
    Remembered.lookNames = names
}

private func seconds(_ minutes: Double) -> Int {
    min(max(Int((minutes * 60).rounded()), 1), 21600)
}

@available(iOS 16.0, *)
private func findLook(_ entity: LookEntity, in mirror: ShortcutData) throws -> MirrorLook {
    guard let found = mirror.looks.first(where: { $0.id == entity.id }) else {
        throw LightFailure(reasons: ["\(entity.name) is gone. Open the app and choose again"])
    }
    return found
}

@available(iOS 16.0, *)
struct ApplySceneIntent: AppIntent {
    static var title: LocalizedStringResource = "Apply Scene"
    static var description = IntentDescription("Sets every light the scene covers. Go Back undoes it.")
    static var openAppWhenRun = false

    @Parameter(title: "Scene") var scene: SceneEntity

    static var parameterSummary: some ParameterSummary { Summary("Apply \(\.$scene)") }

    func perform() async throws -> some IntentResult {
        let mirror = ShortcutData.load()
        guard let found = mirror.scenes.first(where: { $0.id == scene.id }) else {
            throw LightFailure(reasons: ["\(scene.name) is gone. Open the app and choose again"])
        }
        let commands = found.commands.compactMap { command in
            mirror.light(command.lightId).map { ($0, command.body) }
        }
        await LightClient.rememberLooks(of: commands.map { $0.0 })
        try await LightClient.send(commands)
        noted(found.name, on: commands.map { $0.0 })
        return .result()
    }
}

@available(iOS 16.0, *)
struct PlayLookIntent: AppIntent {
    static var title: LocalizedStringResource = "Play Look"
    static var description = IntentDescription(
        "Plays a look. With minutes it goes back by itself after that, and works on a light that is off.")
    static var openAppWhenRun = false

    @Parameter(title: "Look") var look: LookEntity
    @Parameter(title: "Lights") var target: LightsEntity
    @Parameter(title: "Minutes", description: "Leave empty to keep the look.") var minutes: Double?

    static var parameterSummary: some ParameterSummary {
        Summary("Play \(\.$look) on \(\.$target) for \(\.$minutes) minutes")
    }

    func perform() async throws -> some IntentResult {
        let mirror = ShortcutData.load()
        let chosen = try findLook(look, in: mirror)
        let lights = target.lights(in: mirror)
        if let minutes {
            let time = seconds(minutes)
            try await LightClient.send("{\"animation\":\(chosen.animation),\"for_s\":\(time)}", to: lights)
            return .result()
        }
        await LightClient.rememberLooks(of: lights)
        try await LightClient.send("{\"on\":true,\"animation\":\(chosen.animation)}", to: lights)
        noted(chosen.name, on: lights)
        return .result()
    }
}

@available(iOS 16.0, *)
struct FlashIntent: AppIntent {
    static var title: LocalizedStringResource = "Flash Lights"
    static var description = IntentDescription("Flashes a colour, then the lights go back.")
    static var openAppWhenRun = false

    @Parameter(title: "Lights") var target: LightsEntity
    @Parameter(title: "Colour", default: .green) var colour: LightColour
    @Parameter(title: "Flashes", default: 3) var count: Int

    static var parameterSummary: some ParameterSummary {
        Summary("Flash \(\.$target) \(\.$colour) \(\.$count) times")
    }

    func perform() async throws -> some IntentResult {
        let flashes = min(max(count, 1), 50)
        let body = "{\"flash\":{\"color\":\(colour.json),\"count\":\(flashes)}}"
        try await LightClient.send(body, to: target.currentLights)
        return .result()
    }
}

@available(iOS 16.0, *)
struct ShowProgressIntent: AppIntent {
    static var title: LocalizedStringResource = "Show Progress"
    static var description = IntentDescription("Shows a bar of a chosen length, then the lights go back.")
    static var openAppWhenRun = false

    @Parameter(title: "Lights") var target: LightsEntity
    @Parameter(title: "Percent", default: 50) var percent: Double
    @Parameter(title: "Colour", default: .blue) var colour: LightColour
    @Parameter(title: "Seconds", default: 10) var time: Int

    static var parameterSummary: some ParameterSummary {
        Summary("Show \(\.$percent) percent on \(\.$target) in \(\.$colour) for \(\.$time) seconds")
    }

    func perform() async throws -> some IntentResult {
        let part = min(max(percent / 100, 0), 1)
        let body = "{\"progress\":\(part),\"for_s\":\(min(max(time, 1), 21600)),\"color\":\(colour.json)}"
        try await LightClient.send(body, to: target.currentLights)
        return .result()
    }
}

@available(iOS 16.0, *)
struct CountdownIntent: AppIntent {
    static var title: LocalizedStringResource = "Countdown"
    static var description = IntentDescription("A bar that shrinks to nothing, then the lights go back.")
    static var openAppWhenRun = false

    @Parameter(title: "Lights") var target: LightsEntity
    @Parameter(title: "Minutes", default: 10) var minutes: Double
    @Parameter(title: "Colour", default: .amber) var colour: LightColour

    static var parameterSummary: some ParameterSummary {
        Summary("Count down \(\.$minutes) minutes on \(\.$target) in \(\.$colour)")
    }

    func perform() async throws -> some IntentResult {
        let body = "{\"countdown\":\(seconds(minutes)),\"color\":\(colour.json)}"
        try await LightClient.send(body, to: target.currentLights)
        return .result()
    }
}

@available(iOS 16.0, *)
struct FadeToIntent: AppIntent {
    static var title: LocalizedStringResource = "Fade To"
    static var description = IntentDescription(
        "Moves the brightness slowly. 0 percent ends switched off. Lights that are off start from dark.")
    static var openAppWhenRun = false

    @Parameter(title: "Lights") var target: LightsEntity
    @Parameter(title: "Percent", default: 100) var percent: Double
    @Parameter(title: "Minutes", default: 20) var minutes: Double

    static var parameterSummary: some ParameterSummary {
        Summary("Fade \(\.$target) to \(\.$percent) percent over \(\.$minutes) minutes")
    }

    func perform() async throws -> some IntentResult {
        let level = Int((min(max(percent, 0), 100) / 100 * briMax).rounded())
        try await LightClient.send("{\"bri\":\(level),\"fade_s\":\(seconds(minutes))}", to: target.currentLights)
        return .result()
    }
}

@available(iOS 16.0, *)
struct GoBackIntent: AppIntent {
    static var title: LocalizedStringResource = "Go Back"
    static var description = IntentDescription(
        "Ends a timed look, or puts back what the last Apply Scene or Play Look replaced.")
    static var openAppWhenRun = false

    @Parameter(title: "Lights") var target: LightsEntity

    static var parameterSummary: some ParameterSummary { Summary("Put \(\.$target) back") }

    func perform() async throws -> some IntentResult {
        let lights = target.currentLights
        var commands: [(MirrorLight, String)] = []
        for light in lights {
            let isTimed = await LightClient.state(light)?.timed ?? false
            if isTimed {
                commands.append((light, "{\"timed\":false}"))
            } else if let earlier = Remembered.earlier[light.id] {
                commands.append((light, earlier))
            }
        }
        try await LightClient.send(commands)
        return .result()
    }
}

@available(iOS 16.0, *)
struct ToggleLightsIntent: AppIntent {
    static var title: LocalizedStringResource = "Toggle Lights"
    static var description = IntentDescription(
        "Switches the lights the same way: all off if any is on, otherwise all on.")
    static var openAppWhenRun = false

    @Parameter(title: "Lights") var target: LightsEntity

    static var parameterSummary: some ParameterSummary { Summary("Toggle \(\.$target)") }

    func perform() async throws -> some IntentResult {
        let lights = target.currentLights
        var anyOn = false
        for light in lights {
            if await LightClient.state(light)?.on == true { anyOn = true }
        }
        try await LightClient.send("{\"on\":\(!anyOn)}", to: lights)
        return .result()
    }
}

@available(iOS 16.0, *)
struct NextFavouriteIntent: AppIntent {
    static var title: LocalizedStringResource = "Next Favourite"
    static var description = IntentDescription(
        "Steps through your saved looks, or every look if you have saved none.")
    static var openAppWhenRun = false

    @Parameter(title: "Lights") var target: LightsEntity

    static var parameterSummary: some ParameterSummary { Summary("Next favourite on \(\.$target)") }

    func perform() async throws -> some IntentResult {
        let mirror = ShortcutData.load()
        let favourites = mirror.looks.filter { mirror.favourites.contains($0.id) }
        let looks = favourites.isEmpty ? mirror.looks : favourites
        guard !looks.isEmpty else {
            throw LightFailure(reasons: ["No looks known yet. Open the Illumigoon app once"])
        }
        let place = (Remembered.favouritePlace[target.id] ?? -1) + 1
        let chosen = looks[place % looks.count]
        let lights = target.lights(in: mirror)
        try await LightClient.send("{\"on\":true,\"animation\":\(chosen.animation)}", to: lights)
        Remembered.favouritePlace[target.id] = place % looks.count
        noted(chosen.name, on: lights)
        return .result()
    }
}

@available(iOS 16.0, *)
struct SetControlIntent: AppIntent {
    static var title: LocalizedStringResource = "Set Control"
    static var description = IntentDescription(
        "Moves one control of the look that is showing, by its key, such as speed.")
    static var openAppWhenRun = false

    @Parameter(title: "Lights") var target: LightsEntity
    @Parameter(title: "Control", default: "speed") var control: String
    @Parameter(title: "Value") var value: Double

    static var parameterSummary: some ParameterSummary {
        Summary("Set \(\.$control) of \(\.$target) to \(\.$value)")
    }

    func perform() async throws -> some IntentResult {
        guard let key = try? JSONSerialization.data(withJSONObject: [control]),
              let list = String(data: key, encoding: .utf8) else {
            throw LightFailure(reasons: ["That control name cannot be sent"])
        }
        let name = list.dropFirst().dropLast()
        try await LightClient.send("{\"controls\":{\(name):\(value)}}", to: target.currentLights)
        return .result()
    }
}

@available(iOS 16.0, *)
struct GetLightsIntent: AppIntent {
    static var title: LocalizedStringResource = "Get Lights"
    static var description = IntentDescription("Says what each light is doing, as text.")
    static var openAppWhenRun = false

    @Parameter(title: "Lights") var target: LightsEntity

    static var parameterSummary: some ParameterSummary { Summary("Get state of \(\.$target)") }

    func perform() async throws -> some IntentResult & ReturnsValue<String> {
        let mirror = ShortcutData.load()
        var rows: [String] = []
        for light in target.lights(in: mirror) {
            rows.append(await describe(light))
        }
        return .result(value: rows.joined(separator: "\n"))
    }

    private func describe(_ light: MirrorLight) async -> String {
        guard let state = await LightClient.state(light) else { return "\(light.name): no answer" }
        let power = state.on ? "on" : "off"
        let level = Int((Double(state.bri) / briMax * 100).rounded())
        let lookName = Remembered.lookNames[light.id] ?? light.lookName ?? "unknown look"
        let extras = (state.timed == true ? ", timed" : "") + (state.locked ? ", locked" : "")
        return "\(light.name): \(power), \(level)%, \(lookName)\(extras)"
    }
}
