import { describe, expect, it } from 'vitest'
import type { BoardState, PlacedPlayer, PlayerProfile, Position, Skill, TeamSide } from '../../../shared/types/game'
import { calculateAllTargetPreviews } from '../rules/calculateTargetPreviews'

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

describe('calculateAllTargetPreviews', () => {
  it('returns previews only for adjacent opposing players', () => {
    const blocker = createPlayer('A1', 'A', { row: 3, col: 3 })
    const adjacentEnemy = createPlayer('B1', 'B', { row: 3, col: 4 })
    const diagonalEnemy = createPlayer('B2', 'B', { row: 2, col: 2 })
    const distantEnemy = createPlayer('B3', 'B', { row: 0, col: 0 })
    const friendly = createPlayer('A2', 'A', { row: 2, col: 3 })
    const { boardState, profiles } = buildState([blocker, adjacentEnemy, diagonalEnemy, distantEnemy, friendly])

    const previews = calculateAllTargetPreviews(boardState, profiles, 'A1')

    expect(previews.map((preview) => preview.targetId).sort()).toEqual(['B1', 'B2'])
  })

  it('returns attacker-positive and defender-positive dice labels', () => {
    const attackerScenario = buildState([
      createPlayer('A1', 'A', { row: 3, col: 3 }, { strength: 3 }),
      createPlayer('B1', 'B', { row: 3, col: 4 }, { strength: 2 }),
    ])
    const defenderScenario = buildState([
      createPlayer('A1', 'A', { row: 3, col: 3 }, { strength: 3 }),
      createPlayer('B2', 'B', { row: 2, col: 3 }, { strength: 5 }),
    ])

    const attackerPreviews = calculateAllTargetPreviews(
      attackerScenario.boardState,
      attackerScenario.profiles,
      'A1',
    )
    const defenderPreviews = calculateAllTargetPreviews(
      defenderScenario.boardState,
      defenderScenario.profiles,
      'A1',
    )

    expect(attackerPreviews.find((preview) => preview.targetId === 'B1')?.diceLabel).toBe('2D')
    expect(defenderPreviews.find((preview) => preview.targetId === 'B2')?.diceLabel).toBe('-2D')
  })

  it('returns distant targets in blitz preview mode when a potential attack square exists', () => {
    const { boardState, profiles } = buildState([
      createPlayer('A1', 'A', { row: 0, col: 0 }, { strength: 3 }),
      createPlayer('B1', 'B', { row: 4, col: 4 }, { strength: 3 }),
    ])

    const previews = calculateAllTargetPreviews(boardState, profiles, 'A1', 'BLITZ')

    expect(previews).toHaveLength(1)
    expect(previews[0]?.previewMode).toBe('BLITZ')
    expect(previews[0]?.targetId).toBe('B1')
  })
})
