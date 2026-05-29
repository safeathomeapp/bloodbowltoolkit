import type { RosterTemplate, SavedTeam, SavedTeamSummary } from '../types/team'

export interface TeamRepository {
  listTeams(): Promise<SavedTeamSummary[]>
  listCompetitionTeams(): Promise<SavedTeamSummary[]>
  getTeam(id: string): Promise<SavedTeam | null>
  saveTeam(team: SavedTeam): Promise<void>
  deleteTeam(id: string): Promise<void>
  listRosterTemplates(): Promise<RosterTemplate[]>
}
