export interface SkillReference {
  id: string
  name: string
  type: 'ACTIVE' | 'PASSIVE'
  page: number
  excerpt: string
  aliases?: string[]
}
