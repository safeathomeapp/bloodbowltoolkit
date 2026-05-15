import amazonTemplate from './amazon.json'
import darkElfTemplate from './dark-elf.json'
import dwarfTemplate from './dwarf.json'
import humanTemplate from './human.json'
import lizardmenTemplate from './lizardmen.json'
import orcTemplate from './orc.json'
import skavenTemplate from './skaven.json'
import woodElfTemplate from './wood-elf.json'

import type { RosterTemplate } from '../../shared/types/team'

type TemplateSeed = Omit<RosterTemplate, 'apothecary'> & {
  apothecary: string
}

function normalizeTemplate(template: TemplateSeed): RosterTemplate {
  return {
    ...template,
    apothecary: template.apothecary as RosterTemplate['apothecary'],
  }
}

export const rosterTemplates: RosterTemplate[] = [
  normalizeTemplate(amazonTemplate),
  normalizeTemplate(darkElfTemplate),
  normalizeTemplate(dwarfTemplate),
  normalizeTemplate(humanTemplate),
  normalizeTemplate(lizardmenTemplate),
  normalizeTemplate(orcTemplate),
  normalizeTemplate(skavenTemplate),
  normalizeTemplate(woodElfTemplate),
]
