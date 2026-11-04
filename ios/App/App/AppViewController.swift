import UIKit
import WebKit
import Capacitor

// The app's one screen on the iPhone: Capacitor's bridge, with the system back and forward swipe turned on.
// The app pushes a history step for each screen it opens (D72), so a swipe from the left edge walks back one
// screen at a time, the same as Back in a browser.
class AppViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        webView?.allowsBackForwardNavigationGestures = true
    }
}
