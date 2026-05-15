import { describe, expect, it } from 'vitest'

import type { BoardState, PlacedPlayer, Position, TeamSide } from '../../../shared/types/game'
import { getNextSelectionState } from '../components/getNextSelectionState'

function createPlayer(id: string, teamSide: TeamSide, position: Position): PlacedPlayer {
  return {
    id,
    teamSide,
    position,
    isStanding: true,
    hasTackleZone: true,
  }
}

describe('getNextSelectionState', () => {
  it('clears the selected blitz square when switching defender targets in blitz mode', () => {
    const attacker = createPlayer('A-1', 'A', { row: 3, col: 3 })
    const currentDefender = createPlayer('B-1', 'B', { row: 3, col: 4 })
    const nextDefender = createPlayer('B-2', 'B', { row: 4, col: 4 })
    const currentState: BoardState = {
      placedPlayers: [attacker, currentDefender, nextDefender],
      blockerId: attacker.id,
      targetId: currentDefender.id,
    }

    const nextState = getNextSelectionState({
      currentState,
      player: nextDefender,
      activeTeam: 'A',
      previewMode: 'BLITZ',
      selectedBlitzCandidateKey: '4:3',
    })

    expect(nextState.boardState.targetId).toBe(nextDefender.id)
    expect(nextState.selectedBlitzCandidateKey).toBeNull()
  })

  it('clears the selected blitz square when switching attacker selection', () => {
    const currentAttacker = createPlayer('A-1', 'A', { row: 3, col: 3 })
    const nextAttacker = createPlayer('A-2', 'A', { row: 2, col: 3 })
    const defender = createPlayer('B-1', 'B', { row: 3, col: 4 })
    const currentState: BoardState = {
      placedPlayers: [currentAttacker, nextAttacker, defender],
      blockerId: currentAttacker.id,
      targetId: defender.id,
    }

    const nextState = getNextSelectionState({
      currentState,
      player: nextAttacker,
      activeTeam: 'A',
      previewMode: 'BLITZ',
      selectedBlitzCandidateKey: '4:3',
    })

    expect(nextState.boardState.blockerId).toBe(nextAttacker.id)
    expect(nextState.boardState.targetId).toBeNull()
    expect(nextState.selectedBlitzCandidateKey).toBeNull()
  })
})
