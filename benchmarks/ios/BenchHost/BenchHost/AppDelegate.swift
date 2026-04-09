import UIKit
import Capacitor

@main
final class AppDelegate: UIResponder, UIApplicationDelegate {
    var window: UIWindow?

    static let classLoadMark: Void = {
        PacitBench.event("app.classLoad")
    }()

    override init() {
        _ = AppDelegate.classLoadMark
        super.init()
    }

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {
        PacitBench.begin("app.didFinishLaunching")
        defer { PacitBench.end("app.didFinishLaunching") }
        PacitBench.event("app.signpostsEnabled", String(PacitBench.isEnabled))
        CAPLog.print("⚡️  BenchHost launched. Signposts enabled: \(PacitBench.isEnabled)")
        return true
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }
}
