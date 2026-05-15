import { describe, expect, it } from 'vitest'

import { LocalTeamRepository } from '../../../shared/repositories/localTeamRepository'
import { MemoryKeyValueStore } from '../../../shared/storage/keyValueStore'
import type { SavedTeam } from '../../../shared/types/team'

function createTeam(): SavedTeam {
  return {
    id: 'team-1',
    rosterTemplateId: 'amazon',
    name: 'Temple Harpies',
    status: 'DRAFT',
    rerollCount: 1,
    apothecaryPurchased: false,
    createdAt: '2026-05-15T00:00:00.000Z',
    updatedAt: '2026-05-15T00:00:00.000Z',
    players: [
      {
        id: 'player-1',
        teamId: 'team-1',
        positionTemplateId: 'amazon-eagle-warrior',
        name: 'Ayla',
        shirtNumber: 7,
        currentValue: 50000,
        spp: 0,
        nigglingInjuries: 0,
        extraSkills: [],
        statAdjustments: {},
      },
    ],
  }
}

describe('LocalTeamRepository', () => {
  it('saves and returns team summaries with calculated value', async () => {
    const repository = new LocalTeamRepository(new MemoryKeyValueStore())
    const team = createTeam()

    await repository.saveTeam(team)

    const teams = await repository.listTeams()

    expect(teams).toHaveLength(1)
    expect(teams[0]).toMatchObject({
      id: 'team-1',
      playerCount: 1,
      totalValue: 110000,
    })
  })

  it('loads and deletes a saved team', async () => {
    const repository = new LocalTeamRepository(new MemoryKeyValueStore())
    const team = createTeam()

    await repository.saveTeam(team)

    const loadedTeam = await repository.getTeam(team.id)
    expect(loadedTeam?.name).toBe('Temple Harpies')

    await repository.deleteTeam(team.id)

    expect(await repository.getTeam(team.id)).toBeNull()
  })
})
