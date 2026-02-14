<template>
  <div class="interactive-game">
    <!-- Step 1: Pick Your Team -->
    <div v-if="!game && setupStep === 1">
      <div class="title-art">&#9918;</div>
      <h2 class="game-title">Interactive Baseball</h2>
      <TeamSelector @teamSelected="onTeamSelected" />

      <div class="classic-matchups">
        <h3 class="classic-header">Classic Matchups</h3>
        <div class="matchup-grid">
          <button
            v-for="(m, i) in classicMatchups"
            :key="i"
            class="matchup-card"
            @click="selectClassicMatchup(m)"
          >
            <div class="matchup-label">{{ m.label }}</div>
            <div class="matchup-teams">{{ m.home.season }} {{ m.home.name }} vs {{ m.away.season }} {{ m.away.name }}</div>
          </button>
        </div>
      </div>

      <div class="skip-select">
        <button class="skip-btn" @click="startGame()">Skip — Play without teams</button>
      </div>
    </div>

    <!-- Step 2: Pick Your Season -->
    <div v-if="!game && setupStep === 2" class="start-screen">
      <div class="step-header">
        <button class="back-btn" @click="goBack">&larr; Back</button>
        <h3 class="step-label">Your Team: {{ homeTeamName }}</h3>
      </div>
      <p>Choose the season for your roster:</p>
      <div class="season-select pregame-season">
        <select id="season" v-model="selectedSeason" class="season-dropdown">
          <option v-for="year in availableSeasons" :key="year" :value="year">{{ year }}</option>
        </select>
      </div>
      <button class="play-btn" @click="goToStep(3)">Next</button>
    </div>

    <!-- Step 3: Pick Your Pitcher -->
    <div v-if="!game && setupStep === 3" class="start-screen">
      <div class="step-header">
        <button class="back-btn" @click="goBack">&larr; Back</button>
        <h3 class="step-label">{{ homeTeamName }} ({{ selectedSeason }})</h3>
      </div>

      <div v-if="loadingPitchers" class="pitcher-loading">Loading pitchers...</div>

      <div v-else-if="pitcherList.length > 0" class="pitcher-selection">
        <p>Choose your starting pitcher:</p>
        <div class="pitcher-list">
          <button
            v-for="p in pitcherList"
            :key="p.id"
            class="pitcher-option"
            :class="{ selected: selectedPitcherId === p.id }"
            @click="selectedPitcherId = p.id"
          >
            <span class="pitcher-opt-name">{{ p.name }}</span>
            <span class="pitcher-opt-stats">ERA {{ p.stats.era.toFixed(2) }} | K/9 {{ p.stats.k_per_9.toFixed(1) }}</span>
          </button>
        </div>
      </div>

      <div v-else-if="!loadingPitchers">
        <p>No pitchers found — one will be assigned automatically.</p>
      </div>

      <button class="play-btn" @click="goToStep(4)" :disabled="loadingPitchers">Next</button>
    </div>

    <!-- Step 4: Pick Opponent -->
    <div v-if="!game && setupStep === 4" class="start-screen">
      <div class="step-header">
        <button class="back-btn" @click="goBack">&larr; Back</button>
        <h3 class="step-label">Now pick the opponent</h3>
      </div>
      <div class="opponent-leagues">
        <div v-for="league in opponentLeagues" :key="league.name" class="opponent-league-section">
          <h4 class="league-header">{{ league.label }}</h4>
          <div class="opponent-grid">
            <div
              v-for="team in league.teams"
              :key="team.id"
              class="opponent-card"
              :class="{ selected: selectedOpponentId === team.id }"
              @click="selectedOpponentId = team.id"
            >
              <div class="opponent-abbr">{{ team.abbreviation }}</div>
              <div class="opponent-name">{{ team.name }}</div>
            </div>
          </div>
        </div>
      </div>
      <button class="play-btn" @click="goToStep(5)" :disabled="!selectedOpponentId" style="margin-top: 20px">Next</button>
    </div>

    <!-- Step 5: Pick Opponent Season -->
    <div v-if="!game && setupStep === 5" class="start-screen">
      <div class="step-header">
        <button class="back-btn" @click="goBack">&larr; Back</button>
        <h3 class="step-label">Opponent: {{ awayTeamName }}</h3>
      </div>
      <p>Choose the season for the opponent's roster:</p>
      <div class="season-select pregame-season">
        <select id="away-season" v-model="selectedAwaySeason" class="season-dropdown">
          <option v-for="year in availableSeasons" :key="year" :value="year">{{ year }}</option>
        </select>
      </div>
      <button class="play-btn" @click="goToStep(6)">Next</button>
    </div>

    <!-- Step 6: Pick Pitchers (classic mode shows both, normal shows away only) -->
    <div v-if="!game && setupStep === 6" class="start-screen">
      <div class="step-header">
        <button class="back-btn" @click="goBack">&larr; Back</button>
        <h3 class="step-label" v-if="!classicMode">{{ awayTeamName }} ({{ selectedAwaySeason }})</h3>
        <h3 class="step-label" v-else>{{ homeTeamName }} ({{ selectedSeason }}) vs {{ awayTeamName }} ({{ selectedAwaySeason }})</h3>
      </div>

      <div v-if="loadingPitchers || loadingAwayPitchers" class="pitcher-loading">Loading pitchers...</div>

      <template v-else>
        <!-- Home pitcher selection (classic mode only) -->
        <div v-if="classicMode && pitcherList.length > 0" class="pitcher-selection">
          <p>Choose your starting pitcher ({{ homeTeamName }}):</p>
          <div class="pitcher-list">
            <button
              v-for="p in pitcherList"
              :key="p.id"
              class="pitcher-option"
              :class="{ selected: selectedPitcherId === p.id }"
              @click="selectedPitcherId = p.id"
            >
              <span class="pitcher-opt-name">{{ p.name }}</span>
              <span class="pitcher-opt-stats">ERA {{ p.stats.era.toFixed(2) }} | K/9 {{ p.stats.k_per_9.toFixed(1) }}</span>
            </button>
          </div>
        </div>

        <!-- Away pitcher selection -->
        <div v-if="awayPitcherList.length > 0" class="pitcher-selection">
          <p>Choose the opponent's starting pitcher ({{ awayTeamName }}):</p>
          <div class="pitcher-list">
            <button
              v-for="p in awayPitcherList"
              :key="p.id"
              class="pitcher-option"
              :class="{ selected: selectedAwayPitcherId === p.id }"
              @click="selectedAwayPitcherId = p.id"
            >
              <span class="pitcher-opt-name">{{ p.name }}</span>
              <span class="pitcher-opt-stats">ERA {{ p.stats.era.toFixed(2) }} | K/9 {{ p.stats.k_per_9.toFixed(1) }}</span>
            </button>
          </div>
        </div>

        <div v-if="!awayPitcherList.length && (!classicMode || !pitcherList.length)">
          <p>No pitchers found — they will be assigned automatically.</p>
        </div>
      </template>

      <div class="start-actions">
        <button class="play-btn" @click="startGame()" :disabled="loading || loadingAwayPitchers || loadingPitchers">
          {{ loading ? 'Loading rosters...' : 'Play Ball!' }}
        </button>
        <button class="play-btn simulate-btn" @click="startSimulation()" :disabled="loading || loadingAwayPitchers || loadingPitchers">
          {{ loading ? 'Loading...' : 'Simulate' }}
        </button>
      </div>
    </div>

    <!-- Active Game -->
    <div v-if="game">
      <!-- Sound Toggle -->
      <button class="sound-toggle" @click="onToggleSound" :title="soundMuted ? 'Unmute' : 'Mute'">
        {{ soundMuted ? '🔇' : '🔊' }}
      </button>

      <!-- Game Over Overlay -->
      <div v-if="game.game_status === 'final'" class="game-over-overlay">
        <div class="game-over-card">
          <h2>Game Over!</h2>
          <div class="final-score">
            <div class="final-team">
              <span class="label">{{ game.away_abbreviation || 'AWAY' }}</span>
              <span class="score">{{ game.away_total }}</span>
            </div>
            <div class="vs">—</div>
            <div class="final-team">
              <span class="label">{{ game.home_abbreviation || 'HOME' }} (You)</span>
              <span class="score">{{ game.home_total }}</span>
            </div>
          </div>
          <p class="result-text">{{ game.home_total > game.away_total ? 'You Win!' : 'You Lose!' }}</p>
          <button class="play-btn" @click="resetGame">New Game</button>
        </div>
      </div>

      <Scoreboard
        :away-score="game.away_score"
        :home-score="game.home_score"
        :away-total="game.away_total"
        :home-total="game.home_total"
        :inning="game.inning"
        :is-top="game.is_top"
        :balls="game.balls"
        :strikes="game.strikes"
        :outs="game.outs"
        :away-team-name="game.away_abbreviation"
        :home-team-name="game.home_abbreviation"
        :current-batter-name="game.current_batter_name"
      />

      <div class="field-layout">
        <!-- Pitcher (left side) -->
        <div class="player-card pitcher-side">
          <img
            v-if="currentPitcher?.id"
            :src="headshotUrl(currentPitcher.id)"
            :alt="currentPitcherName"
            class="player-headshot"
          />
          <div class="player-card-info">
            <span class="player-card-label">PITCHING</span>
            <span class="player-card-name pitcher-name">{{ currentPitcherName }}</span>
          </div>
        </div>

        <BaseballDiamond :bases="game.bases" />

        <!-- Batter (right side) -->
        <div class="player-card batter-side">
          <img
            v-if="currentBatter?.id"
            :src="headshotUrl(currentBatter.id)"
            :alt="game.current_batter_name"
            class="player-headshot"
          />
          <div class="player-card-info">
            <span class="player-card-label">AT BAT</span>
            <span class="player-card-name batter-name-text">{{ game.current_batter_name }}</span>
          </div>
        </div>
      </div>

      <!-- Last Play -->
      <div class="last-play" v-if="game.last_play">
        <p>{{ game.last_play }}</p>
      </div>

      <!-- Simulation Speed Controls -->
      <div v-if="simulating" class="sim-controls">
        <div class="mode-label">Simulation in progress</div>
        <div class="button-group">
          <button class="action-btn speed-btn" :class="{ active: simSpeed === 2000 }" @click="setSimSpeed(2000)">Slow</button>
          <button class="action-btn speed-btn" :class="{ active: simSpeed === 1000 }" @click="setSimSpeed(1000)">Normal</button>
          <button class="action-btn speed-btn" :class="{ active: simSpeed === 300 }" @click="setSimSpeed(300)">Fast</button>
          <button class="action-btn speed-btn skip" @click="skipToEnd()">Skip to End</button>
        </div>
      </div>

      <!-- Controls -->
      <div class="controls" v-if="game.game_status === 'active' && !simulating">
        <!-- Pitching Mode -->
        <div v-if="game.player_role === 'pitching'" class="pitch-controls">
          <div class="mode-label">You're Pitching — Choose your pitch:</div>
          <div class="button-group">
            <button
              v-for="pitch in pitchTypes"
              :key="pitch.value"
              class="action-btn pitch-btn"
              :class="pitch.value"
              @click="doPitch(pitch.value)"
              :disabled="loading"
            >
              {{ pitch.label }}
            </button>
          </div>
        </div>

        <!-- Batting Mode -->
        <div v-if="game.player_role === 'batting'" class="bat-controls">
          <div class="mode-label">You're Batting — Swing or take?</div>
          <div class="button-group">
            <button class="action-btn swing-btn" @click="doBat('swing')" :disabled="loading">
              Swing!
            </button>
            <button class="action-btn take-btn" @click="doBat('take')" :disabled="loading">
              Take
            </button>
          </div>
        </div>
      </div>

      <!-- Play Log -->
      <div class="play-log">
        <h3>Play-by-Play</h3>
        <div class="log-entries" ref="logEl">
          <div
            v-for="(entry, i) in game.play_log"
            :key="i"
            class="log-entry"
            :class="{ separator: entry.startsWith('---') }"
          >
            {{ entry }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, watch, onUnmounted } from 'vue'
import { createNewGame, getAllTeams, getTeamPitchers, simulateGame, throwPitch, batAction } from '../services/gameApi.js'
import { useSoundEffects } from '../composables/useSoundEffects.js'
import BaseballDiamond from './BaseballDiamond.vue'
import Scoreboard from './Scoreboard.vue'
import TeamSelector from './TeamSelector.vue'

const game = ref(null)
const loading = ref(false)
const logEl = ref(null)

// Setup wizard state
const setupStep = ref(1)
const teamSelected = ref(null)
const selectedSeason = ref(2024)
const availableSeasons = Array.from({ length: 2025 - 1920 + 1 }, (_, i) => 2025 - i)
const loadingPitchers = ref(false)
const pitcherList = ref([])
const selectedPitcherId = ref(null)
const allTeams = ref([])
const selectedOpponentId = ref(null)
const selectedAwaySeason = ref(2024)
const loadingAwayPitchers = ref(false)
const awayPitcherList = ref([])
const selectedAwayPitcherId = ref(null)
const classicMode = ref(false)

// Simulation replay state
const simulating = ref(false)
const simSnapshots = ref([])
const simReplayIndex = ref(0)
const simSpeed = ref(1000)
const simTimer = ref(null)

const opponentTeams = computed(() => {
  return allTeams.value.filter(t => t.id !== teamSelected.value)
})

const opponentLeagues = computed(() => {
  const teams = opponentTeams.value
  const al = teams.filter(t => t.league === 'AL')
  const nl = teams.filter(t => t.league === 'NL')
  const other = teams.filter(t => t.league !== 'AL' && t.league !== 'NL')
  const result = []
  if (al.length) result.push({ name: 'AL', label: 'American League', teams: al })
  if (nl.length) result.push({ name: 'NL', label: 'National League', teams: nl })
  if (other.length) result.push({ name: 'other', label: 'Other', teams: other })
  return result
})

const homeTeamName = computed(() => {
  const team = allTeams.value.find(t => t.id === teamSelected.value)
  return team?.name || 'Your Team'
})

const awayTeamName = computed(() => {
  const team = allTeams.value.find(t => t.id === selectedOpponentId.value)
  return team?.name || 'Opponent'
})

const { playForLastPlay, toggleMute, isMuted } = useSoundEffects()
const soundMuted = ref(false)

function onToggleSound() {
  toggleMute()
  soundMuted.value = isMuted()
}

const classicMatchups = [
  { label: 'Crosstown Classic', home: { id: 145, name: 'White Sox', season: 2005 }, away: { id: 112, name: 'Cubs', season: 2016 } },
  { label: "Murder's Row vs Big Red Machine", home: { id: 147, name: 'Yankees', season: 1927 }, away: { id: 113, name: 'Reds', season: 1975 } },
  { label: 'Curse Breakers', home: { id: 111, name: 'Red Sox', season: 2004 }, away: { id: 138, name: 'Cardinals', season: 2004 } },
  { label: 'Dynasty vs 116 Wins', home: { id: 147, name: 'Yankees', season: 1998 }, away: { id: 136, name: 'Mariners', season: 2001 } },
  { label: 'Subway Series', home: { id: 147, name: 'Yankees', season: 2000 }, away: { id: 121, name: 'Mets', season: 1969 } },
  { label: 'Angels in the Outfield', home: { id: 108, name: 'Angels', season: 2002 }, away: { id: 147, name: 'Yankees', season: 2001 } },
  { label: 'Coast to Coast', home: { id: 119, name: 'Dodgers', season: 2020 }, away: { id: 117, name: 'Astros', season: 2017 } },
  { label: 'Bay Bridge Series', home: { id: 137, name: 'Giants', season: 2010 }, away: { id: 133, name: 'Athletics', season: 1972 } },
  { label: 'Amazin\' vs Magnificent', home: { id: 121, name: 'Mets', season: 1986 }, away: { id: 111, name: 'Red Sox', season: 1986 } },
  { label: 'Small Market Royalty', home: { id: 118, name: 'Royals', season: 2015 }, away: { id: 134, name: 'Pirates', season: 1979 } },
]

const pitchTypes = [
  { label: 'Fastball', value: 'fastball' },
  { label: 'Curveball', value: 'curveball' },
  { label: 'Slider', value: 'slider' },
  { label: 'Changeup', value: 'changeup' },
]

// Show the pitcher who is currently on the mound
const currentPitcher = computed(() => {
  if (!game.value) return null
  return game.value.is_top ? game.value.home_pitcher : game.value.away_pitcher
})

const currentPitcherName = computed(() => currentPitcher.value?.name || '')

const currentBatter = computed(() => {
  if (!game.value) return null
  const lineup = game.value.is_top ? game.value.away_lineup : game.value.home_lineup
  const idx = game.value.current_batter_index || 0
  return lineup?.[idx] || null
})

function headshotUrl(playerId) {
  if (!playerId) return ''
  return `https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_213,q_auto:best/v1/people/${playerId}/headshot/67/current`
}

async function selectClassicMatchup(matchup) {
  classicMode.value = true
  teamSelected.value = matchup.home.id
  selectedSeason.value = matchup.home.season
  selectedOpponentId.value = matchup.away.id
  selectedAwaySeason.value = matchup.away.season

  // Jump to step 6 and load both pitcher lists
  setupStep.value = 6
  loadingPitchers.value = true
  loadingAwayPitchers.value = true
  selectedPitcherId.value = null
  selectedAwayPitcherId.value = null
  pitcherList.value = []
  awayPitcherList.value = []

  try {
    const [homePitchers, awayPitchers, teams] = await Promise.all([
      getTeamPitchers(matchup.home.id, matchup.home.season),
      getTeamPitchers(matchup.away.id, matchup.away.season),
      allTeams.value.length ? Promise.resolve(allTeams.value) : getAllTeams(),
    ])
    allTeams.value = teams
    pitcherList.value = homePitchers
    awayPitcherList.value = awayPitchers
    if (homePitchers.length > 0) selectedPitcherId.value = homePitchers[0].id
    if (awayPitchers.length > 0) selectedAwayPitcherId.value = awayPitchers[0].id
  } finally {
    loadingPitchers.value = false
    loadingAwayPitchers.value = false
  }
}

function onTeamSelected(teamId) {
  teamSelected.value = teamId
  setupStep.value = 2
}

async function goToStep(step) {
  // When entering step 3, fetch home pitchers
  if (step === 3) {
    loadingPitchers.value = true
    selectedPitcherId.value = null
    pitcherList.value = []
    setupStep.value = step
    try {
      const [pitchers, teams] = await Promise.all([
        getTeamPitchers(teamSelected.value, selectedSeason.value),
        allTeams.value.length ? Promise.resolve(allTeams.value) : getAllTeams(),
      ])
      pitcherList.value = pitchers
      allTeams.value = teams
      if (pitcherList.value.length > 0) {
        selectedPitcherId.value = pitcherList.value[0].id
      }
    } finally {
      loadingPitchers.value = false
    }
    return
  }

  // When entering step 6, fetch away pitchers
  if (step === 6) {
    loadingAwayPitchers.value = true
    selectedAwayPitcherId.value = null
    awayPitcherList.value = []
    setupStep.value = step
    try {
      awayPitcherList.value = await getTeamPitchers(selectedOpponentId.value, selectedAwaySeason.value)
      if (awayPitcherList.value.length > 0) {
        selectedAwayPitcherId.value = awayPitcherList.value[0].id
      }
    } finally {
      loadingAwayPitchers.value = false
    }
    return
  }

  setupStep.value = step
}

function goBack() {
  if (classicMode.value) {
    // From classic matchup step 6, go back to step 1
    classicMode.value = false
    teamSelected.value = null
    setupStep.value = 1
  } else if (setupStep.value === 2) {
    teamSelected.value = null
    setupStep.value = 1
  } else {
    setupStep.value = setupStep.value - 1
  }
}

async function startGame() {
  loading.value = true
  try {
    game.value = await createNewGame({
      teamId: teamSelected.value,
      season: selectedSeason.value,
      homePitcherId: selectedPitcherId.value,
      awayTeamId: selectedOpponentId.value,
      awaySeason: selectedAwaySeason.value,
      awayPitcherId: selectedAwayPitcherId.value,
    })
  } finally {
    loading.value = false
  }
}

async function startSimulation() {
  loading.value = true
  try {
    // Create the game first
    const newGame = await createNewGame({
      teamId: teamSelected.value,
      season: selectedSeason.value,
      homePitcherId: selectedPitcherId.value,
      awayTeamId: selectedOpponentId.value,
      awaySeason: selectedAwaySeason.value,
      awayPitcherId: selectedAwayPitcherId.value,
    })
    // Run the full simulation
    const result = await simulateGame(newGame.game_id)
    simSnapshots.value = result.snapshots || []
    simReplayIndex.value = 0
    simulating.value = true
    // Show the first snapshot
    if (simSnapshots.value.length > 0) {
      game.value = { ...newGame, ...simSnapshots.value[0] }
    }
    // Start replaying
    startReplayTimer()
  } finally {
    loading.value = false
  }
}

function startReplayTimer() {
  stopReplayTimer()
  simTimer.value = setInterval(() => {
    simReplayIndex.value++
    if (simReplayIndex.value >= simSnapshots.value.length) {
      stopReplayTimer()
      simulating.value = false
      return
    }
    game.value = { ...game.value, ...simSnapshots.value[simReplayIndex.value] }
  }, simSpeed.value)
}

function stopReplayTimer() {
  if (simTimer.value) {
    clearInterval(simTimer.value)
    simTimer.value = null
  }
}

function setSimSpeed(ms) {
  simSpeed.value = ms
  if (simulating.value) {
    startReplayTimer()
  }
}

function skipToEnd() {
  stopReplayTimer()
  simulating.value = false
  if (simSnapshots.value.length > 0) {
    simReplayIndex.value = simSnapshots.value.length - 1
    game.value = { ...game.value, ...simSnapshots.value[simReplayIndex.value] }
  }
}

onUnmounted(() => {
  stopReplayTimer()
})

function resetGame() {
  stopReplayTimer()
  simulating.value = false
  simSnapshots.value = []
  simReplayIndex.value = 0
  classicMode.value = false
  game.value = null
  setupStep.value = 1
  teamSelected.value = null
  selectedSeason.value = 2024
  pitcherList.value = []
  selectedPitcherId.value = null
  selectedOpponentId.value = null
  selectedAwaySeason.value = 2024
  awayPitcherList.value = []
  selectedAwayPitcherId.value = null
}

async function doPitch(pitchType) {
  loading.value = true
  try {
    game.value = await throwPitch(game.value.game_id, pitchType)
  } finally {
    loading.value = false
  }
}

async function doBat(action) {
  loading.value = true
  try {
    game.value = await batAction(game.value.game_id, action)
  } finally {
    loading.value = false
  }
}

// Play sound effects based on last_play changes
watch(
  () => game.value?.last_play,
  (newPlay, oldPlay) => {
    if (newPlay && newPlay !== oldPlay) {
      playForLastPlay(newPlay)
    }
  }
)

// Auto-scroll play log
watch(
  () => game.value?.play_log?.length,
  async () => {
    await nextTick()
    if (logEl.value) {
      logEl.value.scrollTop = logEl.value.scrollHeight
    }
  }
)
</script>

<style scoped>
.interactive-game {
  position: relative;
}

.game-title {
  text-align: center;
  font-size: 32px;
  color: #e94560;
  margin-bottom: 4px;
}

.title-art {
  font-size: 72px;
  margin-bottom: 16px;
  text-align: center;
}

.season-select {
  text-align: center;
  margin-top: 16px;
}

.season-select label {
  color: #aaa;
  font-size: 14px;
  margin-right: 8px;
}

.season-select select {
  background: #16213e;
  color: #e0e0e0;
  border: 1px solid #555;
  border-radius: 6px;
  padding: 6px 12px;
  font-size: 14px;
  cursor: pointer;
}

.season-select select:hover {
  border-color: #e94560;
}

.skip-select {
  text-align: center;
  margin-top: 16px;
}

.skip-btn {
  background: none;
  border: 1px solid #555;
  color: #888;
  padding: 8px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
}

.skip-btn:hover {
  border-color: #e94560;
  color: #e0e0e0;
}

.start-screen {
  text-align: center;
  padding: 60px 20px;
}

.start-screen h2 {
  font-size: 32px;
  color: #e94560;
  margin-bottom: 12px;
}

.start-screen p {
  color: #aaa;
  margin-bottom: 24px;
}

.step-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-bottom: 20px;
}

.step-label {
  color: #ffdd00;
  font-size: 16px;
  margin: 0;
}

.back-btn {
  background: none;
  border: 1px solid #555;
  color: #aaa;
  padding: 6px 14px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
}

.back-btn:hover {
  border-color: #e94560;
  color: #e0e0e0;
}

.pregame-season {
  margin-bottom: 20px;
}

.season-dropdown {
  background: #16213e;
  color: #e0e0e0;
  border: 1px solid #555;
  border-radius: 6px;
  padding: 8px 14px;
  font-size: 16px;
  cursor: pointer;
  min-width: 120px;
}

.season-dropdown:hover {
  border-color: #e94560;
}

.opponent-leagues {
  max-height: 400px;
  overflow-y: auto;
  padding: 4px;
}

.opponent-league-section {
  margin-bottom: 16px;
}

.league-header {
  color: #ffdd00;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 2px;
  margin-bottom: 8px;
  padding-bottom: 4px;
  border-bottom: 1px solid #333;
}

.opponent-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 10px;
}

.opponent-card {
  background: #16213e;
  border: 2px solid #0f3460;
  border-radius: 8px;
  padding: 14px 8px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
}

.opponent-card:hover {
  border-color: #e94560;
  background: #1a2a4e;
  transform: translateY(-2px);
}

.opponent-card.selected {
  border-color: #e94560;
  background: #1a2a4e;
}

.opponent-abbr {
  font-size: 22px;
  font-weight: bold;
  color: #ffdd00;
  font-family: 'Courier New', monospace;
  margin-bottom: 4px;
}

.opponent-name {
  font-size: 12px;
  color: #ccc;
  line-height: 1.2;
}

.pitcher-loading {
  color: #888;
  text-align: center;
  margin: 20px 0;
}

.pitcher-selection {
  margin-bottom: 24px;
}

.pitcher-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 280px;
  overflow-y: auto;
  padding: 4px;
}

.pitcher-option {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #16213e;
  border: 2px solid #333;
  border-radius: 6px;
  padding: 10px 16px;
  color: #e0e0e0;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
  font-size: 14px;
}

.pitcher-option:hover {
  border-color: #e94560;
}

.pitcher-option.selected {
  border-color: #e94560;
  background: #1a1a3e;
}

.pitcher-opt-name {
  font-weight: bold;
}

.pitcher-opt-stats {
  font-size: 12px;
  color: #888;
}

.play-btn {
  background: #e94560;
  color: white;
  border: none;
  padding: 14px 40px;
  font-size: 20px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: bold;
  transition: background 0.2s;
}

.play-btn:hover:not(:disabled) {
  background: #ff6b81;
}

.play-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Field Layout with Player Headshots */
.field-layout {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin: 8px 0;
}

.player-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100px;
  min-height: 120px;
}

.player-headshot {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  border: 2px solid #333;
  object-fit: cover;
  background: #16213e;
}

.pitcher-side .player-headshot {
  border-color: #e94560;
}

.batter-side .player-headshot {
  border-color: #ffdd00;
}

.player-card-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 6px;
}

.player-card-label {
  font-size: 9px;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.player-card-name {
  font-size: 11px;
  font-weight: bold;
  text-align: center;
  line-height: 1.2;
  margin-top: 2px;
}

.player-card-name.pitcher-name {
  color: #e94560;
}

.player-card-name.batter-name-text {
  color: #ffdd00;
}

/* Game Over */
.game-over-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  border-radius: 8px;
}

.game-over-card {
  text-align: center;
  padding: 40px;
}

.game-over-card h2 {
  font-size: 36px;
  color: #e94560;
  margin-bottom: 20px;
}

.final-score {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24px;
  margin-bottom: 16px;
}

.final-team {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.final-team .label {
  font-size: 12px;
  color: #888;
  text-transform: uppercase;
}

.final-team .score {
  font-size: 48px;
  font-weight: bold;
  color: #ffdd00;
  font-family: 'Courier New', monospace;
}

.vs {
  font-size: 24px;
  color: #666;
}

.result-text {
  font-size: 24px;
  font-weight: bold;
  color: #4caf50;
  margin-bottom: 24px;
}

/* Last Play */
.last-play {
  background: #16213e;
  border: 1px solid #e94560;
  border-radius: 6px;
  padding: 10px 16px;
  margin: 12px 0;
  text-align: center;
  font-size: 15px;
  color: #ffdd00;
  font-weight: 500;
}

/* Controls */
.controls {
  margin: 16px 0;
}

.mode-label {
  text-align: center;
  font-size: 14px;
  color: #aaa;
  margin-bottom: 10px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.button-group {
  display: flex;
  gap: 10px;
  justify-content: center;
  flex-wrap: wrap;
}

.action-btn {
  padding: 12px 24px;
  font-size: 16px;
  font-weight: bold;
  border: 2px solid;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 100px;
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pitch-btn {
  background: #16213e;
  color: #e0e0e0;
  border-color: #e94560;
}

.pitch-btn:hover:not(:disabled) {
  background: #e94560;
  color: white;
}

.swing-btn {
  background: #e94560;
  color: white;
  border-color: #e94560;
  min-width: 140px;
}

.swing-btn:hover:not(:disabled) {
  background: #ff6b81;
}

.take-btn {
  background: #16213e;
  color: #4caf50;
  border-color: #4caf50;
  min-width: 140px;
}

.take-btn:hover:not(:disabled) {
  background: #4caf50;
  color: white;
}

/* Play Log */
.play-log {
  margin-top: 16px;
}

.play-log h3 {
  font-size: 14px;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 8px;
}

.log-entries {
  background: #0f0f23;
  border: 1px solid #333;
  border-radius: 6px;
  padding: 10px;
  max-height: 200px;
  overflow-y: auto;
}

.log-entry {
  padding: 3px 0;
  font-size: 13px;
  color: #ccc;
  border-bottom: 1px solid #1a1a2e;
}

.log-entry.separator {
  color: #e94560;
  font-weight: bold;
  border-bottom: none;
  padding: 6px 0;
}

.log-entries::-webkit-scrollbar {
  width: 6px;
}

.log-entries::-webkit-scrollbar-track {
  background: #0f0f23;
}

.log-entries::-webkit-scrollbar-thumb {
  background: #333;
  border-radius: 3px;
}

/* Simulation */
.start-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
}

.simulate-btn {
  background: #0f3460;
  border: 2px solid #e94560;
}

.simulate-btn:hover:not(:disabled) {
  background: #1a4a7a;
}

.sim-controls {
  margin: 16px 0;
}

.speed-btn {
  background: #16213e;
  color: #e0e0e0;
  border-color: #555;
  min-width: 80px;
  padding: 8px 16px;
  font-size: 14px;
}

.speed-btn.active {
  border-color: #e94560;
  background: #e94560;
  color: white;
}

.speed-btn:hover:not(:disabled) {
  border-color: #e94560;
}

.speed-btn.skip {
  border-color: #ffdd00;
  color: #ffdd00;
}

.speed-btn.skip:hover:not(:disabled) {
  background: #ffdd00;
  color: #0a0a1a;
}

/* Sound Toggle */
.sound-toggle {
  position: absolute;
  top: 8px;
  right: 8px;
  background: none;
  border: 1px solid #555;
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 18px;
  cursor: pointer;
  z-index: 5;
  transition: border-color 0.2s;
}

.sound-toggle:hover {
  border-color: #e94560;
}

/* Classic Matchups */
.classic-matchups {
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid #333;
}

.classic-header {
  color: #ffdd00;
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 2px;
  text-align: center;
  margin-bottom: 12px;
}

.matchup-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 8px;
  max-height: 260px;
  overflow-y: auto;
  padding: 4px;
}

.matchup-card {
  background: #16213e;
  border: 2px solid #0f3460;
  border-radius: 8px;
  padding: 12px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
  color: #e0e0e0;
}

.matchup-card:hover {
  border-color: #e94560;
  background: #1a2a4e;
  transform: translateY(-1px);
}

.matchup-label {
  font-size: 13px;
  font-weight: bold;
  color: #e94560;
  margin-bottom: 4px;
}

.matchup-teams {
  font-size: 12px;
  color: #aaa;
}
</style>
