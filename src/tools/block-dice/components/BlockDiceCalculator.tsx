import { useState } from 'react'
import styles from './BlockDiceCalculator.module.css'
import type { BoardState, PlayerProfile, PlacedPlayer, Position, Skill, TeamSide } from '../../../shared/types/game'

const GRID_SIZE = 7
const STRENGTH_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8]

interface PlacementDraft {
  teamSide: TeamSide
  strength: number
  skills: Skill[]
  isStanding: boolean
  hasTackleZone: boolean
}

const defaultDraft: PlacementDraft = {
  teamSide: 'A',
  strength: 3,
  skills: [],
  isStanding: true,
  hasTackleZone: true,
}

const emptyBoardState: BoardState = {
  placedPlayers: [],
  blockerId: null,
  targetId: null,
}

function buildTokenId(teamSide: TeamSide, nextNumber: number) {
  return `${teamSide}${nextNumber}`
}

function isSamePosition(left: Position, right: Position) {
  return left.row === right.row && left.col === right.col
}

function toggleSkill(skills: Skill[], skill: Skill) {
  return skills.includes(skill) ? skills.filter((entry) => entry !== skill) : [...skills, skill]
}

function getProfileLabel(player: PlacedPlayer, profiles: PlayerProfile[]) {
  const profile = profiles.find((entry) => entry.id === player.profileId)
  return profile?.name ?? player.id
}

function getProfileStrength(player: PlacedPlayer, profiles: PlayerProfile[]) {
  const profile = profiles.find((entry) => entry.id === player.profileId)
  return profile?.strength ?? 0
}

function getProfileSkills(player: PlacedPlayer, profiles: PlayerProfile[]) {
  const profile = profiles.find((entry) => entry.id === player.profileId)
  return profile?.skills ?? []
}

export function BlockDiceCalculator() {
  const [draft, setDraft] = useState<PlacementDraft>(defaultDraft)
  const [playerProfiles, setPlayerProfiles] = useState<PlayerProfile[]>([])
  const [boardState, setBoardState] = useState<BoardState>(emptyBoardState)
  const [nextNumbers, setNextNumbers] = useState<Record<TeamSide, number>>({ A: 1, B: 1 })

  const placePlayer = (position: Position) => {
    const existingPlayer = boardState.placedPlayers.find((player) => isSamePosition(player.position, position))

    if (existingPlayer) {
      setBoardState((currentState) => ({
        ...currentState,
        placedPlayers: currentState.placedPlayers.filter((player) => player.id !== existingPlayer.id),
        blockerId: currentState.blockerId === existingPlayer.id ? null : currentState.blockerId,
        targetId: currentState.targetId === existingPlayer.id ? null : currentState.targetId,
      }))
      setPlayerProfiles((currentProfiles) =>
        currentProfiles.filter((profile) => profile.id !== existingPlayer.profileId),
      )
      return
    }

    const nextNumber = nextNumbers[draft.teamSide]
    const tokenId = buildTokenId(draft.teamSide, nextNumber)
    const profileId = `profile-${tokenId}`

    const nextProfile: PlayerProfile = {
      id: profileId,
      number: nextNumber,
      name: tokenId,
      strength: draft.strength,
      skills: draft.skills,
    }

    const nextPlacedPlayer: PlacedPlayer = {
      id: tokenId,
      profileId,
      teamSide: draft.teamSide,
      position,
      isStanding: draft.isStanding,
      hasTackleZone: draft.isStanding && draft.hasTackleZone,
    }

    setPlayerProfiles((currentProfiles) => [...currentProfiles, nextProfile])
    setBoardState((currentState) => ({
      ...currentState,
      placedPlayers: [...currentState.placedPlayers, nextPlacedPlayer],
    }))
    setNextNumbers((currentNumbers) => ({
      ...currentNumbers,
      [draft.teamSide]: currentNumbers[draft.teamSide] + 1,
    }))
  }

  const teamACount = boardState.placedPlayers.filter((player) => player.teamSide === 'A').length
  const teamBCount = boardState.placedPlayers.filter((player) => player.teamSide === 'B').length

  return (
    <div className={styles.layout}>
      <section className={styles.controls} aria-labelledby="placement-controls">
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>Placement Controls</p>
          <h3 id="placement-controls" className={styles.title}>
            Place players on the 7x7 board
          </h3>
        </div>

        <div className={styles.controlGroup}>
          <span className={styles.label}>Team</span>
          <div className={styles.toggleRow}>
            {(['A', 'B'] as TeamSide[]).map((teamSide) => (
              <button
                key={teamSide}
                type="button"
                className={teamSide === draft.teamSide ? styles.toggleActive : styles.toggle}
                onClick={() => setDraft((currentDraft) => ({ ...currentDraft, teamSide }))}
              >
                Team {teamSide}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.controlGroup}>
          <label className={styles.label} htmlFor="strength-select">
            Strength
          </label>
          <select
            id="strength-select"
            className={styles.select}
            value={draft.strength}
            onChange={(event) =>
              setDraft((currentDraft) => ({
                ...currentDraft,
                strength: Number(event.target.value),
              }))
            }
          >
            {STRENGTH_OPTIONS.map((value) => (
              <option key={value} value={value}>
                ST {value}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.controlGroup}>
          <span className={styles.label}>Skills</span>
          <div className={styles.toggleRow}>
            {(['GUARD', 'DEFENSIVE'] as Skill[]).map((skill) => (
              <button
                key={skill}
                type="button"
                className={draft.skills.includes(skill) ? styles.toggleActive : styles.toggle}
                onClick={() =>
                  setDraft((currentDraft) => ({
                    ...currentDraft,
                    skills: toggleSkill(currentDraft.skills, skill),
                  }))
                }
              >
                {skill}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.controlGroup}>
          <span className={styles.label}>Status</span>
          <div className={styles.checkRow}>
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={draft.isStanding}
                onChange={(event) =>
                  setDraft((currentDraft) => ({
                    ...currentDraft,
                    isStanding: event.target.checked,
                    hasTackleZone: event.target.checked ? currentDraft.hasTackleZone : false,
                  }))
                }
              />
              Standing
            </label>
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={draft.hasTackleZone}
                disabled={!draft.isStanding}
                onChange={(event) =>
                  setDraft((currentDraft) => ({
                    ...currentDraft,
                    hasTackleZone: event.target.checked,
                  }))
                }
              />
              Tackle zone
            </label>
          </div>
        </div>

        <div className={styles.summaryCard}>
          <p className={styles.eyebrow}>Board Summary</p>
          <ul className={styles.summaryList}>
            <li>{teamACount} players placed for Team A</li>
            <li>{teamBCount} players placed for Team B</li>
            <li>Tap an empty square to place the configured player.</li>
            <li>Tap an occupied square to remove that token.</li>
          </ul>
        </div>
      </section>

      <section className={styles.boardPanel} aria-labelledby="board-title">
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>Board</p>
          <h3 id="board-title" className={styles.title}>
            Tactical Grid
          </h3>
        </div>

        <div className={styles.grid} role="grid" aria-label="7 by 7 tactical grid">
          {Array.from({ length: GRID_SIZE }, (_, row) =>
            Array.from({ length: GRID_SIZE }, (_, col) => {
              const player = boardState.placedPlayers.find(
                (entry) => entry.position.row === row && entry.position.col === col,
              )
              const skills = player ? getProfileSkills(player, playerProfiles) : []

              return (
                <button
                  key={`${row}-${col}`}
                  type="button"
                  role="gridcell"
                  className={player ? styles.cellOccupied : styles.cell}
                  onClick={() => placePlayer({ row, col })}
                >
                  {player ? (
                    <span
                      className={
                        player.teamSide === 'A' ? styles.tokenTeamA : styles.tokenTeamB
                      }
                    >
                      <strong>{getProfileLabel(player, playerProfiles)}</strong>
                      <span className={styles.tokenMeta}>ST {getProfileStrength(player, playerProfiles)}</span>
                      <span className={styles.tokenMeta}>
                        {player.isStanding ? 'Standing' : 'Prone'}
                        {player.hasTackleZone ? ' · TZ' : ' · No TZ'}
                      </span>
                      {skills.length > 0 ? <span className={styles.tokenMeta}>{skills.join(', ')}</span> : null}
                    </span>
                  ) : (
                    <span className={styles.cellHint}>{row + 1},{col + 1}</span>
                  )}
                </button>
              )
            }),
          )}
        </div>
      </section>
    </div>
  )
}
