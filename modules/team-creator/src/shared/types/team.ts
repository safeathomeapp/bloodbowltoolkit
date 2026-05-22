export interface RosterTemplate {
  id: string
  name: string
  source: string
  leagues: string[]
  specialRules: string[]
  rerollCost: number
  apothecary: 'YES' | 'NO' | 'OPTIONAL'
  positions: PositionTemplate[]
}

export interface PositionTemplate {
  id: string
  rosterTemplateId: string
  name: string
  role: string
  minQty: number
  maxQty: number
  cost: number
  movement: number
  strength: number
  agility: string
  passing: string | null
  armour: string
  startingSkills: string[]
  primaryCategories: string[]
  secondaryCategories: string[]
  sharedLimitGroup?: string
  sharedLimitMax?: number
}

export interface SavedTeam {
  id: string
  rosterTemplateId: string
  name: string
  status: 'DRAFT' | 'ACTIVE' | 'RETIRED'
  draftBudget: number
  rerollCount: number
  assistantCoachCount: number
  cheerleaderCount: number
  dedicatedFans: number
  apothecaryPurchased: boolean
  createdAt: string
  updatedAt: string
  players: SavedTeamPlayer[]
}

export interface SavedTeamPlayer {
  id: string
  teamId: string
  positionTemplateId: string
  name: string
  shirtNumber: number | null
  playerStatus: 'ACTIVE' | 'SOLD' | 'DEAD' | 'RETIRED'
  currentValue: number
  spp: number
  nigglingInjuries: number
  missNextGame: boolean
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

export interface SavedTeamSummary {
  id: string
  rosterTemplateId: string
  name: string
  status: SavedTeam['status']
  playerCount: number
  totalValue: number
  updatedAt: string
}
