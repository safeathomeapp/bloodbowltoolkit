import { useEffect, useMemo, useState } from 'react'

import styles from './TeamCreator.module.css'
import { getSkillReference } from '../../../data/skillReferences'
import {
  CompetitionClient,
  type CompetitionDetail,
  type CompetitionSubmissionDetail,
} from '../../../shared/api/competitionClient'
import { resolveTeamRepositorySelection } from '../../../shared/repositories/createTeamRepository'
import { BrowserLocalStorageStore } from '../../../shared/storage/keyValueStore'
import {
  TEAM_CREATOR_EXCHANGE_FORMAT,
  TEAM_CREATOR_EXCHANGE_VERSION,
  type TeamCreatorExchangePackage,
} from '../../../shared/types/teamExchange'
import {
  calculateApothecaryValue,
  calculateAssistantCoachValue,
  calculateCheerleaderValue,
  calculateDedicatedFansValue,
  calculatePlayerValue,
  calculateRerollValue,
  calculateTeamValue,
  calculateTreasury,
  countPlayersByPosition,
  countPlayersInSharedGroup,
  getDraftWarnings,
} from '../../../shared/utils/teamMath'
import type { SkillReference } from '../../../shared/types/skillReference'
import type { RosterTemplate, SavedTeam, SavedTeamSummary } from '../../../shared/types/team'
import { createTeam, createTeamPlayer } from '../utils/teamFactory'

type ReferenceModalContent = {
  title: string
  type: string
  excerpt: string
  page: number
}

type CompetitionCreateFormState = {
  name: string
  description: string
  maxEntrants: string
  submissionDeadline: string
  allowUnofficialRosters: boolean
}

const repositorySelection = resolveTeamRepositorySelection()
const repository = repositorySelection.repository
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim() ?? ''
const competitionClient =
  typeof window !== 'undefined' && repositorySelection.mode === 'api' && apiBaseUrl
    ? new CompetitionClient({
        baseUrl: apiBaseUrl,
        store: new BrowserLocalStorageStore(window.localStorage),
      })
    : null

function formatGold(value: number) {
  return value.toLocaleString('en-GB')
}

function formatCategories(categories: string[]) {
  return categories.length > 0 ? categories.join('') : '-'
}

function formatPositionLabel(position: Pick<RosterTemplate['positions'][number], 'name' | 'role'>) {
  return `${position.name} (${position.role})`
}

function toReferenceModalContent(reference: SkillReference): ReferenceModalContent {
  return {
    title: reference.name,
    type: reference.type,
    excerpt: reference.excerpt,
    page: reference.page,
  }
}

function findPosition(template: RosterTemplate, positionId: string) {
  return template.positions.find((position) => position.id === positionId) ?? null
}

function getRemainingSlots(team: SavedTeam, template: RosterTemplate, positionId: string) {
  const counts = countPlayersByPosition(team)
  const position = findPosition(template, positionId)

  if (!position) {
    return 0
  }

  const positionRemaining = position.maxQty - (counts[positionId] ?? 0)

  if (!position.sharedLimitGroup || position.sharedLimitMax === undefined) {
    return Math.max(0, positionRemaining)
  }

  const sharedRemaining = position.sharedLimitMax - countPlayersInSharedGroup(team, template, position)
  return Math.max(0, Math.min(positionRemaining, sharedRemaining))
}

export function TeamCreator() {
  const [templates, setTemplates] = useState<RosterTemplate[]>([])
  const [teams, setTeams] = useState<SavedTeamSummary[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [libraryView, setLibraryView] = useState<'CREATE' | 'LOAD' | 'COMPETITIONS'>('CREATE')
  const [activeTeam, setActiveTeam] = useState<SavedTeam | null>(null)
  const [selectedPositionId, setSelectedPositionId] = useState('')
  const [activeReference, setActiveReference] = useState<ReferenceModalContent | null>(null)
  const [feedback, setFeedback] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [competitions, setCompetitions] = useState<CompetitionDetail[]>([])
  const [competitionSubmissionDetails, setCompetitionSubmissionDetails] = useState<
    Record<string, CompetitionSubmissionDetail>
  >({})
  const [isCompetitionLoading, setIsCompetitionLoading] = useState(false)
  const [competitionUserId, setCompetitionUserId] = useState('')
  const [competitionForm, setCompetitionForm] = useState<CompetitionCreateFormState>({
    name: '',
    description: '',
    maxEntrants: '8',
    submissionDeadline: '',
    allowUnofficialRosters: false,
  })
  const [selectedCompetitionTeamIds, setSelectedCompetitionTeamIds] = useState<Record<string, string>>({})
  const [selectedCompetitionTierIds, setSelectedCompetitionTierIds] = useState<Record<string, string>>({})

  const draftRuleReferences: Record<string, ReferenceModalContent> = {
    rerolls: {
      title: 'Team Re-rolls',
      type: 'DRAFTING RULE',
      page: 90,
      excerpt:
        'Teams may buy Team Re-rolls during drafting up to the roster maximum. In League Play, buying one later costs double its usual amount and still counts at its normal value toward Team Value.',
    },
    assistantCoaches: {
      title: 'Assistant Coaches',
      type: 'DRAFTING RULE',
      page: 90,
      excerpt:
        'A team may hire up to 6 Assistant Coaches at 10,000 gold pieces each. They benefit the team during Brilliant Coaching results on the Kick-off Event table.',
    },
    cheerleaders: {
      title: 'Cheerleaders',
      type: 'DRAFTING RULE',
      page: 90,
      excerpt:
        'A team may hire up to 6 Cheerleaders at 10,000 gold pieces each. They benefit the team during Cheering Fans results on the Kick-off Event table.',
    },
    apothecary: {
      title: 'Apothecary',
      type: 'DRAFTING RULE',
      page: 90,
      excerpt:
        'Most teams may hire a single Apothecary for 50,000 gold pieces if their roster allows one. The Apothecary can attempt to patch up an injured player during the game.',
    },
    dedicatedFans: {
      title: 'Dedicated Fans',
      type: 'DRAFTING RULE',
      page: 91,
      excerpt:
        'A team starts with Dedicated Fans 1 automatically. During drafting, you may increase Dedicated Fans up to a maximum of 7 by paying 5,000 gold pieces per point improved.',
    },
  }

  const activeTemplate = useMemo(
    () => templates.find((template) => template.id === activeTeam?.rosterTemplateId) ?? null,
    [activeTeam?.rosterTemplateId, templates],
  )

  const teamCounts = useMemo(() => (activeTeam ? countPlayersByPosition(activeTeam) : {}), [activeTeam])
  const selectablePositions = useMemo(() => {
    if (!activeTeam || !activeTemplate) {
      return []
    }

    return activeTemplate.positions.filter(
      (position) => getRemainingSlots(activeTeam, activeTemplate, position.id) > 0,
    )
  }, [activeTeam, activeTemplate])

  const effectiveSelectedPositionId =
    selectedPositionId && selectablePositions.some((position) => position.id === selectedPositionId)
      ? selectedPositionId
      : (selectablePositions[0]?.id ?? '')

  const selectedPosition = useMemo(() => {
    if (!activeTemplate || !effectiveSelectedPositionId) {
      return null
    }

    return findPosition(activeTemplate, effectiveSelectedPositionId)
  }, [activeTemplate, effectiveSelectedPositionId])

  const activeTemplatePlayerLimit = useMemo(() => {
    if (!activeTemplate) {
      return 0
    }

    return activeTemplate.positions.reduce((total, position) => total + position.maxQty, 0)
  }, [activeTemplate])

  const draftWarnings = useMemo(() => {
    if (!activeTeam || !activeTemplate) {
      return []
    }

    return getDraftWarnings(activeTeam, activeTemplate)
  }, [activeTeam, activeTemplate])

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedTemplateId) ?? templates[0] ?? null,
    [selectedTemplateId, templates],
  )

  useEffect(() => {
    let isDisposed = false

    async function loadInitialState() {
      setIsLoading(true)

      try {
        const nextTemplates = await repository.listRosterTemplates()

        if (isDisposed) {
          return
        }

        setTemplates(nextTemplates)
        setSelectedTemplateId((currentSelectedTemplateId) =>
          currentSelectedTemplateId && nextTemplates.some((template) => template.id === currentSelectedTemplateId)
            ? currentSelectedTemplateId
            : (nextTemplates[0]?.id ?? ''),
        )

        const nextTeams = await repository.listTeams()
        const nextCompetitions =
          competitionClient ? await competitionClient.listCompetitions() : []

        if (isDisposed) {
          return
        }

        setTeams(nextTeams)
        setCompetitions([])
        setCompetitionSubmissionDetails({})
        setSelectedCompetitionTeamIds({})
        setSelectedCompetitionTierIds({})

        if (competitionClient) {
          const competitionDetails = await Promise.all(
            nextCompetitions.map(async (competition) => competitionClient.getCompetition(competition.id)),
          )

          if (isDisposed) {
            return
          }

          const resolvedCompetitions = competitionDetails.filter(
            (competition): competition is CompetitionDetail => Boolean(competition),
          )
          const nextSubmissionDetails: Record<string, CompetitionSubmissionDetail> = {}
          const nextTeamSelections: Record<string, string> = {}
          const nextTierSelections: Record<string, string> = {}
          const currentUserId = await competitionClient.ensureUserId()

          for (const competition of resolvedCompetitions) {
            const currentEntry = competition.entries.find((entry) => entry.userId === currentUserId) ?? null

            if (currentEntry?.submission) {
              const payload = await competitionClient.getSubmission(competition.id, currentEntry.id)

              if (payload) {
                nextSubmissionDetails[competition.id] = payload.submission
                nextTeamSelections[competition.id] = payload.submission.sourceTeamId ?? ''
                nextTierSelections[competition.id] = payload.submission.tierId ?? ''
              }
            }
          }

          if (isDisposed) {
            return
          }

          setCompetitions(resolvedCompetitions)
          setCompetitionSubmissionDetails(nextSubmissionDetails)
          setSelectedCompetitionTeamIds(nextTeamSelections)
          setSelectedCompetitionTierIds(nextTierSelections)
          setCompetitionUserId(currentUserId)
        }

        setFeedback('')
      } catch (error) {
        if (!isDisposed) {
          const nextMessage =
            error instanceof Error
              ? `Repository load failed: ${error.message}`
              : 'Teams could not be loaded from the current repository.'

          setFeedback(nextMessage)
        }
      } finally {
        if (!isDisposed) {
          setIsLoading(false)
        }
      }
    }

    void loadInitialState()

    return () => {
      isDisposed = true
    }
  }, [])

  async function refreshState() {
    const nextTemplates = await repository.listRosterTemplates()
    const nextTeams = await repository.listTeams()

    setTemplates(nextTemplates)
    setTeams(nextTeams)
    setSelectedTemplateId((currentSelectedTemplateId) =>
      currentSelectedTemplateId && nextTemplates.some((template) => template.id === currentSelectedTemplateId)
        ? currentSelectedTemplateId
        : (nextTemplates[0]?.id ?? ''),
    )
    setFeedback('')
  }

  async function refreshCompetitionState() {
    if (!competitionClient) {
      setCompetitions([])
      setCompetitionSubmissionDetails({})
      setCompetitionUserId('')
      return
    }

    setIsCompetitionLoading(true)

    try {
      const [competitionSummaries, currentUserId] = await Promise.all([
        competitionClient.listCompetitions(),
        competitionClient.ensureUserId(),
      ])
      const competitionDetails = await Promise.all(
        competitionSummaries.map(async (competition) => competitionClient.getCompetition(competition.id)),
      )
      const resolvedCompetitions = competitionDetails.filter(
        (competition): competition is CompetitionDetail => Boolean(competition),
      )
      const nextSubmissionDetails: Record<string, CompetitionSubmissionDetail> = {}
      const nextTeamSelections: Record<string, string> = {}
      const nextTierSelections: Record<string, string> = {}

      for (const competition of resolvedCompetitions) {
        const currentEntry = competition.entries.find((entry) => entry.userId === currentUserId) ?? null

        if (currentEntry?.submission) {
          const payload = await competitionClient.getSubmission(competition.id, currentEntry.id)

          if (payload) {
            nextSubmissionDetails[competition.id] = payload.submission
            nextTeamSelections[competition.id] = payload.submission.sourceTeamId ?? ''
            nextTierSelections[competition.id] = payload.submission.tierId ?? ''
          }
        }
      }

      setCompetitions(resolvedCompetitions)
      setCompetitionSubmissionDetails(nextSubmissionDetails)
      setSelectedCompetitionTeamIds((currentSelections) => ({
        ...currentSelections,
        ...nextTeamSelections,
      }))
      setSelectedCompetitionTierIds((currentSelections) => ({
        ...currentSelections,
        ...nextTierSelections,
      }))
      setCompetitionUserId(currentUserId)
    } finally {
      setIsCompetitionLoading(false)
    }
  }

  async function handleCreateCompetition() {
    if (!competitionClient) {
      setFeedback('Competition tools require the shared API repository mode.')
      return
    }

    if (!competitionForm.name.trim()) {
      setFeedback('Competition name is required.')
      return
    }

    const maxEntrants = Number.parseInt(competitionForm.maxEntrants, 10)

    if (!Number.isFinite(maxEntrants) || maxEntrants <= 1) {
      setFeedback('Competition seat count must be at least 2.')
      return
    }

    await competitionClient.createCompetition({
      name: competitionForm.name.trim(),
      description: competitionForm.description.trim(),
      maxEntrants,
      submissionDeadline: competitionForm.submissionDeadline
        ? new Date(competitionForm.submissionDeadline).toISOString()
        : null,
      allowUnofficialRosters: competitionForm.allowUnofficialRosters,
    })
    await refreshCompetitionState()
    setCompetitionForm({
      name: '',
      description: '',
      maxEntrants: '8',
      submissionDeadline: '',
      allowUnofficialRosters: false,
    })
    setFeedback('Competition created.')
  }

  async function handleJoinCompetition(competitionId: string) {
    if (!competitionClient) {
      setFeedback('Competition tools require the shared API repository mode.')
      return
    }

    await competitionClient.joinCompetition(competitionId)
    await refreshCompetitionState()
    setFeedback('Joined competition.')
  }

  async function handleSubmitCompetitionTeam(competitionId: string, entryId: string) {
    if (!competitionClient) {
      setFeedback('Competition tools require the shared API repository mode.')
      return
    }

    const sourceTeamId = selectedCompetitionTeamIds[competitionId] ?? ''

    if (!sourceTeamId) {
      setFeedback('Choose a saved team before submitting to the competition.')
      return
    }

    const existingSubmission = competitionSubmissionDetails[competitionId] ?? null
    const tierId = (selectedCompetitionTierIds[competitionId] ?? '').trim()

    if (existingSubmission) {
      await competitionClient.updateSubmission(competitionId, entryId, {
        sourceTeamId,
        tierId: tierId || null,
        extraSkillsPackageJson: {},
      })
      setFeedback('Competition team submission updated.')
    } else {
      await competitionClient.submitTeam(competitionId, entryId, {
        sourceTeamId,
        tierId: tierId || null,
        extraSkillsPackageJson: {},
      })
      setFeedback('Competition team submitted.')
    }

    await refreshCompetitionState()
  }

  async function handleApproveCompetitionSubmission(competitionId: string, entryId: string) {
    if (!competitionClient) {
      setFeedback('Competition tools require the shared API repository mode.')
      return
    }

    await competitionClient.approveSubmission(competitionId, entryId)
    await refreshCompetitionState()
    setFeedback('Competition team submission approved.')
  }

  async function handleCreateTeam() {
    const template = templates.find((entry) => entry.id === selectedTemplateId)

    if (!template) {
      setFeedback('Choose a roster first.')
      return
    }

    const nextTeam = createTeam(`New ${template.name} Team`, template)
    await repository.saveTeam(nextTeam)
    await refreshState()
    setActiveTeam((await repository.getTeam(nextTeam.id)) ?? nextTeam)
    setFeedback(`Created a new ${template.name} draft.`)
  }

  async function handleOpenTeam(teamId: string) {
    const nextTeam = await repository.getTeam(teamId)

    if (!nextTeam) {
      setFeedback('That team could not be loaded.')
      return
    }

    setActiveTeam(nextTeam)
    setFeedback(`Loaded ${nextTeam.name}.`)
  }

  async function handleDeleteTeam(teamId: string) {
    await repository.deleteTeam(teamId)

    if (activeTeam?.id === teamId) {
      setActiveTeam(null)
    }

    await refreshState()
    setFeedback('Team deleted.')
  }

  function updateActiveTeam(updater: (team: SavedTeam) => SavedTeam) {
    setActiveTeam((currentTeam) => {
      if (!currentTeam) {
        return currentTeam
      }

      const nextTeam = updater(currentTeam)
      return {
        ...nextTeam,
        updatedAt: new Date().toISOString(),
      }
    })
  }

  function handleAddPlayer() {
    if (!activeTeam || !activeTemplate || !effectiveSelectedPositionId) {
      return
    }

    const position = findPosition(activeTemplate, effectiveSelectedPositionId)

    if (!position || getRemainingSlots(activeTeam, activeTemplate, position.id) <= 0) {
      return
    }

    updateActiveTeam((team) => ({
      ...team,
      players: [...team.players, createTeamPlayer(team, position)],
    }))
  }

  function handleRemovePlayer(playerId: string) {
    updateActiveTeam((team) => ({
      ...team,
      players: team.players.filter((player) => player.id !== playerId),
    }))
  }

  function handleMovePlayer(playerId: string, direction: 'up' | 'down') {
    updateActiveTeam((team) => {
      const currentIndex = team.players.findIndex((player) => player.id === playerId)

      if (currentIndex < 0) {
        return team
      }

      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1

      if (targetIndex < 0 || targetIndex >= team.players.length) {
        return team
      }

      const nextPlayers = [...team.players]
      const [movedPlayer] = nextPlayers.splice(currentIndex, 1)
      nextPlayers.splice(targetIndex, 0, movedPlayer)

      return {
        ...team,
        players: nextPlayers,
      }
    })
  }

  function handleDuplicatePlayer(playerId: string) {
    if (!activeTemplate) {
      return
    }

    updateActiveTeam((team) => {
      const currentIndex = team.players.findIndex((player) => player.id === playerId)
      const sourcePlayer = team.players[currentIndex]

      if (!sourcePlayer) {
        return team
      }

      const position = findPosition(activeTemplate, sourcePlayer.positionTemplateId)

      if (!position || getRemainingSlots(team, activeTemplate, position.id) <= 0) {
        return team
      }

      const duplicatedPlayer = {
        ...sourcePlayer,
        id: crypto.randomUUID(),
        name: `${sourcePlayer.name} Copy`,
        shirtNumber: null,
      }

      const nextPlayers = [...team.players]
      nextPlayers.splice(currentIndex + 1, 0, duplicatedPlayer)

      return {
        ...team,
        players: nextPlayers,
      }
    })
  }

  function handlePlayerNameChange(playerId: string, name: string) {
    updateActiveTeam((team) => ({
      ...team,
      players: team.players.map((player) => (player.id === playerId ? { ...player, name } : player)),
    }))
  }

  function handleTeamNameChange(name: string) {
    updateActiveTeam((team) => ({ ...team, name }))
  }

  function handleStatusChange(status: SavedTeam['status']) {
    updateActiveTeam((team) => ({ ...team, status }))
  }

  function handleRerollChange(value: string) {
    const rerollCount = Math.max(0, Number(value) || 0)
    updateActiveTeam((team) => ({ ...team, rerollCount }))
  }

  function handleDraftBudgetChange(value: string) {
    const draftBudget = Math.max(0, Number(value) || 0)
    updateActiveTeam((team) => ({ ...team, draftBudget }))
  }

  function handleAssistantCoachChange(value: string) {
    const assistantCoachCount = Math.max(0, Number(value) || 0)
    updateActiveTeam((team) => ({ ...team, assistantCoachCount }))
  }

  function handleCheerleaderChange(value: string) {
    const cheerleaderCount = Math.max(0, Number(value) || 0)
    updateActiveTeam((team) => ({ ...team, cheerleaderCount }))
  }

  function handleDedicatedFansChange(value: string) {
    const dedicatedFans = Math.max(1, Number(value) || 1)
    updateActiveTeam((team) => ({ ...team, dedicatedFans }))
  }

  function handleApothecaryPurchasedChange(checked: boolean) {
    updateActiveTeam((team) => ({ ...team, apothecaryPurchased: checked }))
  }

  async function handleSaveTeam() {
    if (!activeTeam) {
      return
    }

    await repository.saveTeam(activeTeam)
    const persistedTeam = await repository.getTeam(activeTeam.id)

    await refreshState()

    if (persistedTeam) {
      setActiveTeam(persistedTeam)
    }

    setFeedback(`Saved ${activeTeam.name}.`)
  }

  async function handleExportTeams() {
    const persistedTeams = (
      await Promise.all(teams.map(async (team) => repository.getTeam(team.id)))
    ).filter((team): team is SavedTeam => Boolean(team))

    const exportTeams = activeTeam
      ? [
          activeTeam,
          ...persistedTeams.filter((team) => team.id !== activeTeam.id),
        ]
      : persistedTeams

    if (exportTeams.length === 0) {
      setFeedback('There are no saved teams to export yet.')
      return
    }

    const exportPackage: TeamCreatorExchangePackage = {
      format: TEAM_CREATOR_EXCHANGE_FORMAT,
      version: TEAM_CREATOR_EXCHANGE_VERSION,
      exportedAt: new Date().toISOString(),
      teams: exportTeams,
    }

    const blob = new Blob([JSON.stringify(exportPackage, null, 2)], { type: 'application/json' })
    const objectUrl = URL.createObjectURL(blob)
    const downloadLink = document.createElement('a')

    downloadLink.href = objectUrl
    downloadLink.download = `blood-bowl-toolkit-teams-${new Date().toISOString().slice(0, 10)}.json`
    downloadLink.click()
    URL.revokeObjectURL(objectUrl)

    setFeedback(`Exported ${exportTeams.length} team${exportTeams.length === 1 ? '' : 's'} for block-dice import.`)
  }

  function renderSkills(skills: string[]) {
    if (skills.length === 0) {
      return 'None'
    }

    return skills.map((skill, index) => {
      const reference = getSkillReference(skill)

      return (
        <span key={`${skill}-${index}`}>
          {reference ? (
            <button className={styles.skillLink} onClick={() => setActiveReference(toReferenceModalContent(reference))} type="button">
              {skill}
            </button>
          ) : (
            <span>{skill}</span>
          )}
          {index < skills.length - 1 ? ', ' : ''}
        </span>
      )
    })
  }

  if (!activeTeam || !activeTemplate) {
    return (
      <div className={styles.appShell}>
        <header className={styles.appChrome}>
          <div className={styles.brandRow}>
            <span className={styles.burger}>|||</span>
            <strong>BB Roster</strong>
          </div>
          <div className={styles.accountDot} aria-hidden="true" />
        </header>

        <div className={styles.pageFrame}>
          <div className={styles.centerTitleBlock}>
            <h1 className={styles.pageTitle}>
              {libraryView === 'CREATE'
                ? 'Create New Team'
                : libraryView === 'LOAD'
                  ? 'Load Saved Team'
                  : 'Competitions'}
            </h1>
          </div>

          <nav className={styles.libraryNav} aria-label="Team vault workflows">
            <button
              className={libraryView === 'CREATE' ? styles.libraryNavButtonActive : styles.libraryNavButton}
              onClick={() => setLibraryView('CREATE')}
              type="button"
            >
              Create Team
            </button>
            <button
              className={libraryView === 'LOAD' ? styles.libraryNavButtonActive : styles.libraryNavButton}
              onClick={() => setLibraryView('LOAD')}
              type="button"
            >
              Load Saved Team
            </button>
            <button
              className={libraryView === 'COMPETITIONS' ? styles.libraryNavButtonActive : styles.libraryNavButton}
              onClick={() => setLibraryView('COMPETITIONS')}
              type="button"
            >
              Competitions
            </button>
          </nav>

          <div className={styles.libraryActionRow}>
            <button
              className={styles.secondaryButton}
              onClick={() => void handleExportTeams()}
              type="button"
              disabled={isLoading || teams.length === 0}
            >
              Export Teams For Block Dice
            </button>
          </div>

          {libraryView === 'CREATE' ? (
            <section className={styles.librarySinglePane}>
              <section className={styles.clonePickerPanel}>
                <div className={styles.cloneChipField}>
                  {templates.map((template) => (
                    <button
                      key={template.id}
                      className={template.id === selectedTemplateId ? styles.templateChipActive : styles.templateChip}
                      onClick={() => setSelectedTemplateId(template.id)}
                      type="button"
                    >
                      {template.name}
                    </button>
                  ))}
                </div>

                <p className={styles.cloneLeagueLine}>
                  Team League: {selectedTemplate?.leagues.join(' / ') || 'Not listed'}
                </p>
              </section>

              <button className={styles.cloneCreateButton} onClick={handleCreateTeam} type="button">
                Create
              </button>

              {!selectedTemplate ? null : (
                <section className={styles.clonePreviewStack}>
                  <section>
                    <div className={styles.cloneSectionTitle}>{selectedTemplate.name} Team Players</div>
                    <div className={styles.tableWrap}>
                      <table className={styles.table}>
                        <thead>
                          <tr>
                            <th>Qty</th>
                            <th>Position</th>
                            <th>Cost</th>
                            <th>MA</th>
                            <th>ST</th>
                            <th>AG</th>
                            <th>PA</th>
                            <th>AV</th>
                            <th>Skills</th>
                            <th>Primary</th>
                            <th>Secondary</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedTemplate.positions.map((position) => (
                            <tr key={position.id}>
                              <td>{position.minQty}/{position.maxQty}</td>
                              <td>{formatPositionLabel(position)}</td>
                              <td>{formatGold(position.cost)}</td>
                              <td>{position.movement}</td>
                              <td>{position.strength}</td>
                              <td>{position.agility}</td>
                              <td>{position.passing ?? '-'}</td>
                              <td>{position.armour}</td>
                              <td>{renderSkills(position.startingSkills)}</td>
                              <td>{formatCategories(position.primaryCategories)}</td>
                              <td>{formatCategories(position.secondaryCategories)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                </section>
              )}
            </section>
          ) : libraryView === 'LOAD' ? (
            <section className={styles.librarySinglePane}>
              <div className={styles.loadSheet}>
                {teams.length === 0 ? (
                  <p className={styles.emptyState}>No saved teams yet.</p>
                ) : (
                  teams.map((team) => (
                    <article key={team.id} className={styles.loadRow}>
                      <button className={styles.loadRowButton} onClick={() => void handleOpenTeam(team.id)} type="button">
                        <span>{team.name}</span>
                        <span>{templates.find((template) => template.id === team.rosterTemplateId)?.name ?? 'Unknown roster'}</span>
                        <span>{team.playerCount} players</span>
                        <span>Team Value {formatGold(team.totalValue)} gp</span>
                      </button>
                      <button className={styles.deleteButton} onClick={() => void handleDeleteTeam(team.id)} type="button">
                        Delete
                      </button>
                    </article>
                  ))
                )}
              </div>
            </section>
          ) : (
            <section className={styles.librarySinglePane}>
              {competitionClient ? (
                <>
                  <section className={styles.competitionPanel}>
                    <div className={styles.panelHeader}>
                      <div>
                        <p className={styles.sectionKicker}>Knockout Setup</p>
                        <h2 className={styles.panelHeadline}>Create Competition</h2>
                      </div>
                    </div>
                    <div className={styles.competitionFormGrid}>
                      <label className={styles.field}>
                        <span>Name</span>
                        <input
                          value={competitionForm.name}
                          onChange={(event) =>
                            setCompetitionForm((current) => ({ ...current, name: event.target.value }))
                          }
                        />
                      </label>
                      <label className={styles.field}>
                        <span>Description</span>
                        <input
                          value={competitionForm.description}
                          onChange={(event) =>
                            setCompetitionForm((current) => ({ ...current, description: event.target.value }))
                          }
                        />
                      </label>
                      <label className={styles.field}>
                        <span>Seats</span>
                        <input
                          type="number"
                          min="2"
                          value={competitionForm.maxEntrants}
                          onChange={(event) =>
                            setCompetitionForm((current) => ({ ...current, maxEntrants: event.target.value }))
                          }
                        />
                      </label>
                      <label className={styles.field}>
                        <span>Submission Deadline</span>
                        <input
                          type="datetime-local"
                          value={competitionForm.submissionDeadline}
                          onChange={(event) =>
                            setCompetitionForm((current) => ({
                              ...current,
                              submissionDeadline: event.target.value,
                            }))
                          }
                        />
                      </label>
                      <label className={styles.toggleField}>
                        <span>Allow Unofficial Rosters</span>
                        <input
                          type="checkbox"
                          checked={competitionForm.allowUnofficialRosters}
                          onChange={(event) =>
                            setCompetitionForm((current) => ({
                              ...current,
                              allowUnofficialRosters: event.target.checked,
                            }))
                          }
                        />
                      </label>
                    </div>
                    <button className={styles.primaryButton} onClick={() => void handleCreateCompetition()} type="button">
                      Create Knockout Competition
                    </button>
                  </section>

                  <section className={styles.competitionPanel}>
                    <div className={styles.panelHeader}>
                      <div>
                        <p className={styles.sectionKicker}>Shared API</p>
                        <h2 className={styles.panelHeadline}>Competition Vault</h2>
                      </div>
                      <button
                        className={styles.secondaryButton}
                        onClick={() => void refreshCompetitionState()}
                        type="button"
                      >
                        Refresh
                      </button>
                    </div>

                    {isCompetitionLoading ? (
                      <p className={styles.helperText}>Refreshing competitions...</p>
                    ) : competitions.length === 0 ? (
                      <p className={styles.emptyState}>No competitions created yet.</p>
                    ) : (
                      <div className={styles.competitionList}>
                        {competitions.map((competition) => {
                          const currentEntry =
                            competition.entries.find((entry) => entry.userId === competitionUserId) ?? null
                          const selectedTeamId = selectedCompetitionTeamIds[competition.id] ?? ''
                          const selectedTierId = selectedCompetitionTierIds[competition.id] ?? ''
                          const submission = competitionSubmissionDetails[competition.id] ?? null
                          const isOwner = competition.createdByUserId === competitionUserId

                          return (
                            <article key={competition.id} className={styles.competitionCard}>
                              <div className={styles.competitionCardHeader}>
                                <div>
                                  <h3 className={styles.competitionName}>{competition.name}</h3>
                                  <p className={styles.metaLine}>
                                    {competition.format} • {competition.status} • {competition.entrantCount}/{competition.maxEntrants} entrants
                                  </p>
                                  {competition.description ? (
                                    <p className={styles.helperText}>{competition.description}</p>
                                  ) : null}
                                </div>
                                <div className={styles.competitionMetaBlock}>
                                  <span>{isOwner ? 'Owner' : 'Participant View'}</span>
                                  <span>{competition.submissionDeadline ? `Deadline ${competition.submissionDeadline.slice(0, 16).replace('T', ' ')}` : 'No deadline set'}</span>
                                </div>
                              </div>

                              {currentEntry ? (
                                <div className={styles.competitionEntryPanel}>
                                  <p className={styles.metaLine}>Entry status: {currentEntry.status}</p>
                                  <div className={styles.competitionSubmissionGrid}>
                                    <label className={styles.field}>
                                      <span>Saved Team</span>
                                      <select
                                        value={selectedTeamId}
                                        onChange={(event) =>
                                          setSelectedCompetitionTeamIds((current) => ({
                                            ...current,
                                            [competition.id]: event.target.value,
                                          }))
                                        }
                                      >
                                        <option value="">Choose team</option>
                                        {teams.map((team) => (
                                          <option key={team.id} value={team.id}>
                                            {team.name}
                                          </option>
                                        ))}
                                      </select>
                                    </label>
                                    <label className={styles.field}>
                                      <span>Tier</span>
                                      <input
                                        value={selectedTierId}
                                        onChange={(event) =>
                                          setSelectedCompetitionTierIds((current) => ({
                                            ...current,
                                            [competition.id]: event.target.value,
                                          }))
                                        }
                                        placeholder="Tier 1"
                                      />
                                    </label>
                                  </div>
                                  <div className={styles.competitionActionRow}>
                                    <button
                                      className={styles.primaryButton}
                                      onClick={() => void handleSubmitCompetitionTeam(competition.id, currentEntry.id)}
                                      type="button"
                                      disabled={!selectedTeamId}
                                    >
                                      {submission ? 'Update Submission' : 'Submit Team'}
                                    </button>
                                    {submission && isOwner && currentEntry.status === 'TEAM_SUBMITTED' ? (
                                      <button
                                        className={styles.secondaryButton}
                                        onClick={() =>
                                          void handleApproveCompetitionSubmission(competition.id, currentEntry.id)
                                        }
                                        type="button"
                                      >
                                        Approve Submission
                                      </button>
                                    ) : null}
                                  </div>
                                  {submission ? (
                                    <div className={styles.inlineSuccess}>
                                      Submitted team: {submission.teamName} ({submission.players.length} players)
                                      {submission.tierId ? ` • ${submission.tierId}` : ''}
                                    </div>
                                  ) : (
                                    <p className={styles.helperText}>No team submitted for this competition yet.</p>
                                  )}
                                </div>
                              ) : (
                                <div className={styles.competitionActionRow}>
                                  <button
                                    className={styles.primaryButton}
                                    onClick={() => void handleJoinCompetition(competition.id)}
                                    type="button"
                                  >
                                    Join Competition
                                  </button>
                                </div>
                              )}
                            </article>
                          )
                        })}
                      </div>
                    )}
                  </section>
                </>
              ) : (
                <section className={styles.competitionPanel}>
                  <p className={styles.emptyState}>
                    Competition tools are available only when the team creator is running against the shared API.
                  </p>
                </section>
              )}
            </section>
          )}

          <footer className={styles.feedback}>
            {feedback ||
              (isLoading
                ? `Loading teams and rosters from ${repositorySelection.label}...`
                : `Choose a team to load or create a fresh draft. Repository: ${repositorySelection.label}.`)}
          </footer>
        </div>
        {activeReference ? (
          <div className={styles.skillModalBackdrop} onClick={() => setActiveReference(null)} role="presentation">
            <div className={styles.skillModal} onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
              <button className={styles.skillModalClose} onClick={() => setActiveReference(null)} type="button" aria-label="Close rule details">
                ×
              </button>
              <h2 className={styles.skillModalTitle}>{activeReference.title}</h2>
              <p className={styles.skillModalMeta}>Type: {activeReference.type}</p>
              <p className={styles.skillModalExcerpt}>{activeReference.excerpt}</p>
              <p className={styles.skillModalPage}>Reference: page {activeReference.page}</p>
            </div>
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <div className={styles.appShell}>
      <header className={styles.appChrome}>
        <div className={styles.brandRow}>
          <span className={styles.burger}>|||</span>
          <strong>BB Roster</strong>
        </div>
        <div className={styles.accountDot} aria-hidden="true" />
      </header>

        <div className={styles.pageFrame}>
      <section className={styles.editor}>
        <>
          <div className={styles.editorTopbar}>
            <button className={styles.secondaryButton} onClick={() => setActiveTeam(null)} type="button">
              Back To Team Vault
            </button>
            <button className={styles.secondaryButton} onClick={() => void handleExportTeams()} type="button">
              Export Teams For Block Dice
            </button>
          </div>
          <header className={styles.cloneHero}>
            <div className={styles.heroCopy}>
              <input
                className={styles.cloneTeamName}
                value={activeTeam.name}
                onChange={(event) => handleTeamNameChange(event.target.value)}
                aria-label="Team name"
              />
              <p className={styles.cloneHeroMeta}>
                {activeTemplate.name} Team &nbsp; {activeTeam.players.length}s &nbsp; {activeTemplate.leagues[0] ?? 'League'}
              </p>
            </div>
            <div className={styles.heroAside}>
              <button className={styles.primaryButton} onClick={() => void handleSaveTeam()} type="button">
                Save Team
              </button>
            </div>
          </header>

          <section className={styles.summaryGrid}>
            <article className={styles.summaryCard}>
              <span>Roster Type</span>
              <strong>{activeTemplate.name}</strong>
              <small>{activeTemplate.specialRules.length > 0 ? activeTemplate.specialRules.join(' • ') : 'No special rules'}</small>
            </article>
            <article className={styles.summaryCard}>
              <span>Players</span>
              <strong>{activeTeam.players.length}</strong>
              <small>{activeTemplatePlayerLimit} possible across this roster</small>
            </article>
            <article className={styles.summaryCard}>
              <span>Draft Budget</span>
              <strong>{formatGold(activeTeam.draftBudget)} gp</strong>
              <small>{formatGold(calculateTreasury(activeTeam, activeTemplate))} gp treasury remaining</small>
            </article>
            <article className={styles.summaryCard}>
              <span>Draft Status</span>
              <strong>{draftWarnings.length === 0 ? 'Ready' : 'Needs fixes'}</strong>
              <small>{formatGold(calculateTeamValue(activeTeam, activeTemplate))} gp team value</small>
            </article>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <p className={styles.sectionKicker}>Drafting</p>
                <h2 className={styles.panelHeadline}>Player Hiring</h2>
              </div>
            </div>

            {draftWarnings.length > 0 ? (
              <div className={styles.inlineWarnings}>
                <strong>Roster Needs Attention</strong>
                <ul className={styles.warningList}>
                  {draftWarnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className={styles.inlineSuccess}>Draft checks are currently satisfied.</div>
            )}

            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Controls</th>
                    <th>Name</th>
                    <th>Position</th>
                    <th>MA</th>
                    <th>ST</th>
                    <th>AG</th>
                    <th>PA</th>
                    <th>AV</th>
                    <th>Skills</th>
                    <th>SPP</th>
                    <th>NI</th>
                    <th>Value</th>
                  </tr>
                </thead>
                <tbody>
                  {activeTeam.players.length === 0
                    ? null
                    : activeTeam.players.map((player, index) => {
                        const position = findPosition(activeTemplate, player.positionTemplateId)

                      if (!position) {
                        return null
                      }

                      const skills = [...position.startingSkills, ...player.extraSkills]

                        return (
                          <tr key={player.id}>
                            <td>{player.shirtNumber ?? index + 1}</td>
                            <td>
                              <div className={styles.playerControls}>
                                <button
                                  className={styles.iconButton}
                                  onClick={() => handleMovePlayer(player.id, 'up')}
                                  type="button"
                                  disabled={index === 0}
                                  aria-label="Move player up"
                                >
                                  ↑
                                </button>
                                <button
                                  className={styles.iconButton}
                                  onClick={() => handleMovePlayer(player.id, 'down')}
                                  type="button"
                                  disabled={index === activeTeam.players.length - 1}
                                  aria-label="Move player down"
                                >
                                  ↓
                                </button>
                                <button
                                  className={styles.iconButton}
                                  onClick={() => handleDuplicatePlayer(player.id)}
                                  type="button"
                                  disabled={getRemainingSlots(activeTeam, activeTemplate, position.id) <= 0}
                                  aria-label="Duplicate player"
                                >
                                  ⧉
                                </button>
                                <button
                                  className={styles.iconButton}
                                  onClick={() => handleRemovePlayer(player.id)}
                                  type="button"
                                  aria-label="Delete player"
                                >
                                  ×
                                </button>
                              </div>
                            </td>
                            <td>
                              <input
                                className={styles.inlineInput}
                                value={player.name}
                                onChange={(event) => handlePlayerNameChange(player.id, event.target.value)}
                              />
                            </td>
                            <td>{formatPositionLabel(position)}</td>
                          <td>{position.movement}</td>
                          <td>{position.strength}</td>
                          <td>{position.agility}</td>
                          <td>{position.passing ?? '-'}</td>
                          <td>{position.armour}</td>
                          <td>{renderSkills(skills)}</td>
                          <td>{player.spp}</td>
                            <td>{player.nigglingInjuries}</td>
                            <td>{formatGold(player.currentValue)}</td>
                          </tr>
                        )
                      })}
                  <tr className={styles.draftEntryRow}>
                    <td></td>
                    <td>
                      <div className={styles.inlineDraftActions}>
                        <button className={styles.inlineAddButton} onClick={handleAddPlayer} type="button">
                          +
                        </button>
                        <span>x</span>
                        <span>1</span>
                      </div>
                    </td>
                    <td className={styles.inlineDraftCellMuted}>Player Name</td>
                    <td>
                      <label className={styles.inlineDraftSelectWrap}>
                        <span className={styles.visuallyHidden}>Position</span>
                        <select value={effectiveSelectedPositionId} onChange={(event) => setSelectedPositionId(event.target.value)}>
                          {activeTemplate.positions.map((position) => {
                            const used = teamCounts[position.id] ?? 0
                            const remaining = getRemainingSlots(activeTeam, activeTemplate, position.id)

                            return (
                              <option key={position.id} value={position.id} disabled={remaining <= 0}>
                                {formatPositionLabel(position)} {used}/{position.maxQty}
                              </option>
                            )
                          })}
                        </select>
                      </label>
                    </td>
                    <td>{selectedPosition?.movement ?? '-'}</td>
                    <td>{selectedPosition?.strength ?? '-'}</td>
                    <td>{selectedPosition?.agility ?? '-'}</td>
                    <td>{selectedPosition?.passing ?? '-'}</td>
                    <td>{selectedPosition?.armour ?? '-'}</td>
                    <td>{selectedPosition ? renderSkills(selectedPosition.startingSkills) : '-'}</td>
                    <td>0</td>
                    <td>0</td>
                    <td>{selectedPosition ? formatGold(selectedPosition.cost) : '-'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <p className={styles.sectionKicker}>Template View</p>
                <h2 className={styles.panelHeadline}>{activeTemplate.name} Team Players</h2>
              </div>
            </div>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Qty</th>
                    <th>Position</th>
                    <th>Cost</th>
                    <th>MA</th>
                    <th>ST</th>
                    <th>AG</th>
                    <th>PA</th>
                    <th>AV</th>
                    <th>Skills</th>
                    <th>Primary</th>
                    <th>Secondary</th>
                  </tr>
                </thead>
                <tbody>
                  {activeTemplate.positions.map((position) => {
                    const used = teamCounts[position.id] ?? 0

                    return (
                      <tr key={position.id}>
                        <td>{used}/{position.maxQty}</td>
                        <td>{formatPositionLabel(position)}</td>
                        <td>{formatGold(position.cost)}</td>
                        <td>{position.movement}</td>
                        <td>{position.strength}</td>
                        <td>{position.agility}</td>
                        <td>{position.passing ?? '-'}</td>
                        <td>{position.armour}</td>
                        <td>{renderSkills(position.startingSkills)}</td>
                        <td>{formatCategories(position.primaryCategories)}</td>
                        <td>{formatCategories(position.secondaryCategories)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className={styles.draftSummaryDeck}>
            <section className={styles.financialZone}>
              <section className={styles.summaryGrid}>
                <article className={styles.summaryCard}>
                  <span>
                    Rerolls
                    <button
                      className={styles.helpIcon}
                      onClick={() => setActiveReference(draftRuleReferences.rerolls)}
                      type="button"
                      aria-label="Show rerolls help"
                    >
                      ?
                    </button>
                  </span>
                  <strong>{formatGold(calculateRerollValue(activeTeam, activeTemplate))} gp</strong>
                  <small>{activeTeam.rerollCount} purchased</small>
                </article>
                <article className={styles.summaryCard}>
                  <span>Sideline Staff</span>
                  <strong>{formatGold(calculateAssistantCoachValue(activeTeam) + calculateCheerleaderValue(activeTeam))} gp</strong>
                  <small>{activeTeam.assistantCoachCount} AC • {activeTeam.cheerleaderCount} CL</small>
                </article>
                <article className={styles.summaryCard}>
                  <span>
                    Dedicated Fans
                    <button
                      className={styles.helpIcon}
                      onClick={() => setActiveReference(draftRuleReferences.dedicatedFans)}
                      type="button"
                      aria-label="Show dedicated fans help"
                    >
                      ?
                    </button>
                  </span>
                  <strong>{formatGold(calculateDedicatedFansValue(activeTeam))} gp</strong>
                  <small>{activeTeam.dedicatedFans} starting fans</small>
                </article>
                <article className={styles.summaryCard}>
                  <span>
                    Apothecary
                    <button
                      className={styles.helpIcon}
                      onClick={() => setActiveReference(draftRuleReferences.apothecary)}
                      type="button"
                      aria-label="Show apothecary help"
                    >
                      ?
                    </button>
                  </span>
                  <strong>{formatGold(calculateApothecaryValue(activeTeam))} gp</strong>
                  <small>{activeTeam.apothecaryPurchased ? 'Purchased' : 'Not purchased'}</small>
                </article>
              </section>

              <section className={styles.draftControlStrip}>
                <label className={styles.compactField}>
                  <span>Status</span>
                  <select value={activeTeam.status} onChange={(event) => handleStatusChange(event.target.value as SavedTeam['status'])}>
                    <option value="DRAFT">Draft</option>
                    <option value="ACTIVE">Active</option>
                    <option value="RETIRED">Retired</option>
                  </select>
                </label>
                <label className={styles.compactField}>
                  <span>Draft Budget</span>
                  <input
                    type="number"
                    min="0"
                    step="5000"
                    value={activeTeam.draftBudget}
                    onChange={(event) => handleDraftBudgetChange(event.target.value)}
                  />
                </label>
                <div className={styles.infoCard}>
                  <span>League</span>
                  <strong>{activeTemplate.leagues.join(' / ') || 'League not listed'}</strong>
                </div>
                <div className={styles.infoCard}>
                  <span>Source</span>
                  <strong>{activeTemplate.source.replace('Blood Bowl rulebook screengrab: ', '')}</strong>
                </div>
              </section>

              <section className={styles.financialGrid}>
              <section className={styles.summaryLedger}>
                <div className={styles.summaryLedgerLabelColumn}>
                  <span>Coach Name</span>
                  <span>Roster</span>
                  <span>Team Value</span>
                  <span>Player Value</span>
                  <span>Treasury</span>
                </div>
                <div className={styles.summaryLedgerValueColumn}>
                  <span>{activeTeam.name}</span>
                  <span>{activeTemplate.name}</span>
                  <span>{formatGold(calculateTeamValue(activeTeam, activeTemplate))} gp</span>
                  <span>{formatGold(calculatePlayerValue(activeTeam))} gp</span>
                  <span>{formatGold(calculateTreasury(activeTeam, activeTemplate))} gp</span>
                </div>
              </section>

              <section className={styles.staffLedger}>
                <div className={styles.staffLedgerLabelColumn}>
                  <span>
                    Rerolls
                    <button
                      className={styles.helpIcon}
                      onClick={() => setActiveReference(draftRuleReferences.rerolls)}
                      type="button"
                      aria-label="Show rerolls help"
                    >
                      ?
                    </button>
                  </span>
                  <span>
                    Assistant Coaches
                    <button
                      className={styles.helpIcon}
                      onClick={() => setActiveReference(draftRuleReferences.assistantCoaches)}
                      type="button"
                      aria-label="Show assistant coaches help"
                    >
                      ?
                    </button>
                  </span>
                  <span>
                    Cheerleaders
                    <button
                      className={styles.helpIcon}
                      onClick={() => setActiveReference(draftRuleReferences.cheerleaders)}
                      type="button"
                      aria-label="Show cheerleaders help"
                    >
                      ?
                    </button>
                  </span>
                  <span>
                    Dedicated Fans
                    <button
                      className={styles.helpIcon}
                      onClick={() => setActiveReference(draftRuleReferences.dedicatedFans)}
                      type="button"
                      aria-label="Show dedicated fans help"
                    >
                      ?
                    </button>
                  </span>
                  <span>
                    Apothecary
                    <button
                      className={styles.helpIcon}
                      onClick={() => setActiveReference(draftRuleReferences.apothecary)}
                      type="button"
                      aria-label="Show apothecary help"
                    >
                      ?
                    </button>
                  </span>
                </div>
                <div className={styles.staffLedgerControlColumn}>
                  <label className={styles.staffControlRow}>
                    <input type="number" min="0" value={activeTeam.rerollCount} onChange={(event) => handleRerollChange(event.target.value)} />
                    <small>{formatGold(activeTemplate.rerollCost)} gp</small>
                  </label>
                  <label className={styles.staffControlRow}>
                    <input
                      type="number"
                      min="0"
                      value={activeTeam.assistantCoachCount}
                      onChange={(event) => handleAssistantCoachChange(event.target.value)}
                    />
                    <small>10,000 gp</small>
                  </label>
                  <label className={styles.staffControlRow}>
                    <input
                      type="number"
                      min="0"
                      value={activeTeam.cheerleaderCount}
                      onChange={(event) => handleCheerleaderChange(event.target.value)}
                    />
                    <small>10,000 gp</small>
                  </label>
                  <label className={styles.staffControlRow}>
                    <input
                      type="number"
                      min="1"
                      max="7"
                      value={activeTeam.dedicatedFans}
                      onChange={(event) => handleDedicatedFansChange(event.target.value)}
                    />
                    <small>5,000 gp step</small>
                  </label>
                  <label className={styles.staffToggleRow}>
                    <input
                      type="checkbox"
                      checked={activeTeam.apothecaryPurchased}
                      disabled={activeTemplate.apothecary === 'NO'}
                      onChange={(event) => handleApothecaryPurchasedChange(event.target.checked)}
                    />
                    <small>
                      {activeTemplate.apothecary === 'NO' ? 'Unavailable' : activeTemplate.apothecary === 'OPTIONAL' ? 'Optional' : 'Available'}
                    </small>
                  </label>
                </div>
              </section>
              </section>
            </section>
          </section>
        </>

        <footer className={styles.feedback}>
          {feedback ||
            `Repository: ${repositorySelection.label}. ${
              repositorySelection.mode === 'api'
                ? 'Teams save through the shared backend.'
                : 'Teams currently save in this browser.'
            }`}
        </footer>
      </section>
      {activeReference ? (
        <div className={styles.skillModalBackdrop} onClick={() => setActiveReference(null)} role="presentation">
          <div className={styles.skillModal} onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
            <button className={styles.skillModalClose} onClick={() => setActiveReference(null)} type="button" aria-label="Close rule details">
              ×
            </button>
            <h2 className={styles.skillModalTitle}>{activeReference.title}</h2>
            <p className={styles.skillModalMeta}>Type: {activeReference.type}</p>
            <p className={styles.skillModalExcerpt}>{activeReference.excerpt}</p>
            <p className={styles.skillModalPage}>Reference: page {activeReference.page}</p>
          </div>
        </div>
      ) : null}
      </div>
    </div>
  )
}
