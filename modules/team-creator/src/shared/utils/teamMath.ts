import type { RosterTemplate, SavedTeam } from '../types/team'

export function calculatePlayerValue(team: SavedTeam) {
  return team.players.reduce((total, player) => total + player.currentValue, 0)
}

export function calculateRerollValue(team: SavedTeam, template: RosterTemplate) {
  return team.rerollCount * template.rerollCost
}

export function calculateTeamValue(team: SavedTeam, template: RosterTemplate) {
  return calculatePlayerValue(team) + calculateRerollValue(team, template)
}

export function countPlayersByPosition(team: SavedTeam) {
  return team.players.reduce<Record<string, number>>((counts, player) => {
    counts[player.positionTemplateId] = (counts[player.positionTemplateId] ?? 0) + 1
    return counts
  }, {})
}
