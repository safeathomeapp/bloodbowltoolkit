import { describe, expect, it } from 'vitest'

import { rosterTemplates } from '../../../data/rosterTemplates'

const validCategoryCodes = new Set(['A', 'D', 'G', 'M', 'P', 'S'])

describe('roster template seeds', () => {
  it('keeps roster and position identifiers unique', () => {
    const rosterIds = new Set<string>()
    const positionIds = new Set<string>()

    for (const template of rosterTemplates) {
      expect(rosterIds.has(template.id)).toBe(false)
      rosterIds.add(template.id)

      for (const position of template.positions) {
        expect(positionIds.has(position.id)).toBe(false)
        positionIds.add(position.id)
      }
    }
  })

  it('keeps each position aligned with its parent roster and valid quantity bounds', () => {
    for (const template of rosterTemplates) {
      for (const position of template.positions) {
        expect(position.rosterTemplateId).toBe(template.id)
        expect(position.minQty).toBeGreaterThanOrEqual(0)
        expect(position.maxQty).toBeGreaterThanOrEqual(position.minQty)
        expect(position.cost).toBeGreaterThan(0)
      }
    }
  })

  it('uses only known category codes when categories are present', () => {
    for (const template of rosterTemplates) {
      for (const position of template.positions) {
        for (const category of position.primaryCategories) {
          expect(validCategoryCodes.has(category)).toBe(true)
        }

        for (const category of position.secondaryCategories) {
          expect(validCategoryCodes.has(category)).toBe(true)
        }
      }
    }
  })

  it('keeps shared-limit groups internally consistent', () => {
    for (const template of rosterTemplates) {
      const positionsBySharedGroup = new Map<string, typeof template.positions>()

      for (const position of template.positions) {
        if (!position.sharedLimitGroup) {
          expect(position.sharedLimitMax).toBeUndefined()
          continue
        }

        expect(position.sharedLimitMax).toBeDefined()

        const existingPositions = positionsBySharedGroup.get(position.sharedLimitGroup) ?? []
        existingPositions.push(position)
        positionsBySharedGroup.set(position.sharedLimitGroup, existingPositions)
      }

      for (const positions of positionsBySharedGroup.values()) {
        expect(positions.length).toBeGreaterThan(1)

        const sharedLimitMax = positions[0].sharedLimitMax
        expect(sharedLimitMax).toBeDefined()

        for (const position of positions) {
          expect(position.sharedLimitMax).toBe(sharedLimitMax)
        }
      }
    }
  })

  it('keeps the uploaded screenshot set represented in the seeded roster list', () => {
    expect(rosterTemplates.length).toBeGreaterThanOrEqual(29)
  })
})
