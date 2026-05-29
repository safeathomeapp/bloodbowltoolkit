import { useEffect, useMemo, useState } from 'react'

import styles from './TeamCreator.module.css'
import { getSkillReference } from '../../../data/skillReferences'
import { AuthClient, type AuthApiUser } from '../../../shared/api/authClient'
import {
  CompetitionClient,
  type CompetitionDetail,
  type CompetitionFixtureSummary,
  type CompetitionFixtureMatchSession,
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
  countActivePlayers,
  countEligiblePlayers,
  countRosteredPlayers,
  calculatePlayerValue,
  calculateRerollValue,
  calculateTeamValue,
  calculateTreasury,
  countPlayersByPosition,
  countPlayersInSharedGroup,
  getDraftWarnings,
  isEligibleForNextGamePlayer,
} from '../../../shared/utils/teamMath'
import type { SkillReference } from '../../../shared/types/skillReference'
import type { RosterTemplate, SavedTeam, SavedTeamSummary } from '../../../shared/types/team'
import {
  createNextShirtNumberForLockedTeam,
  isRosterOrderLocked,
  normalizeTeamShirtNumbers,
} from '../../../shared/utils/shirtNumbers'
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
  type: 'LEAGUE' | 'TOURNAMENT'
  format: 'KNOCKOUT' | 'SWISS' | 'ROUND_ROBIN'
  status: 'DRAFT' | 'OPEN_FOR_JOIN' | 'TEAM_SUBMISSION_OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'ARCHIVED'
  visibility: 'PRIVATE' | 'INVITE_ONLY' | 'OPEN'
  maxEntrants: string
  submissionDeadline: string
  allowUnofficialRosters: boolean
}

type AuthPanelMode = 'SIGN_UP' | 'PASSWORD' | 'MAGIC_LINK'

type SignupFormState = {
  displayName: string
  email: string
  password: string
  townOrCity: string
  country: string
}

type PasswordLoginFormState = {
  email: string
  password: string
}

type MagicLinkFormState = {
  email: string
  token: string
}

type VerificationFormState = {
  token: string
}

type ProfileFormState = {
  displayName: string
  townOrCity: string
  country: string
}

type EmailChangeFormState = {
  email: string
  token: string
}

type SubmissionInspectionState = {
  competitionName: string
  coachName: string
  submission: CompetitionSubmissionDetail
}

type ConfirmationDialogState =
  | {
      kind: 'DELETE_TEAM'
      teamId: string
      title: string
      message: string
      confirmLabel: string
    }
  | {
      kind: 'REMOVE_DRAFT_PLAYER' | 'FIRE_PLAYER' | 'RETIRE_PLAYER' | 'MARK_PLAYER_DEAD'
      playerId: string
      title: string
      message: string
      confirmLabel: string
    }

type CompetitionTypeCard = {
  type: CompetitionCreateFormState['type']
  title: string
  eyebrow: string
  description: string
}

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim() ?? ''
const blockDiceBaseUrl = (import.meta.env.VITE_BLOCK_DICE_URL?.trim() || 'http://127.0.0.1:5174').replace(/\/+$/u, '')
const browserStore =
  typeof window !== 'undefined' ? new BrowserLocalStorageStore(window.localStorage) : null
const authClient =
  typeof window !== 'undefined' && apiBaseUrl && browserStore
    ? new AuthClient({
        baseUrl: apiBaseUrl,
        store: browserStore,
      })
    : null
const repositorySelection = resolveTeamRepositorySelection({
  authClient,
})
const repository = repositorySelection.repository
const competitionClient =
  typeof window !== 'undefined' && repositorySelection.mode === 'api' && apiBaseUrl && browserStore
    ? new CompetitionClient({
        baseUrl: apiBaseUrl,
        store: browserStore,
        authClient: authClient ?? undefined,
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

function applyAdjustedNumber(baseValue: number, adjustment?: number) {
  return typeof adjustment === 'number' ? baseValue + adjustment : baseValue
}

function applyAdjustedTargetNumber(baseValue: string | null, adjustment?: number, mode: 'increase' | 'decrease' = 'increase') {
  if (baseValue === null || typeof adjustment !== 'number' || adjustment === 0) {
    return baseValue ?? '-'
  }

  const match = /^(\d+)\+$/u.exec(baseValue)

  if (!match) {
    return baseValue
  }

  const currentValue = Number(match[1])
  const nextValue = mode === 'increase' ? currentValue - adjustment : currentValue + adjustment
  return `${nextValue}+`
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

function formatPlayerStatusLabel(status: SavedTeam['players'][number]['playerStatus']) {
  switch (status) {
    case 'RETIRED':
      return 'TEMP RETIRED'
    default:
      return status
  }
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

async function loadCompetitionSupplementalData(
  client: CompetitionClient,
  competition: CompetitionDetail,
  currentUserId: string,
) {
  const fixtureResult = await client
    .listFixtures(competition.id)
    .catch((): CompetitionFixtureSummary[] => [])
  const fixtureSessionEntries = await Promise.all(
    fixtureResult.map(async (fixture) => [
      fixture.id,
      await client.getFixtureMatchSession(competition.id, fixture.id).catch(() => null),
    ] as const),
  )
  const submissionDetails: CompetitionSubmissionDetail | null = await (async () => {
    const currentEntry = competition.entries.find((entry) => entry.userId === currentUserId) ?? null

    if (!currentEntry?.submission) {
      return null
    }

    const payload = await client.getSubmission(competition.id, currentEntry.id).catch(() => null)
    return payload?.submission ?? null
  })()

  return {
    fixtures: fixtureResult,
    fixtureSessions: Object.fromEntries(fixtureSessionEntries) as Record<
      string,
      CompetitionFixtureMatchSession | null
    >,
    submission: submissionDetails,
  }
}

function patchCompetitionEntry(
  competitions: CompetitionDetail[],
  competitionId: string,
  entryId: string,
  updater: (entry: CompetitionDetail['entries'][number]) => CompetitionDetail['entries'][number],
) {
  return competitions.map((competition) =>
    competition.id !== competitionId
      ? competition
      : {
          ...competition,
          entries: competition.entries.map((entry) =>
            entry.id === entryId ? updater(entry) : entry,
          ),
        },
  )
}

function toDateTimeLocalValue(isoString: string | null) {
  return isoString ? isoString.slice(0, 16) : ''
}

const defaultCompetitionFormState: CompetitionCreateFormState = {
  name: '',
  description: '',
  type: 'TOURNAMENT',
  format: 'KNOCKOUT',
  status: 'TEAM_SUBMISSION_OPEN',
  visibility: 'INVITE_ONLY',
  maxEntrants: '8',
  submissionDeadline: '',
  allowUnofficialRosters: false,
}

const competitionModeCards: CompetitionTypeCard[] = [
  {
    type: 'TOURNAMENT',
    eyebrow: 'Resurrection Baseline',
    title: 'Resurrection / Matched Play',
    description:
      'Use the current shared match room flow for event-bound play. Teams stay non-destructive here and the result should return to competition context after signoff.',
  },
  {
    type: 'LEAGUE',
    eyebrow: 'Progressive League',
    title: 'League',
    description:
      'Use competition-bound live teams that will later move through explicit pre-game and post-game progression steps outside the timer room.',
  },
]

function applyCompetitionTypeDefaults(
  current: CompetitionCreateFormState,
  nextType: CompetitionCreateFormState['type'],
): CompetitionCreateFormState {
  return {
    ...current,
    type: nextType,
    format: nextType === 'LEAGUE' ? 'ROUND_ROBIN' : 'KNOCKOUT',
    status: nextType === 'LEAGUE' ? 'OPEN_FOR_JOIN' : 'TEAM_SUBMISSION_OPEN',
  }
}

function getCompetitionTypeLabel(type: CompetitionCreateFormState['type']) {
  return type === 'TOURNAMENT' ? 'Resurrection / Matched Play' : 'League'
}

function getCompetitionModeSummary(type: CompetitionCreateFormState['type']) {
  return type === 'TOURNAMENT'
    ? 'Event rosters stay locked and non-destructive. Use the shared match room, then return the result to the competition page.'
    : 'Competition-bound teams progress over time. Match logging can reuse the room later, but roster mutation belongs in league workflow outside the timer room.'
}

function getCompetitionFormatGuidance(type: CompetitionCreateFormState['type']) {
  return type === 'TOURNAMENT'
    ? 'Resurrection / matched play can still use knockout, swiss, or round-robin pairing styles without changing the non-destructive roster model.'
    : 'League defaults should favour persistent season structure, with round-robin as the cleanest current baseline until richer league administration is added.'
}

function getCompetitionSeatLabel(type: CompetitionCreateFormState['type']) {
  return type === 'TOURNAMENT' ? 'Entrants' : 'Coaches'
}

function getCompetitionDeadlineLabel(type: CompetitionCreateFormState['type']) {
  return type === 'TOURNAMENT' ? 'Submission Deadline' : 'Entry Deadline'
}

function getCompetitionStatusChoices(type: CompetitionCreateFormState['type']) {
  return type === 'TOURNAMENT'
    ? [
        { value: 'DRAFT', label: 'Draft' },
        { value: 'OPEN_FOR_JOIN', label: 'Open For Join' },
        { value: 'TEAM_SUBMISSION_OPEN', label: 'Team Submission Open' },
      ]
    : [
        { value: 'DRAFT', label: 'Draft' },
        { value: 'OPEN_FOR_JOIN', label: 'Open For Join' },
      ]
}

function getCompetitionWorkflowHighlights(type: CompetitionCreateFormState['type']) {
  return type === 'TOURNAMENT'
    ? [
        'Use locked event rosters with no post-game team mutation.',
        'The shared match room is the intended tactical flow for this mode.',
        'After signoff, the result should return to competition context.',
      ]
    : [
        'Use progressing competition-bound teams rather than one-off event rosters.',
        'Match logging can reuse the shared room, but post-game roster changes belong elsewhere.',
        'This mode is the setup point for later pre-game and post-game league workflow.',
      ]
}

function getCompetitionFormatChoices(type: CompetitionCreateFormState['type']) {
  return type === 'TOURNAMENT'
    ? [
        { value: 'KNOCKOUT', label: 'Knockout' },
        { value: 'SWISS', label: 'Swiss' },
        { value: 'ROUND_ROBIN', label: 'Round Robin' },
      ]
    : [{ value: 'ROUND_ROBIN', label: 'Round Robin' }]
}

function getModeSpecificSettingsTitle(type: CompetitionCreateFormState['type']) {
  return type === 'TOURNAMENT' ? 'Resurrection Settings' : 'League Settings'
}

function getModeSpecificSettingsNotes(type: CompetitionCreateFormState['type']) {
  return type === 'TOURNAMENT'
    ? [
        'Default toward event-ready states such as open joining and team submission rather than long-running league administration.',
        'Use pairing formats that suit a one-event cycle, then hand finished matches back to competition context.',
        'Keep roster handling lightweight here because post-game progression does not belong to this mode.',
      ]
    : [
        'Use round-robin as the current safe default while league workflow is still being made explicit.',
        'Think of this page as setting up the league shell, not the full progression engine.',
        'Post-game mutations, treasury changes, and roster administration will be handled in later league-specific workflow.',
      ]
}

function getUnofficialRosterLabel(type: CompetitionCreateFormState['type']) {
  return type === 'TOURNAMENT' ? 'Allow Unofficial Event Rosters' : 'Allow Unofficial League Rosters'
}

export function TeamCreator() {
  const [templates, setTemplates] = useState<RosterTemplate[]>([])
  const [teams, setTeams] = useState<SavedTeamSummary[]>([])
  const [competitionTeams, setCompetitionTeams] = useState<SavedTeamSummary[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [libraryView, setLibraryView] = useState<'CREATE' | 'LOAD' | 'COMPETITIONS' | 'CREATE_COMPETITION'>('CREATE')
  const [activeTeam, setActiveTeam] = useState<SavedTeam | null>(null)
  const [selectedPositionId, setSelectedPositionId] = useState('')
  const [activeReference, setActiveReference] = useState<ReferenceModalContent | null>(null)
  const [feedback, setFeedback] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [competitions, setCompetitions] = useState<CompetitionDetail[]>([])
  const [competitionSubmissionDetails, setCompetitionSubmissionDetails] = useState<
    Record<string, CompetitionSubmissionDetail>
  >({})
  const [competitionFixtures, setCompetitionFixtures] = useState<
    Record<string, CompetitionFixtureSummary[]>
  >({})
  const [competitionFixtureSessions, setCompetitionFixtureSessions] = useState<
    Record<string, CompetitionFixtureMatchSession | null>
  >({})
  const [isCompetitionLoading, setIsCompetitionLoading] = useState(false)
  const [competitionUserId, setCompetitionUserId] = useState('')
  const [currentApiUser, setCurrentApiUser] = useState<AuthApiUser | null>(null)
  const [competitionForm, setCompetitionForm] = useState<CompetitionCreateFormState>(defaultCompetitionFormState)
  const [editingCompetitionId, setEditingCompetitionId] = useState<string | null>(null)
  const [selectedCompetitionTeamIds, setSelectedCompetitionTeamIds] = useState<Record<string, string>>({})
  const [selectedCompetitionTierIds, setSelectedCompetitionTierIds] = useState<Record<string, string>>({})
  const [authPanelMode, setAuthPanelMode] = useState<AuthPanelMode>('SIGN_UP')
  const [signupForm, setSignupForm] = useState<SignupFormState>({
    displayName: '',
    email: '',
    password: '',
    townOrCity: '',
    country: '',
  })
  const [passwordLoginForm, setPasswordLoginForm] = useState<PasswordLoginFormState>({
    email: '',
    password: '',
  })
  const [magicLinkForm, setMagicLinkForm] = useState<MagicLinkFormState>({
    email: '',
    token: '',
  })
  const [verificationForm, setVerificationForm] = useState<VerificationFormState>({
    token: '',
  })
  const [profileForm, setProfileForm] = useState<ProfileFormState>({
    displayName: '',
    townOrCity: '',
    country: '',
  })
  const [emailChangeForm, setEmailChangeForm] = useState<EmailChangeFormState>({
    email: '',
    token: '',
  })
  const [developmentVerificationToken, setDevelopmentVerificationToken] = useState<string | null>(null)
  const [developmentMagicLinkToken, setDevelopmentMagicLinkToken] = useState<string | null>(null)
  const [developmentEmailChangeToken, setDevelopmentEmailChangeToken] = useState<string | null>(null)
  const [accountFeedback, setAccountFeedback] = useState('')
  const [inspectedSubmission, setInspectedSubmission] = useState<SubmissionInspectionState | null>(null)
  const [confirmationDialog, setConfirmationDialog] = useState<ConfirmationDialogState | null>(null)
  const hasAuthenticatedApiUser = Boolean(currentApiUser)
  const [isAccountPortalOpen, setIsAccountPortalOpen] = useState(false)

  const accountPortalLabel = currentApiUser?.displayName?.trim().charAt(0).toUpperCase() || 'A'

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

  const activePlayerCount = useMemo(
    () => (activeTeam ? countActivePlayers(activeTeam) : 0),
    [activeTeam],
  )
  const rosteredPlayerCount = useMemo(
    () => (activeTeam ? countRosteredPlayers(activeTeam) : 0),
    [activeTeam],
  )
  const eligiblePlayerCount = useMemo(
    () => (activeTeam ? countEligiblePlayers(activeTeam) : 0),
    [activeTeam],
  )
  const isDraftTeam = activeTeam?.status === 'DRAFT'
  const activePlayers = useMemo(
    () => activeTeam?.players.filter((player) => player.playerStatus === 'ACTIVE') ?? [],
    [activeTeam],
  )
  const inactivePlayers = useMemo(
    () => activeTeam?.players.filter((player) => player.playerStatus !== 'ACTIVE') ?? [],
    [activeTeam],
  )
  const sortedCompetitions = useMemo(
    () =>
      [...competitions].sort((left, right) => {
        if (left.type !== right.type) {
          return left.type === 'TOURNAMENT' ? -1 : 1
        }

        return left.name.localeCompare(right.name)
      }),
    [competitions],
  )

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

        const nextTeams =
          repositorySelection.mode === 'api' && authClient && !authClient.hasStoredSession()
            ? []
            : await repository.listTeams()
        const nextCompetitionTeams =
          repositorySelection.mode === 'api' && authClient?.hasStoredSession()
            ? await repository.listCompetitionTeams()
            : []
        const nextCompetitions =
          competitionClient ? await competitionClient.listCompetitions() : []

        if (isDisposed) {
          return
        }

        setTeams(nextTeams)
        setCompetitionTeams(nextCompetitionTeams)
        setCompetitions([])
        setCompetitionSubmissionDetails({})
        setCompetitionFixtures({})
        setCompetitionFixtureSessions({})
        setSelectedCompetitionTeamIds({})
        setSelectedCompetitionTierIds({})

        if (competitionClient && authClient?.hasStoredSession()) {
          const currentUser = await competitionClient.getCurrentUser()
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
          const nextFixtures: Record<string, CompetitionFixtureSummary[]> = {}
          const nextFixtureSessions: Record<string, CompetitionFixtureMatchSession | null> = {}
          const nextTeamSelections: Record<string, string> = {}
          const nextTierSelections: Record<string, string> = {}
          const currentUserId = currentUser.id

          for (const competition of resolvedCompetitions) {
            const supplementalData = await loadCompetitionSupplementalData(
              competitionClient,
              competition,
              currentUserId,
            )

            nextFixtures[competition.id] = supplementalData.fixtures
            Object.assign(nextFixtureSessions, supplementalData.fixtureSessions)

            if (supplementalData.submission) {
              nextSubmissionDetails[competition.id] = supplementalData.submission
              nextTeamSelections[competition.id] = supplementalData.submission.sourceTeamId ?? ''
              nextTierSelections[competition.id] = supplementalData.submission.tierId ?? ''
            }
          }

          if (isDisposed) {
            return
          }

          setCompetitions(resolvedCompetitions)
          setCompetitionSubmissionDetails(nextSubmissionDetails)
          setCompetitionFixtures(nextFixtures)
          setCompetitionFixtureSessions(nextFixtureSessions)
          setSelectedCompetitionTeamIds(nextTeamSelections)
          setSelectedCompetitionTierIds(nextTierSelections)
          setCompetitionUserId(currentUserId)
          setCurrentApiUser(currentUser)
          setPasswordLoginForm((current) => ({
            ...current,
            email: currentUser.email ?? current.email,
          }))
          setMagicLinkForm((current) => ({
            ...current,
            email: currentUser.email ?? current.email,
          }))
          setProfileForm({
            displayName: currentUser.displayName,
            townOrCity: currentUser.townOrCity ?? '',
            country: currentUser.country ?? '',
          })
          setEmailChangeForm((current) => ({
            ...current,
            email: currentUser.pendingEmail ?? currentUser.email ?? current.email,
          }))
        } else {
          setCompetitionTeams([])
          setCompetitionUserId('')
          setCurrentApiUser(null)
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
    const nextTeams =
      repositorySelection.mode === 'api' && authClient && !authClient.hasStoredSession()
        ? []
        : await repository.listTeams()
    const nextCompetitionTeams =
      repositorySelection.mode === 'api' && authClient?.hasStoredSession()
        ? await repository.listCompetitionTeams()
        : []

    setTemplates(nextTemplates)
    setTeams(nextTeams)
    setCompetitionTeams(nextCompetitionTeams)
    setSelectedTemplateId((currentSelectedTemplateId) =>
      currentSelectedTemplateId && nextTemplates.some((template) => template.id === currentSelectedTemplateId)
        ? currentSelectedTemplateId
        : (nextTemplates[0]?.id ?? ''),
    )
    setFeedback('')
  }

  async function refreshCompetitionState() {
    if (!competitionClient || !authClient?.hasStoredSession()) {
      setCompetitions([])
      setCompetitionSubmissionDetails({})
      setCompetitionFixtures({})
      setCompetitionFixtureSessions({})
      setCompetitionTeams([])
      setCompetitionUserId('')
      setCurrentApiUser(null)
      return
    }

    setIsCompetitionLoading(true)

    try {
      const [competitionSummaries, currentUser] = await Promise.all([
        competitionClient.listCompetitions(),
        competitionClient.getCurrentUser(),
      ])
      const nextCompetitionTeams = await repository.listCompetitionTeams()
      const currentUserId = currentUser.id
      const competitionDetails = await Promise.all(
        competitionSummaries.map(async (competition) => competitionClient.getCompetition(competition.id)),
      )
      const resolvedCompetitions = competitionDetails.filter(
        (competition): competition is CompetitionDetail => Boolean(competition),
      )
      const nextSubmissionDetails: Record<string, CompetitionSubmissionDetail> = {}
      const nextFixtures: Record<string, CompetitionFixtureSummary[]> = {}
      const nextFixtureSessions: Record<string, CompetitionFixtureMatchSession | null> = {}
      const nextTeamSelections: Record<string, string> = {}
      const nextTierSelections: Record<string, string> = {}

      for (const competition of resolvedCompetitions) {
        const supplementalData = await loadCompetitionSupplementalData(
          competitionClient,
          competition,
          currentUserId,
        )

        nextFixtures[competition.id] = supplementalData.fixtures
        Object.assign(nextFixtureSessions, supplementalData.fixtureSessions)

        if (supplementalData.submission) {
          nextSubmissionDetails[competition.id] = supplementalData.submission
          nextTeamSelections[competition.id] = supplementalData.submission.sourceTeamId ?? ''
          nextTierSelections[competition.id] = supplementalData.submission.tierId ?? ''
        }
      }

      setCompetitions(resolvedCompetitions)
      setCompetitionSubmissionDetails(nextSubmissionDetails)
      setCompetitionFixtures(nextFixtures)
      setCompetitionFixtureSessions(nextFixtureSessions)
      setCompetitionTeams(nextCompetitionTeams)
      setSelectedCompetitionTeamIds((currentSelections) => ({
        ...currentSelections,
        ...nextTeamSelections,
      }))
      setSelectedCompetitionTierIds((currentSelections) => ({
        ...currentSelections,
        ...nextTierSelections,
      }))
      setCompetitionUserId(currentUserId)
      setCurrentApiUser(currentUser)
      setPasswordLoginForm((current) => ({
        ...current,
        email: currentUser.email ?? current.email,
      }))
      setMagicLinkForm((current) => ({
        ...current,
        email: currentUser.email ?? current.email,
      }))
      setProfileForm({
        displayName: currentUser.displayName,
        townOrCity: currentUser.townOrCity ?? '',
        country: currentUser.country ?? '',
      })
      setEmailChangeForm((current) => ({
        ...current,
        email: currentUser.pendingEmail ?? currentUser.email ?? current.email,
      }))
    } finally {
      setIsCompetitionLoading(false)
    }
  }

  async function handleCreateCompetition() {
    try {
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

      const sharedPayload = {
        name: competitionForm.name.trim(),
        description: competitionForm.description.trim(),
        maxEntrants,
        submissionDeadline: competitionForm.submissionDeadline
          ? new Date(competitionForm.submissionDeadline).toISOString()
          : null,
        allowUnofficialRosters: competitionForm.allowUnofficialRosters,
      }

      if (editingCompetitionId) {
        await competitionClient.updateCompetition(editingCompetitionId, {
          ...sharedPayload,
          status: competitionForm.status,
          visibility: competitionForm.visibility,
        })
      } else {
        await competitionClient.createCompetition({
          ...sharedPayload,
          type: competitionForm.type,
          format: competitionForm.format,
          status: competitionForm.status,
          visibility: competitionForm.visibility,
        })
      }
      const createdType = competitionForm.type
      await refreshCompetitionState()
      setCompetitionForm(defaultCompetitionFormState)
      setEditingCompetitionId(null)
      setLibraryView('COMPETITIONS')
      setFeedback(
        editingCompetitionId
          ? `${getCompetitionTypeLabel(createdType)} competition updated.`
          : createdType === 'TOURNAMENT'
            ? 'Resurrection / matched play competition created. Next step: move into entrants, submissions, and fixture setup.'
            : 'League competition created. Next step: shape entrants and later league-specific administration around this shell.',
      )
    } catch (error) {
      setFeedback(
        error instanceof Error
          ? `${editingCompetitionId ? 'Competition update' : 'Competition create'} failed: ${error.message}`
          : `${editingCompetitionId ? 'Competition update' : 'Competition create'} failed.`,
      )
    }
  }

  function handleStartCompetitionEdit(competition: CompetitionDetail) {
    setEditingCompetitionId(competition.id)
    setCompetitionForm({
      name: competition.name,
      description: competition.description ?? '',
      type: competition.type,
      format: competition.format,
      status: competition.status,
      visibility: competition.visibility,
      maxEntrants: String(competition.maxEntrants),
      submissionDeadline: toDateTimeLocalValue(competition.submissionDeadline),
      allowUnofficialRosters: competition.allowUnofficialRosters,
    })
    setLibraryView('CREATE_COMPETITION')
    setFeedback(`Editing ${competition.name}.`)
  }

  function handleCancelCompetitionEdit() {
    setEditingCompetitionId(null)
    setCompetitionForm(defaultCompetitionFormState)
    setLibraryView('COMPETITIONS')
    setFeedback('Competition edit cancelled.')
  }

  async function handleJoinCompetition(competitionId: string) {
    try {
      if (!competitionClient) {
        setFeedback('Competition tools require the shared API repository mode.')
        return
      }

      const joinedEntry = await competitionClient.joinCompetition(competitionId)
      setCompetitions((currentCompetitions) =>
        currentCompetitions.map((competition) =>
          competition.id !== competitionId
            ? competition
            : {
                ...competition,
                entrantCount: competition.entrantCount + 1,
                entries: [...competition.entries, joinedEntry],
              },
        ),
      )
      await refreshCompetitionState()
      setFeedback('Joined competition.')
    } catch (error) {
      setFeedback(error instanceof Error ? `Competition join failed: ${error.message}` : 'Competition join failed.')
    }
  }

  async function handleSubmitCompetitionTeam(competitionId: string, entryId: string) {
    try {
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
        const updatedSubmission = await competitionClient.updateSubmission(competitionId, entryId, {
          sourceTeamId,
          tierId: tierId || null,
          extraSkillsPackageJson: {},
        })
        setCompetitionSubmissionDetails((current) => ({
          ...current,
          [competitionId]: updatedSubmission,
        }))
        setCompetitions((currentCompetitions) =>
          patchCompetitionEntry(currentCompetitions, competitionId, entryId, (entry) => ({
            ...entry,
            status: 'TEAM_SUBMITTED',
            submittedAt: updatedSubmission.submittedAt,
            approvedAt: null,
            submission: {
              id: updatedSubmission.id,
              sourceTeamId: updatedSubmission.sourceTeamId,
              competitionTeamId: updatedSubmission.competitionTeamId,
              teamName: updatedSubmission.teamName,
              rosterTemplateId: updatedSubmission.rosterTemplateId,
              submittedAt: updatedSubmission.submittedAt,
            },
          })),
        )
        await refreshCompetitionState()
        setFeedback('Competition team submission updated.')
      } else {
        const createdSubmission = await competitionClient.submitTeam(competitionId, entryId, {
          sourceTeamId,
          tierId: tierId || null,
          extraSkillsPackageJson: {},
        })
        setCompetitionSubmissionDetails((current) => ({
          ...current,
          [competitionId]: createdSubmission,
        }))
        setCompetitions((currentCompetitions) =>
          patchCompetitionEntry(currentCompetitions, competitionId, entryId, (entry) => ({
            ...entry,
            status: 'TEAM_SUBMITTED',
            submittedAt: createdSubmission.submittedAt,
            approvedAt: null,
            submission: {
              id: createdSubmission.id,
              sourceTeamId: createdSubmission.sourceTeamId,
              competitionTeamId: createdSubmission.competitionTeamId,
              teamName: createdSubmission.teamName,
              rosterTemplateId: createdSubmission.rosterTemplateId,
              submittedAt: createdSubmission.submittedAt,
            },
          })),
        )
        await refreshCompetitionState()
        setFeedback('Competition team submitted.')
      }
    } catch (error) {
      setFeedback(
        error instanceof Error ? `Competition submission failed: ${error.message}` : 'Competition submission failed.',
      )
    }
  }

  async function handleApproveCompetitionSubmission(competitionId: string, entryId: string) {
    try {
      if (!competitionClient) {
        setFeedback('Competition tools require the shared API repository mode.')
        return
      }

      const approvedEntry = await competitionClient.approveSubmission(competitionId, entryId)
      setCompetitions((currentCompetitions) =>
        patchCompetitionEntry(currentCompetitions, competitionId, entryId, () => approvedEntry),
      )
      await refreshCompetitionState()
      setFeedback('Competition team submission approved.')
    } catch (error) {
      setFeedback(
        error instanceof Error ? `Competition approval failed: ${error.message}` : 'Competition approval failed.',
      )
    }
  }

  async function handleGenerateCompetitionFixtures(competitionId: string) {
    try {
      if (!competitionClient) {
        setFeedback('Competition tools require the shared API repository mode.')
        return
      }

      await competitionClient.generateFixtures(competitionId)
      await refreshCompetitionState()
      setFeedback('Fixtures generated.')
    } catch (error) {
      setFeedback(
        error instanceof Error ? `Fixture generation failed: ${error.message}` : 'Fixture generation failed.',
      )
    }
  }

  async function handleCreateFixtureMatchSession(competitionId: string, fixtureId: string) {
    try {
      if (!competitionClient) {
        setFeedback('Competition tools require the shared API repository mode.')
        return
      }

      const matchSession = await competitionClient.createFixtureMatchSession(competitionId, fixtureId)
      setCompetitionFixtureSessions((current) => ({
        ...current,
        [fixtureId]: matchSession,
      }))
      setFeedback(`Match room ready. Session code: ${matchSession.sessionCode}.`)
    } catch (error) {
      setFeedback(
        error instanceof Error ? `Match room creation failed: ${error.message}` : 'Match room creation failed.',
      )
    }
  }

  function handleOpenBlockDiceMatchRoom(sessionCode: string) {
    if (!authClient?.hasStoredSession()) {
      setFeedback('Sign in before opening the match room.')
      return
    }

    const sessionToken = authClient.getSessionToken()

    if (!sessionToken) {
      setFeedback('Sign in before opening the match room.')
      return
    }

    const matchRoomUrl = `${blockDiceBaseUrl}/?sessionCode=${encodeURIComponent(sessionCode)}#authToken=${encodeURIComponent(sessionToken)}`
    window.open(matchRoomUrl, '_blank', 'noopener,noreferrer')
  }

  async function handleInspectCompetitionSubmission(
    competitionId: string,
    competitionName: string,
    entryId: string,
    coachName: string,
  ) {
    try {
      if (!competitionClient) {
        setFeedback('Competition tools require the shared API repository mode.')
        return
      }

      const payload = await competitionClient.getSubmission(competitionId, entryId)

      if (!payload) {
        setFeedback('That submitted team could not be loaded.')
        return
      }

      setInspectedSubmission({
        competitionName,
        coachName,
        submission: payload.submission,
      })
    } catch (error) {
      setFeedback(
        error instanceof Error ? `Submission review failed: ${error.message}` : 'Submission review failed.',
      )
    }
  }

  async function refreshAuthenticatedState(user: AuthApiUser, message: string) {
    setCurrentApiUser(user)
    setCompetitionUserId(user.id)
    setIsAccountPortalOpen(false)
    setAccountFeedback('')
    setProfileForm({
      displayName: user.displayName,
      townOrCity: user.townOrCity ?? '',
      country: user.country ?? '',
    })
    setEmailChangeForm((current) => ({
      ...current,
      email: user.pendingEmail ?? user.email ?? current.email,
      token: '',
    }))
    await refreshState()
    await refreshCompetitionState()
    setFeedback(message)
  }

  async function handleUpdateProfile() {
    try {
      if (!authClient) {
        setFeedback('Account tools require the shared API repository mode.')
        return
      }

      const result = await authClient.updateProfile({
        displayName: profileForm.displayName,
        townOrCity: profileForm.townOrCity || null,
        country: profileForm.country || null,
      })

      setCurrentApiUser(result.user)
      setAccountFeedback('Account details saved.')
      setFeedback('Account details saved.')
    } catch (error) {
      setAccountFeedback(error instanceof Error ? error.message : 'Profile update failed.')
      setFeedback(error instanceof Error ? `Profile update failed: ${error.message}` : 'Profile update failed.')
    }
  }

  async function handleRequestEmailChange() {
    try {
      if (!authClient) {
        setFeedback('Account tools require the shared API repository mode.')
        return
      }

      const result = await authClient.requestEmailChange(emailChangeForm.email)
      setCurrentApiUser(result.user)
      setDevelopmentEmailChangeToken(result.verification.token)
      setEmailChangeForm((current) => ({
        ...current,
        token: result.verification.token,
      }))
      setAccountFeedback('Email change requested. Verify the new email token to activate it.')
      setFeedback('Email change requested.')
    } catch (error) {
      setAccountFeedback(error instanceof Error ? error.message : 'Email change request failed.')
      setFeedback(
        error instanceof Error ? `Email change request failed: ${error.message}` : 'Email change request failed.',
      )
    }
  }

  async function handleVerifyEmailChange() {
    try {
      if (!authClient) {
        setFeedback('Account tools require the shared API repository mode.')
        return
      }

      const result = await authClient.verifyEmailChange(emailChangeForm.token)
      setCurrentApiUser(result.user)
      setDevelopmentEmailChangeToken(null)
      setEmailChangeForm({
        email: result.user.email ?? '',
        token: '',
      })
      setAccountFeedback('Email address updated and verified.')
      setFeedback('Email address updated and verified.')
    } catch (error) {
      setAccountFeedback(error instanceof Error ? error.message : 'Email change verification failed.')
      setFeedback(
        error instanceof Error
          ? `Email change verification failed: ${error.message}`
          : 'Email change verification failed.',
      )
    }
  }

  async function handleSignup() {
    try {
      if (!authClient) {
        setFeedback('Account tools require the shared API repository mode.')
        return
      }

      const result = await authClient.signup({
        displayName: signupForm.displayName,
        email: signupForm.email,
        password: signupForm.password,
        townOrCity: signupForm.townOrCity || undefined,
        country: signupForm.country || undefined,
      })

      setDevelopmentVerificationToken(result.verification.token)
      setVerificationForm({
        token: result.verification.token,
      })
      setPasswordLoginForm((current) => ({
        ...current,
        email: signupForm.email,
      }))
      setMagicLinkForm((current) => ({
        ...current,
        email: signupForm.email,
      }))
      setAuthPanelMode('SIGN_UP')
      setAccountFeedback('Account created. Verify the email token to finish sign-in.')
      setFeedback(`Account created for ${result.user.displayName}. Verify the email token to finish sign-in.`)
    } catch (error) {
      setAccountFeedback(error instanceof Error ? error.message : 'Signup failed.')
      setFeedback(
        error instanceof Error ? `Signup failed: ${error.message}` : 'Signup failed.',
      )
    }
  }

  async function handleVerifyEmail() {
    try {
      if (!authClient) {
        setFeedback('Account tools require the shared API repository mode.')
        return
      }

      const result = await authClient.verifyEmail(verificationForm.token)
      setDevelopmentVerificationToken(null)
      await refreshAuthenticatedState(result.user, `Email verified. Signed in as ${result.user.displayName}.`)
    } catch (error) {
      setAccountFeedback(error instanceof Error ? error.message : 'Email verification failed.')
      setFeedback(
        error instanceof Error ? `Email verification failed: ${error.message}` : 'Email verification failed.',
      )
    }
  }

  async function handlePasswordLogin() {
    try {
      if (!authClient) {
        setFeedback('Account tools require the shared API repository mode.')
        return
      }

      const result = await authClient.loginWithPassword({
        email: passwordLoginForm.email,
        password: passwordLoginForm.password,
      })
      await refreshAuthenticatedState(result.user, `Signed in as ${result.user.displayName}.`)
    } catch (error) {
      setAccountFeedback(error instanceof Error ? error.message : 'Password login failed.')
      setFeedback(
        error instanceof Error ? `Password login failed: ${error.message}` : 'Password login failed.',
      )
    }
  }

  async function handleRequestMagicLink() {
    try {
      if (!authClient) {
        setFeedback('Account tools require the shared API repository mode.')
        return
      }

      const result = await authClient.requestMagicLink(magicLinkForm.email)
      setDevelopmentMagicLinkToken(result.token)
      setMagicLinkForm((current) => ({
        ...current,
        token: result.token,
      }))
      setAuthPanelMode('MAGIC_LINK')
      setAccountFeedback('Magic-link token issued for development use.')
      setFeedback('Magic link token issued for development use.')
    } catch (error) {
      setAccountFeedback(error instanceof Error ? error.message : 'Magic-link request failed.')
      setFeedback(
        error instanceof Error ? `Magic-link request failed: ${error.message}` : 'Magic-link request failed.',
      )
    }
  }

  async function handleConsumeMagicLink() {
    try {
      if (!authClient) {
        setFeedback('Account tools require the shared API repository mode.')
        return
      }

      const result = await authClient.consumeMagicLink(magicLinkForm.token)
      setDevelopmentMagicLinkToken(null)
      await refreshAuthenticatedState(result.user, `Signed in as ${result.user.displayName}.`)
    } catch (error) {
      setAccountFeedback(error instanceof Error ? error.message : 'Magic-link login failed.')
      setFeedback(
        error instanceof Error ? `Magic-link login failed: ${error.message}` : 'Magic-link login failed.',
      )
    }
  }

  async function handleLogout() {
    try {
      if (!authClient) {
        setFeedback('Account tools require the shared API repository mode.')
        return
      }

      await authClient.logout()
      setCurrentApiUser(null)
      setCompetitionUserId('')
      setCompetitionTeams([])
      setCompetitions([])
      setCompetitionSubmissionDetails({})
      setCompetitionFixtures({})
      setCompetitionFixtureSessions({})
      setIsAccountPortalOpen(false)
      setAccountFeedback('')
      await refreshState()
      setFeedback('Signed out of the shared API account.')
    } catch (error) {
      setAccountFeedback(error instanceof Error ? error.message : 'Logout failed.')
      setFeedback(error instanceof Error ? `Logout failed: ${error.message}` : 'Logout failed.')
    }
  }

  async function handleCreateTeam() {
    if (repositorySelection.mode === 'api' && authClient && !authClient.hasStoredSession()) {
      setFeedback('Sign in to create and save teams in shared API mode.')
      return
    }

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
    setFeedback(
      nextTeam.isCompetitionCopy
        ? `Loaded competition team copy ${nextTeam.name}. Competition copies are managed through competition workflow.`
        : `Loaded ${nextTeam.name}.`,
    )
  }

  async function handleDeleteTeam(teamId: string) {
    await repository.deleteTeam(teamId)

    if (activeTeam?.id === teamId) {
      setActiveTeam(null)
    }

    await refreshState()
    setFeedback('Team deleted.')
  }

  async function handleConfirmedAction() {
    if (!confirmationDialog) {
      return
    }

    const action = confirmationDialog
    setConfirmationDialog(null)

    if (action.kind === 'DELETE_TEAM') {
      await handleDeleteTeam(action.teamId)
      return
    }

    if (action.kind === 'REMOVE_DRAFT_PLAYER') {
      handleRemovePlayer(action.playerId)
      return
    }

    if (action.kind === 'FIRE_PLAYER') {
      handleFirePlayer(action.playerId)
      return
    }

    if (action.kind === 'RETIRE_PLAYER') {
      handleRetirePlayer(action.playerId)
      return
    }

    if (action.kind === 'MARK_PLAYER_DEAD') {
      handleMarkPlayerDead(action.playerId)
    }
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
    updateActiveTeam((team) => {
      if (!isRosterOrderLocked(team)) {
        return {
          ...team,
          players: team.players.filter((player) => player.id !== playerId),
        }
      }

      const playerToArchive = team.players.find((player) => player.id === playerId)

      if (!playerToArchive) {
        return team
      }

      return {
        ...team,
        draftBudget: Math.max(0, team.draftBudget - playerToArchive.currentValue),
        players: team.players.map((player) =>
          player.id === playerId
            ? {
                ...player,
                playerStatus: 'SOLD',
                isDead: false,
                missNextGame: false,
              }
            : player,
        ),
      }
    })
  }

  function handleMovePlayer(playerId: string, direction: 'up' | 'down') {
    updateActiveTeam((team) => {
      if (isRosterOrderLocked(team)) {
        return team
      }

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
        shirtNumber: createNextShirtNumberForLockedTeam(team),
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

  function handlePlayerSppChange(playerId: string, value: string) {
    const spp = Math.max(0, Number(value) || 0)

    updateActiveTeam((team) => ({
      ...team,
      players: team.players.map((player) => (player.id === playerId ? { ...player, spp } : player)),
    }))
  }

  function handlePlayerNigglingInjuriesChange(playerId: string, value: string) {
    const nigglingInjuries = Math.max(0, Number(value) || 0)

    updateActiveTeam((team) => ({
      ...team,
      players: team.players.map((player) =>
        player.id === playerId ? { ...player, nigglingInjuries } : player,
      ),
    }))
  }

  function handlePlayerMissNextGameChange(playerId: string, checked: boolean) {
    updateActiveTeam((team) => ({
      ...team,
      players: team.players.map((player) =>
        player.id === playerId ? { ...player, missNextGame: checked } : player,
      ),
    }))
  }

  function handlePlayerStatusChange(
    playerId: string,
    playerStatus: 'ACTIVE' | 'SOLD' | 'DEAD' | 'RETIRED',
  ) {
    updateActiveTeam((team) =>
      normalizeTeamShirtNumbers({
        ...team,
        players: team.players.map((player) =>
          player.id === playerId
            ? {
                ...player,
                playerStatus,
                isDead: playerStatus === 'DEAD',
                missNextGame: playerStatus === 'ACTIVE' ? player.missNextGame : false,
              }
            : player,
        ),
      }).team,
    )
  }

  function handleFirePlayer(playerId: string) {
    handleRemovePlayer(playerId)
  }

  function handleRetirePlayer(playerId: string) {
    handlePlayerStatusChange(playerId, 'RETIRED')
  }

  function handleMarkPlayerDead(playerId: string) {
    handlePlayerStatusChange(playerId, 'DEAD')
  }

  function canFirePlayer(team: SavedTeam, playerId: string) {
    const player = team.players.find((entry) => entry.id === playerId)

    if (!player || player.playerStatus !== 'ACTIVE') {
      return false
    }

    if (!isEligibleForNextGamePlayer(player)) {
      return true
    }

    return countEligiblePlayers(team) - 1 >= 11
  }

  function requestDeleteTeam(teamId: string, teamName: string) {
    setConfirmationDialog({
      kind: 'DELETE_TEAM',
      teamId,
      title: 'Delete Team?',
      message: `${teamName} will be removed from this repository. This cannot be undone from the team vault.`,
      confirmLabel: 'Delete Team',
    })
  }

  function requestRemoveDraftPlayer(playerId: string, playerName: string) {
    setConfirmationDialog({
      kind: 'REMOVE_DRAFT_PLAYER',
      playerId,
      title: 'Remove Draft Player?',
      message: `${playerName} will be removed from this draft with no penalty.`,
      confirmLabel: 'Remove Player',
    })
  }

  function requestFirePlayer(playerId: string, playerName: string) {
    if (activeTeam && !canFirePlayer(activeTeam, playerId)) {
      setFeedback(
        `${playerName} cannot be fired because it would leave fewer than 11 players eligible for the next game.`,
      )
      return
    }

    setConfirmationDialog({
      kind: 'FIRE_PLAYER',
      playerId,
      title: 'Fire Player?',
      message: `${playerName} will be archived as fired. Team value will drop, but no gold is refunded to treasury.`,
      confirmLabel: 'Fire Player',
    })
  }

  function requestRetirePlayer(playerId: string, playerName: string) {
    setConfirmationDialog({
      kind: 'RETIRE_PLAYER',
      playerId,
      title: 'Temporarily Retire Player?',
      message: `${playerName} will be marked as temporarily retired. They stay on the team list and keep their shirt number, but stop counting toward active team value.`,
      confirmLabel: 'Temporarily Retire',
    })
  }

  function requestMarkPlayerDead(playerId: string, playerName: string) {
    setConfirmationDialog({
      kind: 'MARK_PLAYER_DEAD',
      playerId,
      title: 'Mark Player Dead?',
      message: `${playerName} will be archived as dead and removed from the active roster.`,
      confirmLabel: 'Mark Dead',
    })
  }

  function handleTeamNameChange(name: string) {
    updateActiveTeam((team) => ({ ...team, name }))
  }

  function handleStatusChange(status: SavedTeam['status']) {
    updateActiveTeam((team) => normalizeTeamShirtNumbers({ ...team, status }).team)
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

    if (activeTeam.isCompetitionCopy) {
      setFeedback(
        activeTeam.competitionLocked
          ? 'This competition team copy is locked and cannot be saved from the standard team editor.'
          : 'Competition team copies are not yet saved from the standard team editor. Use the competition workflow for submission updates.',
      )
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

  function renderAccountPortal() {
    return (
      <div className={styles.accountPortal}>
        <button
          className={styles.accountDotButton}
          onClick={() => setIsAccountPortalOpen((current) => !current)}
          type="button"
        >
          <span className={styles.accountDotLabel}>{accountPortalLabel}</span>
        </button>
        {isAccountPortalOpen ? (
          <div className={styles.accountPortalPanel}>
            <div className={styles.accountPortalHeader}>
              <div>
                <p className={styles.sectionKicker}>Shared API Account</p>
                <h2 className={styles.accountPortalTitle}>
                  {hasAuthenticatedApiUser ? 'Account Management' : 'Sign In'}
                </h2>
              </div>
            </div>

            {accountFeedback ? <p className={styles.accountPortalFeedback}>{accountFeedback}</p> : null}

            {hasAuthenticatedApiUser ? (
              <div className={styles.identityControls}>
                <div className={styles.identityCard}>
                  <strong>{currentApiUser?.displayName ?? 'Unknown user'}</strong>
                  <span>{currentApiUser?.email ?? currentApiUser?.id}</span>
                  {currentApiUser?.pendingEmail ? <span>Pending email: {currentApiUser.pendingEmail}</span> : null}
                  <span>
                    {[currentApiUser?.townOrCity, currentApiUser?.country].filter(Boolean).join(', ') || 'Location not set'}
                  </span>
                  <span>{currentApiUser?.emailVerifiedAt ? 'Verified account' : 'Verification pending'}</span>
                </div>
                <div className={styles.accountFormGrid}>
                  <label className={styles.field}>
                    <span>Coach Name</span>
                    <input
                      value={profileForm.displayName}
                      onChange={(event) =>
                        setProfileForm((current) => ({ ...current, displayName: event.target.value }))
                      }
                    />
                  </label>
                  <label className={styles.field}>
                    <span>Town / City</span>
                    <input
                      value={profileForm.townOrCity}
                      onChange={(event) =>
                        setProfileForm((current) => ({ ...current, townOrCity: event.target.value }))
                      }
                    />
                  </label>
                  <label className={styles.field}>
                    <span>Country</span>
                    <input
                      value={profileForm.country}
                      onChange={(event) =>
                        setProfileForm((current) => ({ ...current, country: event.target.value }))
                      }
                    />
                  </label>
                </div>
                <div className={styles.competitionActionRow}>
                  <button
                    className={styles.primaryButton}
                    onClick={() => void handleUpdateProfile()}
                    type="button"
                  >
                    Save Account Details
                  </button>
                </div>
                <div className={styles.accountFormGrid}>
                  <label className={styles.field}>
                    <span>New Email Address</span>
                    <input
                      type="email"
                      value={emailChangeForm.email}
                      onChange={(event) =>
                        setEmailChangeForm((current) => ({ ...current, email: event.target.value }))
                      }
                    />
                  </label>
                  <label className={styles.field}>
                    <span>Email Change Token</span>
                    <input
                      value={emailChangeForm.token}
                      onChange={(event) =>
                        setEmailChangeForm((current) => ({ ...current, token: event.target.value }))
                      }
                      placeholder="Paste token or use development token"
                    />
                  </label>
                </div>
                <div className={styles.competitionActionRow}>
                  <button
                    className={styles.secondaryButton}
                    onClick={() => void handleRequestEmailChange()}
                    type="button"
                  >
                    Request Email Change
                  </button>
                  <button
                    className={styles.primaryButton}
                    onClick={() => void handleVerifyEmailChange()}
                    type="button"
                  >
                    Verify New Email
                  </button>
                  <button
                    className={styles.secondaryButton}
                    onClick={() => void handleLogout()}
                    type="button"
                  >
                    Sign Out
                  </button>
                </div>
                {developmentEmailChangeToken ? (
                  <p className={styles.helperText}>
                    Development email-change token: <code>{developmentEmailChangeToken}</code>
                  </p>
                ) : null}
                <p className={styles.helperText}>
                  Shared API mode is using the authenticated account. Team saving, competition entry, and manager actions resolve through this user.
                </p>
              </div>
            ) : (
              <div className={styles.identityControls}>
                <div className={styles.competitionActionRow}>
                  <button
                    className={authPanelMode === 'SIGN_UP' ? styles.primaryButton : styles.secondaryButton}
                    onClick={() => setAuthPanelMode('SIGN_UP')}
                    type="button"
                  >
                    Create Account
                  </button>
                  <button
                    className={authPanelMode === 'PASSWORD' ? styles.primaryButton : styles.secondaryButton}
                    onClick={() => setAuthPanelMode('PASSWORD')}
                    type="button"
                  >
                    Password Login
                  </button>
                  <button
                    className={authPanelMode === 'MAGIC_LINK' ? styles.primaryButton : styles.secondaryButton}
                    onClick={() => setAuthPanelMode('MAGIC_LINK')}
                    type="button"
                  >
                    Magic Link
                  </button>
                </div>

                {authPanelMode === 'SIGN_UP' ? (
                  <>
                    <div className={styles.accountFormGrid}>
                      <label className={styles.field}>
                        <span>Display Name</span>
                        <input
                          value={signupForm.displayName}
                          onChange={(event) =>
                            setSignupForm((current) => ({ ...current, displayName: event.target.value }))
                          }
                        />
                      </label>
                      <label className={styles.field}>
                        <span>Email</span>
                        <input
                          type="email"
                          value={signupForm.email}
                          onChange={(event) =>
                            setSignupForm((current) => ({ ...current, email: event.target.value }))
                          }
                        />
                      </label>
                      <label className={styles.field}>
                        <span>Password</span>
                        <input
                          type="password"
                          value={signupForm.password}
                          onChange={(event) =>
                            setSignupForm((current) => ({ ...current, password: event.target.value }))
                          }
                        />
                      </label>
                      <label className={styles.field}>
                        <span>Town / City</span>
                        <input
                          value={signupForm.townOrCity}
                          onChange={(event) =>
                            setSignupForm((current) => ({ ...current, townOrCity: event.target.value }))
                          }
                        />
                      </label>
                      <label className={styles.field}>
                        <span>Country</span>
                        <input
                          value={signupForm.country}
                          onChange={(event) =>
                            setSignupForm((current) => ({ ...current, country: event.target.value }))
                          }
                        />
                      </label>
                    </div>
                    <div className={styles.competitionActionRow}>
                      <button className={styles.primaryButton} onClick={() => void handleSignup()} type="button">
                        Create Account
                      </button>
                    </div>
                    <label className={styles.field}>
                      <span>Verification Token</span>
                      <input
                        value={verificationForm.token}
                        onChange={(event) => setVerificationForm({ token: event.target.value })}
                        placeholder="Paste token or use development token"
                      />
                    </label>
                    <div className={styles.competitionActionRow}>
                      <button
                        className={styles.secondaryButton}
                        onClick={() => void handleVerifyEmail()}
                        type="button"
                      >
                        Verify Email
                      </button>
                    </div>
                    {developmentVerificationToken ? (
                      <p className={styles.helperText}>
                        Development verification token: <code>{developmentVerificationToken}</code>
                      </p>
                    ) : null}
                  </>
                ) : null}

                {authPanelMode === 'PASSWORD' ? (
                  <>
                    <div className={styles.accountFormGrid}>
                      <label className={styles.field}>
                        <span>Email</span>
                        <input
                          type="email"
                          value={passwordLoginForm.email}
                          onChange={(event) =>
                            setPasswordLoginForm((current) => ({
                              ...current,
                              email: event.target.value,
                            }))
                          }
                        />
                      </label>
                      <label className={styles.field}>
                        <span>Password</span>
                        <input
                          type="password"
                          value={passwordLoginForm.password}
                          onChange={(event) =>
                            setPasswordLoginForm((current) => ({
                              ...current,
                              password: event.target.value,
                            }))
                          }
                        />
                      </label>
                    </div>
                    <div className={styles.competitionActionRow}>
                      <button
                        className={styles.primaryButton}
                        onClick={() => void handlePasswordLogin()}
                        type="button"
                      >
                        Sign In
                      </button>
                    </div>
                  </>
                ) : null}

                {authPanelMode === 'MAGIC_LINK' ? (
                  <>
                    <div className={styles.accountFormGrid}>
                      <label className={styles.field}>
                        <span>Email</span>
                        <input
                          type="email"
                          value={magicLinkForm.email}
                          onChange={(event) =>
                            setMagicLinkForm((current) => ({ ...current, email: event.target.value }))
                          }
                        />
                      </label>
                      <label className={styles.field}>
                        <span>Magic-Link Token</span>
                        <input
                          value={magicLinkForm.token}
                          onChange={(event) =>
                            setMagicLinkForm((current) => ({ ...current, token: event.target.value }))
                          }
                        />
                      </label>
                    </div>
                    <div className={styles.competitionActionRow}>
                      <button
                        className={styles.secondaryButton}
                        onClick={() => void handleRequestMagicLink()}
                        type="button"
                      >
                        Request Magic Link
                      </button>
                      <button
                        className={styles.primaryButton}
                        onClick={() => void handleConsumeMagicLink()}
                        type="button"
                      >
                        Use Magic Link
                      </button>
                    </div>
                    {developmentMagicLinkToken ? (
                      <p className={styles.helperText}>
                        Development magic-link token: <code>{developmentMagicLinkToken}</code>
                      </p>
                    ) : null}
                  </>
                ) : null}

                <p className={styles.helperText}>
                  Email delivery is not wired yet. In shared API mode, development verification and magic-link tokens are shown here until the mail relay layer exists.
                </p>
              </div>
            )}
          </div>
        ) : null}
      </div>
    )
  }

  if (!activeTeam || !activeTemplate) {
    return (
      <div className={styles.appShell}>
        <header className={styles.appChrome}>
          <div className={styles.brandRow}>
            <span className={styles.burger}>|||</span>
            <strong>BB Roster</strong>
          </div>
          {renderAccountPortal()}
        </header>

        <div className={styles.pageFrame}>
          <div className={styles.centerTitleBlock}>
            <h1 className={styles.pageTitle}>
              {libraryView === 'CREATE'
                ? 'Create New Team'
                : libraryView === 'LOAD'
                  ? 'Load Saved Team'
                  : libraryView === 'CREATE_COMPETITION'
                    ? editingCompetitionId ? 'Edit Competition' : 'Create Competition'
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
            <button
              className={libraryView === 'CREATE_COMPETITION' ? styles.libraryNavButtonActive : styles.libraryNavButton}
              onClick={() => {
                if (!editingCompetitionId) {
                  setCompetitionForm(defaultCompetitionFormState)
                }
                setLibraryView('CREATE_COMPETITION')
              }}
              type="button"
            >
              Create Competition
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
                      <button
                        className={styles.deleteButton}
                        onClick={() => requestDeleteTeam(team.id, team.name)}
                        type="button"
                      >
                        Delete
                      </button>
                    </article>
                  ))
                )}
                {competitionTeams.length > 0 ? (
                  <>
                    <div className={styles.panelHeader}>
                      <div>
                        <p className={styles.sectionKicker}>Competition Copies</p>
                        <h2 className={styles.panelHeadline}>Locked Team Vault</h2>
                      </div>
                    </div>
                    {competitionTeams.map((team) => (
                      <article key={team.id} className={styles.loadRow}>
                        <button className={styles.loadRowButton} onClick={() => void handleOpenTeam(team.id)} type="button">
                          <span>{team.name}</span>
                          <span>{templates.find((template) => template.id === team.rosterTemplateId)?.name ?? 'Unknown roster'}</span>
                          <span>{team.competitionLocked ? 'Locked' : 'Pending approval'}</span>
                          <span>Team Value {formatGold(team.totalValue)} gp</span>
                        </button>
                      </article>
                    ))}
                  </>
                ) : null}
              </div>
            </section>
          ) : libraryView === 'CREATE_COMPETITION' ? (
            <section className={styles.librarySinglePane}>
              {competitionClient ? (
                <section className={styles.competitionPanel}>
                  <div className={styles.panelHeader}>
                    <div>
                      <p className={styles.sectionKicker}>
                        {editingCompetitionId ? 'Competition Settings' : 'Competition Setup'}
                      </p>
                      <h2 className={styles.panelHeadline}>
                        {editingCompetitionId ? 'Edit Competition' : 'Create Competition'}
                      </h2>
                    </div>
                    <div className={styles.competitionActionRow}>
                      <button
                        className={styles.secondaryButton}
                        onClick={() => setLibraryView('COMPETITIONS')}
                        type="button"
                      >
                        Back To Competition List
                      </button>
                      {editingCompetitionId ? (
                        <button
                          className={styles.secondaryButton}
                          onClick={handleCancelCompetitionEdit}
                          type="button"
                        >
                          Cancel Edit
                        </button>
                      ) : null}
                    </div>
                  </div>

                  <div className={styles.competitionModeGrid}>
                    {competitionModeCards.map((card) => (
                      <button
                        key={card.type}
                        type="button"
                        className={
                          competitionForm.type === card.type
                            ? `${styles.competitionModeCard} ${styles.competitionModeCardActive}`
                            : styles.competitionModeCard
                        }
                        onClick={() => setCompetitionForm((current) => applyCompetitionTypeDefaults(current, card.type))}
                      >
                        <span className={styles.sectionKicker}>{card.eyebrow}</span>
                        <strong className={styles.subsectionTitle}>{card.title}</strong>
                        <span className={styles.helperText}>{card.description}</span>
                      </button>
                    ))}
                  </div>

                  <div className={styles.competitionWorkflowGrid}>
                    {getCompetitionWorkflowHighlights(competitionForm.type).map((entry) => (
                      <article key={entry} className={styles.competitionWorkflowCard}>
                        <span className={styles.sectionKicker}>{getCompetitionTypeLabel(competitionForm.type)}</span>
                        <p className={styles.helperText}>{entry}</p>
                      </article>
                    ))}
                  </div>

                  <section className={styles.modeSettingsPanel}>
                    <div className={styles.subsectionHeader}>
                      <p className={styles.sectionKicker}>Mode-Specific Setup</p>
                      <h3 className={styles.subsectionTitle}>{getModeSpecificSettingsTitle(competitionForm.type)}</h3>
                    </div>
                    <div className={styles.modeSettingsList}>
                      {getModeSpecificSettingsNotes(competitionForm.type).map((entry) => (
                        <p key={entry} className={styles.helperText}>
                          {entry}
                        </p>
                      ))}
                    </div>
                  </section>

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
                      <span>Competition Type</span>
                      <select
                        value={competitionForm.type}
                        disabled={Boolean(editingCompetitionId)}
                        onChange={(event) => {
                          const nextType = event.target.value as CompetitionCreateFormState['type']
                          setCompetitionForm((current) => applyCompetitionTypeDefaults(current, nextType))
                        }}
                      >
                        <option value="TOURNAMENT">Resurrection / Matched Play</option>
                        <option value="LEAGUE">League</option>
                      </select>
                    </label>
                    <label className={styles.field}>
                      <span>Format</span>
                      <select
                        value={competitionForm.format}
                        disabled={Boolean(editingCompetitionId)}
                        onChange={(event) =>
                          setCompetitionForm((current) => ({
                            ...current,
                            format: event.target.value as CompetitionCreateFormState['format'],
                          }))
                        }
                      >
                        {getCompetitionFormatChoices(competitionForm.type).map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className={styles.field}>
                      <span>Visibility</span>
                      <select
                        value={competitionForm.visibility}
                        onChange={(event) =>
                          setCompetitionForm((current) => ({
                            ...current,
                            visibility: event.target.value as CompetitionCreateFormState['visibility'],
                          }))
                        }
                      >
                        <option value="PRIVATE">Private</option>
                        <option value="INVITE_ONLY">Invite Only</option>
                        <option value="OPEN">Open</option>
                      </select>
                    </label>
                    <label className={styles.field}>
                      <span>Start State</span>
                      <select
                        value={competitionForm.status}
                        onChange={(event) =>
                          setCompetitionForm((current) => ({
                            ...current,
                            status: event.target.value as CompetitionCreateFormState['status'],
                          }))
                        }
                      >
                        {getCompetitionStatusChoices(competitionForm.type).map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className={styles.field}>
                      <span>{getCompetitionSeatLabel(competitionForm.type)}</span>
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
                      <span>{getCompetitionDeadlineLabel(competitionForm.type)}</span>
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
                      <span>{getUnofficialRosterLabel(competitionForm.type)}</span>
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
                  <p className={styles.helperText}>
                    {getCompetitionModeSummary(competitionForm.type)}
                  </p>
                  <p className={styles.helperText}>
                    {getCompetitionFormatGuidance(competitionForm.type)}
                  </p>
                  <button className={styles.primaryButton} onClick={() => void handleCreateCompetition()} type="button">
                    {editingCompetitionId ? 'Save Competition Changes' : 'Create Competition'}
                  </button>
                </section>
              ) : (
                <section className={styles.competitionPanel}>
                  <div className={styles.panelHeader}>
                    <div>
                      <p className={styles.sectionKicker}>Shared API Required</p>
                      <h2 className={styles.panelHeadline}>Competition Creation</h2>
                    </div>
                  </div>
                  <p className={styles.helperText}>
                    Competition creation requires the shared API repository mode and a signed-in account.
                  </p>
                </section>
              )}
            </section>
          ) : (
            <section className={styles.librarySinglePane}>
              {competitionClient ? (
                <>
                  <section className={styles.competitionPanel}>
                    <div className={styles.panelHeader}>
                      <div>
                        <p className={styles.sectionKicker}>Shared API</p>
                        <h2 className={styles.panelHeadline}>Competition Vault</h2>
                      </div>
                      <div className={styles.competitionActionRow}>
                        <button
                          className={styles.primaryButton}
                          onClick={() => {
                            setEditingCompetitionId(null)
                            setCompetitionForm(defaultCompetitionFormState)
                            setLibraryView('CREATE_COMPETITION')
                          }}
                          type="button"
                        >
                          New Competition
                        </button>
                        <button
                          className={styles.secondaryButton}
                          onClick={() => void refreshCompetitionState()}
                          type="button"
                        >
                          Refresh
                        </button>
                      </div>
                    </div>

                    {isCompetitionLoading ? (
                      <p className={styles.helperText}>Refreshing competitions...</p>
                    ) : competitions.length === 0 ? (
                      <p className={styles.emptyState}>No competitions created yet.</p>
                    ) : (
                      <div className={styles.competitionList}>
                        {sortedCompetitions.map((competition, index) => {
                          const currentEntry =
                            competition.entries.find((entry) => entry.userId === competitionUserId) ?? null
                          const submittedEntries = competition.entries.filter(
                            (entry) => entry.status === 'TEAM_SUBMITTED' && entry.submission,
                          )
                          const approvedEntries = competition.entries.filter(
                            (entry) => entry.status === 'TEAM_APPROVED',
                          )
                          const selectedTeamId = selectedCompetitionTeamIds[competition.id] ?? ''
                          const selectedTierId = selectedCompetitionTierIds[competition.id] ?? ''
                          const submission = competitionSubmissionDetails[competition.id] ?? null
                          const fixtures = competitionFixtures[competition.id] ?? []
                          const isOwner = competition.createdByUserId === competitionUserId
                          const previousCompetitionType =
                            index > 0 ? sortedCompetitions[index - 1]?.type ?? null : null
                          const startsNewTypeGroup = index === 0 || previousCompetitionType !== competition.type

                          return (
                            <div key={competition.id} className={styles.competitionGroupStack}>
                              {startsNewTypeGroup ? (
                                <div className={styles.subsectionHeader}>
                                  <p className={styles.sectionKicker}>Competition Type</p>
                                  <h3 className={styles.subsectionTitle}>{getCompetitionTypeLabel(competition.type)}</h3>
                                  <p className={styles.helperText}>
                                    {competition.type === 'TOURNAMENT'
                                      ? 'Non-destructive event competitions using the shared match-room baseline.'
                                      : 'Progressive competitions intended for later league pre-game and post-game workflow.'}
                                  </p>
                                </div>
                              ) : null}
                              <article className={styles.competitionCard}>
                                <div className={styles.competitionCardHeader}>
                                  <div>
                                    <h3 className={styles.competitionName}>{competition.name}</h3>
                                    <p className={styles.metaLine}>
                                      {getCompetitionTypeLabel(competition.type)} • {competition.format} • {competition.status} • {competition.entrantCount}/{competition.maxEntrants} entrants
                                    </p>
                                    {competition.description ? (
                                      <p className={styles.helperText}>{competition.description}</p>
                                    ) : null}
                                  </div>
                                  <div className={styles.competitionMetaBlock}>
                                    <span>{isOwner ? 'Owner' : 'Participant View'}</span>
                                    <span>{competition.submissionDeadline ? `Deadline ${competition.submissionDeadline.slice(0, 16).replace('T', ' ')}` : 'No deadline set'}</span>
                                    {isOwner ? (
                                      <button
                                        className={styles.secondaryButton}
                                        onClick={() => handleStartCompetitionEdit(competition)}
                                        type="button"
                                      >
                                        Edit Competition
                                      </button>
                                    ) : null}
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

                              {isOwner ? (
                                <div className={styles.reviewPanel}>
                                  <div className={styles.fixturePanelHeader}>
                                    <strong>Submission Review</strong>
                                  </div>
                                  {submittedEntries.length === 0 ? (
                                    <p className={styles.helperText}>No submitted teams are currently awaiting approval.</p>
                                  ) : (
                                    <div className={styles.reviewList}>
                                      {submittedEntries.map((entry) => (
                                        <div key={entry.id} className={styles.reviewCard}>
                                          <div className={styles.reviewMeta}>
                                            <strong>{entry.submission?.teamName ?? 'Unnamed submission'}</strong>
                                            <span>{entry.user.displayName}</span>
                                            <span>{entry.status}</span>
                                          </div>
                                          <div className={styles.competitionActionRow}>
                                            <button
                                              className={styles.secondaryButton}
                                              onClick={() =>
                                                void handleInspectCompetitionSubmission(
                                                  competition.id,
                                                  competition.name,
                                                  entry.id,
                                                  entry.user.displayName,
                                                )
                                              }
                                              type="button"
                                            >
                                              View Team
                                            </button>
                                            <button
                                              className={styles.secondaryButton}
                                              onClick={() =>
                                                void handleApproveCompetitionSubmission(competition.id, entry.id)
                                              }
                                              type="button"
                                            >
                                              Approve Submission
                                            </button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ) : null}

                              <div className={styles.fixturePanel}>
                                <div className={styles.fixturePanelHeader}>
                                  <strong>Fixtures</strong>
                                  {isOwner && fixtures.length === 0 ? (
                                    <button
                                      className={styles.secondaryButton}
                                      onClick={() => void handleGenerateCompetitionFixtures(competition.id)}
                                      type="button"
                                    >
                                      Generate Fixtures
                                    </button>
                                  ) : null}
                                </div>
                                {fixtures.length === 0 ? (
                                  <p className={styles.helperText}>
                                    No fixtures generated yet. {approvedEntries.length < 2
                                      ? 'At least two approved entries from different coaches are required before a bracket can be created.'
                                      : 'Approved entries are required before a bracket can be created.'}
                                  </p>
                                ) : (
                                  <div className={styles.fixtureList}>
                                    {fixtures.map((fixture) => {
                                      const fixtureMatchSession = competitionFixtureSessions[fixture.id] ?? null
                                      const canCreateMatchRoom =
                                        isOwner &&
                                        fixture.status === 'READY' &&
                                        Boolean(fixture.homeEntry?.submission && fixture.awayEntry?.submission) &&
                                        !fixtureMatchSession
                                      const canOpenMatchRoom =
                                        Boolean(fixtureMatchSession) &&
                                        (isOwner ||
                                          fixture.homeEntry?.userId === competitionUserId ||
                                          fixture.awayEntry?.userId === competitionUserId)

                                      return (
                                        <div key={fixture.id} className={styles.fixtureCard}>
                                          <div className={styles.fixtureMeta}>
                                            <span>Round {fixture.roundNumber}</span>
                                            <span>Match {fixture.bracketPosition ?? '-'}</span>
                                            <span>{fixture.status}</span>
                                          </div>
                                          <div className={styles.fixtureTeams}>
                                            <span>{fixture.homeEntry?.submission?.teamName ?? fixture.homeEntry?.user.displayName ?? 'TBD'}</span>
                                            <span>vs</span>
                                            <span>{fixture.awayEntry?.submission?.teamName ?? fixture.awayEntry?.user.displayName ?? 'TBD'}</span>
                                          </div>
                                          {fixtureMatchSession ? (
                                            <div className={styles.inlineSuccess}>
                                              Match room code: {fixtureMatchSession.sessionCode} ({fixtureMatchSession.status})
                                            </div>
                                          ) : null}
                                          {canOpenMatchRoom ? (
                                            <div className={styles.competitionActionRow}>
                                              <button
                                                className={styles.primaryButton}
                                                onClick={() => handleOpenBlockDiceMatchRoom(fixtureMatchSession!.sessionCode)}
                                                type="button"
                                              >
                                                Open Match Room
                                              </button>
                                            </div>
                                          ) : null}
                                          {canCreateMatchRoom ? (
                                            <div className={styles.competitionActionRow}>
                                              <button
                                                className={styles.secondaryButton}
                                                onClick={() =>
                                                  void handleCreateFixtureMatchSession(
                                                    competition.id,
                                                    fixture.id,
                                                  )
                                                }
                                                type="button"
                                              >
                                                Create Match Room
                                              </button>
                                            </div>
                                          ) : null}
                                        </div>
                                      )
                                    })}
                                  </div>
                                )}
                              </div>
                            </article>
                            </div>
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
        {inspectedSubmission ? (
          <div
            className={styles.skillModalBackdrop}
            onClick={() => setInspectedSubmission(null)}
            role="presentation"
          >
            <div
              className={styles.submissionModal}
              onClick={(event) => event.stopPropagation()}
              role="dialog"
              aria-modal="true"
            >
              <button
                className={styles.skillModalClose}
                onClick={() => setInspectedSubmission(null)}
                type="button"
                aria-label="Close submission details"
              >
                ×
              </button>
              <h2 className={styles.skillModalTitle}>{inspectedSubmission.submission.teamName}</h2>
              <p className={styles.skillModalMeta}>Competition: {inspectedSubmission.competitionName}</p>
              <p className={styles.skillModalMeta}>Coach: {inspectedSubmission.coachName}</p>
              <p className={styles.skillModalMeta}>
                Roster: {templates.find((template) => template.id === inspectedSubmission.submission.rosterTemplateId)?.name ?? inspectedSubmission.submission.rosterTemplateId}
              </p>
              <p className={styles.skillModalMeta}>
                Team Value: {formatGold(inspectedSubmission.submission.teamValue)} gp
                {inspectedSubmission.submission.tierId ? ` • ${inspectedSubmission.submission.tierId}` : ''}
              </p>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Name</th>
                      <th>Position</th>
                      <th>Value</th>
                      <th>Skills</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inspectedSubmission.submission.players.map((player, index) => (
                      <tr key={player.id}>
                        <td>{player.shirtNumber ?? index + 1}</td>
                        <td>{player.name}</td>
                        <td>{player.positionTemplateId}</td>
                        <td>{formatGold(player.currentValue)} gp</td>
                        <td>{player.extraSkills.length > 0 ? player.extraSkills.join(', ') : 'None'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : null}
        {confirmationDialog ? (
          <div
            className={styles.skillModalBackdrop}
            onClick={() => setConfirmationDialog(null)}
            role="presentation"
          >
            <div
              className={styles.submissionModal}
              onClick={(event) => event.stopPropagation()}
              role="dialog"
              aria-modal="true"
            >
              <button
                className={styles.skillModalClose}
                onClick={() => setConfirmationDialog(null)}
                type="button"
                aria-label="Close confirmation"
              >
                ×
              </button>
              <h2 className={styles.skillModalTitle}>{confirmationDialog.title}</h2>
              <p className={styles.skillModalExcerpt}>{confirmationDialog.message}</p>
              <div className={styles.competitionActionRow}>
                <button
                  className={styles.secondaryButton}
                  onClick={() => setConfirmationDialog(null)}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className={styles.deleteButton}
                  onClick={() => void handleConfirmedAction()}
                  type="button"
                >
                  {confirmationDialog.confirmLabel}
                </button>
              </div>
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
        {renderAccountPortal()}
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
                {activeTemplate.name} Team &nbsp; {activePlayerCount} active / {rosteredPlayerCount} rostered &nbsp; {activeTemplate.leagues[0] ?? 'League'}
              </p>
              {activeTeam.isCompetitionCopy ? (
                <p className={styles.helperText}>
                  Competition copy{activeTeam.competitionLocked ? ' • locked' : ' • pending approval'}.
                  Standard team saving is disabled for competition-bound teams.
                </p>
              ) : null}
            </div>
            <div className={styles.heroAside}>
              <button
                className={styles.primaryButton}
                onClick={() => void handleSaveTeam()}
                type="button"
                disabled={activeTeam.isCompetitionCopy}
              >
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
              <strong>{activePlayerCount}</strong>
              <small>{eligiblePlayerCount} eligible next game • {rosteredPlayerCount}/{activeTemplatePlayerLimit} rostered</small>
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

            <div className={styles.subsectionHeader}>
              <div>
                <p className={styles.sectionKicker}>Active Roster</p>
                <h3 className={styles.subsectionTitle}>{activePlayers.length} active player{activePlayers.length === 1 ? '' : 's'}</h3>
              </div>
                <p className={styles.helperText}>
                Active players count toward TV, competition submission, and block-dice imports. Miss Next Game players stay active but are not eligible for the next fixture.
                </p>
            </div>

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
                    {!isDraftTeam ? <th>NI</th> : null}
                    {!isDraftTeam ? <th>MNG</th> : null}
                    {!isDraftTeam ? <th>Lifecycle</th> : null}
                    <th>Value</th>
                  </tr>
                </thead>
                <tbody>
                  {activePlayers.length === 0
                    ? null
                    : activePlayers.map((player, index) => {
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
                                  disabled={index === 0 || isRosterOrderLocked(activeTeam)}
                                  aria-label="Move player up"
                                >
                                  ↑
                                </button>
                                <button
                                  className={styles.iconButton}
                                  onClick={() => handleMovePlayer(player.id, 'down')}
                                  type="button"
                                  disabled={
                                    index === activePlayers.length - 1 || isRosterOrderLocked(activeTeam)
                                  }
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
                                  onClick={() =>
                                    isDraftTeam
                                      ? requestRemoveDraftPlayer(player.id, player.name)
                                      : requestFirePlayer(player.id, player.name)
                                  }
                                  type="button"
                                  aria-label={isDraftTeam ? 'Remove draft player' : 'Fire player'}
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
                          <td>{applyAdjustedNumber(position.movement, player.statAdjustments.movement)}</td>
                          <td>{applyAdjustedNumber(position.strength, player.statAdjustments.strength)}</td>
                          <td>{applyAdjustedTargetNumber(position.agility, player.statAdjustments.agility)}</td>
                          <td>{applyAdjustedTargetNumber(position.passing, player.statAdjustments.passing)}</td>
                          <td>{applyAdjustedTargetNumber(position.armour, player.statAdjustments.armour, 'decrease')}</td>
                          <td>{renderSkills(skills)}</td>
                          <td>
                            <input
                              className={styles.progressionInput}
                              type="number"
                              min="0"
                              value={player.spp}
                              onChange={(event) => handlePlayerSppChange(player.id, event.target.value)}
                            />
                          </td>
                          {!isDraftTeam ? (
                            <td>
                              <input
                                className={styles.progressionInput}
                                type="number"
                                min="0"
                                value={player.nigglingInjuries}
                                onChange={(event) =>
                                  handlePlayerNigglingInjuriesChange(player.id, event.target.value)
                                }
                              />
                            </td>
                          ) : null}
                          {!isDraftTeam ? (
                            <td>
                              <label className={styles.progressionToggle}>
                                <input
                                  type="checkbox"
                                  checked={player.missNextGame}
                                  onChange={(event) =>
                                    handlePlayerMissNextGameChange(player.id, event.target.checked)
                                  }
                                />
                                <span>{player.missNextGame ? 'Yes' : 'No'}</span>
                              </label>
                            </td>
                          ) : null}
                          {!isDraftTeam ? (
                            <td>
                              <div className={styles.lifecycleActionStack}>
                              <button
                                className={styles.rowButton}
                                onClick={() => requestFirePlayer(player.id, player.name)}
                                type="button"
                              >
                                Fire
                              </button>
                              <button
                                className={styles.rowButton}
                                onClick={() => requestRetirePlayer(player.id, player.name)}
                                type="button"
                              >
                                Temp Retire
                              </button>
                              <button
                                className={styles.rowButton}
                                onClick={() => requestMarkPlayerDead(player.id, player.name)}
                                type="button"
                              >
                                Mark Dead
                                </button>
                              </div>
                            </td>
                          ) : null}
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
                    {!isDraftTeam ? <td>0</td> : null}
                    {!isDraftTeam ? <td>No</td> : null}
                    {!isDraftTeam ? <td>No</td> : null}
                    <td>{selectedPosition ? formatGold(selectedPosition.cost) : '-'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {!isDraftTeam && inactivePlayers.length > 0 ? (
            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <p className={styles.sectionKicker}>Inactive</p>
                  <h2 className={styles.panelHeadline}>Inactive Players</h2>
                </div>
              </div>
              <p className={styles.helperText}>
                Sold and dead players remain as history. Temporarily retired players also remain on the team list, keep their shirt numbers, and still count against roster slots.
              </p>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Name</th>
                      <th>Position</th>
                      <th>Status</th>
                      <th>SPP</th>
                      <th>NI</th>
                      <th>Value</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inactivePlayers.map((player) => {
                      const position = findPosition(activeTemplate, player.positionTemplateId)

                      if (!position) {
                        return null
                      }

                      return (
                        <tr key={player.id}>
                          <td>{player.shirtNumber ?? '-'}</td>
                          <td>{player.name}</td>
                          <td>{formatPositionLabel(position)}</td>
                          <td>
                            <span className={styles.lifecycleBadge}>{formatPlayerStatusLabel(player.playerStatus)}</span>
                          </td>
                          <td>{player.spp}</td>
                          <td>{player.nigglingInjuries}</td>
                          <td>{formatGold(player.currentValue)}</td>
                          <td>
                            <span className={styles.helperText}>
                              {player.playerStatus === 'RETIRED' ? 'On team list' : 'Historical'}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

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
      {confirmationDialog ? (
        <div
          className={styles.skillModalBackdrop}
          onClick={() => setConfirmationDialog(null)}
          role="presentation"
        >
          <div
            className={styles.submissionModal}
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <button
              className={styles.skillModalClose}
              onClick={() => setConfirmationDialog(null)}
              type="button"
              aria-label="Close confirmation"
            >
              ×
            </button>
            <h2 className={styles.skillModalTitle}>{confirmationDialog.title}</h2>
            <p className={styles.skillModalExcerpt}>{confirmationDialog.message}</p>
            <div className={styles.competitionActionRow}>
              <button
                className={styles.secondaryButton}
                onClick={() => setConfirmationDialog(null)}
                type="button"
              >
                Cancel
              </button>
              <button
                className={styles.deleteButton}
                onClick={() => void handleConfirmedAction()}
                type="button"
              >
                {confirmationDialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      </div>
    </div>
  )
}
