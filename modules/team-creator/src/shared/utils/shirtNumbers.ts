import type { SavedTeam, SavedTeamPlayer } from '../types/team'

function keepsReservedShirtNumber(player: Pick<SavedTeamPlayer, 'playerStatus'>) {
  return player.playerStatus === 'ACTIVE' || player.playerStatus === 'RETIRED'
}

function getNextAvailableShirtNumber(players: SavedTeamPlayer[]) {
  const usedNumbers = new Set(
    players
      .filter(keepsReservedShirtNumber)
      .map((player) => player.shirtNumber)
      .filter((value): value is number => typeof value === 'number' && value > 0),
  )

  let candidate = 1

  while (usedNumbers.has(candidate)) {
    candidate += 1
  }

  return candidate
}

export function isRosterOrderLocked(team: Pick<SavedTeam, 'status'>) {
  return team.status !== 'DRAFT'
}

export function assignFrozenShirtNumbers(players: SavedTeamPlayer[]) {
  const usedNumbers = new Set<number>()
  let changed = false

  const nextPlayers = players.map((player) => {
    if (!keepsReservedShirtNumber(player)) {
      return player
    }

    if (typeof player.shirtNumber === 'number' && player.shirtNumber > 0 && !usedNumbers.has(player.shirtNumber)) {
      usedNumbers.add(player.shirtNumber)
      return player
    }

    let nextNumber = 1

    while (usedNumbers.has(nextNumber)) {
      nextNumber += 1
    }

    usedNumbers.add(nextNumber)
    changed = true

    return {
      ...player,
      shirtNumber: nextNumber,
    }
  })

  return {
    changed,
    players: nextPlayers,
  }
}

export function normalizeTeamShirtNumbers(team: SavedTeam) {
  if (!isRosterOrderLocked(team)) {
    return {
      changed: false,
      team,
    }
  }

  const assigned = assignFrozenShirtNumbers(team.players)

  if (!assigned.changed) {
    return {
      changed: false,
      team,
    }
  }

  return {
    changed: true,
    team: {
      ...team,
      players: assigned.players,
    },
  }
}

export function createNextShirtNumberForLockedTeam(team: SavedTeam) {
  return isRosterOrderLocked(team) ? getNextAvailableShirtNumber(team.players) : null
}
