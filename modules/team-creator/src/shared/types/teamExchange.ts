import type { SavedTeam } from './team'

export const TEAM_CREATOR_EXCHANGE_FORMAT = 'blood-bowl-toolkit-team-export'
export const TEAM_CREATOR_EXCHANGE_VERSION = 1

export interface TeamCreatorExchangePackage {
  format: typeof TEAM_CREATOR_EXCHANGE_FORMAT
  version: typeof TEAM_CREATOR_EXCHANGE_VERSION
  exportedAt: string
  teams: SavedTeam[]
}
