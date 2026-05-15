import { describe, expect, it } from 'vitest'

import { rosterTemplates } from '../../../data/rosterTemplates'
import { calculatePlayerValue, calculateRerollValue, calculateTeamValue } from '../../../shared/utils/teamMath'
import type { SavedTeam } from '../../../shared/types/team'

describe('teamMath', () => {
  it('calculates player, reroll, and total team value', () => {
    const template = rosterTemplates.find((entry) => entry.id === 'amazon')

    if (!template) {
      throw new Error('Amazon template missing')
    }

    const team: SavedTeam = {
      id: 'team-1',
      rosterTemplateId: 'amazon',
      name: 'Temple Harpies',
      status: 'DRAFT',
      rerollCount: 2,
      apothecaryPurchased: false,
      createdAt: '2026-05-15T00:00:00.000Z',
      updatedAt: '2026-05-15T00:00:00.000Z',
      players: [
        {
          id: 'player-1',
          teamId: 'team-1',
          positionTemplateId: 'amazon-eagle-warrior',
          name: 'Ayla',
          shirtNumber: 1,
          currentValue: 50000,
          spp: 0,
          nigglingInjuries: 0,
          extraSkills: [],
          statAdjustments: {},
        },
        {
          id: 'player-2',
          teamId: 'team-1',
          positionTemplateId: 'amazon-piranha-warrior',
          name: 'Shara',
          shirtNumber: 2,
          currentValue: 90000,
          spp: 0,
          nigglingInjuries: 0,
          extraSkills: [],
          statAdjustments: {},
        },
      ],
    }

    expect(calculatePlayerValue(team)).toBe(140000)
    expect(calculateRerollValue(team, template)).toBe(120000)
    expect(calculateTeamValue(team, template)).toBe(260000)
  })
})
