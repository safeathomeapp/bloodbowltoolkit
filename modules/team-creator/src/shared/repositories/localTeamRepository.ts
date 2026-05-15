import { rosterTemplates } from '../../data/rosterTemplates'
import { calculateTeamValue } from '../utils/teamMath'
import type { KeyValueStore } from '../storage/keyValueStore'
import type { RosterTemplate, SavedTeam, SavedTeamSummary } from '../types/team'
import type { TeamRepository } from './teamRepository'

const STORAGE_KEY = 'blood-bowl-toolkit:team-creator:teams'

function cloneTeam(team: SavedTeam) {
  return structuredClone(team)
}

function buildTemplateMap(templates: RosterTemplate[]) {
  return new Map(templates.map((template) => [template.id, template]))
}

export class LocalTeamRepository implements TeamRepository {
  private readonly templateMap = buildTemplateMap(rosterTemplates)
  private readonly store: KeyValueStore

  constructor(store: KeyValueStore) {
    this.store = store
  }

  async listTeams() {
    return this.listTeamsSync()
  }

  listTeamsSync() {
    const teams = this.readTeams()

    return teams
      .map<SavedTeamSummary>((team) => {
        const template = this.requireTemplate(team.rosterTemplateId)

        return {
          id: team.id,
          rosterTemplateId: team.rosterTemplateId,
          name: team.name,
          status: team.status,
          playerCount: team.players.length,
          totalValue: calculateTeamValue(team, template),
          updatedAt: team.updatedAt,
        }
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }

  async getTeam(id: string) {
    return this.getTeamSync(id)
  }

  getTeamSync(id: string) {
    const team = this.readTeams().find((entry) => entry.id === id)
    return team ? cloneTeam(team) : null
  }

  async saveTeam(team: SavedTeam) {
    this.requireTemplate(team.rosterTemplateId)

    const teams = this.readTeams()
    const existingIndex = teams.findIndex((entry) => entry.id === team.id)
    const persistedTeam = cloneTeam(team)

    if (existingIndex >= 0) {
      teams[existingIndex] = persistedTeam
    } else {
      teams.push(persistedTeam)
    }

    this.writeTeams(teams)
  }

  async deleteTeam(id: string) {
    const teams = this.readTeams().filter((entry) => entry.id !== id)
    this.writeTeams(teams)
  }

  async listRosterTemplates() {
    return this.listRosterTemplatesSync()
  }

  listRosterTemplatesSync() {
    return structuredClone(rosterTemplates)
  }

  private readTeams() {
    const rawValue = this.store.getItem(STORAGE_KEY)

    if (!rawValue) {
      return [] as SavedTeam[]
    }

    try {
      const parsedValue = JSON.parse(rawValue) as SavedTeam[]
      return Array.isArray(parsedValue) ? parsedValue : []
    } catch {
      return []
    }
  }

  private writeTeams(teams: SavedTeam[]) {
    this.store.setItem(STORAGE_KEY, JSON.stringify(teams))
  }

  private requireTemplate(templateId: string) {
    const template = this.templateMap.get(templateId)

    if (!template) {
      throw new Error(`Unknown roster template: ${templateId}`)
    }

    return template
  }
}
