import type { Skill } from '../types/game'
import {
  type ImportedBlockDiceTeam,
  type TeamCreatorRosterTemplateRecord,
  type TeamCreatorSavedTeamRecord,
} from './teamImport'

const SUPPORTED_BLOCK_DICE_SKILLS: Skill[] = ['GUARD', 'DEFENSIVE', 'DAUNTLESS', 'HORNS']

function applyNumericAdjustment(baseValue: number, adjustment?: number) {
  return typeof adjustment === 'number' ? baseValue + adjustment : baseValue
}

function mapBlockDiceSkills(skills: string[]): Skill[] {
  return skills
    .map((skill) => skill.toUpperCase())
    .filter((skill): skill is Skill => SUPPORTED_BLOCK_DICE_SKILLS.includes(skill as Skill))
}

export function buildRosterTemplateMap(templates: TeamCreatorRosterTemplateRecord[]) {
  return new Map(templates.map((template) => [template.id, template]))
}

export function resolveImportedTeam(
  savedTeam: TeamCreatorSavedTeamRecord,
  templateMap: Map<string, TeamCreatorRosterTemplateRecord>,
): ImportedBlockDiceTeam {
  const template = templateMap.get(savedTeam.rosterTemplateId)

  if (!template) {
    throw new Error(`Missing roster template for saved team ${savedTeam.id}`)
  }

  return {
    id: savedTeam.id,
    name: savedTeam.name,
    rosterName: template.name,
    players: savedTeam.players.flatMap((player, index) => {
      const position = template.positions.find((entry) => entry.id === player.positionTemplateId)

      if (!position) {
        return []
      }

      const allSkills = [...position.startingSkills, ...player.extraSkills]
      const shirtNumber = player.shirtNumber ?? index + 1

      return [
        {
          id: player.id,
          teamId: savedTeam.id,
          teamName: savedTeam.name,
          playerName: player.name,
          shirtNumber,
          rosterName: template.name,
          positionName: position.name,
          role: position.role,
          movement: applyNumericAdjustment(position.movement, player.statAdjustments.movement),
          strength: applyNumericAdjustment(position.strength, player.statAdjustments.strength),
          agility: position.agility,
          passing: position.passing,
          armour: position.armour,
          allSkills,
          blockDiceSkills: mapBlockDiceSkills(allSkills),
          currentValue: player.currentValue,
        },
      ]
    }),
  }
}
