<template>
  <div class="scorecard">
    <h3 class="scorecard-header">{{ teamAbbr }} Scorecard</h3>
    <div class="scorecard-scroll">
      <table class="scorecard-table">
        <thead>
          <tr>
            <th class="sc-name">Player</th>
            <th v-for="inn in maxInning" :key="inn" class="sc-inning">{{ inn }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(player, idx) in lineup" :key="player.id || idx">
            <td class="sc-name">{{ player.name }}</td>
            <td v-for="inn in maxInning" :key="inn" class="sc-cell">
              <span
                v-for="(pa, pi) in getPAs(idx, inn)"
                :key="pi"
                class="sc-result"
                :class="resultClass(pa.result)"
              >{{ formatResult(pa.result) }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  scorecard: { type: Array, default: () => [] },
  lineup: { type: Array, default: () => [] },
  teamAbbr: { type: String, default: '' },
})

const RESULT_MAP = {
  single: '1B',
  double: '2B',
  triple: '3B',
  homerun: 'HR',
  groundout: 'GO',
  flyout: 'FO',
  lineout: 'LO',
  strikeout: 'K',
  walk: 'BB',
}

const maxInning = computed(() => {
  if (!props.scorecard.length) return 9
  const max = Math.max(...props.scorecard.map((pa) => pa.inning))
  return Math.max(9, max)
})

function getPAs(batterIdx, inning) {
  return props.scorecard.filter(
    (pa) => pa.batterIdx === batterIdx && pa.inning === inning
  )
}

function formatResult(result) {
  return RESULT_MAP[result] || result
}

function resultClass(result) {
  if (result === 'homerun') return 'sc-hr'
  if (result === 'single' || result === 'double' || result === 'triple') return 'sc-hit'
  if (result === 'walk') return 'sc-bb'
  return 'sc-out'
}
</script>

<style scoped>
.scorecard {
  background: #0f0f23;
  border: 1px solid #333;
  border-radius: 6px;
  padding: 10px;
  margin-bottom: 16px;
}

.scorecard-header {
  font-size: 13px;
  color: #ffdd00;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin: 0 0 8px 0;
}

.scorecard-scroll {
  overflow-x: auto;
}

.scorecard-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  font-family: 'Courier New', monospace;
}

.scorecard-table th {
  color: #888;
  font-size: 11px;
  text-transform: uppercase;
  padding: 4px 6px;
  border-bottom: 1px solid #333;
  text-align: center;
}

.scorecard-table td {
  padding: 4px 6px;
  border-bottom: 1px solid #1a1a3a;
  color: #ccc;
  text-align: center;
  white-space: nowrap;
}

.sc-name {
  text-align: left !important;
  min-width: 120px;
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sc-inning {
  min-width: 36px;
}

.sc-cell {
  min-width: 36px;
}

.sc-result {
  display: inline-block;
  font-weight: bold;
  font-size: 12px;
}

.sc-result + .sc-result::before {
  content: ' ';
}

.sc-hit {
  color: #4caf50;
}

.sc-hr {
  color: #ffdd00;
}

.sc-bb {
  color: #64b5f6;
}

.sc-out {
  color: #888;
}
</style>
