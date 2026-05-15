import amazonTemplate from './amazon.json'
import blackOrcTemplate from './black-orc.json'
import bretonnianTemplate from './bretonnian.json'
import chaosChosenTemplate from './chaos-chosen.json'
import chaosDwarfTemplate from './chaos-dwarf.json'
import chaosRenegadeTemplate from './chaos-renegade.json'
import darkElfTemplate from './dark-elf.json'
import dwarfTemplate from './dwarf.json'
import elvenUnionTemplate from './elven-union.json'
import gnomeTemplate from './gnome.json'
import goblinTemplate from './goblin.json'
import halflingTemplate from './halfling.json'
import humanTemplate from './human.json'
import imperialNobilityTemplate from './imperial-nobility.json'
import khorneTemplate from './khorne.json'
import lizardmenTemplate from './lizardmen.json'
import necromanticHorrorTemplate from './necromantic-horror.json'
import norseTemplate from './norse.json'
import nurgleTemplate from './nurgle.json'
import ogreTemplate from './ogre.json'
import oldWorldAllianceTemplate from './old-world-alliance.json'
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
  normalizeTemplate(bretonnianTemplate),
  normalizeTemplate(chaosChosenTemplate),
  normalizeTemplate(chaosDwarfTemplate),
  normalizeTemplate(chaosRenegadeTemplate),
  normalizeTemplate(darkElfTemplate),
  normalizeTemplate(dwarfTemplate),
  normalizeTemplate(elvenUnionTemplate),
  normalizeTemplate(gnomeTemplate),
  normalizeTemplate(goblinTemplate),
  normalizeTemplate(halflingTemplate),
  normalizeTemplate(humanTemplate),
  normalizeTemplate(imperialNobilityTemplate),
  normalizeTemplate(khorneTemplate),
  normalizeTemplate(lizardmenTemplate),
  normalizeTemplate(necromanticHorrorTemplate),
  normalizeTemplate(norseTemplate),
  normalizeTemplate(nurgleTemplate),
  normalizeTemplate(ogreTemplate),
  normalizeTemplate(oldWorldAllianceTemplate),
  normalizeTemplate(orcTemplate),
  normalizeTemplate(skavenTemplate),
  normalizeTemplate(underworldDenizensTemplate),
  normalizeTemplate(woodElfTemplate),
]
