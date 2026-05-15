import { describe, expect, it } from 'vitest'
import { blockDiceTool } from '../index'

describe('blockDiceTool', () => {
  it('exposes the MVP tool metadata', () => {
    expect(blockDiceTool.id).toBe('block-dice')
    expect(blockDiceTool.name).toBe('Block Dice Calculator')
  })
})
