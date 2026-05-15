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
  const { preferredCandidate } = calculatePotentialBlockCandidates(
    boardState,
    profiles,
    blockerId,
    targetId,
    invalidatedKeys,
  )

  if (!preferredCandidate || !preferredCandidate.calculation) {
    return null
  }

  return {
    blockerId,
    targetId,
    targetLabel: preferredCandidate.calculation.target.label,
    diceLabel: preferredCandidate.diceLabel ?? '1D',
    calculation: preferredCandidate.calculation,
    attackPosition: preferredCandidate.position,
    previewMode: 'BLITZ',
  }
}
