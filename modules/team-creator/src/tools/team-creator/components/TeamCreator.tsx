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
  const [templateSearch, setTemplateSearch] = useState('')
  const [libraryView, setLibraryView] = useState<'CREATE' | 'LOAD'>('CREATE')
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

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedTemplateId) ?? templates[0] ?? null,
    [selectedTemplateId, templates],
  )

  const filteredTemplates = useMemo(() => {
    const query = templateSearch.trim().toLowerCase()

    if (!query) {
      return templates
    }

    return templates.filter((template) => {
      const haystack = [
        template.name,
        template.leagues.join(' '),
        template.specialRules.join(' '),
        ...template.positions.map((position) => position.name),
      ]
        .join(' ')
        .toLowerCase()

      return haystack.includes(query)
    })
  }, [templateSearch, templates])

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
            <h1 className={styles.pageTitle}>{libraryView === 'CREATE' ? 'Create New Team' : 'Load Saved Team'}</h1>
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
          </nav>

          {libraryView === 'CREATE' ? (
            <section className={styles.librarySinglePane}>
              <section className={styles.clonePickerPanel}>
                <div className={styles.cloneFilterRow}>
                  <label className={styles.cloneSearchLabel}>
                    <span>Search</span>
                    <input
                      value={templateSearch}
                      onChange={(event) => setTemplateSearch(event.target.value)}
                      placeholder="Team type"
                    />
                  </label>
                </div>

                <div className={styles.cloneChipField}>
                  {filteredTemplates.map((template) => (
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
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>

                  <section className={styles.cloneNameBar}>
                    <label className={styles.field}>
                      <span>Team Name</span>
                      <input
                        value={newTeamName}
                        onChange={(event) => setNewTeamName(event.target.value)}
                        placeholder={`Enter ${selectedTemplate.name} team name`}
                      />
                    </label>
                  </section>
                </section>
              )}
            </section>
          ) : (
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
          )}

          <footer className={styles.feedback}>{feedback || 'Choose a team to load or create a fresh draft.'}</footer>
        </div>
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

            <div className={styles.inlineDraftRow}>
              <span className={styles.inlineDraftCellMuted}>Player Name</span>
              <div className={styles.inlineDraftActions}>
                <button className={styles.inlineAddButton} onClick={handleAddPlayer} type="button">
                  +
                </button>
                <span>x</span>
                <span>1</span>
              </div>
              <label className={styles.inlineDraftSelectWrap}>
                <span className={styles.visuallyHidden}>Position</span>
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
              <span className={styles.inlineDraftHint}>Quantity and shared-limit checks are enforced automatically.</span>
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

          <section className={styles.draftSummaryDeck}>
            <section className={styles.financialZone}>
              <section className={styles.summaryGrid}>
                <article className={styles.summaryCard}>
                  <span>Rerolls</span>
                  <strong>{formatGold(calculateRerollValue(activeTeam, activeTemplate))} gp</strong>
                  <small>{activeTeam.rerollCount} purchased</small>
                </article>
                <article className={styles.summaryCard}>
                  <span>Sideline Staff</span>
                  <strong>{formatGold(calculateAssistantCoachValue(activeTeam) + calculateCheerleaderValue(activeTeam))} gp</strong>
                  <small>{activeTeam.assistantCoachCount} AC • {activeTeam.cheerleaderCount} CL</small>
                </article>
                <article className={styles.summaryCard}>
                  <span>Dedicated Fans</span>
                  <strong>{formatGold(calculateDedicatedFansValue(activeTeam))} gp</strong>
                  <small>{activeTeam.dedicatedFans} starting fans</small>
                </article>
                <article className={styles.summaryCard}>
                  <span>Apothecary</span>
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
                  <span>Rerolls</span>
                  <span>Assistant Coaches</span>
                  <span>Cheerleaders</span>
                  <span>Dedicated Fans</span>
                  <span>Apothecary</span>
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
                    <span>{used}/{position.maxQty} rostered</span>
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
    </div>
  )
}
