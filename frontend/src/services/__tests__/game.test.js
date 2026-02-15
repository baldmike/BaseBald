/**
 * game.test.js — 10-test suite covering core game logic.
 * Runs before every deploy to catch regressions.
 */
import { describe, it, expect, vi } from 'vitest'

import {
  weightedChoice,
  applyFatigueMod,
  determineOutcome,
  cpuPicksPitch,
  cpuDecidesSwing,
  SWING_OUTCOMES,
  TAKE_OUTCOMES,
  CPU_PITCH_WEIGHTS,
} from '../probabilities.js'

import { applyWeatherModifiers, WEATHER_MODIFIERS } from '../weather.js'

import {
  calculateAdjustedOutcomes,
  calculateAdjustedTakeOutcomes,
} from '../statsCalculator.js'

import { processPitch, processAtBat, switchPitcher } from '../gameEngine.js'

// Helper: build a minimal playable game state
function makeGameState(overrides = {}) {
  const pitcher = { id: 1, name: 'Ace', stats: { era: 3.50, k_per_9: 9.0, bb_per_9: 2.5 } }
  const batter = { id: 2, name: 'Slugger', stats: { avg: 0.280, slg: 0.450, k_rate: 0.200, hr_rate: 0.040 } }
  return {
    game_id: 'test-001',
    inning: 1,
    is_top: true,
    outs: 0,
    balls: 0,
    strikes: 0,
    bases: [false, false, false],
    runner_indices: [null, null, null],
    away_score: Array(9).fill(0),
    home_score: Array(9).fill(0),
    away_total: 0,
    home_total: 0,
    player_role: 'pitching',
    game_status: 'active',
    play_log: [],
    last_play: '',
    away_team: 'Away',
    home_team: 'Home',
    away_abbreviation: 'AWY',
    home_abbreviation: 'HME',
    away_lineup: Array(9).fill(batter).map((b, i) => ({ ...b, id: 100 + i, name: `Batter ${i + 1}` })),
    home_lineup: Array(9).fill(batter).map((b, i) => ({ ...b, id: 200 + i, name: `Batter ${i + 1}` })),
    away_batter_idx: 0,
    home_batter_idx: 0,
    current_batter_index: 0,
    current_batter_name: 'Batter 1',
    home_pitcher: { ...pitcher },
    away_pitcher: { ...pitcher, id: 3, name: 'Rival Ace' },
    away_box_score: Array(9).fill(null).map((_, i) => ({ id: 100 + i, name: `Batter ${i + 1}`, pos: 'UT', ab: 0, r: 0, h: 0, '2b': 0, '3b': 0, hr: 0, rbi: 0, bb: 0, so: 0, sb: 0 })),
    home_box_score: Array(9).fill(null).map((_, i) => ({ id: 200 + i, name: `Batter ${i + 1}`, pos: 'UT', ab: 0, r: 0, h: 0, '2b': 0, '3b': 0, hr: 0, rbi: 0, bb: 0, so: 0, sb: 0 })),
    away_pitcher_stats: { id: 3, name: 'Rival Ace', ip_outs: 0, h: 0, r: 0, er: 0, bb: 0, so: 0 },
    home_pitcher_stats: { id: 1, name: 'Ace', ip_outs: 0, h: 0, r: 0, er: 0, bb: 0, so: 0 },
    weather: 'clear',
    home_pitch_count: 0,
    away_pitch_count: 0,
    home_bullpen: [{ id: 10, name: 'Reliever', role: 'RP', stats: { era: 3.80, k_per_9: 8.5, bb_per_9: 3.0 } }],
    away_bullpen: [{ id: 11, name: 'Away Reliever', role: 'RP', stats: { era: 4.00, k_per_9: 7.5, bb_per_9: 3.5 } }],
    home_scorecard: [],
    away_scorecard: [],
    classic_relievers: null,
  }
}

// ──────────────────────────────────────────────
// TEST 1: weightedChoice always returns a valid outcome
// ──────────────────────────────────────────────
describe('probabilities', () => {
  it('weightedChoice returns a key from the weights object', () => {
    const weights = { a: 50, b: 30, c: 20 }
    for (let i = 0; i < 100; i++) {
      const result = weightedChoice(weights)
      expect(Object.keys(weights)).toContain(result)
    }
  })

  // ──────────────────────────────────────────────
  // TEST 2: cpuPicksPitch returns a valid pitch type
  // ──────────────────────────────────────────────
  it('cpuPicksPitch returns a valid pitch type', () => {
    const validPitches = Object.keys(CPU_PITCH_WEIGHTS)
    for (let i = 0; i < 50; i++) {
      expect(validPitches).toContain(cpuPicksPitch())
    }
  })

  // ──────────────────────────────────────────────
  // TEST 3: determineOutcome returns valid outcomes for all pitch types
  // ──────────────────────────────────────────────
  it('determineOutcome returns valid outcomes for swings and takes', () => {
    const allSwingOutcomes = new Set(Object.keys(SWING_OUTCOMES.fastball))
    const allTakeOutcomes = new Set(Object.keys(TAKE_OUTCOMES.fastball))
    for (const pitch of ['fastball', 'curveball', 'slider', 'changeup']) {
      const swingResult = determineOutcome(pitch, true)
      expect(allSwingOutcomes).toContain(swingResult)
      const takeResult = determineOutcome(pitch, false)
      expect(allTakeOutcomes).toContain(takeResult)
    }
  })
})

// ──────────────────────────────────────────────
// TEST 4: fatigue increases hit probability
// ──────────────────────────────────────────────
describe('fatigue', () => {
  it('applyFatigueMod boosts hit weights after 85 pitches', () => {
    const base = { ...SWING_OUTCOMES.fastball }
    const fresh = applyFatigueMod(base, 50)
    const tired = applyFatigueMod(base, 100)
    expect(tired.single).toBeGreaterThan(fresh.single)
    expect(tired.homerun).toBeGreaterThan(fresh.homerun)
    expect(tired.strike_swinging).toBeLessThan(fresh.strike_swinging)
  })
})

// ──────────────────────────────────────────────
// TEST 5: weather modifiers adjust outcomes correctly
// ──────────────────────────────────────────────
describe('weather', () => {
  it('wind_out boosts HRs and wind_in suppresses them', () => {
    const base = { homerun: 10, flyout: 10, single: 10 }
    const windOut = applyWeatherModifiers(base, 'wind_out')
    const windIn = applyWeatherModifiers(base, 'wind_in')
    expect(windOut.homerun).toBeGreaterThan(base.homerun)
    expect(windIn.homerun).toBeLessThan(base.homerun)
  })
})

// ──────────────────────────────────────────────
// TEST 6: stats calculator adjusts for good hitters
// ──────────────────────────────────────────────
describe('statsCalculator', () => {
  it('a great hitter gets more hit weight than a poor one', () => {
    const base = { ...SWING_OUTCOMES.fastball }
    const great = calculateAdjustedOutcomes(base, { avg: 0.320, slg: 0.550, k_rate: 0.150 })
    const poor = calculateAdjustedOutcomes(base, { avg: 0.190, slg: 0.280, k_rate: 0.310 })
    expect(great.single).toBeGreaterThan(poor.single)
    expect(great.homerun).toBeGreaterThan(poor.homerun)
  })

  // ──────────────────────────────────────────────
  // TEST 7: wild pitcher gives more balls on takes
  // ──────────────────────────────────────────────
  it('wild pitcher gets more balls in take outcomes', () => {
    const base = { ...TAKE_OUTCOMES.fastball }
    const wild = calculateAdjustedTakeOutcomes(base, { bb_per_9: 5.5 })
    const control = calculateAdjustedTakeOutcomes(base, { bb_per_9: 1.5 })
    expect(wild.ball).toBeGreaterThan(control.ball)
  })
})

// ──────────────────────────────────────────────
// TEST 8: processPitch advances game state
// ──────────────────────────────────────────────
describe('gameEngine', () => {
  it('processPitch updates pitch count and play log', () => {
    const state = makeGameState()
    const before = state.play_log.length
    processPitch(state, 'fastball')
    expect(state.home_pitch_count).toBe(1)
    expect(state.play_log.length).toBeGreaterThan(before)
  })

  // ──────────────────────────────────────────────
  // TEST 9: processAtBat only works when batting
  // ──────────────────────────────────────────────
  it('processAtBat rejects input when player is pitching', () => {
    const state = makeGameState()
    state.player_role = 'pitching'
    processAtBat(state, 'swing')
    expect(state.last_play).toMatch(/pitching right now/)
  })

  // ──────────────────────────────────────────────
  // TEST 10: switchPitcher updates pitcher and resets count
  // ──────────────────────────────────────────────
  it('switchPitcher replaces the pitcher and resets pitch count', () => {
    const state = makeGameState()
    state.home_pitch_count = 95
    const reliever = { id: 99, name: 'New Arm', stats: { era: 2.50, k_per_9: 10.0, bb_per_9: 2.0 } }
    switchPitcher(state, 'home', reliever)
    expect(state.home_pitcher.name).toBe('New Arm')
    expect(state.home_pitch_count).toBe(0)
    expect(state.home_pitcher_stats.id).toBe(99)
    expect(state.play_log.at(-1)).toMatch(/Pitching change/)
  })
})
