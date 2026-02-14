<template>
  <div class="scoreboard">
    <div class="score-grid" :style="gridStyle">
      <!-- Header row -->
      <div class="cell team-col header"></div>
      <div
        v-for="(_, i) in totalInnings"
        :key="'h' + i"
        class="cell header"
        :class="{ active: i === inning - 1 }"
      >
        {{ i + 1 }}
      </div>
      <div class="cell header total-col">R</div>

      <!-- Away row -->
      <div class="cell team-col">{{ awayTeamName || 'AWAY' }}</div>
      <div
        v-for="(runs, i) in awayScore"
        :key="'a' + i"
        class="cell"
        :class="{ active: i === inning - 1 && isTop }"
      >
        {{ i < inning || (i === inning - 1 && isTop) ? runs : '' }}
      </div>
      <div class="cell total-col">{{ awayTotal }}</div>

      <!-- Home row -->
      <div class="cell team-col">{{ homeTeamName || 'HOME' }}</div>
      <div
        v-for="(runs, i) in homeScore"
        :key="'hm' + i"
        class="cell"
        :class="{ active: i === inning - 1 && !isTop }"
      >
        {{ i < inning - 1 || (i === inning - 1 && !isTop) ? runs : '' }}
      </div>
      <div class="cell total-col">{{ homeTotal }}</div>
    </div>

    <div class="game-info">
      <div class="count-display">
        <div class="info-label">COUNT</div>
        <div class="count-numbers">
          <span class="balls-val">{{ balls }}</span>
          <span class="separator">-</span>
          <span class="strikes-val">{{ strikes }}</span>
        </div>
        <div class="count-labels">
          <span>B</span><span></span><span>S</span>
        </div>
      </div>

      <div class="outs-display">
        <div class="info-label">OUTS</div>
        <div class="out-dots">
          <span class="out-dot" :class="{ filled: outs >= 1 }"></span>
          <span class="out-dot" :class="{ filled: outs >= 2 }"></span>
        </div>
      </div>

      <div class="inning-display">
        <div class="info-label">INNING</div>
        <div class="inning-number">
          <span class="arrow">{{ isTop ? '▲' : '▼' }}</span>
          {{ inning }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  awayScore: { type: Array, default: () => [] },
  homeScore: { type: Array, default: () => [] },
  awayTotal: { type: Number, default: 0 },
  homeTotal: { type: Number, default: 0 },
  inning: { type: Number, default: 1 },
  isTop: { type: Boolean, default: true },
  balls: { type: Number, default: 0 },
  strikes: { type: Number, default: 0 },
  outs: { type: Number, default: 0 },
  awayTeamName: { type: String, default: '' },
  homeTeamName: { type: String, default: '' },
  currentBatterName: { type: String, default: '' },
})

const totalInnings = computed(() => props.awayScore.length)

const gridStyle = computed(() => ({
  gridTemplateColumns: `60px repeat(${totalInnings.value}, 1fr) 40px`,
}))
</script>

<style scoped>
.scoreboard {
  background: #0f0f23;
  border: 2px solid #e94560;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 16px;
}

.score-grid {
  display: grid;
  gap: 0;
  overflow-x: auto;
  font-family: 'Courier New', monospace;
}

.cell {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px 4px;
  font-size: 14px;
  color: #e0e0e0;
  border-bottom: 1px solid #1a1a2e;
  min-width: 0;
}

.cell.header {
  color: #888;
  font-size: 12px;
  border-bottom: 1px solid #333;
}

.cell.team-col {
  justify-content: flex-start;
  font-weight: bold;
  color: #e94560;
  font-size: 13px;
  padding-left: 6px;
}

.cell.team-col.header {
  color: #888;
}

.cell.total-col {
  font-weight: bold;
  color: #ffdd00;
  border-left: 2px solid #333;
}

.cell.active {
  background: rgba(233, 69, 96, 0.15);
}

.game-info {
  display: flex;
  justify-content: space-around;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #333;
}

.info-label {
  font-size: 10px;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 4px;
  text-align: center;
}

.count-display {
  text-align: center;
}

.count-numbers {
  font-size: 24px;
  font-weight: bold;
  font-family: 'Courier New', monospace;
}

.balls-val {
  color: #4caf50;
}

.strikes-val {
  color: #e94560;
}

.separator {
  color: #666;
  margin: 0 2px;
}

.count-labels {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: #666;
  padding: 0 4px;
}

.outs-display {
  text-align: center;
}

.out-dots {
  display: flex;
  gap: 8px;
  justify-content: center;
  margin-top: 6px;
}

.out-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid #e94560;
  display: inline-block;
}

.out-dot.filled {
  background: #e94560;
}

.inning-display {
  text-align: center;
}

.inning-number {
  font-size: 24px;
  font-weight: bold;
  font-family: 'Courier New', monospace;
  color: #e0e0e0;
}

.arrow {
  font-size: 14px;
  color: #e94560;
}
</style>
