import type { BoardState, PlacedPlayer, PlayerProfile, Position, Skill, TeamSide } from '../../../shared/types/game'
import type {
  AssistDetail,
  AssistStatus,
  AssistType,
  BlockDiceCalculation,
  DiceChooser,
  ExplanationSection,
} from '../types/blockDice'

interface BlockCalculationOptions {
  isBlitz?: boolean
}

interface EvaluatedPlayer {
  placedPlayer: PlacedPlayer
  profile: PlayerProfile
}

function isAdjacent(left: Position, right: Position) {
  const rowDelta = Math.abs(left.row - right.row)
  const colDelta = Math.abs(left.col - right.col)
  return (rowDelta > 0 || colDelta > 0) && rowDelta <= 1 && colDelta <= 1
}

function hasActiveTackleZone(player: PlacedPlayer) {
  return player.isStanding && player.hasTackleZone
}

function getProfile(player: PlacedPlayer, profiles: PlayerProfile[]) {
  return profiles.find((profile) => profile.id === player.profileId)
}

function requirePlayer(playerId: string | null, boardState: BoardState, profiles: PlayerProfile[]) {
  if (!playerId) {
    throw new Error('Blocker and target must be selected before calculating block dice.')
  }

  const placedPlayer = boardState.placedPlayers.find((player) => player.id === playerId)

  if (!placedPlayer) {
    throw new Error(`Selected player ${playerId} was not found on the board.`)
  }

  const profile = getProfile(placedPlayer, profiles)

  if (!profile) {
    throw new Error(`Player profile for ${playerId} was not found.`)
  }

  return { placedPlayer, profile }
}

function hasSkill(player: EvaluatedPlayer, skill: Skill) {
  return player.profile.skills.includes(skill)
}

function listMarkers(
  candidate: EvaluatedPlayer,
  boardState: BoardState,
  profiles: PlayerProfile[],
  ignoredOpponentIds: string[],
) {
  return boardState.placedPlayers
    .filter((opponent) => opponent.teamSide !== candidate.placedPlayer.teamSide)
    .filter((opponent) => !ignoredOpponentIds.includes(opponent.id))
    .filter((opponent) => hasActiveTackleZone(opponent))
    .filter((opponent) => isAdjacent(candidate.placedPlayer.position, opponent.position))
    .map((opponent) => requirePlayer(opponent.id, boardState, profiles))
}

function isGuardSuppressedByDefensive(
  candidate: EvaluatedPlayer,
  activeTeam: TeamSide,
  boardState: BoardState,
  profiles: PlayerProfile[],
) {
  if (candidate.placedPlayer.teamSide !== activeTeam) {
    return false
  }

  return boardState.placedPlayers
    .filter((player) => player.teamSide !== candidate.placedPlayer.teamSide)
    .filter((player) => hasActiveTackleZone(player))
    .filter((player) => isAdjacent(candidate.placedPlayer.position, player.position))
    .some((player) => {
      const evaluated = requirePlayer(player.id, boardState, profiles)
      return hasSkill(evaluated, 'DEFENSIVE') && player.teamSide !== activeTeam
    })
}

function buildAssistReason(
  status: AssistStatus,
  type: AssistType,
  label: string,
  markerLabels: string[],
  usedGuard: boolean,
  guardSuppressedByDefensive: boolean,
) {
  if (status === 'VALID') {
    if (usedGuard) {
      return `${label} provides a ${type.toLowerCase()} assist with Guard.`
    }

    if (guardSuppressedByDefensive) {
      return `${label} still assists normally because Guard is suppressed but no other marker cancels the assist.`
    }

    return `${label} provides a ${type.toLowerCase()} assist.`
  }

  if (status === 'CANCELLED') {
    if (guardSuppressedByDefensive) {
      return `${label} cannot use Guard because of Defensive and is marked by ${markerLabels.join(', ')}.`
    }

    return `${label} cannot assist because they are marked by ${markerLabels.join(', ')}.`
  }

  return `${label} is not eligible to assist.`
}

function evaluateAssist(
  candidate: EvaluatedPlayer,
  type: AssistType,
  activeTeam: TeamSide,
  markedPlayer: EvaluatedPlayer,
  ignoredOpponentIds: string[],
  boardState: BoardState,
  profiles: PlayerProfile[],
): AssistDetail {
  const label = candidate.profile.name ?? candidate.placedPlayer.id

  if (!candidate.placedPlayer.isStanding) {
    return {
      playerId: candidate.placedPlayer.id,
      label,
      teamSide: candidate.placedPlayer.teamSide,
      type,
      status: 'INELIGIBLE',
      reason: `${label} is prone or stunned and cannot assist.`,
      usedGuard: false,
      guardSuppressedByDefensive: false,
      strengthModifier: 0,
    }
  }

  if (!candidate.placedPlayer.hasTackleZone) {
    return {
      playerId: candidate.placedPlayer.id,
      label,
      teamSide: candidate.placedPlayer.teamSide,
      type,
      status: 'INELIGIBLE',
      reason: `${label} does not have a Tackle Zone and cannot assist.`,
      usedGuard: false,
      guardSuppressedByDefensive: false,
      strengthModifier: 0,
    }
  }

  if (!isAdjacent(candidate.placedPlayer.position, markedPlayer.placedPlayer.position)) {
    return {
      playerId: candidate.placedPlayer.id,
      label,
      teamSide: candidate.placedPlayer.teamSide,
      type,
      status: 'INELIGIBLE',
      reason: `${label} is not marking the relevant player for this assist.`,
      usedGuard: false,
      guardSuppressedByDefensive: false,
      strengthModifier: 0,
    }
  }

  const guardSuppressedByDefensive =
    hasSkill(candidate, 'GUARD') &&
    isGuardSuppressedByDefensive(candidate, activeTeam, boardState, profiles)
  const usedGuard = hasSkill(candidate, 'GUARD') && !guardSuppressedByDefensive
  const markers = listMarkers(candidate, boardState, profiles, ignoredOpponentIds)
  const markerLabels = markers.map((marker) => marker.profile.name ?? marker.placedPlayer.id)

  if (markers.length > 0 && !usedGuard) {
    return {
      playerId: candidate.placedPlayer.id,
      label,
      teamSide: candidate.placedPlayer.teamSide,
      type,
      status: 'CANCELLED',
      reason: buildAssistReason('CANCELLED', type, label, markerLabels, false, guardSuppressedByDefensive),
      usedGuard: false,
      guardSuppressedByDefensive,
      strengthModifier: 0,
    }
  }

  return {
    playerId: candidate.placedPlayer.id,
    label,
    teamSide: candidate.placedPlayer.teamSide,
    type,
    status: 'VALID',
    reason: buildAssistReason('VALID', type, label, markerLabels, usedGuard, guardSuppressedByDefensive),
    usedGuard,
    guardSuppressedByDefensive,
    strengthModifier: 1,
  }
}

function buildFinalDiceSummary(attackerStrength: number, defenderStrength: number) {
  if (attackerStrength === defenderStrength) {
    return {
      count: 1,
      chooser: 'NONE' as DiceChooser,
      summary: 'Equal Strength: 1 block die.',
    }
  }

  const attackerStronger = attackerStrength > defenderStrength
  const strongerStrength = attackerStronger ? attackerStrength : defenderStrength
  const weakerStrength = attackerStronger ? defenderStrength : attackerStrength
  const count = strongerStrength > weakerStrength * 2 ? 3 : 2

  return {
    count,
    chooser: attackerStronger ? ('ATTACKER' as DiceChooser) : ('DEFENDER' as DiceChooser),
    summary: attackerStronger
      ? `${count} block dice, attacker chooses.`
      : `${count} block dice, defender chooses.`,
  }
}

function formatLabelList(labels: string[]) {
  if (labels.length <= 1) {
    return labels[0] ?? ''
  }

  if (labels.length === 2) {
    return `${labels[0]} and ${labels[1]}`
  }

  return `${labels.slice(0, -1).join(', ')} and ${labels.at(-1)}`
}

function groupAssistExplanationEntries(assists: AssistDetail[]) {
  const relevantSuffix = ' is not marking the relevant player for this assist.'
  const irrelevantLabels = assists
    .filter((assist) => assist.reason.endsWith(relevantSuffix))
    .map((assist) => assist.label)
  const groupedEntries: string[] = []

  if (irrelevantLabels.length > 0) {
    const subject = formatLabelList(irrelevantLabels)
    const verb = irrelevantLabels.length === 1 ? 'is' : 'are'
    groupedEntries.push(`${subject} ${verb} not relevant in this block.`)
  }

  return [
    ...groupedEntries,
    ...assists
      .filter((assist) => !assist.reason.endsWith(relevantSuffix))
      .map((assist) => assist.reason),
  ]
}

function buildExplanation(
  blockerLabel: string,
  defenderLabel: string,
  attackerBaseSummary: string,
  hornsSummary: string | null,
  attackerStrength: number,
  defenderStrength: number,
  offensiveAssists: AssistDetail[],
  defensiveAssists: AssistDetail[],
  finalSummary: string,
): ExplanationSection[] {
  const offensiveExplanation = groupAssistExplanationEntries(offensiveAssists)
  const defensiveExplanation = groupAssistExplanationEntries(defensiveAssists)
  const cancelledAssists = groupAssistExplanationEntries(
    [...offensiveAssists, ...defensiveAssists].filter((assist) => assist.status !== 'VALID'),
  )

  return [
    {
      title: 'Base',
      entries: [
        `${blockerLabel} blocks ${defenderLabel}.`,
        attackerBaseSummary,
        ...(hornsSummary ? [hornsSummary] : []),
        `Base Strength comparison: ST ${attackerStrength} vs ST ${defenderStrength}.`,
      ],
    },
    {
      title: 'Offensive Assists',
      entries:
        offensiveAssists.length > 0
          ? offensiveExplanation
          : ['No offensive assist candidates.'],
    },
    {
      title: 'Defensive Assists',
      entries:
        defensiveAssists.length > 0
          ? defensiveExplanation
          : ['No defensive assist candidates.'],
    },
    {
      title: 'Cancelled / Ignored',
      entries: cancelledAssists.length > 0 ? cancelledAssists : ['No cancelled or ignored assists.'],
    },
    {
      title: 'Final',
      entries: [finalSummary],
    },
  ]
}

export function calculateBlockDice(
  boardState: BoardState,
  profiles: PlayerProfile[],
  options: BlockCalculationOptions = {},
): BlockDiceCalculation {
  const blocker = requirePlayer(boardState.blockerId, boardState, profiles)
  const target = requirePlayer(boardState.targetId, boardState, profiles)
  const activeTeam = blocker.placedPlayer.teamSide
  const attackerHasDauntless = hasSkill(blocker, 'DAUNTLESS')
  const attackerUsesHorns = Boolean(options.isBlitz) && hasSkill(blocker, 'HORNS')
  const hornsModifier = attackerUsesHorns ? 1 : 0
  const strengthAfterHorns = blocker.profile.strength + hornsModifier
  const attackerBaseStrength =
    attackerHasDauntless && target.profile.strength > strengthAfterHorns
      ? target.profile.strength
      : strengthAfterHorns
  const attackerBaseSummary = attackerHasDauntless
    ? target.profile.strength > strengthAfterHorns
      ? `${blocker.profile.name ?? blocker.placedPlayer.id} uses temporary Dauntless after Horns and rises to match ${target.profile.name ?? target.placedPlayer.id} at ST ${target.profile.strength}.`
      : `${blocker.profile.name ?? blocker.placedPlayer.id} has Dauntless, but it does not trigger because their Strength is already high enough.`
    : `${blocker.profile.name ?? blocker.placedPlayer.id} uses their normal base Strength of ST ${blocker.profile.strength}.`
  const hornsSummary = attackerUsesHorns
    ? `${blocker.profile.name ?? blocker.placedPlayer.id} gains +1 ST from Horns because this block is part of a blitz.`
    : null

  const offensiveAssists = boardState.placedPlayers
    .filter((player) => player.teamSide === blocker.placedPlayer.teamSide)
    .filter((player) => player.id !== blocker.placedPlayer.id && player.id !== target.placedPlayer.id)
    .map((player) => requirePlayer(player.id, boardState, profiles))
    .map((player) =>
      evaluateAssist(
        player,
        'OFFENSIVE',
        activeTeam,
        target,
        [target.placedPlayer.id],
        boardState,
        profiles,
      ),
    )

  const defensiveAssists = boardState.placedPlayers
    .filter((player) => player.teamSide === target.placedPlayer.teamSide)
    .filter((player) => player.id !== blocker.placedPlayer.id && player.id !== target.placedPlayer.id)
    .map((player) => requirePlayer(player.id, boardState, profiles))
    .map((player) =>
      evaluateAssist(
        player,
        'DEFENSIVE',
        activeTeam,
        blocker,
        [blocker.placedPlayer.id],
        boardState,
        profiles,
      ),
    )

  const offensiveModifier = offensiveAssists
    .filter((assist) => assist.status === 'VALID')
    .reduce((total, assist) => total + assist.strengthModifier, 0)
  const defensiveModifier = defensiveAssists
    .filter((assist) => assist.status === 'VALID')
    .reduce((total, assist) => total + assist.strengthModifier, 0)
  const attackerStrength = attackerBaseStrength + offensiveModifier
  const defenderStrength = target.profile.strength + defensiveModifier
  const finalDice = buildFinalDiceSummary(attackerStrength, defenderStrength)
  const blockerLabel = blocker.profile.name ?? blocker.placedPlayer.id
  const defenderLabel = target.profile.name ?? target.placedPlayer.id

  return {
    blocker: {
      id: blocker.placedPlayer.id,
      label: blockerLabel,
      teamSide: blocker.placedPlayer.teamSide,
      strength: attackerBaseStrength,
      position: blocker.placedPlayer.position,
    },
    target: {
      id: target.placedPlayer.id,
      label: defenderLabel,
      teamSide: target.placedPlayer.teamSide,
      strength: target.profile.strength,
      position: target.placedPlayer.position,
    },
    attackerStrength: {
      base: attackerBaseStrength,
      assistModifier: offensiveModifier,
      total: attackerStrength,
    },
    defenderStrength: {
      base: target.profile.strength,
      assistModifier: defensiveModifier,
      total: defenderStrength,
    },
    offensiveAssists,
    defensiveAssists,
    finalDice,
    explanation: buildExplanation(
      blockerLabel,
      defenderLabel,
      attackerBaseSummary,
      hornsSummary,
      attackerStrength,
      defenderStrength,
      offensiveAssists,
      defensiveAssists,
      finalDice.summary,
    ),
  }
}
