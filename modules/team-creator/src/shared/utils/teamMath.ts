import type { PositionTemplate, RosterTemplate, SavedTeam } from '../types/team'

const ASSISTANT_COACH_COST = 10_000
const CHEERLEADER_COST = 10_000
const APOTHECARY_COST = 50_000
const DEDICATED_FAN_STEP_COST = 5_000
const MINIMUM_TEAM_SIZE = 11
const MAXIMUM_TEAM_SIZE = 16

export function isActivePlayer(player: Pick<SavedTeam['players'][number], 'playerStatus'>) {
  return player.playerStatus === 'ACTIVE'
}

export function isRosteredPlayer(player: Pick<SavedTeam['players'][number], 'playerStatus'>) {
  return player.playerStatus === 'ACTIVE' || player.playerStatus === 'RETIRED'
}

export function isEligibleForNextGamePlayer(
  player: Pick<SavedTeam['players'][number], 'playerStatus' | 'missNextGame'>,
) {
  return player.playerStatus === 'ACTIVE' && !player.missNextGame
}

export function countActivePlayers(team: SavedTeam) {
  return team.players.filter(isActivePlayer).length
}

export function countRosteredPlayers(team: SavedTeam) {
  return team.players.filter(isRosteredPlayer).length
}

export function countEligiblePlayers(team: SavedTeam) {
  return team.players.filter(isEligibleForNextGamePlayer).length
}

export function calculatePlayerValue(team: SavedTeam) {
  return team.players
    .filter(isActivePlayer)
    .reduce((total, player) => total + player.currentValue, 0)
}

export function calculateRerollValue(team: SavedTeam, template: RosterTemplate) {
  return team.rerollCount * template.rerollCost
}

export function calculateAssistantCoachValue(team: SavedTeam) {
  return team.assistantCoachCount * ASSISTANT_COACH_COST
}

export function calculateCheerleaderValue(team: SavedTeam) {
  return team.cheerleaderCount * CHEERLEADER_COST
}

export function calculateDedicatedFansValue(team: SavedTeam) {
  return Math.max(0, team.dedicatedFans - 1) * DEDICATED_FAN_STEP_COST
}

export function calculateApothecaryValue(team: SavedTeam) {
  return team.apothecaryPurchased ? APOTHECARY_COST : 0
}

export function calculateSidelineValue(team: SavedTeam) {
  return (
    calculateAssistantCoachValue(team) +
    calculateCheerleaderValue(team) +
    calculateDedicatedFansValue(team) +
    calculateApothecaryValue(team)
  )
}

export function calculateTeamValue(team: SavedTeam, template: RosterTemplate) {
  return calculatePlayerValue(team) + calculateRerollValue(team, template) + calculateSidelineValue(team)
}

export function calculateTreasury(team: SavedTeam, template: RosterTemplate) {
  return team.draftBudget - calculateTeamValue(team, template)
}

export function calculateMinimumTeamSize(template: RosterTemplate) {
  return template.positions.reduce((total, position) => total + position.minQty, 0)
}

export function getDraftWarnings(team: SavedTeam, template: RosterTemplate) {
  const warnings: string[] = []
  const activePlayers = countActivePlayers(team)

  if (activePlayers < Math.max(MINIMUM_TEAM_SIZE, calculateMinimumTeamSize(template))) {
    warnings.push('Draft list needs at least 11 players.')
  }

  if (activePlayers > MAXIMUM_TEAM_SIZE) {
    warnings.push('Draft list cannot exceed 16 players.')
  }

  if (team.rerollCount > 8) {
    warnings.push('Draft list cannot purchase more than 8 team rerolls.')
  }

  if (team.assistantCoachCount > 6) {
    warnings.push('Draft list cannot purchase more than 6 assistant coaches.')
  }

  if (team.cheerleaderCount > 12) {
    warnings.push('Draft list cannot purchase more than 12 cheerleaders.')
  }

  if (team.dedicatedFans < 1 || team.dedicatedFans > 7) {
    warnings.push('Dedicated fans must stay between 1 and 7 during drafting.')
  }

  if (team.apothecaryPurchased && template.apothecary === 'NO') {
    warnings.push('This roster cannot draft an apothecary.')
  }

  if (calculateTreasury(team, template) < 0) {
    warnings.push('Draft spending exceeds the current draft budget.')
  }

  return warnings
}

export function countPlayersByPosition(team: SavedTeam) {
  return team.players
    .filter(isRosteredPlayer)
    .reduce<Record<string, number>>((counts, player) => {
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

  return team.players.filter((player) => isRosteredPlayer(player) && groupedPositionIds.has(player.positionTemplateId)).length
}
