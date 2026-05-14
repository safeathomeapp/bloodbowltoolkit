import type { BoardState, PlayerProfile, Position } from '../../../shared/types/game'
import type { BlockDiceCalculation, DiceChooser, TargetPreview } from '../types/blockDice'
import { calculateBlockDice } from './calculateBlockDice'

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

export function calculateBestPotentialBlock(
  boardState: BoardState,
  profiles: PlayerProfile[],
  blockerId: string,
  targetId: string,
): TargetPreview | null {
  const blocker = boardState.placedPlayers.find((player) => player.id === blockerId)
  const target = boardState.placedPlayers.find((player) => player.id === targetId)

  if (!blocker || !target) {
    return null
  }

  const candidateSquares = getAdjacentPositions(target.position)
    .filter(isWithinBoard)
    .filter((position) => !isSamePosition(position, blocker.position))
    .filter(
      (position) =>
        !boardState.placedPlayers.some(
          (player) => player.id !== blockerId && isSamePosition(player.position, position),
        ),
    )

  let best: { calculation: BlockDiceCalculation; attackPosition: Position } | null = null

  for (const position of candidateSquares) {
    const calculation = calculateBlockDice(
      {
        ...moveBlocker(boardState, blockerId, position),
        blockerId,
        targetId,
      },
      profiles,
    )

    if (!best || scoreCalculation(calculation.finalDice) > scoreCalculation(best.calculation.finalDice)) {
      best = {
        calculation,
        attackPosition: position,
      }
    }
  }

  if (!best) {
    return null
  }

  return {
    blockerId,
    targetId,
    targetLabel: best.calculation.target.label,
    diceLabel: toDiceLabel(best.calculation.finalDice.count, best.calculation.finalDice.chooser),
    calculation: best.calculation,
    attackPosition: best.attackPosition,
    previewMode: 'BLITZ',
  }
}
