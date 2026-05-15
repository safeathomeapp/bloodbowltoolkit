import amazonTemplate from './amazon.json'
import orcTemplate from './orc.json'

import type { RosterTemplate } from '../../shared/types/team'

function normalizeTemplate(template: typeof amazonTemplate): RosterTemplate {
  return {
    ...template,
    apothecary: template.apothecary as RosterTemplate['apothecary'],
  }
}

export const rosterTemplates: RosterTemplate[] = [
  normalizeTemplate(amazonTemplate),
  normalizeTemplate(orcTemplate),
]
