import type { Skill } from '../types/game'

export const TEAM_CREATOR_STORAGE_KEY = 'blood-bowl-toolkit:team-creator:teams'
export const TEAM_CREATOR_EXCHANGE_STORAGE_KEY = 'blood-bowl-toolkit:block-dice:team-imports'
export const TEAM_CREATOR_EXCHANGE_FORMAT = 'blood-bowl-toolkit-team-export'
export const TEAM_CREATOR_EXCHANGE_VERSION = 1

export interface TeamCreatorRosterTemplateRecord {
  id: string
  name: string
  positions: TeamCreatorPositionTemplateRecord[]
}

export interface TeamCreatorPositionTemplateRecord {
  id: string
  rosterTemplateId: string
  name: string
  role: string
  movement: number
  strength: number
  agility: string
  passing: string | null
  armour: string
  startingSkills: string[]
}

export interface TeamCreatorSavedTeamRecord {
  id: string
  rosterTemplateId: string
  name: string
  status: 'DRAFT' | 'ACTIVE' | 'RETIRED'
  players: TeamCreatorSavedPlayerRecord[]
}

export interface TeamCreatorSavedPlayerRecord {
  id: string
  teamId: string
  positionTemplateId: string
  name: string
  shirtNumber: number | null
  playerStatus?: 'ACTIVE' | 'SOLD' | 'DEAD' | 'RETIRED'
  currentValue: number
  spp: number
  nigglingInjuries: number
  isDead: boolean
  extraSkills: string[]
  statAdjustments: {
    movement?: number
    strength?: number
    agility?: number
    passing?: number
    armour?: number
  }
}

export interface ImportedBlockDicePlayer {
  id: string
  teamId: string
  teamName: string
  playerName: string
  shirtNumber: number | null
  rosterName: string
  positionName: string
  role: string
  movement: number
  strength: number
  agility: string
  passing: string | null
  armour: string
  allSkills: string[]
  blockDiceSkills: Skill[]
  currentValue: number
}

export interface ImportedBlockDiceTeam {
  id: string
  name: string
  rosterName: string
  players: ImportedBlockDicePlayer[]
}

export interface TeamCreatorExchangePackage {
  format: typeof TEAM_CREATOR_EXCHANGE_FORMAT
  version: typeof TEAM_CREATOR_EXCHANGE_VERSION
  exportedAt: string
  teams: TeamCreatorSavedTeamRecord[]
}
