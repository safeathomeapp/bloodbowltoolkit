import amazonTemplate from './amazon.json'
import blackOrcTemplate from './black-orc.json'
import darkElfTemplate from './dark-elf.json'
import dwarfTemplate from './dwarf.json'
import goblinTemplate from './goblin.json'
import halflingTemplate from './halfling.json'
import humanTemplate from './human.json'
import lizardmenTemplate from './lizardmen.json'
import ogreTemplate from './ogre.json'
import orcTemplate from './orc.json'
import skavenTemplate from './skaven.json'
import underworldDenizensTemplate from './underworld-denizens.json'
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
  normalizeTemplate(blackOrcTemplate),
  normalizeTemplate(darkElfTemplate),
  normalizeTemplate(dwarfTemplate),
  normalizeTemplate(goblinTemplate),
  normalizeTemplate(halflingTemplate),
  normalizeTemplate(humanTemplate),
  normalizeTemplate(lizardmenTemplate),
  normalizeTemplate(ogreTemplate),
  normalizeTemplate(orcTemplate),
  normalizeTemplate(skavenTemplate),
  normalizeTemplate(underworldDenizensTemplate),
  normalizeTemplate(woodElfTemplate),
]
