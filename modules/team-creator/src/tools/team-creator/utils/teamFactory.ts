import type { PositionTemplate, RosterTemplate, SavedTeam, SavedTeamPlayer } from '../../../shared/types/team'
import { createId } from '../../../shared/utils/createId'

function buildPlayerName(position: PositionTemplate, existingPlayers: SavedTeamPlayer[]) {
  const nextIndex =
    existingPlayers.filter((player) => player.positionTemplateId === position.id).length + 1

  return `${position.name} ${nextIndex}`
}

export function createTeam(name: string, template: RosterTemplate): SavedTeam {
  const timestamp = new Date().toISOString()

  return {
    id: createId('team'),
    rosterTemplateId: template.id,
    name: name.trim(),
    status: 'DRAFT',
    draftBudget: 1_000_000,
    rerollCount: 0,
    assistantCoachCount: 0,
    cheerleaderCount: 0,
    dedicatedFans: 1,
    apothecaryPurchased: false,
    createdAt: timestamp,
    updatedAt: timestamp,
    players: [],
  }
}

export function createTeamPlayer(team: SavedTeam, position: PositionTemplate): SavedTeamPlayer {
  return {
    id: createId('player'),
    teamId: team.id,
    positionTemplateId: position.id,
    name: buildPlayerName(position, team.players),
    shirtNumber: null,
    currentValue: position.cost,
    spp: 0,
    nigglingInjuries: 0,
    missNextGame: false,
    extraSkills: [],
    statAdjustments: {},
  }
}
