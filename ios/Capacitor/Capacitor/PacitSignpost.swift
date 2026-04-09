import Foundation
import os

/// Lightweight signpost API for Pacit cold-start benchmarking.
///
/// All signposts emit to the "PointsOfInterest" category so they automatically
/// appear in Instruments' Points of Interest track without a custom instrument.
///
/// Gated behind the `PACIT_BENCH` compile flag — when absent, every call
/// compiles to nothing. When present but the OSLog subsystem is disabled at
/// runtime, cost is ~1 ns per call (a single branch).
public enum PacitBench {

    public static let coldStart = OSLog(
        subsystem: "xyz.pacit.bench",
        category: "PointsOfInterest"
    )

    @inline(__always)
    public static var isEnabled: Bool {
        #if PACIT_BENCH
        return coldStart.isEnabled(type: .default)
        #else
        return false
        #endif
    }

    @inline(__always)
    public static func signpostID(_ obj: AnyObject) -> OSSignpostID {
        return OSSignpostID(log: coldStart, object: obj)
    }

    @inline(__always)
    public static func begin(_ name: StaticString, id: OSSignpostID = .exclusive) {
        #if PACIT_BENCH
        os_signpost(.begin, log: coldStart, name: name, signpostID: id)
        #endif
    }

    @inline(__always)
    public static func end(_ name: StaticString, id: OSSignpostID = .exclusive) {
        #if PACIT_BENCH
        os_signpost(.end, log: coldStart, name: name, signpostID: id)
        #endif
    }

    @inline(__always)
    public static func event(_ name: StaticString) {
        #if PACIT_BENCH
        os_signpost(.event, log: coldStart, name: name)
        #endif
    }

    @inline(__always)
    public static func event(_ name: StaticString, _ message: String) {
        #if PACIT_BENCH
        os_signpost(.event, log: coldStart, name: name, "%{public}s", message)
        #endif
    }

    @inline(__always)
    public static func beginAsset(
        id: OSSignpostID,
        path: String,
        mime: String
    ) {
        #if PACIT_BENCH
        os_signpost(.begin, log: coldStart, name: "asset.request",
                    signpostID: id,
                    "path=%{public}s mime=%{public}s",
                    path, mime)
        #endif
    }

    @inline(__always)
    public static func endAsset(id: OSSignpostID, outcome: String) {
        #if PACIT_BENCH
        os_signpost(.end, log: coldStart, name: "asset.request",
                    signpostID: id,
                    "outcome=%{public}s", outcome)
        #endif
    }
}
