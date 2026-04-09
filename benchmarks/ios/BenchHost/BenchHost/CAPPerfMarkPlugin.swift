import Foundation
import Capacitor

@objc(CAPPerfMarkPlugin)
public class CAPPerfMarkPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "CAPPerfMark"
    public let jsName = "PerfMark"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "mark", returnType: CAPPluginReturnNone)
    ]

    @objc func mark(_ call: CAPPluginCall) {
        guard let name = call.getString("name") else {
            call.resolve()
            return
        }
        PacitBench.event("js.mark", name)
        call.resolve()
    }
}
