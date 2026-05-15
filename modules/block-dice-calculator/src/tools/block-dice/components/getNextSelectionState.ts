import type { BoardState, PlacedPlayer, Position, TeamSide } from '../../../shared/types/game'

export type PreviewMode = 'STANDARD' | 'BLITZ'

interface NextSelectionStateParams {
  currentState: BoardState
  player: PlacedPlayer
  activeTeam: TeamSide
  previewMode: PreviewMode
  selectedBlitzCandidateKey: string | null
}

interface NextSelectionStateResult {
  boardState: BoardState
  selectedBlitzCandidateKey: string | null
}

function isAdjacentPosition(a: Position, b: Position) {
  const rowDelta = Math.abs(a.row - b.row)
  const colDelta = Math.abs(a.col - b.col)

  return rowDelta <= 1 && colDelta <= 1 && (rowDelta !== 0 || colDelta !== 0)
}

export function getNextSelectionState({
  currentState,
  player,
  activeTeam,
  previewMode,
  selectedBlitzCandidateKey,
}: NextSelectionStateParams): NextSelectionStateResult {
  if (player.teamSide === activeTeam) {
    return {
      boardState: {
        ...currentState,
        blockerId: player.id,
        targetId: null,
      },
      selectedBlitzCandidateKey: null,
    }
  }

  const currentBlocker = currentState.placedPlayers.find((entry) => entry.id === currentState.blockerId)

  if (!currentBlocker || currentBlocker.teamSide !== activeTeam) {
    return {
      boardState: currentState,
      selectedBlitzCandidateKey,
    }
  }

  const previewIsAdjacent = isAdjacentPosition(currentBlocker.position, player.position)

  if (previewMode === 'STANDARD' && !previewIsAdjacent) {
    return {
      boardState: currentState,
      selectedBlitzCandidateKey,
    }
  }

  return {
    boardState: {
      ...currentState,
      targetId: player.id,
    },
    selectedBlitzCandidateKey: null,
  }
}
