import type { BoardState, PlayerProfile, Position } from '../../../shared/types/game'
import type {
  BlockDiceCalculation,
  DiceChooser,
  PotentialBlockCandidateResult,
} from '../types/blockDice'
import { calculateBlockDice } from './calculateBlockDice'

export function buildPositionKey(position: Position) {
  return `${position.row},${position.col}`
}

function getAdjacentPositions(position: Position) {
  const positions: Position[] = []

  for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
    for (let colOffset = -1; colOffset <= 1; colOffset += 1) {
      if (rowOffset === 0 && colOffset === 0) {
        continue
      }

      positions.push({
        row: position.row + rowOffset,
        col: position.col + colOffset,
      })
    }
  }

  return positions
}

function isWithinBoard(position: Position) {
  return position.row >= 0 && position.row < 7 && position.col >= 0 && position.col < 7
}

function isSamePosition(left: Position, right: Position) {
  return left.row === right.row && left.col === right.col
}

function toDiceLabel(count: number, chooser: DiceChooser) {
  if (chooser === 'ATTACKER') {
    return `${count}D`
  }

  if (chooser === 'DEFENDER') {
    return `-${count}D`
  }

  return '1D'
}

function scoreCalculation(finalDice: BlockDiceCalculation['finalDice']) {
  if (finalDice.chooser === 'ATTACKER') {
    return 100 + finalDice.count
  }

  if (finalDice.chooser === 'NONE') {
    return 50
  }

  return 10 - finalDice.count
}

function moveBlocker(boardState: BoardState, blockerId: string, position: Position): BoardState {
  return {
    ...boardState,
    placedPlayers: boardState.placedPlayers.map((player) =>
      player.id === blockerId ? { ...player, position } : player,
    ),
  }
}

export function calculatePotentialBlockCandidates(
  boardState: BoardState,
  profiles: PlayerProfile[],
  blockerId: string,
  targetId: string,
  invalidatedKeys: string[] = [],
): PotentialBlockCandidateResult {
  const blocker = boardState.placedPlayers.find((player) => player.id === blockerId)
  const target = boardState.placedPlayers.find((player) => player.id === targetId)

  if (!blocker || !target) {
    return {
      candidates: [],
      topTierCandidates: [],
      preferredCandidate: null,
    }
  }

  const candidates = getAdjacentPositions(target.position)
    .filter(isWithinBoard)
    .filter((position) => !isSamePosition(position, target.position))
    .map((position) => {
      const key = buildPositionKey(position)
      const occupiedByOtherPlayer = boardState.placedPlayers.some(
        (player) => player.id !== blockerId && isSamePosition(player.position, position),
      )

      if (occupiedByOtherPlayer) {
        return {
          key,
          position,
          status: 'OCCUPIED' as const,
          diceLabel: null,
          calculation: null,
        }
      }

      const calculation = calculateBlockDice(
        {
          ...moveBlocker(boardState, blockerId, position),
          blockerId,
          targetId,
        },
        profiles,
        { isBlitz: true },
      )

      return {
        key,
        position,
        status: invalidatedKeys.includes(key) ? ('INVALIDATED' as const) : ('VALID' as const),
        diceLabel: toDiceLabel(calculation.finalDice.count, calculation.finalDice.chooser),
        calculation,
      }
    })

  const rankedCandidates = candidates
    .filter((candidate) => candidate.status === 'VALID' && candidate.calculation)
    .map((candidate) => ({
      candidate,
      score: scoreCalculation(candidate.calculation!.finalDice),
    }))
    .sort((left, right) => right.score - left.score)

  const topScore = rankedCandidates[0]?.score ?? null
  const topTierCandidates =
    topScore === null
      ? []
      : rankedCandidates.filter((entry) => entry.score === topScore).map((entry) => entry.candidate)
  const preferredCandidate = rankedCandidates[0]?.candidate ?? null

  return {
    candidates,
    topTierCandidates,
    preferredCandidate,
  }
}
