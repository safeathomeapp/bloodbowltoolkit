import { describe, expect, it } from 'vitest'
import type { BoardState, PlacedPlayer, PlayerProfile, Position, Skill, TeamSide } from '../../../shared/types/game'
import { buildPositionKey, calculatePotentialBlockCandidates } from '../rules/calculatePotentialBlockCandidates'

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

function buildState(players: ReturnType<typeof createPlayer>[]) {
  return {
    boardState: {
      placedPlayers: players.map((player) => player.placedPlayer),
      blockerId: null,
      targetId: null,
    } as BoardState,
    profiles: players.map((player) => player.profile),
  }
}

describe('calculatePotentialBlockCandidates', () => {
  it('returns valid and occupied candidate squares around a blitz target', () => {
    const blocker = createPlayer('A1', 'A', { row: 0, col: 0 })
    const target = createPlayer('B1', 'B', { row: 3, col: 3 })
    const occupier = createPlayer('A2', 'A', { row: 2, col: 2 })
    const { boardState, profiles } = buildState([blocker, target, occupier])

    const result = calculatePotentialBlockCandidates(boardState, profiles, 'A1', 'B1')

    expect(result.candidates).toHaveLength(8)
    expect(result.candidates.find((candidate) => candidate.key === '2,2')?.status).toBe('OCCUPIED')
    expect(result.preferredCandidate).not.toBeNull()
    expect(result.topTierCandidates.length).toBeGreaterThan(0)
  })

  it('excludes invalidated squares from preferred-candidate selection', () => {
    const blocker = createPlayer('A1', 'A', { row: 0, col: 0 })
    const target = createPlayer('B1', 'B', { row: 3, col: 3 })
    const assist = createPlayer('A2', 'A', { row: 2, col: 2 })
    const { boardState, profiles } = buildState([blocker, target, assist])

    const initial = calculatePotentialBlockCandidates(boardState, profiles, 'A1', 'B1')
    const initialBestKey = initial.preferredCandidate?.key
    expect(initialBestKey).toBeTruthy()

    const recalculated = calculatePotentialBlockCandidates(
      boardState,
      profiles,
      'A1',
      'B1',
      [initialBestKey as string],
    )

    expect(recalculated.candidates.find((candidate) => candidate.key === initialBestKey)?.status).toBe('INVALIDATED')
    expect(recalculated.preferredCandidate?.key).not.toBe(initialBestKey)
  })

  it('returns every equally optimal square in the top tier', () => {
    const blocker = createPlayer('A1', 'A', { row: 0, col: 0 })
    const target = createPlayer('B1', 'B', { row: 3, col: 3 })
    const { boardState, profiles } = buildState([blocker, target])

    const result = calculatePotentialBlockCandidates(boardState, profiles, 'A1', 'B1')

    expect(result.topTierCandidates).toHaveLength(8)
    expect(new Set(result.topTierCandidates.map((candidate) => candidate.diceLabel))).toEqual(new Set(['1D']))
  })

  it('creates stable position keys for candidate invalidation', () => {
    expect(buildPositionKey({ row: 4, col: 5 })).toBe('4,5')
  })
})
