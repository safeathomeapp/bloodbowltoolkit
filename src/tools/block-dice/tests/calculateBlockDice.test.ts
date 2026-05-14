import { describe, expect, it } from 'vitest'
import type { BoardState, PlacedPlayer, PlayerProfile, Position, Skill, TeamSide } from '../../../shared/types/game'
import { calculateBlockDice } from '../rules/calculateBlockDice'

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

function buildState(
  players: ReturnType<typeof createPlayer>[],
  blockerId: string,
  targetId: string,
): { boardState: BoardState; profiles: PlayerProfile[] } {
  return {
    boardState: {
      placedPlayers: players.map((player) => player.placedPlayer),
      blockerId,
      targetId,
    },
    profiles: players.map((player) => player.profile),
  }
}

describe('calculateBlockDice', () => {
  it('returns one die for equal strength', () => {
    const attacker = createPlayer('A1', 'A', { row: 3, col: 3 })
    const defender = createPlayer('B1', 'B', { row: 3, col: 4 })
    const { boardState, profiles } = buildState([attacker, defender], 'A1', 'B1')

    const result = calculateBlockDice(boardState, profiles)

    expect(result.attackerStrength.total).toBe(3)
    expect(result.defenderStrength.total).toBe(3)
    expect(result.finalDice.count).toBe(1)
    expect(result.finalDice.chooser).toBe('NONE')
    expect(result.explanation[0]?.title).toBe('Base')
    expect(result.explanation.at(-1)?.title).toBe('Final')
  })

  it('adds an offensive assist', () => {
    const attacker = createPlayer('A1', 'A', { row: 3, col: 3 })
    const defender = createPlayer('B1', 'B', { row: 3, col: 4 })
    const assister = createPlayer('A2', 'A', { row: 2, col: 4 })
    const { boardState, profiles } = buildState([attacker, defender, assister], 'A1', 'B1')

    const result = calculateBlockDice(boardState, profiles)

    expect(result.attackerStrength.total).toBe(4)
    expect(result.offensiveAssists.filter((assist) => assist.status === 'VALID')).toHaveLength(1)
    expect(result.finalDice.count).toBe(2)
    expect(result.finalDice.chooser).toBe('ATTACKER')
  })

  it('adds a defensive assist', () => {
    const attacker = createPlayer('A1', 'A', { row: 3, col: 3 })
    const defender = createPlayer('B1', 'B', { row: 3, col: 4 })
    const assister = createPlayer('B2', 'B', { row: 2, col: 3 })
    const { boardState, profiles } = buildState([attacker, defender, assister], 'A1', 'B1')

    const result = calculateBlockDice(boardState, profiles)

    expect(result.defenderStrength.total).toBe(4)
    expect(result.defensiveAssists.filter((assist) => assist.status === 'VALID')).toHaveLength(1)
    expect(result.finalDice.count).toBe(2)
    expect(result.finalDice.chooser).toBe('DEFENDER')
  })

  it('allows Guard to provide an assist while marked', () => {
    const attacker = createPlayer('A1', 'A', { row: 3, col: 3 })
    const defender = createPlayer('B1', 'B', { row: 3, col: 4 })
    const guardAssister = createPlayer('A2', 'A', { row: 2, col: 4 }, { skills: ['GUARD'] })
    const marker = createPlayer('B2', 'B', { row: 1, col: 4 })
    const { boardState, profiles } = buildState([attacker, defender, guardAssister, marker], 'A1', 'B1')

    const result = calculateBlockDice(boardState, profiles)
    const assist = result.offensiveAssists.find((entry) => entry.playerId === 'A2')

    expect(assist?.status).toBe('VALID')
    expect(assist?.usedGuard).toBe(true)
    expect(result.attackerStrength.total).toBe(4)
  })

  it('cancels an assist when the assister is marked', () => {
    const attacker = createPlayer('A1', 'A', { row: 3, col: 3 })
    const defender = createPlayer('B1', 'B', { row: 3, col: 4 })
    const assister = createPlayer('A2', 'A', { row: 2, col: 4 })
    const marker = createPlayer('B2', 'B', { row: 1, col: 4 })
    const { boardState, profiles } = buildState([attacker, defender, assister, marker], 'A1', 'B1')

    const result = calculateBlockDice(boardState, profiles)
    const assist = result.offensiveAssists.find((entry) => entry.playerId === 'A2')

    expect(assist?.status).toBe('CANCELLED')
    expect(result.attackerStrength.total).toBe(3)
  })

  it('ignores prone players for assists', () => {
    const attacker = createPlayer('A1', 'A', { row: 3, col: 3 })
    const defender = createPlayer('B1', 'B', { row: 3, col: 4 })
    const proneAssister = createPlayer('A2', 'A', { row: 2, col: 4 }, { isStanding: false, hasTackleZone: false })
    const { boardState, profiles } = buildState([attacker, defender, proneAssister], 'A1', 'B1')

    const result = calculateBlockDice(boardState, profiles)
    const assist = result.offensiveAssists.find((entry) => entry.playerId === 'A2')

    expect(assist?.status).toBe('INELIGIBLE')
    expect(result.attackerStrength.total).toBe(3)
  })

  it('ignores players without a tackle zone for assists', () => {
    const attacker = createPlayer('A1', 'A', { row: 3, col: 3 })
    const defender = createPlayer('B1', 'B', { row: 3, col: 4 })
    const noZoneAssister = createPlayer('A2', 'A', { row: 2, col: 4 }, { hasTackleZone: false })
    const { boardState, profiles } = buildState([attacker, defender, noZoneAssister], 'A1', 'B1')

    const result = calculateBlockDice(boardState, profiles)
    const assist = result.offensiveAssists.find((entry) => entry.playerId === 'A2')

    expect(assist?.status).toBe('INELIGIBLE')
    expect(result.attackerStrength.total).toBe(3)
  })

  it('suppresses Guard with Defensive and cancels the assist', () => {
    const attacker = createPlayer('A1', 'A', { row: 3, col: 3 })
    const defender = createPlayer('B1', 'B', { row: 3, col: 4 }, { skills: ['DEFENSIVE'] })
    const guardAssister = createPlayer('A2', 'A', { row: 2, col: 4 }, { skills: ['GUARD'] })
    const extraMarker = createPlayer('B2', 'B', { row: 1, col: 4 })
    const { boardState, profiles } = buildState([attacker, defender, guardAssister, extraMarker], 'A1', 'B1')

    const result = calculateBlockDice(boardState, profiles)
    const assist = result.offensiveAssists.find((entry) => entry.playerId === 'A2')

    expect(assist?.status).toBe('CANCELLED')
    expect(assist?.guardSuppressedByDefensive).toBe(true)
    expect(assist?.usedGuard).toBe(false)
  })

  it('excludes the blocker from being counted as an assist', () => {
    const attacker = createPlayer('A1', 'A', { row: 3, col: 3 })
    const defender = createPlayer('B1', 'B', { row: 3, col: 4 })
    const { boardState, profiles } = buildState([attacker, defender], 'A1', 'B1')

    const result = calculateBlockDice(boardState, profiles)

    expect(result.offensiveAssists).toHaveLength(0)
    expect(result.attackerStrength.assistModifier).toBe(0)
  })

  it('excludes the target from being counted as an assist', () => {
    const attacker = createPlayer('A1', 'A', { row: 3, col: 3 })
    const defender = createPlayer('B1', 'B', { row: 3, col: 4 })
    const { boardState, profiles } = buildState([attacker, defender], 'A1', 'B1')

    const result = calculateBlockDice(boardState, profiles)

    expect(result.defensiveAssists).toHaveLength(0)
    expect(result.defenderStrength.assistModifier).toBe(0)
  })

  it('recalculates after changing blocker', () => {
    const a1 = createPlayer('A1', 'A', { row: 3, col: 3 }, { strength: 3 })
    const a2 = createPlayer('A2', 'A', { row: 2, col: 4 }, { strength: 4 })
    const b1 = createPlayer('B1', 'B', { row: 3, col: 4 }, { strength: 3 })
    const b2 = createPlayer('B2', 'B', { row: 2, col: 3 }, { strength: 2 })
    const players = [a1, a2, b1, b2]
    const first = buildState(players, 'A1', 'B1')
    const second = buildState(players, 'A2', 'B2')

    const firstResult = calculateBlockDice(first.boardState, first.profiles)
    const secondResult = calculateBlockDice(second.boardState, second.profiles)

    expect(firstResult.attackerStrength.total).not.toBe(secondResult.attackerStrength.total)
    expect(firstResult.finalDice.summary).not.toBe(secondResult.finalDice.summary)
  })

  it('recalculates after moving a token', () => {
    const attacker = createPlayer('A1', 'A', { row: 3, col: 3 })
    const defender = createPlayer('B1', 'B', { row: 3, col: 4 })
    const assister = createPlayer('A2', 'A', { row: 2, col: 4 })
    const first = buildState([attacker, defender, assister], 'A1', 'B1')
    const movedAssister = createPlayer('A2', 'A', { row: 0, col: 0 })
    const second = buildState([attacker, defender, movedAssister], 'A1', 'B1')

    const firstResult = calculateBlockDice(first.boardState, first.profiles)
    const secondResult = calculateBlockDice(second.boardState, second.profiles)

    expect(firstResult.attackerStrength.total).toBe(4)
    expect(secondResult.attackerStrength.total).toBe(3)
  })

  it('uses the player strength when Dauntless is not enabled', () => {
    const attacker = createPlayer('A1', 'A', { row: 3, col: 3 }, { strength: 3 })
    const defender = createPlayer('B1', 'B', { row: 3, col: 4 }, { strength: 5 })
    const { boardState, profiles } = buildState([attacker, defender], 'A1', 'B1')

    const result = calculateBlockDice(boardState, profiles)

    expect(result.attackerStrength.base).toBe(3)
    expect(result.attackerStrength.total).toBe(3)
    expect(result.finalDice.chooser).toBe('DEFENDER')
  })

  it('matches the target strength when Dauntless is enabled', () => {
    const attacker = createPlayer('A1', 'A', { row: 3, col: 3 }, { strength: 3, skills: ['DAUNTLESS'] })
    const defender = createPlayer('B1', 'B', { row: 3, col: 4 }, { strength: 5 })
    const { boardState, profiles } = buildState([attacker, defender], 'A1', 'B1')

    const result = calculateBlockDice(boardState, profiles)

    expect(result.attackerStrength.base).toBe(5)
    expect(result.attackerStrength.total).toBe(5)
    expect(result.finalDice.chooser).toBe('NONE')
    expect(result.explanation[0]?.entries).toContain('A1 uses temporary Dauntless and matches B1 at ST 5.')
  })

  it('does not apply Horns outside a blitz', () => {
    const attacker = createPlayer('A1', 'A', { row: 3, col: 3 }, { strength: 3, skills: ['HORNS'] })
    const defender = createPlayer('B1', 'B', { row: 3, col: 4 }, { strength: 4 })
    const { boardState, profiles } = buildState([attacker, defender], 'A1', 'B1')

    const result = calculateBlockDice(boardState, profiles, { isBlitz: false })

    expect(result.attackerStrength.base).toBe(3)
    expect(result.attackerStrength.total).toBe(3)
    expect(result.finalDice.chooser).toBe('DEFENDER')
  })

  it('applies Horns during a blitz', () => {
    const attacker = createPlayer('A1', 'A', { row: 3, col: 3 }, { strength: 3, skills: ['HORNS'] })
    const defender = createPlayer('B1', 'B', { row: 3, col: 4 }, { strength: 4 })
    const { boardState, profiles } = buildState([attacker, defender], 'A1', 'B1')

    const result = calculateBlockDice(boardState, profiles, { isBlitz: true })

    expect(result.attackerStrength.base).toBe(3)
    expect(result.attackerStrength.total).toBe(4)
    expect(result.finalDice.chooser).toBe('NONE')
    expect(result.explanation[0]?.entries).toContain('A1 gains +1 ST from Horns because this block is part of a blitz.')
  })
})
