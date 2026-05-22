import { describe, expect, it } from 'vitest'

import {
  buildTeamCreatorExchangePackage,
  parseTeamCreatorExchangePackage,
  readAvailableTeamsForBlockDice,
  readSavedTeamsFromTeamCreator,
} from '../../../shared/integration/teamCreatorStore'
import { buildRosterTemplateMap, resolveImportedTeam } from '../../../shared/integration/resolveImportedTeam'
import type {
  TeamCreatorRosterTemplateRecord,
  TeamCreatorSavedTeamRecord,
} from '../../../shared/integration/teamImport'

describe('resolveImportedTeam', () => {
  it('resolves team-creator data into block-dice-ready players', () => {
    const templates: TeamCreatorRosterTemplateRecord[] = [
      {
        id: 'amazon',
        name: 'Amazon',
        positions: [
          {
            id: 'jaguar',
            rosterTemplateId: 'amazon',
            name: 'Jaguar Warrior',
            role: 'Blocker',
            movement: 6,
            strength: 4,
            agility: '3+',
            passing: null,
            armour: '9+',
            startingSkills: ['GUARD'],
          },
        ],
      },
    ]

    const team: TeamCreatorSavedTeamRecord = {
      id: 'team-1',
      rosterTemplateId: 'amazon',
      name: 'Lustria Queens',
      status: 'DRAFT',
      players: [
        {
          id: 'player-1',
          teamId: 'team-1',
          positionTemplateId: 'jaguar',
          name: 'Tala',
          shirtNumber: 4,
          currentValue: 120000,
          spp: 0,
          nigglingInjuries: 0,
          isDead: false,
          extraSkills: ['HORNS', 'BLOCK'],
          statAdjustments: {
            strength: 1,
          },
        },
      ],
    }

    const importedTeam = resolveImportedTeam(team, buildRosterTemplateMap(templates))

    expect(importedTeam.rosterName).toBe('Amazon')
    expect(importedTeam.players).toHaveLength(1)
    expect(importedTeam.players[0]).toMatchObject({
      teamName: 'Lustria Queens',
      playerName: 'Tala',
      shirtNumber: 4,
      positionName: 'Jaguar Warrior',
      role: 'Blocker',
      strength: 5,
      allSkills: ['GUARD', 'HORNS', 'BLOCK'],
      blockDiceSkills: ['GUARD', 'HORNS'],
    })
  })

  it('falls back to roster order for player numbers when shirt numbers are unset', () => {
    const templates: TeamCreatorRosterTemplateRecord[] = [
      {
        id: 'orc',
        name: 'Orc',
        positions: [
          {
            id: 'blitzer',
            rosterTemplateId: 'orc',
            name: 'Blitzer',
            role: 'Blitzer',
            movement: 6,
            strength: 3,
            agility: '3+',
            passing: '4+',
            armour: '10+',
            startingSkills: ['GUARD'],
          },
        ],
      },
    ]

    const team: TeamCreatorSavedTeamRecord = {
      id: 'team-2',
      rosterTemplateId: 'orc',
      name: 'Da Orderly Lads',
      status: 'DRAFT',
      players: [
        {
          id: 'player-1',
          teamId: 'team-2',
          positionTemplateId: 'blitzer',
          name: 'First',
          shirtNumber: null,
          currentValue: 80000,
          spp: 0,
          nigglingInjuries: 0,
          isDead: false,
          extraSkills: [],
          statAdjustments: {},
        },
        {
          id: 'player-2',
          teamId: 'team-2',
          positionTemplateId: 'blitzer',
          name: 'Second',
          shirtNumber: null,
          currentValue: 80000,
          spp: 0,
          nigglingInjuries: 0,
          isDead: false,
          extraSkills: [],
          statAdjustments: {},
        },
      ],
    }

    const importedTeam = resolveImportedTeam(team, buildRosterTemplateMap(templates))

    expect(importedTeam.players.map((player) => player.shirtNumber)).toEqual([1, 2])
  })

  it('reads and normalizes saved teams from the team creator storage key', () => {
    const storage = {
      getItem(key: string) {
        if (key !== 'blood-bowl-toolkit:team-creator:teams') {
          return null
        }

        return JSON.stringify([
          {
            id: 'team-1',
            rosterTemplateId: 'orc',
            name: 'Da Smashers',
            status: 'DRAFT',
            players: [
              {
                id: 'player-1',
                teamId: 'team-1',
                positionTemplateId: 'blitzer',
                name: 'Gruk',
                currentValue: 80000,
                isDead: false,
              },
            ],
          },
        ])
      },
    } as Storage

    const teams = readSavedTeamsFromTeamCreator(storage)

    expect(teams).toHaveLength(1)
    expect(teams[0].players[0]).toMatchObject({
      shirtNumber: null,
      spp: 0,
      nigglingInjuries: 0,
      isDead: false,
      extraSkills: [],
      statAdjustments: {},
    })
  })

  it('parses a versioned export package and merges it with direct same-origin teams', () => {
    const sharedTeam: TeamCreatorSavedTeamRecord = {
      id: 'team-exported',
      rosterTemplateId: 'orc',
      name: 'Exported Team',
      status: 'ACTIVE',
      players: [],
    }
    const directTeam: TeamCreatorSavedTeamRecord = {
      id: 'team-local',
      rosterTemplateId: 'amazon',
      name: 'Local Team',
      status: 'DRAFT',
      players: [],
    }
    const exportPackage = buildTeamCreatorExchangePackage([sharedTeam])

    expect(parseTeamCreatorExchangePackage(JSON.stringify(exportPackage))?.teams).toMatchObject([sharedTeam])

    const storage = {
      getItem(key: string) {
        if (key === 'blood-bowl-toolkit:block-dice:team-imports') {
          return JSON.stringify(exportPackage)
        }

        if (key === 'blood-bowl-toolkit:team-creator:teams') {
          return JSON.stringify([directTeam])
        }

        return null
      },
    } as Storage

    const teams = readAvailableTeamsForBlockDice(storage)

    expect(teams.map((team) => team.id)).toEqual(['team-exported', 'team-local'])
  })
})
