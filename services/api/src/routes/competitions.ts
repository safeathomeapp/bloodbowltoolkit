import {
  CompetitionEntryStatus,
  CompetitionFormat,
  CompetitionStatus,
  CompetitionType,
  CompetitionVisibility,
  FixtureSourceType,
  FixtureStatus,
  Prisma,
  TournamentTeamSourceType,
} from '@prisma/client'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'

const competitionParamsSchema = z.object({
  competitionId: z.string().min(1),
})

const entryParamsSchema = z.object({
  competitionId: z.string().min(1),
  entryId: z.string().min(1),
})

const listCompetitionsQuerySchema = z.object({
  createdByUserId: z.string().min(1).optional(),
  userId: z.string().min(1).optional(),
  type: z.nativeEnum(CompetitionType).optional(),
  status: z.nativeEnum(CompetitionStatus).optional(),
})

const createCompetitionBodySchema = z.object({
  createdByUserId: z.string().min(1),
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).nullable().optional(),
  type: z.nativeEnum(CompetitionType),
  format: z.nativeEnum(CompetitionFormat),
  status: z.nativeEnum(CompetitionStatus).default(CompetitionStatus.DRAFT),
  visibility: z
    .nativeEnum(CompetitionVisibility)
    .default(CompetitionVisibility.PRIVATE),
  maxEntrants: z.number().int().positive(),
  submissionDeadline: z.string().datetime({ offset: true }).nullable().optional(),
  allowUnofficialRosters: z.boolean().default(false),
  configJson: z.record(z.string(), z.unknown()).default({}),
})

const joinCompetitionBodySchema = z.object({
  userId: z.string().min(1),
})

const submissionBodySchema = z.object({
  sourceTeamId: z.string().min(1),
  tierId: z.string().trim().min(1).max(80).nullable().optional(),
  extraSkillsPackageJson: z.record(z.string(), z.unknown()).default({}),
})

const approveSubmissionBodySchema = z.object({
  approvedByUserId: z.string().min(1),
})

const fixtureParamsSchema = z.object({
  competitionId: z.string().min(1),
  fixtureId: z.string().min(1),
})

const generateFixturesBodySchema = z.object({
  requestedByUserId: z.string().min(1),
})

const updateFixtureBodySchema = z.object({
  requestedByUserId: z.string().min(1),
  homeEntryId: z.string().min(1).nullable().optional(),
  awayEntryId: z.string().min(1).nullable().optional(),
  scheduledAt: z.string().datetime({ offset: true }).nullable().optional(),
})

function toIsoString(value: Date | null) {
  return value ? value.toISOString() : null
}

function toCompetitionSummary(competition: {
  id: string
  name: string
  description: string | null
  type: CompetitionType
  format: CompetitionFormat
  status: CompetitionStatus
  visibility: CompetitionVisibility
  maxEntrants: number
  submissionDeadline: Date | null
  allowUnofficialRosters: boolean
  createdByUserId: string
  createdAt: Date
  updatedAt: Date
  createdBy?: {
    id: string
    displayName: string
  }
  _count?: {
    entries: number
  }
}) {
  return {
    id: competition.id,
    name: competition.name,
    description: competition.description,
    type: competition.type,
    format: competition.format,
    status: competition.status,
    visibility: competition.visibility,
    maxEntrants: competition.maxEntrants,
    submissionDeadline: toIsoString(competition.submissionDeadline),
    allowUnofficialRosters: competition.allowUnofficialRosters,
    createdByUserId: competition.createdByUserId,
    createdAt: competition.createdAt.toISOString(),
    updatedAt: competition.updatedAt.toISOString(),
    createdBy: competition.createdBy ?? null,
    entrantCount: competition._count?.entries ?? 0,
  }
}

function toCompetitionEntrySummary(entry: {
  id: string
  competitionId: string
  userId: string
  status: CompetitionEntryStatus
  joinedAt: Date
  submittedAt: Date | null
  approvedAt: Date | null
  seed: number | null
  notes: string | null
  createdAt: Date
  updatedAt: Date
  user: {
    id: string
    displayName: string
  }
  submission?: {
    id: string
    sourceTeamId: string | null
    teamName: string
    rosterTemplateId: string
    submittedAt: Date
  } | null
}) {
  return {
    id: entry.id,
    competitionId: entry.competitionId,
    userId: entry.userId,
    status: entry.status,
    joinedAt: entry.joinedAt.toISOString(),
    submittedAt: toIsoString(entry.submittedAt),
    approvedAt: toIsoString(entry.approvedAt),
    seed: entry.seed,
    notes: entry.notes,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
    user: entry.user,
    submission: entry.submission
      ? {
          id: entry.submission.id,
          sourceTeamId: entry.submission.sourceTeamId,
          teamName: entry.submission.teamName,
          rosterTemplateId: entry.submission.rosterTemplateId,
          submittedAt: entry.submission.submittedAt.toISOString(),
        }
      : null,
  }
}

function toCompetitionSubmissionDetail(submission: {
  id: string
  competitionEntryId: string
  sourceType: TournamentTeamSourceType
  sourceTeamId: string | null
  rosterTemplateId: string
  teamName: string
  tierId: string | null
  teamValue: number
  draftBudget: number
  rerollCount: number
  assistantCoachCount: number
  cheerleaderCount: number
  dedicatedFans: number
  apothecaryPurchased: boolean
  extraSkillsPackageJson: Prisma.JsonValue
  submittedAt: Date
  createdAt: Date
  updatedAt: Date
  players: Array<{
    id: string
    sourcePlayerId: string | null
    positionTemplateId: string
    name: string
    shirtNumber: number | null
    currentValue: number
    displayOrder: number
    extraSkills: string[]
    statAdjustments: Prisma.JsonValue
  }>
}) {
  return {
    id: submission.id,
    competitionEntryId: submission.competitionEntryId,
    sourceType: submission.sourceType,
    sourceTeamId: submission.sourceTeamId,
    rosterTemplateId: submission.rosterTemplateId,
    teamName: submission.teamName,
    tierId: submission.tierId,
    teamValue: submission.teamValue,
    draftBudget: submission.draftBudget,
    rerollCount: submission.rerollCount,
    assistantCoachCount: submission.assistantCoachCount,
    cheerleaderCount: submission.cheerleaderCount,
    dedicatedFans: submission.dedicatedFans,
    apothecaryPurchased: submission.apothecaryPurchased,
    extraSkillsPackageJson: submission.extraSkillsPackageJson,
    submittedAt: submission.submittedAt.toISOString(),
    createdAt: submission.createdAt.toISOString(),
    updatedAt: submission.updatedAt.toISOString(),
    players: submission.players.map((player) => ({
      id: player.id,
      sourcePlayerId: player.sourcePlayerId,
      positionTemplateId: player.positionTemplateId,
      name: player.name,
      shirtNumber: player.shirtNumber,
      currentValue: player.currentValue,
      displayOrder: player.displayOrder,
      extraSkills: player.extraSkills,
      statAdjustments: player.statAdjustments,
    })),
  }
}

function toFixtureEntrySummary(entry: {
  id: string
  userId: string
  status: CompetitionEntryStatus
  user: {
    id: string
    displayName: string
  }
  submission: {
    id: string
    teamName: string
    rosterTemplateId: string
  } | null
}) {
  return {
    id: entry.id,
    userId: entry.userId,
    status: entry.status,
    user: entry.user,
    submission: entry.submission,
  }
}

function toFixtureSummary(fixture: {
  id: string
  competitionId: string
  roundNumber: number
  bracketPosition: number | null
  status: FixtureStatus
  sourceType: FixtureSourceType
  scheduledAt: Date | null
  nextFixtureId: string | null
  winnerEntryId: string | null
  createdAt: Date
  updatedAt: Date
  homeEntry: {
    id: string
    userId: string
    status: CompetitionEntryStatus
    user: {
      id: string
      displayName: string
    }
    submission: {
      id: string
      teamName: string
      rosterTemplateId: string
    } | null
  } | null
  awayEntry: {
    id: string
    userId: string
    status: CompetitionEntryStatus
    user: {
      id: string
      displayName: string
    }
    submission: {
      id: string
      teamName: string
      rosterTemplateId: string
    } | null
  } | null
}) {
  return {
    id: fixture.id,
    competitionId: fixture.competitionId,
    roundNumber: fixture.roundNumber,
    bracketPosition: fixture.bracketPosition,
    status: fixture.status,
    sourceType: fixture.sourceType,
    scheduledAt: toIsoString(fixture.scheduledAt),
    nextFixtureId: fixture.nextFixtureId,
    winnerEntryId: fixture.winnerEntryId,
    createdAt: fixture.createdAt.toISOString(),
    updatedAt: fixture.updatedAt.toISOString(),
    homeEntry: fixture.homeEntry ? toFixtureEntrySummary(fixture.homeEntry) : null,
    awayEntry: fixture.awayEntry ? toFixtureEntrySummary(fixture.awayEntry) : null,
  }
}

async function fetchCompetitionDetail(app: FastifyInstance, competitionId: string) {
  return app.prisma.competition.findUnique({
    where: {
      id: competitionId,
    },
    include: {
      createdBy: {
        select: {
          id: true,
          displayName: true,
        },
      },
      entries: {
        include: {
          user: {
            select: {
              id: true,
              displayName: true,
            },
          },
          submission: {
            select: {
              id: true,
              sourceTeamId: true,
              teamName: true,
              rosterTemplateId: true,
              submittedAt: true,
            },
          },
        },
        orderBy: [
          {
            joinedAt: 'asc',
          },
          {
            createdAt: 'asc',
          },
        ],
      },
      _count: {
        select: {
          entries: true,
        },
      },
    },
  })
}

async function fetchCompetitionEntry(
  app: FastifyInstance,
  competitionId: string,
  entryId: string,
) {
  return app.prisma.competitionEntry.findFirst({
    where: {
      id: entryId,
      competitionId,
    },
    include: {
      competition: true,
      user: {
        select: {
          id: true,
          displayName: true,
        },
      },
      submission: {
        include: {
          players: {
            orderBy: {
              displayOrder: 'asc',
            },
          },
        },
      },
    },
  })
}

type FixtureReader = Pick<Prisma.TransactionClient, 'fixture'> | Pick<FastifyInstance['prisma'], 'fixture'>

async function fetchCompetitionFixtures(prisma: FixtureReader, competitionId: string) {
  return prisma.fixture.findMany({
    where: {
      competitionId,
    },
    include: {
      homeEntry: {
        include: {
          user: {
            select: {
              id: true,
              displayName: true,
            },
          },
          submission: {
            select: {
              id: true,
              teamName: true,
              rosterTemplateId: true,
            },
          },
        },
      },
      awayEntry: {
        include: {
          user: {
            select: {
              id: true,
              displayName: true,
            },
          },
          submission: {
            select: {
              id: true,
              teamName: true,
              rosterTemplateId: true,
            },
          },
        },
      },
    },
    orderBy: [
      {
        roundNumber: 'asc',
      },
      {
        bracketPosition: 'asc',
      },
      {
        createdAt: 'asc',
      },
    ],
  })
}

export async function registerCompetitionRoutes(app: FastifyInstance) {
  app.post('/competitions', async (request, reply) => {
    const bodyResult = createCompetitionBodySchema.safeParse(request.body)

    if (!bodyResult.success) {
      return reply.code(400).send({
        message: 'Invalid competition payload.',
        issues: bodyResult.error.issues,
      })
    }

    const owner = await app.prisma.user.findUnique({
      where: {
        id: bodyResult.data.createdByUserId,
      },
    })

    if (!owner) {
      return reply.code(404).send({
        message: 'Competition owner not found.',
      })
    }

    const competition = await app.prisma.competition.create({
      data: {
        createdByUserId: bodyResult.data.createdByUserId,
        name: bodyResult.data.name,
        description: bodyResult.data.description ?? null,
        type: bodyResult.data.type,
        format: bodyResult.data.format,
        status: bodyResult.data.status,
        visibility: bodyResult.data.visibility,
        maxEntrants: bodyResult.data.maxEntrants,
        submissionDeadline: bodyResult.data.submissionDeadline
          ? new Date(bodyResult.data.submissionDeadline)
          : null,
        allowUnofficialRosters: bodyResult.data.allowUnofficialRosters,
        configJson: bodyResult.data.configJson as Prisma.InputJsonValue,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            displayName: true,
          },
        },
        _count: {
          select: {
            entries: true,
          },
        },
      },
    })

    return reply.code(201).send({
      competition: toCompetitionSummary(competition),
    })
  })

  app.get('/competitions', async (request, reply) => {
    const queryResult = listCompetitionsQuerySchema.safeParse(request.query)

    if (!queryResult.success) {
      return reply.code(400).send({
        message: 'Invalid competition filter query.',
        issues: queryResult.error.issues,
      })
    }

    const competitions = await app.prisma.competition.findMany({
      where: {
        createdByUserId: queryResult.data.createdByUserId,
        type: queryResult.data.type,
        status: queryResult.data.status,
        ...(queryResult.data.userId
          ? {
              entries: {
                some: {
                  userId: queryResult.data.userId,
                },
              },
            }
          : {}),
      },
      include: {
        createdBy: {
          select: {
            id: true,
            displayName: true,
          },
        },
        _count: {
          select: {
            entries: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    })

    return reply.send({
      competitions: competitions.map(toCompetitionSummary),
    })
  })

  app.get('/competitions/:competitionId', async (request, reply) => {
    const paramsResult = competitionParamsSchema.safeParse(request.params)

    if (!paramsResult.success) {
      return reply.code(400).send({
        message: 'Invalid competition id.',
      })
    }

    const competition = await fetchCompetitionDetail(app, paramsResult.data.competitionId)

    if (!competition) {
      return reply.code(404).send({
        message: 'Competition not found.',
      })
    }

    return reply.send({
      competition: {
        ...toCompetitionSummary(competition),
        configJson: competition.configJson,
        entries: competition.entries.map(toCompetitionEntrySummary),
      },
    })
  })

  app.post('/competitions/:competitionId/join', async (request, reply) => {
    const paramsResult = competitionParamsSchema.safeParse(request.params)
    const bodyResult = joinCompetitionBodySchema.safeParse(request.body)

    if (!paramsResult.success) {
      return reply.code(400).send({
        message: 'Invalid competition id.',
      })
    }

    if (!bodyResult.success) {
      return reply.code(400).send({
        message: 'Invalid join payload.',
        issues: bodyResult.error.issues,
      })
    }

    const [competition, user] = await Promise.all([
      app.prisma.competition.findUnique({
        where: {
          id: paramsResult.data.competitionId,
        },
        include: {
          _count: {
            select: {
              entries: true,
            },
          },
        },
      }),
      app.prisma.user.findUnique({
        where: {
          id: bodyResult.data.userId,
        },
      }),
    ])

    if (!competition) {
      return reply.code(404).send({
        message: 'Competition not found.',
      })
    }

    if (!user) {
      return reply.code(404).send({
        message: 'User not found.',
      })
    }

    if (
      competition.status !== CompetitionStatus.OPEN_FOR_JOIN &&
      competition.status !== CompetitionStatus.TEAM_SUBMISSION_OPEN
    ) {
      return reply.code(409).send({
        message: 'Competition is not currently accepting joins.',
      })
    }

    const existingEntry = await app.prisma.competitionEntry.findUnique({
      where: {
        competitionId_userId: {
          competitionId: competition.id,
          userId: user.id,
        },
      },
    })

    if (existingEntry) {
      return reply.code(409).send({
        message: 'User has already joined this competition.',
      })
    }

    if (competition._count.entries >= competition.maxEntrants) {
      return reply.code(409).send({
        message: 'Competition is already full.',
      })
    }

    const entry = await app.prisma.competitionEntry.create({
      data: {
        competitionId: competition.id,
        userId: user.id,
        status: CompetitionEntryStatus.TEAM_PENDING,
      },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
          },
        },
      },
    })

    return reply.code(201).send({
      entry: toCompetitionEntrySummary(entry),
    })
  })

  app.get('/competitions/:competitionId/entries/:entryId/submission', async (request, reply) => {
    const paramsResult = entryParamsSchema.safeParse(request.params)

    if (!paramsResult.success) {
      return reply.code(400).send({
        message: 'Invalid competition entry id.',
      })
    }

    const entry = await fetchCompetitionEntry(
      app,
      paramsResult.data.competitionId,
      paramsResult.data.entryId,
    )

    if (!entry) {
      return reply.code(404).send({
        message: 'Competition entry not found.',
      })
    }

    if (!entry.submission) {
      return reply.code(404).send({
        message: 'Competition team submission not found.',
      })
    }

    return reply.send({
      entry: toCompetitionEntrySummary(entry),
      submission: toCompetitionSubmissionDetail(entry.submission),
    })
  })

  app.post('/competitions/:competitionId/entries/:entryId/submission', async (request, reply) => {
    const paramsResult = entryParamsSchema.safeParse(request.params)
    const bodyResult = submissionBodySchema.safeParse(request.body)

    if (!paramsResult.success) {
      return reply.code(400).send({
        message: 'Invalid competition entry id.',
      })
    }

    if (!bodyResult.success) {
      return reply.code(400).send({
        message: 'Invalid competition submission payload.',
        issues: bodyResult.error.issues,
      })
    }

    const entry = await fetchCompetitionEntry(
      app,
      paramsResult.data.competitionId,
      paramsResult.data.entryId,
    )

    if (!entry) {
      return reply.code(404).send({
        message: 'Competition entry not found.',
      })
    }

    if (entry.competition.type !== CompetitionType.TOURNAMENT) {
      return reply.code(409).send({
        message: 'Team submissions are only supported for tournament competitions.',
      })
    }

    if (
      entry.competition.status !== CompetitionStatus.OPEN_FOR_JOIN &&
      entry.competition.status !== CompetitionStatus.TEAM_SUBMISSION_OPEN
    ) {
      return reply.code(409).send({
        message: 'Competition is not currently accepting team submissions.',
      })
    }

    if (
      entry.competition.submissionDeadline &&
      entry.competition.submissionDeadline.getTime() < Date.now()
    ) {
      return reply.code(409).send({
        message: 'The team submission deadline has passed.',
      })
    }

    if (entry.submission) {
      return reply.code(409).send({
        message: 'Competition entry already has a submitted team snapshot.',
      })
    }

    if (
      entry.status !== CompetitionEntryStatus.JOINED &&
      entry.status !== CompetitionEntryStatus.TEAM_PENDING
    ) {
      return reply.code(409).send({
        message: 'Competition entry is not in a state that can accept a new submission.',
      })
    }

    const team = await app.prisma.team.findUnique({
      where: {
        id: bodyResult.data.sourceTeamId,
      },
      include: {
        players: {
          orderBy: {
            displayOrder: 'asc',
          },
        },
      },
    })

    if (!team) {
      return reply.code(404).send({
        message: 'Source team not found.',
      })
    }

    if (team.ownerUserId !== entry.userId) {
      return reply.code(409).send({
        message: 'Users may only submit their own saved teams.',
      })
    }

    const teamValue = team.players.reduce((sum, player) => sum + player.currentValue, 0)
    const submittedAt = new Date()
    const createdSubmission = await app.prisma.$transaction(async (transaction) => {
      const submission = await transaction.competitionTeamSubmission.create({
        data: {
          competitionEntryId: entry.id,
          sourceType: TournamentTeamSourceType.COPIED_FROM_TEAM,
          sourceTeamId: team.id,
          rosterTemplateId: team.rosterTemplateId,
          teamName: team.name,
          tierId: bodyResult.data.tierId ?? null,
          teamValue,
          draftBudget: team.draftBudget,
          rerollCount: team.rerollCount,
          assistantCoachCount: team.assistantCoachCount,
          cheerleaderCount: team.cheerleaderCount,
          dedicatedFans: team.dedicatedFans,
          apothecaryPurchased: team.apothecaryPurchased,
          extraSkillsPackageJson: bodyResult.data.extraSkillsPackageJson as Prisma.InputJsonValue,
          submittedAt,
          players: {
            create: team.players.map((player) => ({
              sourcePlayerId: player.id,
              positionTemplateId: player.positionTemplateId,
              name: player.name,
              shirtNumber: player.shirtNumber,
              currentValue: player.currentValue,
              displayOrder: player.displayOrder,
              extraSkills: player.extraSkills,
              statAdjustments: player.statAdjustments as Prisma.InputJsonValue,
            })),
          },
        },
        include: {
          players: {
            orderBy: {
              displayOrder: 'asc',
            },
          },
        },
      })

      await transaction.competitionEntry.update({
        where: {
          id: entry.id,
        },
        data: {
          status: CompetitionEntryStatus.TEAM_SUBMITTED,
          submittedAt,
          approvedAt: null,
        },
      })

      return submission
    })

    return reply.code(201).send({
      submission: toCompetitionSubmissionDetail(createdSubmission),
    })
  })

  app.put('/competitions/:competitionId/entries/:entryId/submission', async (request, reply) => {
    const paramsResult = entryParamsSchema.safeParse(request.params)
    const bodyResult = submissionBodySchema.safeParse(request.body)

    if (!paramsResult.success) {
      return reply.code(400).send({
        message: 'Invalid competition entry id.',
      })
    }

    if (!bodyResult.success) {
      return reply.code(400).send({
        message: 'Invalid competition submission payload.',
        issues: bodyResult.error.issues,
      })
    }

    const entry = await fetchCompetitionEntry(
      app,
      paramsResult.data.competitionId,
      paramsResult.data.entryId,
    )

    if (!entry) {
      return reply.code(404).send({
        message: 'Competition entry not found.',
      })
    }

    if (!entry.submission) {
      return reply.code(404).send({
        message: 'Competition team submission not found.',
      })
    }

    if (entry.competition.type !== CompetitionType.TOURNAMENT) {
      return reply.code(409).send({
        message: 'Team submissions are only supported for tournament competitions.',
      })
    }

    if (entry.status === CompetitionEntryStatus.TEAM_APPROVED) {
      return reply.code(409).send({
        message: 'Approved tournament submissions cannot be changed.',
      })
    }

    if (
      entry.competition.submissionDeadline &&
      entry.competition.submissionDeadline.getTime() < Date.now()
    ) {
      return reply.code(409).send({
        message: 'The team submission deadline has passed.',
      })
    }

    const team = await app.prisma.team.findUnique({
      where: {
        id: bodyResult.data.sourceTeamId,
      },
      include: {
        players: {
          orderBy: {
            displayOrder: 'asc',
          },
        },
      },
    })

    if (!team) {
      return reply.code(404).send({
        message: 'Source team not found.',
      })
    }

    if (team.ownerUserId !== entry.userId) {
      return reply.code(409).send({
        message: 'Users may only submit their own saved teams.',
      })
    }

    const teamValue = team.players.reduce((sum, player) => sum + player.currentValue, 0)
    const submittedAt = new Date()
    const updatedSubmission = await app.prisma.$transaction(async (transaction) => {
      await transaction.competitionTeamSubmissionPlayer.deleteMany({
        where: {
          competitionTeamSubmissionId: entry.submission!.id,
        },
      })

      const submission = await transaction.competitionTeamSubmission.update({
        where: {
          id: entry.submission!.id,
        },
        data: {
          sourceType: TournamentTeamSourceType.COPIED_FROM_TEAM,
          sourceTeamId: team.id,
          rosterTemplateId: team.rosterTemplateId,
          teamName: team.name,
          tierId: bodyResult.data.tierId ?? null,
          teamValue,
          draftBudget: team.draftBudget,
          rerollCount: team.rerollCount,
          assistantCoachCount: team.assistantCoachCount,
          cheerleaderCount: team.cheerleaderCount,
          dedicatedFans: team.dedicatedFans,
          apothecaryPurchased: team.apothecaryPurchased,
          extraSkillsPackageJson: bodyResult.data.extraSkillsPackageJson as Prisma.InputJsonValue,
          submittedAt,
          players: {
            create: team.players.map((player) => ({
              sourcePlayerId: player.id,
              positionTemplateId: player.positionTemplateId,
              name: player.name,
              shirtNumber: player.shirtNumber,
              currentValue: player.currentValue,
              displayOrder: player.displayOrder,
              extraSkills: player.extraSkills,
              statAdjustments: player.statAdjustments as Prisma.InputJsonValue,
            })),
          },
        },
        include: {
          players: {
            orderBy: {
              displayOrder: 'asc',
            },
          },
        },
      })

      await transaction.competitionEntry.update({
        where: {
          id: entry.id,
        },
        data: {
          status: CompetitionEntryStatus.TEAM_SUBMITTED,
          submittedAt,
          approvedAt: null,
        },
      })

      return submission
    })

    return reply.send({
      submission: toCompetitionSubmissionDetail(updatedSubmission),
    })
  })

  app.post('/competitions/:competitionId/entries/:entryId/approve', async (request, reply) => {
    const paramsResult = entryParamsSchema.safeParse(request.params)
    const bodyResult = approveSubmissionBodySchema.safeParse(request.body)

    if (!paramsResult.success) {
      return reply.code(400).send({
        message: 'Invalid competition entry id.',
      })
    }

    if (!bodyResult.success) {
      return reply.code(400).send({
        message: 'Invalid competition approval payload.',
        issues: bodyResult.error.issues,
      })
    }

    const entry = await fetchCompetitionEntry(
      app,
      paramsResult.data.competitionId,
      paramsResult.data.entryId,
    )

    if (!entry) {
      return reply.code(404).send({
        message: 'Competition entry not found.',
      })
    }

    if (!entry.submission) {
      return reply.code(404).send({
        message: 'Competition team submission not found.',
      })
    }

    if (entry.competition.createdByUserId !== bodyResult.data.approvedByUserId) {
      return reply.code(403).send({
        message: 'Only the competition owner can approve tournament submissions.',
      })
    }

    if (entry.status !== CompetitionEntryStatus.TEAM_SUBMITTED) {
      return reply.code(409).send({
        message: 'Only submitted teams can be approved.',
      })
    }

    const approvedAt = new Date()
    const approvedEntry = await app.prisma.competitionEntry.update({
      where: {
        id: entry.id,
      },
      data: {
        status: CompetitionEntryStatus.TEAM_APPROVED,
        approvedAt,
      },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
          },
        },
        submission: {
          select: {
            id: true,
            sourceTeamId: true,
            teamName: true,
            rosterTemplateId: true,
            submittedAt: true,
          },
        },
      },
    })

    return reply.send({
      entry: toCompetitionEntrySummary(approvedEntry),
    })
  })

  app.post('/competitions/:competitionId/fixtures/generate', async (request, reply) => {
    const paramsResult = competitionParamsSchema.safeParse(request.params)
    const bodyResult = generateFixturesBodySchema.safeParse(request.body)

    if (!paramsResult.success) {
      return reply.code(400).send({
        message: 'Invalid competition id.',
      })
    }

    if (!bodyResult.success) {
      return reply.code(400).send({
        message: 'Invalid fixture generation payload.',
        issues: bodyResult.error.issues,
      })
    }

    const competition = await app.prisma.competition.findUnique({
      where: {
        id: paramsResult.data.competitionId,
      },
      include: {
        entries: {
          include: {
            user: {
              select: {
                id: true,
                displayName: true,
              },
            },
            submission: {
              select: {
                id: true,
                teamName: true,
                rosterTemplateId: true,
              },
            },
          },
          where: {
            status: CompetitionEntryStatus.TEAM_APPROVED,
          },
          orderBy: [
            {
              approvedAt: 'asc',
            },
            {
              createdAt: 'asc',
            },
          ],
        },
        fixtures: {
          select: {
            id: true,
          },
          take: 1,
        },
      },
    })

    if (!competition) {
      return reply.code(404).send({
        message: 'Competition not found.',
      })
    }

    if (competition.createdByUserId !== bodyResult.data.requestedByUserId) {
      return reply.code(403).send({
        message: 'Only the competition owner can generate fixtures.',
      })
    }

    if (competition.type !== CompetitionType.TOURNAMENT || competition.format !== CompetitionFormat.KNOCKOUT) {
      return reply.code(409).send({
        message: 'Fixture generation is currently implemented only for knockout tournaments.',
      })
    }

    if (competition.fixtures.length > 0) {
      return reply.code(409).send({
        message: 'Fixtures already exist for this competition.',
      })
    }

    if (competition.entries.length < 2) {
      return reply.code(409).send({
        message: 'At least two approved entries are required to generate fixtures.',
      })
    }

    const approvedEntryCount = competition.entries.length
    const isPowerOfTwo = (approvedEntryCount & (approvedEntryCount - 1)) === 0

    if (!isPowerOfTwo) {
      return reply.code(409).send({
        message: 'The current knockout generator requires a power-of-two number of approved entries.',
      })
    }

    const fixtures = await app.prisma.$transaction(async (transaction) => {
      const createdFixturesByRound: Array<Array<{ id: string; bracketPosition: number | null }>> = []
      const totalRounds = Math.log2(approvedEntryCount)

      for (let roundNumber = 1; roundNumber <= totalRounds; roundNumber += 1) {
        const fixtureCount = approvedEntryCount / 2 ** roundNumber
        const roundFixtures: Array<{ id: string; bracketPosition: number | null }> = []

        for (let bracketIndex = 0; bracketIndex < fixtureCount; bracketIndex += 1) {
          const homeEntryId =
            roundNumber === 1 ? competition.entries[bracketIndex * 2]?.id ?? null : null
          const awayEntryId =
            roundNumber === 1 ? competition.entries[bracketIndex * 2 + 1]?.id ?? null : null

          const fixture = await transaction.fixture.create({
            data: {
              competitionId: competition.id,
              roundNumber,
              bracketPosition: bracketIndex + 1,
              homeEntryId,
              awayEntryId,
              status:
                roundNumber === 1 && homeEntryId && awayEntryId
                  ? FixtureStatus.READY
                  : FixtureStatus.PENDING,
              sourceType: FixtureSourceType.GENERATED,
            },
          })

          roundFixtures.push({
            id: fixture.id,
            bracketPosition: fixture.bracketPosition,
          })
        }

        createdFixturesByRound.push(roundFixtures)
      }

      for (let roundIndex = 0; roundIndex < createdFixturesByRound.length - 1; roundIndex += 1) {
        const currentRound = createdFixturesByRound[roundIndex]
        const nextRound = createdFixturesByRound[roundIndex + 1]

        for (let fixtureIndex = 0; fixtureIndex < currentRound.length; fixtureIndex += 1) {
          const nextFixture = nextRound[Math.floor(fixtureIndex / 2)]

          await transaction.fixture.update({
            where: {
              id: currentRound[fixtureIndex].id,
            },
            data: {
              nextFixtureId: nextFixture.id,
            },
          })
        }
      }

      return fetchCompetitionFixtures(transaction, competition.id)
    })

    return reply.code(201).send({
      fixtures: fixtures.map(toFixtureSummary),
    })
  })

  app.get('/competitions/:competitionId/fixtures', async (request, reply) => {
    const paramsResult = competitionParamsSchema.safeParse(request.params)

    if (!paramsResult.success) {
      return reply.code(400).send({
        message: 'Invalid competition id.',
      })
    }

    const competition = await app.prisma.competition.findUnique({
      where: {
        id: paramsResult.data.competitionId,
      },
      select: {
        id: true,
      },
    })

    if (!competition) {
      return reply.code(404).send({
        message: 'Competition not found.',
      })
    }

    const fixtures = await fetchCompetitionFixtures(app.prisma, competition.id)

    return reply.send({
      fixtures: fixtures.map(toFixtureSummary),
    })
  })

  app.put('/competitions/:competitionId/fixtures/:fixtureId', async (request, reply) => {
    const paramsResult = fixtureParamsSchema.safeParse(request.params)
    const bodyResult = updateFixtureBodySchema.safeParse(request.body)

    if (!paramsResult.success) {
      return reply.code(400).send({
        message: 'Invalid fixture id.',
      })
    }

    if (!bodyResult.success) {
      return reply.code(400).send({
        message: 'Invalid fixture update payload.',
        issues: bodyResult.error.issues,
      })
    }

    const fixture = await app.prisma.fixture.findFirst({
      where: {
        id: paramsResult.data.fixtureId,
        competitionId: paramsResult.data.competitionId,
      },
      include: {
        competition: true,
      },
    })

    if (!fixture) {
      return reply.code(404).send({
        message: 'Fixture not found.',
      })
    }

    if (fixture.competition.createdByUserId !== bodyResult.data.requestedByUserId) {
      return reply.code(403).send({
        message: 'Only the competition owner can update fixtures.',
      })
    }

    if (
      bodyResult.data.homeEntryId &&
      bodyResult.data.awayEntryId &&
      bodyResult.data.homeEntryId === bodyResult.data.awayEntryId
    ) {
      return reply.code(400).send({
        message: 'Fixture home and away entries must be different.',
      })
    }

    const referencedEntryIds = [bodyResult.data.homeEntryId, bodyResult.data.awayEntryId].filter(
      (value): value is string => Boolean(value),
    )

    if (referencedEntryIds.length > 0) {
      const entries = await app.prisma.competitionEntry.findMany({
        where: {
          competitionId: fixture.competitionId,
          id: {
            in: referencedEntryIds,
          },
          status: CompetitionEntryStatus.TEAM_APPROVED,
        },
        select: {
          id: true,
        },
      })

      if (entries.length !== referencedEntryIds.length) {
        return reply.code(409).send({
          message: 'Fixtures may only reference approved entries in the same competition.',
        })
      }
    }

    const updatedFixture = await app.prisma.fixture.update({
      where: {
        id: fixture.id,
      },
      data: {
        homeEntryId:
          bodyResult.data.homeEntryId === undefined ? fixture.homeEntryId : bodyResult.data.homeEntryId,
        awayEntryId:
          bodyResult.data.awayEntryId === undefined ? fixture.awayEntryId : bodyResult.data.awayEntryId,
        scheduledAt:
          bodyResult.data.scheduledAt === undefined
            ? fixture.scheduledAt
            : bodyResult.data.scheduledAt
              ? new Date(bodyResult.data.scheduledAt)
              : null,
        sourceType: FixtureSourceType.COMMISSIONER_OVERRIDE,
        status:
          (bodyResult.data.homeEntryId === undefined ? fixture.homeEntryId : bodyResult.data.homeEntryId) &&
          (bodyResult.data.awayEntryId === undefined ? fixture.awayEntryId : bodyResult.data.awayEntryId)
            ? FixtureStatus.READY
            : FixtureStatus.PENDING,
      },
      include: {
        homeEntry: {
          include: {
            user: {
              select: {
                id: true,
                displayName: true,
              },
            },
            submission: {
              select: {
                id: true,
                teamName: true,
                rosterTemplateId: true,
              },
            },
          },
        },
        awayEntry: {
          include: {
            user: {
              select: {
                id: true,
                displayName: true,
              },
            },
            submission: {
              select: {
                id: true,
                teamName: true,
                rosterTemplateId: true,
              },
            },
          },
        },
      },
    })

    return reply.send({
      fixture: toFixtureSummary(updatedFixture),
    })
  })
}
