import { describe, expect, it } from 'vitest'

import { assignFrozenShirtNumbers, createNextShirtNumberForLockedTeam } from '../../../shared/utils/shirtNumbers'
import type { SavedTeam, SavedTeamPlayer } from '../../../shared/types/team'

function createPlayer(overrides: Partial<SavedTeamPlayer>): SavedTeamPlayer {
  return {
    id: overrides.id ?? 'player-1',
    teamId: overrides.teamId ?? 'team-1',
    positionTemplateId: overrides.positionTemplateId ?? 'amazon-eagle-warrior',
    name: overrides.name ?? 'Player',
    shirtNumber: overrides.shirtNumber ?? null,
    playerStatus: overrides.playerStatus ?? 'ACTIVE',
    currentValue: overrides.currentValue ?? 50000,
    spp: overrides.spp ?? 0,
    nigglingInjuries: overrides.nigglingInjuries ?? 0,
    missNextGame: overrides.missNextGame ?? false,
    isDead: overrides.isDead ?? false,
    extraSkills: overrides.extraSkills ?? [],
    statAdjustments: overrides.statAdjustments ?? {},
  }
}

describe('shirtNumbers', () => {
  it('keeps temporarily retired shirt numbers reserved on locked teams', () => {
    const players = [
      createPlayer({ id: 'player-1', shirtNumber: 1, playerStatus: 'ACTIVE' }),
      createPlayer({ id: 'player-2', shirtNumber: 2, playerStatus: 'RETIRED' }),
      createPlayer({ id: 'player-3', shirtNumber: null, playerStatus: 'ACTIVE' }),
    ]

    const assigned = assignFrozenShirtNumbers(players)

    expect(assigned.players[2]?.shirtNumber).toBe(3)
  })

  it('skips temporarily retired shirt numbers when adding a player to a locked team', () => {
    const team: SavedTeam = {
      id: 'team-1',
      rosterTemplateId: 'amazon',
      name: 'Temple Harpies',
      status: 'ACTIVE',
      draftBudget: 1000000,
      rerollCount: 0,
      assistantCoachCount: 0,
      cheerleaderCount: 0,
      dedicatedFans: 1,
      apothecaryPurchased: false,
      createdAt: '2026-05-15T00:00:00.000Z',
      updatedAt: '2026-05-15T00:00:00.000Z',
      players: [
        createPlayer({ id: 'player-1', shirtNumber: 1, playerStatus: 'ACTIVE' }),
        createPlayer({ id: 'player-2', shirtNumber: 2, playerStatus: 'RETIRED' }),
      ],
    }

    expect(createNextShirtNumberForLockedTeam(team)).toBe(3)
  })
})
