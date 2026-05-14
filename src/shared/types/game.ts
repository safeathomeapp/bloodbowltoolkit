export type TeamSide = 'A' | 'B'

export type Skill = 'GUARD' | 'DEFENSIVE' | 'DAUNTLESS'

export interface Position {
  row: number
  col: number
}

export interface PlayerProfile {
  id: string
  number?: number
  name?: string
  strength: number
  skills: Skill[]
}

export interface PlacedPlayer {
  id: string
  profileId?: string
  teamSide: TeamSide
  position: Position
  isStanding: boolean
  hasTackleZone: boolean
}

export interface BoardState {
  placedPlayers: PlacedPlayer[]
  blockerId: string | null
  targetId: string | null
}
