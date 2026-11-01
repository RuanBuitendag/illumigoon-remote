import Capacitor
import Foundation

/// Lets the web app keep the file the Shortcuts actions read. See `shortcut-mirror.ts`.
@objc(ShortcutMirrorPlugin)
public class ShortcutMirrorPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "ShortcutMirrorPlugin"
    public let jsName = "ShortcutMirror"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "save", returnType: CAPPluginReturnPromise)
    ]

    @objc func save(_ call: CAPPluginCall) {
        guard let json = call.getString("json") else {
            call.reject("no json")
            return
        }
        do {
            try ShortcutData.save(json)
            call.resolve()
        } catch {
            call.reject(error.localizedDescription)
        }
    }
}

/// A plugin of the app itself, so it is not listed in the package Capacitor generates.
class AppViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(ShortcutMirrorPlugin())
    }
}
