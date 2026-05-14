import type { BoardState, PlayerProfile } from '../../../shared/types/game'
import type { TargetPreview } from '../types/blockDice'
import { calculatePotentialBlockCandidates } from './calculatePotentialBlockCandidates'

export function calculateBestPotentialBlock(
  boardState: BoardState,
  profiles: PlayerProfile[],
  blockerId: string,
  targetId: string,
  invalidatedKeys: string[] = [],
): TargetPreview | null {
  const { bestCandidate } = calculatePotentialBlockCandidates(
    boardState,
    profiles,
    blockerId,
    targetId,
    invalidatedKeys,
  )

  if (!bestCandidate || !bestCandidate.calculation) {
    return null
  }

  return {
    blockerId,
    targetId,
    targetLabel: bestCandidate.calculation.target.label,
    diceLabel: bestCandidate.diceLabel ?? '1D',
    calculation: bestCandidate.calculation,
    attackPosition: bestCandidate.position,
    previewMode: 'BLITZ',
  }
}
