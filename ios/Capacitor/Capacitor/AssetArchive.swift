import Foundation

/// Entry in the pacit asset archive index.
public struct AssetEntry {
    public let offset: UInt64
    public let length: UInt64
    public let origLength: UInt64
    public let mimeType: String
    public let flags: UInt16
    public let etagHex: String

    public var isBrotli: Bool { flags & 0x01 != 0 }
    public var isGzip: Bool { flags & 0x02 != 0 }
    public var isIdentity: Bool { flags & 0x04 != 0 || flags == 0 }
}

/// Reads a pacit `.pak` asset archive using memory-mapped I/O.
///
/// Archive format:
/// ```
/// HEADER (64 bytes): magic "PACT", version, index_offset, index_count, build_id
/// PAYLOAD: concatenated asset bytes
/// INDEX (at index_offset): path, offset, length, origLength, mimeType, flags, etag per asset
/// ```
public final class AssetArchive {
    public let data: Data
    public let buildID: String
    private let index: [String: AssetEntry]

    /// Initialize from a `.pak` file URL. Returns nil if the file is missing or malformed.
    public init?(url: URL) {
        guard let mapped = try? Data(contentsOf: url, options: .alwaysMapped) else {
            return nil
        }
        guard mapped.count >= 64 else { return nil }

        // Validate magic
        let magic = String(data: mapped[0..<4], encoding: .ascii)
        guard magic == "PACT" else { return nil }

        // Parse header
        let version = mapped.readUInt32(at: 4)
        guard version == 1 else { return nil }

        let indexOffset = mapped.readUInt64(at: 8)
        let indexCount = mapped.readUInt32(at: 16)
        let buildIDBytes = mapped[20..<52]
        self.buildID = buildIDBytes.map { String(format: "%02x", $0) }.joined()
        self.data = mapped

        // Parse index
        var entries: [String: AssetEntry] = [:]
        entries.reserveCapacity(Int(indexCount))
        var pos = Int(indexOffset)

        for _ in 0..<indexCount {
            guard pos + 2 <= mapped.count else { break }
            let pathLen = Int(mapped.readUInt16(at: pos))
            pos += 2

            guard pos + pathLen <= mapped.count else { break }
            let path = String(data: mapped[pos..<(pos + pathLen)], encoding: .utf8) ?? ""
            pos += pathLen

            guard pos + 42 <= mapped.count else { break }
            let offset = mapped.readUInt64(at: pos)
            let length = mapped.readUInt64(at: pos + 8)
            let origLength = mapped.readUInt64(at: pos + 16)
            let mimeLen = Int(mapped.readUInt16(at: pos + 24))
            pos += 26

            guard pos + mimeLen <= mapped.count else { break }
            let mimeType = String(data: mapped[pos..<(pos + mimeLen)], encoding: .utf8) ?? "application/octet-stream"
            pos += mimeLen

            guard pos + 18 <= mapped.count else { break }
            let flags = mapped.readUInt16(at: pos)
            pos += 2

            let etagBytes = mapped[pos..<(pos + 16)]
            let etag = etagBytes.map { String(format: "%02x", $0) }.joined()
            pos += 16

            entries[path] = AssetEntry(
                offset: offset,
                length: length,
                origLength: origLength,
                mimeType: mimeType,
                flags: flags,
                etagHex: etag
            )
        }

        self.index = entries
        CAPLog.print("⚡️  AssetArchive loaded: \(entries.count) entries, build \(buildID.prefix(8))")
    }

    /// Look up an asset by its URL path (e.g. "/_nuxt/entry.abc123.js").
    public func entry(for path: String) -> AssetEntry? {
        // Try exact path, then without leading slash
        if let e = index[path] { return e }
        let trimmed = path.hasPrefix("/") ? String(path.dropFirst()) : path
        return index[trimmed]
    }

    /// Return a zero-copy Data slice for an identity (uncompressed) entry.
    public func slice(for entry: AssetEntry) -> Data {
        let start = Int(entry.offset)
        let end = start + Int(entry.length)
        guard end <= data.count else { return Data() }
        return data[start..<end]
    }
}

// MARK: - Data reading helpers

private extension Data {
    func readUInt16(at offset: Int) -> UInt16 {
        var value: UInt16 = 0
        _ = Swift.withUnsafeMutableBytes(of: &value) { buf in
            self.copyBytes(to: buf, from: offset..<(offset + 2))
        }
        return UInt16(littleEndian: value)
    }

    func readUInt32(at offset: Int) -> UInt32 {
        var value: UInt32 = 0
        _ = Swift.withUnsafeMutableBytes(of: &value) { buf in
            self.copyBytes(to: buf, from: offset..<(offset + 4))
        }
        return UInt32(littleEndian: value)
    }

    func readUInt64(at offset: Int) -> UInt64 {
        var value: UInt64 = 0
        _ = Swift.withUnsafeMutableBytes(of: &value) { buf in
            self.copyBytes(to: buf, from: offset..<(offset + 8))
        }
        return UInt64(littleEndian: value)
    }
}
