import { useMemo, useState } from 'react'

import styles from './TeamCreator.module.css'
import { BrowserLocalStorageStore, MemoryKeyValueStore } from '../../../shared/storage/keyValueStore'
import { LocalTeamRepository } from '../../../shared/repositories/localTeamRepository'
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
import type { RosterTemplate, SavedTeam, SavedTeamSummary } from '../../../shared/types/team'
import { createTeam, createTeamPlayer } from '../utils/teamFactory'

const repository =
  typeof window !== 'undefined'
    ? new LocalTeamRepository(new BrowserLocalStorageStore(window.localStorage))
    : new LocalTeamRepository(new MemoryKeyValueStore())

function formatGold(value: number) {
  return value.toLocaleString('en-GB')
}

function formatCategories(categories: string[]) {
  return categories.length > 0 ? categories.join('') : '-'
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

  const rosterPositionGroups = useMemo(() => {
    if (!activeTemplate || !activeTeam) {
      return []
    }

    return activeTemplate.positions.map((position) => {
      const used = teamCounts[position.id] ?? 0
      const remaining = getRemainingSlots(activeTeam, activeTemplate, position.id)

      return {
        position,
        used,
        remaining,
      }
    })
  }, [activeTeam, activeTemplate, teamCounts])

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
    refreshState()
    setFeedback(`Saved ${activeTeam.name}.`)
  }

  if (!activeTeam || !activeTemplate) {
    return (
      <div className={styles.libraryLayout}>
        <header className={styles.libraryHero}>
          <div className={styles.libraryHeroCopy}>
            <p className={styles.kicker}>Blood Bowl Toolkit Suite</p>
            <h1 className={styles.libraryTitle}>Team Vault</h1>
            <p className={styles.copy}>
              Load a saved draft or start a new club from an official roster template. Each team keeps its current
              team value ready for the rest of the suite.
            </p>
          </div>
          <div className={styles.libraryStats}>
            <article className={styles.summaryCard}>
              <span>Saved Teams</span>
              <strong>{teams.length}</strong>
              <small>Local browser records</small>
            </article>
            <article className={styles.summaryCard}>
              <span>Roster Templates</span>
              <strong>{templates.length}</strong>
              <small>Seeded from rulebook sources</small>
            </article>
          </div>
        </header>

        <section className={styles.libraryDeck}>
          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <p className={styles.sectionKicker}>Start Here</p>
                <h2 className={styles.panelHeadline}>Create New Team</h2>
              </div>
            </div>
            <div className={styles.createTeamGrid}>
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
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <p className={styles.sectionKicker}>Load Existing</p>
                <h2 className={styles.panelHeadline}>Saved Teams</h2>
              </div>
            </div>

            <div className={styles.libraryList}>
              {teams.length === 0 ? (
                <p className={styles.emptyState}>No saved teams yet.</p>
              ) : (
                teams.map((team) => (
                  <article key={team.id} className={styles.libraryCard}>
                    <button className={styles.libraryCardButton} onClick={() => void handleOpenTeam(team.id)} type="button">
                      <div className={styles.libraryCardHeader}>
                        <strong>{team.name}</strong>
                        <span className={styles.libraryStatus}>{team.status.toLowerCase()}</span>
                      </div>
                      <span>{templates.find((template) => template.id === team.rosterTemplateId)?.name ?? 'Unknown roster'}</span>
                      <div className={styles.libraryMetaRow}>
                        <span>{team.playerCount} players</span>
                        <span>Team Value {formatGold(team.totalValue)} gp</span>
                      </div>
                    </button>
                    <button className={styles.deleteButton} onClick={() => void handleDeleteTeam(team.id)} type="button">
                      Delete
                    </button>
                  </article>
                ))
              )}
            </div>
          </section>
        </section>

        <footer className={styles.feedback}>{feedback || 'Choose a team to load or create a fresh draft.'}</footer>
      </div>
    )
  }

  return (
    <div className={styles.editorLayout}>
      <section className={styles.editor}>
        <>
            <div className={styles.editorTopbar}>
              <button className={styles.secondaryButton} onClick={() => setActiveTeam(null)} type="button">
                Back To Team Vault
              </button>
            </div>
            <header className={styles.hero}>
              <div className={styles.heroCopy}>
                <p className={styles.kicker}>Blood Bowl Toolkit Suite</p>
                <input
                  className={styles.teamNameInput}
                  value={activeTeam.name}
                  onChange={(event) => handleTeamNameChange(event.target.value)}
                  aria-label="Team name"
                />
                <div className={styles.heroMeta}>
                  <span className={styles.heroPill}>{activeTemplate.name}</span>
                  <span className={styles.heroPill}>{activeTeam.players.length} players</span>
                  <span className={styles.heroPill}>{activeTeam.status.toLowerCase()}</span>
                </div>
                <p className={styles.metaLine}>{activeTemplate.leagues.join(' / ') || 'League not listed'}</p>
              </div>
              <div className={styles.heroAside}>
                <div className={styles.heroValuePanel}>
                  <span>Total Team Value</span>
                  <strong>{formatGold(calculateTeamValue(activeTeam, activeTemplate))} gp</strong>
                </div>
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
                <span>Draft Budget</span>
                <strong>
                  {formatGold(activeTeam.draftBudget)} gp
                </strong>
                <small>{formatGold(calculateTreasury(activeTeam, activeTemplate))} gp treasury remaining</small>
              </article>
              <article className={styles.summaryCard}>
                <span>Player Value</span>
                <strong>{formatGold(calculatePlayerValue(activeTeam))} gp</strong>
                <small>Purchased player total</small>
              </article>
              <article className={styles.summaryCard}>
                <span>Draft Status</span>
                <strong>{draftWarnings.length === 0 ? 'Ready' : 'Needs fixes'}</strong>
                <small>
                  {activeTeam.players.length}/{activeTemplatePlayerLimit} registered players
                </small>
              </article>
            </section>

            <section className={styles.editorDeck}>
              <section className={styles.panel}>
                <div className={styles.panelHeader}>
                  <div>
                    <p className={styles.sectionKicker}>Control Desk</p>
                    <h2 className={styles.panelHeadline}>Team Ledger</h2>
                  </div>
                </div>

                <div className={styles.controlGrid}>
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
                  <label className={styles.compactField}>
                    <span>Status</span>
                    <select value={activeTeam.status} onChange={(event) => handleStatusChange(event.target.value as SavedTeam['status'])}>
                      <option value="DRAFT">Draft</option>
                      <option value="ACTIVE">Active</option>
                      <option value="RETIRED">Retired</option>
                    </select>
                  </label>
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
                    <span>Assistant Coaches</span>
                    <input
                      type="number"
                      min="0"
                      value={activeTeam.assistantCoachCount}
                      onChange={(event) => handleAssistantCoachChange(event.target.value)}
                    />
                  </label>
                  <label className={styles.compactField}>
                    <span>Cheerleaders</span>
                    <input
                      type="number"
                      min="0"
                      value={activeTeam.cheerleaderCount}
                      onChange={(event) => handleCheerleaderChange(event.target.value)}
                    />
                  </label>
                  <label className={styles.compactField}>
                    <span>Dedicated Fans</span>
                    <input
                      type="number"
                      min="1"
                      max="7"
                      value={activeTeam.dedicatedFans}
                      onChange={(event) => handleDedicatedFansChange(event.target.value)}
                    />
                  </label>
                  <label className={styles.toggleField}>
                    <span>Apothecary</span>
                    <input
                      type="checkbox"
                      checked={activeTeam.apothecaryPurchased}
                      disabled={activeTemplate.apothecary === 'NO'}
                      onChange={(event) => handleApothecaryPurchasedChange(event.target.checked)}
                    />
                    <small>
                      {activeTemplate.apothecary === 'NO'
                        ? 'Not available for this roster'
                        : activeTemplate.apothecary === 'OPTIONAL'
                          ? 'Optional purchase during draft'
                          : 'Available during draft'}
                    </small>
                  </label>
                  <div className={styles.infoCard}>
                    <span>Treasury</span>
                    <strong>{formatGold(calculateTreasury(activeTeam, activeTemplate))} gp</strong>
                  </div>
                  <div className={styles.infoCard}>
                    <span>Source</span>
                    <strong>{activeTemplate.source.replace('Blood Bowl rulebook screengrab: ', '')}</strong>
                  </div>
                </div>
              </section>

              <section className={styles.panel}>
                <div className={styles.panelHeader}>
                  <div>
                    <p className={styles.sectionKicker}>Roster Tools</p>
                    <h2 className={styles.panelHeadline}>Add Players</h2>
                  </div>
                </div>

                <div className={styles.toolbar}>
                  <label className={styles.compactField}>
                    <span>Position</span>
                    <select value={effectiveSelectedPositionId} onChange={(event) => setSelectedPositionId(event.target.value)}>
                      {activeTemplate.positions.map((position) => {
                        const used = teamCounts[position.id] ?? 0
                        const remaining = getRemainingSlots(activeTeam, activeTemplate, position.id)

                        return (
                          <option key={position.id} value={position.id} disabled={remaining <= 0}>
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
                <p className={styles.helperText}>
                  Quantity limits, shared big-guy restrictions, and draft budgeting are enforced from the roster template.
                </p>
              </section>
            </section>

            <section className={styles.summaryGrid}>
              <article className={styles.summaryCard}>
                <span>Rerolls</span>
                <strong>{formatGold(calculateRerollValue(activeTeam, activeTemplate))} gp</strong>
                <small>{activeTeam.rerollCount} rerolls at {formatGold(activeTemplate.rerollCost)} gp</small>
              </article>
              <article className={styles.summaryCard}>
                <span>Sideline Staff</span>
                <strong>
                  {formatGold(
                    calculateAssistantCoachValue(activeTeam) +
                      calculateCheerleaderValue(activeTeam) +
                      calculateApothecaryValue(activeTeam),
                  )}{' '}
                  gp
                </strong>
                <small>
                  {activeTeam.assistantCoachCount} AC • {activeTeam.cheerleaderCount} CL •{' '}
                  {activeTeam.apothecaryPurchased ? 'Apothecary bought' : 'No apothecary'}
                </small>
              </article>
              <article className={styles.summaryCard}>
                <span>Dedicated Fans</span>
                <strong>{formatGold(calculateDedicatedFansValue(activeTeam))} gp</strong>
                <small>{activeTeam.dedicatedFans} starting fans</small>
              </article>
              <article className={styles.summaryCard}>
                <span>Team Value</span>
                <strong>{formatGold(calculateTeamValue(activeTeam, activeTemplate))} gp</strong>
                <small>Players, rerolls, staff, fans, and apothecary</small>
              </article>
            </section>

            {draftWarnings.length > 0 ? (
              <section className={styles.warningPanel}>
                <div className={styles.panelHeader}>
                  <div>
                    <p className={styles.sectionKicker}>Draft Checks</p>
                    <h2 className={styles.panelHeadline}>Roster Needs Attention</h2>
                  </div>
                </div>
                <ul className={styles.warningList}>
                  {draftWarnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <p className={styles.sectionKicker}>Main Roster</p>
                  <h2 className={styles.panelHeadline}>Player Register</h2>
                </div>
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

            <section className={styles.bottomDeck}>
              <section className={styles.panel}>
                <div className={styles.panelHeader}>
                  <div>
                    <p className={styles.sectionKicker}>Template View</p>
                    <h2 className={styles.panelHeadline}>Roster Template</h2>
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
                            <td>
                              {used}/{position.maxQty}
                            </td>
                            <td>{position.name}</td>
                            <td>{formatGold(position.cost)}</td>
                            <td>{position.movement}</td>
                            <td>{position.strength}</td>
                            <td>{position.agility}</td>
                            <td>{position.passing ?? '-'}</td>
                            <td>{position.armour}</td>
                            <td>{position.startingSkills.length > 0 ? position.startingSkills.join(', ') : 'None'}</td>
                            <td>{formatCategories(position.primaryCategories)}</td>
                            <td>{formatCategories(position.secondaryCategories)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className={styles.panel}>
                <div className={styles.panelHeader}>
                  <div>
                    <p className={styles.sectionKicker}>Composition</p>
                    <h2 className={styles.panelHeadline}>Roster Breakdown</h2>
                  </div>
                </div>

                <div className={styles.breakdownGrid}>
                  {rosterPositionGroups.map(({ position, used, remaining }) => (
                    <article key={position.id} className={styles.breakdownCard}>
                      <strong>{position.name}</strong>
                      <span>
                        {used}/{position.maxQty} rostered
                      </span>
                      <span>{formatGold(position.cost)} gp</span>
                      <small>{remaining > 0 ? `${remaining} slot${remaining === 1 ? '' : 's'} open` : 'Full'}</small>
                    </article>
                  ))}
                </div>
              </section>
            </section>
        </>

        <footer className={styles.feedback}>{feedback || 'Local-first repository active. Saved teams stay in this browser for now.'}</footer>
      </section>
    </div>
  )
}
