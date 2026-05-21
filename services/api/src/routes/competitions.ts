import {
  CompetitionEntryStatus,
  CompetitionFormat,
  CompetitionStatus,
  CompetitionType,
  CompetitionVisibility,
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
}
