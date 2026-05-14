import type { BoardState, PlayerProfile, Position } from '../../../shared/types/game'
import type { TargetPreview } from '../types/blockDice'
import { calculateBestPotentialBlock } from './calculateBestPotentialBlock'
import { calculateBlockDice } from './calculateBlockDice'

function isAdjacent(left: Position, right: Position) {
  const rowDelta = Math.abs(left.row - right.row)
  const colDelta = Math.abs(left.col - right.col)
  return (rowDelta > 0 || colDelta > 0) && rowDelta <= 1 && colDelta <= 1
}

function toDiceLabel(count: number, chooser: 'ATTACKER' | 'DEFENDER' | 'NONE') {
  if (chooser === 'ATTACKER') {
    return `${count}D`
  }

  if (chooser === 'DEFENDER') {
    return `-${count}D`
  }

  return '1D'
}

export function calculateAllTargetPreviews(
  boardState: BoardState,
  profiles: PlayerProfile[],
  blockerId: string,
  previewMode: 'STANDARD' | 'BLITZ' = 'STANDARD',
): TargetPreview[] {
  const blocker = boardState.placedPlayers.find((player) => player.id === blockerId)

  if (!blocker) {
    return []
  }

  if (previewMode === 'BLITZ') {
    return boardState.placedPlayers
      .filter((player) => player.teamSide !== blocker.teamSide)
      .map((target) => calculateBestPotentialBlock(boardState, profiles, blockerId, target.id))
      .filter((preview): preview is TargetPreview => preview !== null)
  }

  return boardState.placedPlayers
    .filter((player) => player.teamSide !== blocker.teamSide)
    .filter((player) => isAdjacent(blocker.position, player.position))
    .map((target) => {
      const calculation = calculateBlockDice(
        {
          ...boardState,
          blockerId,
          targetId: target.id,
        },
        profiles,
      )

      return {
        blockerId,
        targetId: target.id,
        targetLabel: calculation.target.label,
        diceLabel: toDiceLabel(calculation.finalDice.count, calculation.finalDice.chooser),
        calculation,
        attackPosition: blocker.position,
        previewMode: 'STANDARD',
      }
    })
}
