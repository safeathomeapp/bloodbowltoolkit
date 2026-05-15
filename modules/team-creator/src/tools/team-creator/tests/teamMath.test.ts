import { describe, expect, it } from 'vitest'

import { rosterTemplates } from '../../../data/rosterTemplates'
import {
  calculateAssistantCoachValue,
  calculateCheerleaderValue,
  calculateDedicatedFansValue,
  calculatePlayerValue,
  calculateRerollValue,
  calculateTeamValue,
  calculateTreasury,
  getDraftWarnings,
} from '../../../shared/utils/teamMath'
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
      draftBudget: 1000000,
      rerollCount: 2,
      assistantCoachCount: 1,
      cheerleaderCount: 2,
      dedicatedFans: 3,
      apothecaryPurchased: true,
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
    expect(calculateAssistantCoachValue(team)).toBe(10000)
    expect(calculateCheerleaderValue(team)).toBe(20000)
    expect(calculateDedicatedFansValue(team)).toBe(10000)
    expect(calculateTeamValue(team, template)).toBe(350000)
    expect(calculateTreasury(team, template)).toBe(650000)
  })

  it('flags invalid draft states', () => {
    const template = rosterTemplates.find((entry) => entry.id === 'orc')

    if (!template) {
      throw new Error('Orc template missing')
    }

    const team: SavedTeam = {
      id: 'team-2',
      rosterTemplateId: 'orc',
      name: 'Bad Draft',
      status: 'DRAFT',
      draftBudget: 100000,
      rerollCount: 9,
      assistantCoachCount: 7,
      cheerleaderCount: 13,
      dedicatedFans: 0,
      apothecaryPurchased: false,
      createdAt: '2026-05-15T00:00:00.000Z',
      updatedAt: '2026-05-15T00:00:00.000Z',
      players: [],
    }

    expect(getDraftWarnings(team, template)).toEqual([
      'Draft list needs at least 11 players.',
      'Draft list cannot purchase more than 8 team rerolls.',
      'Draft list cannot purchase more than 6 assistant coaches.',
      'Draft list cannot purchase more than 12 cheerleaders.',
      'Dedicated fans must stay between 1 and 7 during drafting.',
      'Draft spending exceeds the current draft budget.',
    ])
  })
})
