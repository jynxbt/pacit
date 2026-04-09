import { XMLParser } from 'fast-xml-parser'
import { readFileSync, existsSync } from 'fs'
import type { Event } from './types'

export function parseTraceXml(xmlPath: string): Event[] {
  if (!existsSync(xmlPath)) return []
  const xml = readFileSync(xmlPath, 'utf-8')
  if (!xml.trim()) return []

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
  })

  const parsed = parser.parse(xml)
  const events: Event[] = []

  // Handle trace-query-result format (from xctrace export --xpath)
  const nodes = parsed?.['trace-query-result']?.node
  if (nodes) {
    const nodeArray = Array.isArray(nodes) ? nodes : [nodes]
    for (const node of nodeArray) {
      const rows = node?.row
      if (!rows) continue
      const rowArray = Array.isArray(rows) ? rows : [rows]
      for (const row of rowArray) {
        const event = parseLifecycleRow(row)
        if (event) events.push(event)
      }
    }
  }

  return events.sort((a, b) => a.tStart - b.tStart)
}

function parseLifecycleRow(row: any): Event | null {
  if (!row) return null

  // Extract start-time (nanoseconds) — can be object with #text or @_fmt
  let tStart = 0
  const startTime = row['start-time']
  if (startTime != null) {
    if (typeof startTime === 'number') {
      tStart = startTime
    } else if (typeof startTime === 'object') {
      tStart = Number(startTime['#text'] ?? 0)
    } else {
      tStart = Number(startTime) || 0
    }
  }

  // Extract duration (nanoseconds)
  let duration: number | undefined
  const dur = row['duration']
  if (dur != null) {
    if (typeof dur === 'number') {
      duration = dur
    } else if (typeof dur === 'object') {
      duration = Number(dur['#text'] ?? 0) || undefined
    } else {
      duration = Number(dur) || undefined
    }
  }

  // Extract period name from app-period
  let name = 'unknown'
  const period = row['app-period']
  if (period) {
    if (typeof period === 'string') {
      name = period
    } else if (typeof period === 'object') {
      name = period['@_fmt'] ?? period['#text'] ?? String(period)
    }
  }

  // Extract narrative for notes
  let notes = ''
  const narrative = row['narrative']
  if (narrative) {
    if (typeof narrative === 'string') {
      notes = narrative
    } else if (typeof narrative === 'object') {
      notes = narrative['@_fmt'] ?? ''
    }
  }

  return {
    name,
    kind: duration != null ? 'interval' : 'event',
    tStart,
    tEnd: duration != null ? tStart + duration : undefined,
    duration,
    meta: notes ? { notes } : undefined,
  }
}
