import type { Position, TeamSide } from '../../../shared/types/game'

export type AssistType = 'OFFENSIVE' | 'DEFENSIVE'
export type AssistStatus = 'VALID' | 'CANCELLED' | 'INELIGIBLE'
export type DiceChooser = 'ATTACKER' | 'DEFENDER' | 'NONE'

export interface BlockParticipant {
  id: string
  label: string
  teamSide: TeamSide
  strength: number
  position: Position
}

export interface AssistDetail {
  playerId: string
  label: string
  teamSide: TeamSide
  type: AssistType
  status: AssistStatus
  reason: string
  usedGuard: boolean
  guardSuppressedByDefensive: boolean
  strengthModifier: number
}

export interface StrengthSummary {
  base: number
  assistModifier: number
  total: number
}

export interface FinalDiceSummary {
  count: number
  chooser: DiceChooser
  summary: string
}

export interface ExplanationSection {
  title: string
  entries: string[]
}

export interface BlockDiceCalculation {
  blocker: BlockParticipant
  target: BlockParticipant
  attackerStrength: StrengthSummary
  defenderStrength: StrengthSummary
  offensiveAssists: AssistDetail[]
  defensiveAssists: AssistDetail[]
  finalDice: FinalDiceSummary
  explanation: ExplanationSection[]
}

export interface TargetPreview {
  blockerId: string
  targetId: string
  targetLabel: string
  diceLabel: string
  calculation: BlockDiceCalculation
  attackPosition: Position
  previewMode: 'STANDARD' | 'BLITZ'
}

export type CandidateSquareStatus = 'VALID' | 'OCCUPIED' | 'INVALIDATED'

export interface CandidateAttackSquare {
  key: string
  position: Position
  status: CandidateSquareStatus
  diceLabel: string | null
  calculation: BlockDiceCalculation | null
}
