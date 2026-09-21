/**
 * Player starship frames (Starfinder Tech Core pp. 196–199).
 *
 * All three frames are Medium tech starships with two default battle stations
 * (pilot's console and generator), four customizable battle-station slots, and
 * four expansion bays. Statistics by level are transcribed from the
 * "Statistics by Level" tables; the starship's level equals the party's level.
 */

import type { FrameId, StationKind } from '../types/tsc'

export interface FrameLevelRow {
  level: number
  /** Hull Points */
  hp: number
  /** Shield Points */
  sp: number
  ac: number
  fort: number
  ref: number
  will: number
  /** Speed in zones */
  speed: number
}

export interface FrameDefaultStation {
  kind: StationKind
  /** Fixed upgrade that does not count against the station's upgrade limit. */
  upgradeId?: string
}

export interface FrameDefinition {
  id: FrameId
  name: string
  description: string
  sensorRange: number
  expansionBays: number
  customStationSlots: number
  defaultStations: FrameDefaultStation[]
  levels: FrameLevelRow[]
}

function rows(table: number[][]): FrameLevelRow[] {
  return table.map(([level, hp, sp, ac, fort, ref, will, speed]) => ({ level, hp, sp, ac, fort, ref, will, speed }))
}

export const FRAMES: Record<FrameId, FrameDefinition> = {
  bulwark: {
    id: 'bulwark',
    name: 'Bulwark',
    description:
      'A bulky, defensive frame. Not the speediest, but very sturdy, with a ramming prow that makes the most of its impressive bulk and a reinforced hull that can endure battles with minimal shield generation.',
    sensorRange: 5,
    expansionBays: 4,
    customStationSlots: 4,
    defaultStations: [
      { kind: "pilot's console", upgradeId: 'ramming-prow' },
      { kind: 'generator' },
    ],
    levels: rows([
      [1, 27, 10, 17, 9, 6, 8, 2],
      [2, 42, 14, 18, 10, 7, 9, 2],
      [3, 57, 18, 19, 11, 10, 10, 2],
      [4, 72, 22, 20, 12, 11, 11, 2],
      [5, 92, 31, 21, 14, 13, 13, 2],
      [6, 108, 36, 22, 15, 14, 14, 2],
      [7, 124, 41, 25, 18, 15, 15, 2],
      [8, 140, 46, 26, 19, 16, 16, 2],
      [9, 156, 51, 27, 20, 17, 17, 2],
      [10, 172, 66, 28, 21, 18, 19, 3],
      [11, 188, 72, 29, 22, 19, 22, 3],
      [12, 204, 78, 30, 23, 20, 23, 3],
      [13, 220, 84, 33, 24, 21, 24, 3],
      [14, 236, 90, 34, 25, 22, 25, 3],
      [15, 267, 96, 35, 29, 24, 26, 3],
      [16, 284, 102, 36, 30, 25, 27, 3],
      [17, 301, 108, 39, 31, 26, 28, 3],
      [18, 318, 114, 40, 32, 27, 29, 3],
      [19, 335, 120, 41, 33, 28, 30, 4],
      [20, 372, 146, 42, 35, 29, 32, 4],
    ]),
  },
  explorer: {
    id: 'explorer',
    name: 'Explorer',
    description:
      'A balanced frame with powerful sensors. Neither as bulky as the bulwark nor as mobile as the skirmisher, but unmatched in shield generation thanks to its default pulse shield.',
    sensorRange: 6,
    expansionBays: 4,
    customStationSlots: 4,
    defaultStations: [
      { kind: "pilot's console" },
      { kind: 'generator', upgradeId: 'pulse-shield' },
    ],
    levels: rows([
      [1, 24, 11, 15, 8, 6, 9, 3],
      [2, 36, 16, 16, 9, 7, 10, 3],
      [3, 48, 21, 17, 10, 10, 11, 3],
      [4, 60, 26, 18, 11, 11, 12, 3],
      [5, 77, 36, 20, 13, 13, 14, 3],
      [6, 90, 42, 21, 14, 14, 15, 3],
      [7, 103, 48, 24, 15, 15, 18, 4],
      [8, 116, 54, 25, 16, 16, 19, 4],
      [9, 129, 60, 26, 17, 17, 20, 4],
      [10, 142, 66, 28, 18, 19, 21, 4],
      [11, 155, 72, 29, 21, 20, 22, 4],
      [12, 168, 78, 30, 22, 21, 23, 4],
      [13, 181, 84, 33, 23, 22, 24, 4],
      [14, 194, 90, 34, 24, 23, 25, 4],
      [15, 222, 111, 35, 26, 24, 29, 5],
      [16, 236, 118, 36, 27, 25, 30, 5],
      [17, 250, 125, 39, 28, 26, 31, 5],
      [18, 264, 132, 40, 29, 27, 32, 5],
      [19, 278, 139, 41, 30, 28, 33, 5],
      [20, 292, 166, 43, 31, 30, 35, 5],
    ]),
  },
  skirmisher: {
    id: 'skirmisher',
    name: 'Skirmisher',
    description:
      'A swift, battle-ready frame. It lacks bulk and shielding compared to the other frames, but its superior mobility and rotational thrusters let it get behind enemies and catch them off-guard.',
    sensorRange: 4,
    expansionBays: 4,
    customStationSlots: 4,
    defaultStations: [
      { kind: "pilot's console", upgradeId: 'rotational-thrusters' },
      { kind: 'generator' },
    ],
    levels: rows([
      [1, 22, 8, 16, 6, 9, 8, 5],
      [2, 32, 12, 17, 7, 10, 9, 5],
      [3, 42, 16, 18, 10, 11, 10, 5],
      [4, 52, 20, 19, 11, 12, 11, 5],
      [5, 67, 29, 21, 13, 14, 13, 5],
      [6, 78, 34, 22, 14, 15, 14, 5],
      [7, 89, 39, 25, 15, 18, 15, 6],
      [8, 100, 44, 26, 16, 19, 16, 6],
      [9, 111, 49, 27, 17, 20, 17, 6],
      [10, 122, 64, 28, 18, 21, 19, 6],
      [11, 133, 70, 29, 19, 22, 22, 6],
      [12, 144, 76, 30, 20, 23, 23, 6],
      [13, 155, 82, 33, 21, 24, 24, 6],
      [14, 166, 88, 34, 22, 25, 25, 6],
      [15, 192, 94, 36, 24, 29, 26, 7],
      [16, 204, 100, 37, 25, 30, 27, 7],
      [17, 216, 106, 40, 26, 31, 28, 7],
      [18, 228, 112, 41, 27, 32, 29, 7],
      [19, 240, 118, 42, 28, 33, 30, 7],
      [20, 252, 144, 44, 29, 35, 32, 7],
    ]),
  },
}

export const FRAME_LIST: FrameDefinition[] = [FRAMES.bulwark, FRAMES.explorer, FRAMES.skirmisher]

/** Statistics row for a frame at a level, clamped to 1–20. */
export function getFrameRow(frame: FrameId, level: number): FrameLevelRow {
  const clamped = Math.max(1, Math.min(20, Math.floor(level)))
  return FRAMES[frame].levels[clamped - 1]
}
