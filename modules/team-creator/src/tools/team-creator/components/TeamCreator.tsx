import { useMemo, useState } from 'react'

import styles from './TeamCreator.module.css'
import { BrowserLocalStorageStore, MemoryKeyValueStore } from '../../../shared/storage/keyValueStore'
import { LocalTeamRepository } from '../../../shared/repositories/localTeamRepository'
import { calculatePlayerValue, calculateRerollValue, calculateTeamValue, countPlayersByPosition } from '../../../shared/utils/teamMath'
import type { RosterTemplate, SavedTeam, SavedTeamSummary } from '../../../shared/types/team'
import { createTeam, createTeamPlayer } from '../utils/teamFactory'

const repository =
  typeof window !== 'undefined'
    ? new LocalTeamRepository(new BrowserLocalStorageStore(window.localStorage))
    : new LocalTeamRepository(new MemoryKeyValueStore())

function formatGold(value: number) {
  return value.toLocaleString('en-GB')
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

  return Math.max(0, position.maxQty - (counts[positionId] ?? 0))
}

export function TeamCreator() {
  const [templates, setTemplates] = useState<RosterTemplate[]>(() => repository.listRosterTemplatesSync())
  const [teams, setTeams] = useState<SavedTeamSummary[]>(() => repository.listTeamsSync())
  const [selectedTemplateId, setSelectedTemplateId] = useState(() => repository.listRosterTemplatesSync()[0]?.id ?? '')
  const [newTeamName, setNewTeamName] = useState('')
  const [activeTeam, setActiveTeam] = useState<SavedTeam | null>(null)
  const [selectedPositionId, setSelectedPositionId] = useState('')
  const [feedback, setFeedback] = useState('')

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

  function refreshState() {
    const nextTemplates = repository.listRosterTemplatesSync()
    const nextTeams = repository.listTeamsSync()

    setTemplates(nextTemplates)
    setTeams(nextTeams)

    if (!selectedTemplateId && nextTemplates[0]) {
      setSelectedTemplateId(nextTemplates[0].id)
    }
  }

  async function handleCreateTeam() {
    const template = templates.find((entry) => entry.id === selectedTemplateId)

    if (!template || !newTeamName.trim()) {
      setFeedback('Choose a roster and enter a team name first.')
      return
    }

    const nextTeam = createTeam(newTeamName, template)
    await repository.saveTeam(nextTeam)
    refreshState()
    setActiveTeam(nextTeam)
    setNewTeamName('')
    setFeedback(`Created ${nextTeam.name}.`)
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

    refreshState()
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

  function handlePlayerNameChange(playerId: string, name: string) {
    updateActiveTeam((team) => ({
      ...team,
      players: team.players.map((player) => (player.id === playerId ? { ...player, name } : player)),
    }))
  }

  function handlePlayerNumberChange(playerId: string, value: string) {
    updateActiveTeam((team) => ({
      ...team,
      players: team.players.map((player) =>
        player.id === playerId
          ? {
              ...player,
              shirtNumber: value ? Number(value) : null,
            }
          : player,
      ),
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

  async function handleSaveTeam() {
    if (!activeTeam) {
      return
    }

    await repository.saveTeam(activeTeam)
    refreshState()
    setFeedback(`Saved ${activeTeam.name}.`)
  }

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <header className={styles.sidebarHeader}>
          <p className={styles.kicker}>Blood Bowl Toolkit</p>
          <h1 className={styles.title}>Team Creator</h1>
          <p className={styles.copy}>
            Local-first team building with reusable saved rosters for later suite integration.
          </p>
        </header>

        <section className={styles.panel}>
          <h2 className={styles.panelTitle}>New Team</h2>
          <label className={styles.field}>
            <span>Roster</span>
            <select value={selectedTemplateId} onChange={(event) => setSelectedTemplateId(event.target.value)}>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span>Team Name</span>
            <input
              value={newTeamName}
              onChange={(event) => setNewTeamName(event.target.value)}
              placeholder="Enter team name"
            />
          </label>
          <button className={styles.primaryButton} onClick={handleCreateTeam} type="button">
            Create Team
          </button>
        </section>

        <section className={styles.panel}>
          <h2 className={styles.panelTitle}>Saved Teams</h2>
          <div className={styles.teamList}>
            {teams.length === 0 ? (
              <p className={styles.emptyState}>No saved teams yet.</p>
            ) : (
              teams.map((team) => (
                <article key={team.id} className={styles.teamCard}>
                  <button className={styles.teamCardButton} onClick={() => void handleOpenTeam(team.id)} type="button">
                    <strong>{team.name}</strong>
                    <span>{templates.find((template) => template.id === team.rosterTemplateId)?.name ?? 'Unknown roster'}</span>
                    <span>
                      {team.playerCount} players • {formatGold(team.totalValue)} gp
                    </span>
                  </button>
                  <button className={styles.deleteButton} onClick={() => void handleDeleteTeam(team.id)} type="button">
                    Delete
                  </button>
                </article>
              ))
            )}
          </div>
        </section>
      </aside>

      <section className={styles.editor}>
        {!activeTeam || !activeTemplate ? (
          <div className={styles.placeholder}>
            <h2>Select or create a team</h2>
            <p>The editor will open here once a local team record exists.</p>
          </div>
        ) : (
          <>
            <header className={styles.editorHeader}>
              <div>
                <p className={styles.kicker}>{activeTemplate.name} roster</p>
                <input
                  className={styles.teamNameInput}
                  value={activeTeam.name}
                  onChange={(event) => handleTeamNameChange(event.target.value)}
                  aria-label="Team name"
                />
                <p className={styles.metaLine}>
                  {activeTemplate.source} • Apothecary: {activeTemplate.apothecary}
                </p>
              </div>
              <div className={styles.editorActions}>
                <label className={styles.compactField}>
                  <span>Status</span>
                  <select value={activeTeam.status} onChange={(event) => handleStatusChange(event.target.value as SavedTeam['status'])}>
                    <option value="DRAFT">Draft</option>
                    <option value="ACTIVE">Active</option>
                    <option value="RETIRED">Retired</option>
                  </select>
                </label>
                <button className={styles.primaryButton} onClick={() => void handleSaveTeam()} type="button">
                  Save Team
                </button>
              </div>
            </header>

            <section className={styles.summaryGrid}>
              <article className={styles.summaryCard}>
                <span>Players</span>
                <strong>{activeTeam.players.length}</strong>
              </article>
              <article className={styles.summaryCard}>
                <span>Player Value</span>
                <strong>{formatGold(calculatePlayerValue(activeTeam))} gp</strong>
              </article>
              <article className={styles.summaryCard}>
                <span>Rerolls</span>
                <strong>{formatGold(calculateRerollValue(activeTeam, activeTemplate))} gp</strong>
              </article>
              <article className={styles.summaryCard}>
                <span>Total Value</span>
                <strong>{formatGold(calculateTeamValue(activeTeam, activeTemplate))} gp</strong>
              </article>
            </section>

            <section className={styles.panel}>
              <div className={styles.toolbar}>
                <label className={styles.compactField}>
                  <span>Rerolls</span>
                  <input
                    type="number"
                    min="0"
                    value={activeTeam.rerollCount}
                    onChange={(event) => handleRerollChange(event.target.value)}
                  />
                </label>
                <label className={styles.compactField}>
                  <span>Add Position</span>
                  <select value={effectiveSelectedPositionId} onChange={(event) => setSelectedPositionId(event.target.value)}>
                    {activeTemplate.positions.map((position) => {
                      const used = teamCounts[position.id] ?? 0

                      return (
                        <option key={position.id} value={position.id} disabled={used >= position.maxQty}>
                          {position.name} {used}/{position.maxQty}
                        </option>
                      )
                    })}
                  </select>
                </label>
                <button className={styles.primaryButton} onClick={handleAddPlayer} type="button">
                  Add Player
                </button>
              </div>

              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>#</th>
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
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeTeam.players.length === 0 ? (
                      <tr>
                        <td colSpan={13} className={styles.emptyTableCell}>
                          Add players from the selected roster template.
                        </td>
                      </tr>
                    ) : (
                      activeTeam.players.map((player, index) => {
                        const position = findPosition(activeTemplate, player.positionTemplateId)

                        if (!position) {
                          return null
                        }

                        const skills = [...position.startingSkills, ...player.extraSkills]

                        return (
                          <tr key={player.id}>
                            <td>{player.shirtNumber ?? index + 1}</td>
                            <td>
                              <input
                                className={styles.inlineInput}
                                value={player.name}
                                onChange={(event) => handlePlayerNameChange(player.id, event.target.value)}
                              />
                              <input
                                className={styles.numberInput}
                                type="number"
                                min="0"
                                placeholder="No."
                                value={player.shirtNumber ?? ''}
                                onChange={(event) => handlePlayerNumberChange(player.id, event.target.value)}
                              />
                            </td>
                            <td>{position.name}</td>
                            <td>{position.movement}</td>
                            <td>{position.strength}</td>
                            <td>{position.agility}</td>
                            <td>{position.passing ?? '-'}</td>
                            <td>{position.armour}</td>
                            <td>{skills.length > 0 ? skills.join(', ') : 'None'}</td>
                            <td>{player.spp}</td>
                            <td>{player.nigglingInjuries}</td>
                            <td>{formatGold(player.currentValue)}</td>
                            <td>
                              <button className={styles.rowButton} onClick={() => handleRemovePlayer(player.id)} type="button">
                                Remove
                              </button>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className={styles.panel}>
              <h2 className={styles.panelTitle}>Roster Breakdown</h2>
              <div className={styles.breakdownGrid}>
                {activeTemplate.positions.map((position) => {
                  const used = teamCounts[position.id] ?? 0

                  return (
                    <article key={position.id} className={styles.breakdownCard}>
                      <strong>{position.name}</strong>
                      <span>
                        {used}/{position.maxQty}
                      </span>
                      <span>{formatGold(position.cost)} gp</span>
                    </article>
                  )
                })}
              </div>
            </section>
          </>
        )}

        <footer className={styles.feedback}>{feedback || 'Local-first repository active. Saved teams stay in this browser for now.'}</footer>
      </section>
    </div>
  )
}
