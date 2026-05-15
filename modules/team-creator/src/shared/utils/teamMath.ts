import type { PositionTemplate, RosterTemplate, SavedTeam } from '../types/team'

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

export function countPlayersInSharedGroup(
  team: SavedTeam,
  template: RosterTemplate,
  position: PositionTemplate,
) {
  if (!position.sharedLimitGroup) {
    return 0
  }

  const groupedPositionIds = new Set(
    template.positions
      .filter((candidate) => candidate.sharedLimitGroup === position.sharedLimitGroup)
      .map((candidate) => candidate.id),
  )

  return team.players.filter((player) => groupedPositionIds.has(player.positionTemplateId)).length
}
