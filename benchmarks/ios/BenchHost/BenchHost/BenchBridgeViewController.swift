import UIKit
import WebKit
import Capacitor

final class BenchBridgeViewController: CAPBridgeViewController, WKScriptMessageHandler {

    private let processStart = ProcessInfo.processInfo.systemUptime
    private var marks: [(String, TimeInterval)] = []

    // Register AFTER prepareWebView — webViewConfiguration's userContentController
    // gets replaced at line 315 of CAPBridgeViewController, so we must use
    // capacitorDidLoad which runs after loadView completes.
    override func capacitorDidLoad() {
        super.capacitorDidLoad()

        guard let wv = webView else { return }
        let controller = wv.configuration.userContentController

        // Register message handler for JS → native timing marks
        controller.add(self, name: "pacitPerf")

        // Inject window.__pacitMark IIFE + auto-fire on DOMContentLoaded/load
        let source = """
        (function() {
          var m = window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.pacitPerf;
          window.__pacitMark = function(name) {
            try { performance.mark(name); } catch (e) {}
            if (m) { m.postMessage(name); }
          };
          document.addEventListener('DOMContentLoaded', function() {
            window.__pacitMark('dom.contentLoaded');
          });
          window.addEventListener('load', function() {
            window.__pacitMark('window.load');
          });
        })();
        """
        controller.addUserScript(
            WKUserScript(source: source, injectionTime: .atDocumentStart, forMainFrameOnly: true)
        )
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        if message.name == "pacitPerf" {
            // Handle echo requests for microbench: { type: "echo", id: "...", value: "..." }
            if let dict = message.body as? [String: Any], dict["type"] as? String == "echo" {
                let id = dict["id"] as? String ?? ""
                let value = dict["value"] as? String ?? ""
                let js = "window.__pacitEchoResolve&&window.__pacitEchoResolve('\(id)','\(value)')"
                webView?.evaluateJavaScript(js, completionHandler: nil)
                return
            }

            // Handle string marks (perf timing)
            if let name = message.body as? String {
                let elapsed = ProcessInfo.processInfo.systemUptime - processStart
                let ms = Int(elapsed * 1000)
                marks.append((name, elapsed))
                PacitBench.event("js.mark", name)
                NSLog("PACIT_BENCH_MARK: %@ %dms", name, ms)

                if name == "nuxt.interactive" || name == "window.load" || name.hasPrefix("microbench.done") {
                    writeBenchResults()
                }
            }
        }
    }

    private func writeBenchResults() {
        var lines: [String] = []
        for (name, time) in marks {
            lines.append("\(name)=\(Int(time * 1000))")
        }
        let result = lines.joined(separator: "\n")

        if let docs = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first {
            let url = docs.appendingPathComponent("bench-marks.txt")
            try? result.write(to: url, atomically: true, encoding: .utf8)
        }

        NSLog("PACIT_BENCH_DONE: %@", result)
    }
}
