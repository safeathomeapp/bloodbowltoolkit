import { describe, expect, it } from 'vitest'
import type { BoardState, PlacedPlayer, PlayerProfile, Position, Skill, TeamSide } from '../../../shared/types/game'
import { calculateBestPotentialBlock } from '../rules/calculateBestPotentialBlock'

function createPlayer(
  id: string,
  teamSide: TeamSide,
  position: Position,
  options: {
    strength?: number
    skills?: Skill[]
    isStanding?: boolean
    hasTackleZone?: boolean
  } = {},
) {
  const profileId = `profile-${id}`
  const profile: PlayerProfile = {
    id: profileId,
    name: id,
    strength: options.strength ?? 3,
    skills: options.skills ?? [],
  }
  const placedPlayer: PlacedPlayer = {
    id,
    profileId,
    teamSide,
    position,
    isStanding: options.isStanding ?? true,
    hasTackleZone: options.hasTackleZone ?? true,
  }

  return { profile, placedPlayer }
}

function buildState(players: ReturnType<typeof createPlayer>[]): { boardState: BoardState; profiles: PlayerProfile[] } {
  return {
    boardState: {
      placedPlayers: players.map((player) => player.placedPlayer),
      blockerId: null,
      targetId: null,
    },
    profiles: players.map((player) => player.profile),
  }
}

describe('calculateBestPotentialBlock', () => {
  it('finds a potential blitz result for a non-adjacent target', () => {
    const blocker = createPlayer('A1', 'A', { row: 0, col: 0 }, { strength: 3 })
    const target = createPlayer('B1', 'B', { row: 3, col: 3 }, { strength: 3 })
    const assist = createPlayer('A2', 'A', { row: 2, col: 2 }, { strength: 3 })
    const { boardState, profiles } = buildState([blocker, target, assist])

    const preview = calculateBestPotentialBlock(boardState, profiles, 'A1', 'B1')

    expect(preview).not.toBeNull()
    expect(preview?.previewMode).toBe('BLITZ')
    expect(preview?.targetId).toBe('B1')
    expect(preview?.diceLabel).toBe('2D')
  })

  it('applies Horns when scoring blitz preview candidates', () => {
    const blocker = createPlayer('A1', 'A', { row: 0, col: 0 }, { strength: 3, skills: ['HORNS'] })
    const target = createPlayer('B1', 'B', { row: 3, col: 3 }, { strength: 4 })
    const { boardState, profiles } = buildState([blocker, target])

    const preview = calculateBestPotentialBlock(boardState, profiles, 'A1', 'B1')

    expect(preview).not.toBeNull()
    expect(preview?.diceLabel).toBe('1D')
    expect(preview?.calculation.attackerStrength.base).toBe(4)
  })

  it('applies Dauntless after Horns when scoring blitz preview candidates', () => {
    const blocker = createPlayer('A1', 'A', { row: 0, col: 0 }, { strength: 3, skills: ['DAUNTLESS', 'HORNS'] })
    const target = createPlayer('B1', 'B', { row: 3, col: 3 }, { strength: 5 })
    const { boardState, profiles } = buildState([blocker, target])

    const preview = calculateBestPotentialBlock(boardState, profiles, 'A1', 'B1')

    expect(preview).not.toBeNull()
    expect(preview?.diceLabel).toBe('1D')
    expect(preview?.calculation.attackerStrength.base).toBe(5)
  })

  it('returns null when all adjacent attack squares are occupied', () => {
    const blocker = createPlayer('A1', 'A', { row: 0, col: 0 }, { strength: 3 })
    const target = createPlayer('B1', 'B', { row: 3, col: 3 }, { strength: 3 })
    const occupiers = [
      createPlayer('A2', 'A', { row: 2, col: 2 }),
      createPlayer('A3', 'A', { row: 2, col: 3 }),
      createPlayer('A4', 'A', { row: 2, col: 4 }),
      createPlayer('A5', 'A', { row: 3, col: 2 }),
      createPlayer('A6', 'A', { row: 3, col: 4 }),
      createPlayer('A7', 'A', { row: 4, col: 2 }),
      createPlayer('A8', 'A', { row: 4, col: 3 }),
      createPlayer('A9', 'A', { row: 4, col: 4 }),
    ]
    const { boardState, profiles } = buildState([blocker, target, ...occupiers])

    const preview = calculateBestPotentialBlock(boardState, profiles, 'A1', 'B1')

    expect(preview).toBeNull()
  })

  it('returns null when every valid candidate is invalidated', () => {
    const blocker = createPlayer('A1', 'A', { row: 0, col: 0 }, { strength: 3 })
    const target = createPlayer('B1', 'B', { row: 3, col: 3 }, { strength: 3 })
    const { boardState, profiles } = buildState([blocker, target])

    const preview = calculateBestPotentialBlock(
      boardState,
      profiles,
      'A1',
      'B1',
      ['2,2', '2,3', '2,4', '3,2', '3,4', '4,2', '4,3', '4,4'],
    )

    expect(preview).toBeNull()
  })
})
