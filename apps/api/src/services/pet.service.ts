import { Prisma, PrismaClient } from '@prisma/client';
import {
  DAILY_GOAL_REWARD_XP,
  applyCareAction,
  applyStatDecay,
  buildDailyGoalsResponse,
  calculateLevelFromXp,
  calculatePetMood,
  elapsedSecondsBetween,
  generateInitialPetState,
  getUtcDateKey,
  validateCareCooldown,
  type AdoptPetInput,
  type CarePetInput,
  type CarePetResponse,
  type ClaimDailyRewardInput,
  type ClaimDailyRewardResponse,
  type DailyGoalCareAction,
  type DailyGoalsResponse,
  type DailyRewardClaimState,
  type PassportResponse,
  type Pet,
  type PetPassportEvent,
  type PetResponse,
  type PetStats,
} from '@pawket/shared';
import { PassportEventType } from '@pawket/shared';
import { prisma } from '../db';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type DbPet = {
  id: string;
  ownerWalletAddress: string;
  name: string;
  species: Pet['species'];
  personality: Pet['personality'];
  hunger: number;
  happiness: number;
  energy: number;
  hygiene: number;
  xp: number;
  level: number;
  createdAt: Date;
  updatedAt: Date;
  statsUpdatedAt: Date;
  lastCaredAt: Date | null;
  lastCareActionType: Pet['lastCareActionType'];
};

type CreatePetRecord = {
  ownerWalletAddress: string;
  name: string;
  species: Pet['species'];
  personality: Pet['personality'];
  stats: PetStats;
  xp: number;
  level: number;
};

type UpdateCareRecord = {
  stats: PetStats;
  xp: number;
  level: number;
  actionType: CarePetInput['actionType'];
  xpGained: number;
  passportEvent: Omit<PetPassportEvent, 'id' | 'createdAt'>;
};

type ClaimDailyRewardRecord = {
  date: string;
  bonusXp: number;
  xp: number;
  level: number;
  passportEvent: Omit<PetPassportEvent, 'id' | 'createdAt'>;
};

type DailyRewardClaimRecord = DailyRewardClaimState;

export interface PetRepository {
  findActivePetByWallet(walletAddress: string): Promise<DbPet | null>;
  findPetById(petId: string): Promise<DbPet | null>;
  createPetWithAdoptionEvent(input: CreatePetRecord): Promise<DbPet>;
  updatePetAfterCare(
    petId: string,
    input: UpdateCareRecord,
  ): Promise<{
    pet: DbPet;
    passportEvent: PetPassportEvent;
  }>;
  listPassportEvents(petId: string): Promise<PetPassportEvent[]>;
  findLastCareActionAt(petId: string, actionType: CarePetInput['actionType']): Promise<Date | null>;
  listCareActionsForPet(petId: string): Promise<DailyGoalCareAction[]>;
  findDailyRewardClaim(petId: string, date: string): Promise<DailyRewardClaimRecord | null>;
  claimDailyReward(
    petId: string,
    input: ClaimDailyRewardRecord,
  ): Promise<{
    pet: DbPet;
    passportEvent: PetPassportEvent;
    rewardClaim: DailyRewardClaimRecord;
  }>;
}

function iso(date: Date) {
  return date.toISOString();
}

function storedStats(record: DbPet): PetStats {
  return {
    hunger: record.hunger,
    happiness: record.happiness,
    energy: record.energy,
    hygiene: record.hygiene,
  };
}

/**
 * Projects a stored pet to its live state: vitals drain from `statsUpdatedAt`
 * forward to `now`, and mood follows the projected vitals. Reads stay
 * side-effect-free — decay is only persisted when the player acts (care).
 */
function presentPet(record: DbPet, now: Date): Pet {
  const stats = applyStatDecay(
    storedStats(record),
    elapsedSecondsBetween(record.statsUpdatedAt, now),
  );

  return {
    id: record.id,
    ownerWalletAddress: record.ownerWalletAddress,
    name: record.name,
    species: record.species,
    personality: record.personality,
    stats,
    xp: record.xp,
    level: record.level,
    mood: calculatePetMood(stats),
    createdAt: iso(record.createdAt),
    updatedAt: iso(record.updatedAt),
    statsUpdatedAt: iso(record.statsUpdatedAt),
    lastCaredAt: record.lastCaredAt ? iso(record.lastCaredAt) : null,
    lastCareActionType: record.lastCareActionType,
  };
}

function adoptionEventTitle(name: string) {
  return `${name} joined your Pawket`;
}

function careEventTitle(actionType: CarePetInput['actionType']) {
  const labels: Record<CarePetInput['actionType'], string> = {
    feed: 'Fed',
    play: 'Played with',
    groom: 'Groomed',
    rest: 'Rested',
  };
  return `${labels[actionType]} your Pawket`;
}

function dailyRewardEventTitle(date: string) {
  return `Claimed daily goals reward for ${date}`;
}

export class PetService {
  constructor(
    private readonly repository: PetRepository = new PrismaPetRepository(),
    private readonly clock: () => Date = () => new Date(),
  ) {}

  private async findOwnedPet(petId: string, walletAddress: string) {
    const pet = await this.repository.findPetById(petId);
    if (!pet) throw new ApiError(404, 'PET_NOT_FOUND', 'Pet not found.');
    if (pet.ownerWalletAddress !== walletAddress) {
      throw new ApiError(403, 'NOT_PET_OWNER', 'That wallet does not own this pet.');
    }
    return pet;
  }

  private async buildDailyGoalsForPet(
    pet: DbPet,
    walletAddress: string,
    now: Date,
  ): Promise<DailyGoalsResponse> {
    const today = getUtcDateKey(now);
    const [careActions, rewardClaim] = await Promise.all([
      this.repository.listCareActionsForPet(pet.id),
      this.repository.findDailyRewardClaim(pet.id, today),
    ]);

    return buildDailyGoalsResponse({
      walletAddress,
      petId: pet.id,
      careActions,
      rewardClaims: rewardClaim ? [rewardClaim] : [],
      now,
    });
  }

  async getPetByWallet(walletAddress: string): Promise<PetResponse> {
    const pet = await this.repository.findActivePetByWallet(walletAddress);
    return { pet: pet ? presentPet(pet, this.clock()) : null };
  }

  async adoptPet(input: AdoptPetInput): Promise<{ pet: Pet }> {
    const existing = await this.repository.findActivePetByWallet(input.walletAddress);
    if (existing) {
      throw new ApiError(409, 'ACTIVE_PET_EXISTS', 'This wallet already has an active pet.');
    }

    const initial = generateInitialPetState(input);
    const created = await this.repository.createPetWithAdoptionEvent({
      ownerWalletAddress: initial.ownerWalletAddress,
      name: initial.name,
      species: initial.species,
      personality: initial.personality,
      stats: initial.stats,
      xp: initial.xp,
      level: initial.level,
    });

    return { pet: presentPet(created, this.clock()) };
  }

  async careForPet(petId: string, input: CarePetInput): Promise<CarePetResponse> {
    const now = this.clock();
    const pet = await this.repository.findPetById(petId);
    if (!pet) throw new ApiError(404, 'PET_NOT_FOUND', 'Pet not found.');
    if (pet.ownerWalletAddress !== input.walletAddress) {
      throw new ApiError(403, 'NOT_PET_OWNER', 'That wallet does not own this pet.');
    }

    const lastActionAt = await this.repository.findLastCareActionAt(petId, input.actionType);
    const cooldown = validateCareCooldown(lastActionAt, input.actionType, now);
    if (!cooldown.allowed) {
      throw new ApiError(409, 'CARE_COOLDOWN_ACTIVE', cooldown.message, {
        remainingSeconds: cooldown.remainingSeconds,
      });
    }

    // Care lands on the pet's *current* (decayed) vitals, then resets the decay
    // clock — this is the only path that persists drained stats.
    const currentStats = applyStatDecay(
      storedStats(pet),
      elapsedSecondsBetween(pet.statsUpdatedAt, now),
    );
    const { stats, xpGained } = applyCareAction(currentStats, input.actionType);
    const xp = pet.xp + xpGained;
    const level = calculateLevelFromXp(xp);
    const passportEvent = {
      petId,
      type: level > pet.level ? PassportEventType.LevelUp : PassportEventType.CareAction,
      title: level > pet.level ? `Reached level ${level}` : careEventTitle(input.actionType),
      description:
        level > pet.level
          ? `Your Pawket grew after a ${input.actionType} care action.`
          : `+${xpGained} XP from ${input.actionType}.`,
      metadata: { actionType: input.actionType, xpGained, level },
    };

    const updated = await this.repository.updatePetAfterCare(petId, {
      stats,
      xp,
      level,
      actionType: input.actionType,
      xpGained,
      passportEvent,
    });

    return { pet: presentPet(updated.pet, now), passportEvent: updated.passportEvent };
  }

  async getDailyGoals(petId: string, walletAddress: string): Promise<DailyGoalsResponse> {
    const now = this.clock();
    const pet = await this.findOwnedPet(petId, walletAddress);
    return this.buildDailyGoalsForPet(pet, walletAddress, now);
  }

  async claimDailyReward(
    petId: string,
    input: ClaimDailyRewardInput,
  ): Promise<ClaimDailyRewardResponse> {
    const now = this.clock();
    const pet = await this.findOwnedPet(petId, input.walletAddress);
    const dailyGoals = await this.buildDailyGoalsForPet(pet, input.walletAddress, now);

    if (!dailyGoals.allGoalsCompleted) {
      throw new ApiError(
        409,
        'DAILY_GOALS_INCOMPLETE',
        'Complete all daily goals before claiming.',
      );
    }
    if (dailyGoals.reward?.claimed) {
      throw new ApiError(409, 'DAILY_REWARD_ALREADY_CLAIMED', 'Daily reward already claimed.');
    }

    const xp = pet.xp + DAILY_GOAL_REWARD_XP;
    const level = calculateLevelFromXp(xp);
    const passportEvent = {
      petId,
      type: PassportEventType.DailyReward,
      title: dailyRewardEventTitle(dailyGoals.today),
      description: `+${DAILY_GOAL_REWARD_XP} bonus XP for completing every daily care goal.`,
      metadata: {
        date: dailyGoals.today,
        bonusXp: DAILY_GOAL_REWARD_XP,
        completedGoals: dailyGoals.completedGoals,
        totalGoals: dailyGoals.totalGoals,
        currentStreakDays: dailyGoals.currentStreakDays,
        level,
      },
    };

    const updated = await this.repository.claimDailyReward(petId, {
      date: dailyGoals.today,
      bonusXp: DAILY_GOAL_REWARD_XP,
      xp,
      level,
      passportEvent,
    });

    return {
      pet: presentPet(updated.pet, now),
      passportEvent: updated.passportEvent,
      dailyGoals: buildDailyGoalsResponse({
        walletAddress: input.walletAddress,
        petId,
        careActions: await this.repository.listCareActionsForPet(petId),
        rewardClaims: [updated.rewardClaim],
        now,
      }),
    };
  }

  async getPassport(petId: string): Promise<PassportResponse> {
    const pet = await this.repository.findPetById(petId);
    if (!pet) throw new ApiError(404, 'PET_NOT_FOUND', 'Pet not found.');
    return { petId, events: await this.repository.listPassportEvents(petId) };
  }
}

export class PrismaPetRepository implements PetRepository {
  constructor(private readonly client: PrismaClient = prisma) {}

  private mapPet(row: {
    id: string;
    name: string;
    species: string;
    personality: string;
    hunger: number;
    happiness: number;
    energy: number;
    hygiene: number;
    xp: number;
    level: number;
    createdAt: Date;
    updatedAt: Date;
    statsUpdatedAt: Date;
    lastCaredAt: Date | null;
    lastCareActionType: string | null;
    owner: { walletAddress: string };
  }): DbPet {
    return {
      id: row.id,
      ownerWalletAddress: row.owner.walletAddress,
      name: row.name,
      species: row.species as Pet['species'],
      personality: row.personality as Pet['personality'],
      hunger: row.hunger,
      happiness: row.happiness,
      energy: row.energy,
      hygiene: row.hygiene,
      xp: row.xp,
      level: row.level,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      statsUpdatedAt: row.statsUpdatedAt,
      lastCaredAt: row.lastCaredAt,
      lastCareActionType: row.lastCareActionType as Pet['lastCareActionType'],
    };
  }

  async findActivePetByWallet(walletAddress: string) {
    const row = await this.client.pet.findFirst({
      where: { owner: { walletAddress }, active: true },
      include: { owner: true },
      orderBy: { createdAt: 'desc' },
    });
    return row ? this.mapPet(row) : null;
  }

  async findPetById(petId: string) {
    const row = await this.client.pet.findUnique({
      where: { id: petId },
      include: { owner: true },
    });
    return row ? this.mapPet(row) : null;
  }

  async createPetWithAdoptionEvent(input: CreatePetRecord) {
    return this.client.$transaction(async (tx) => {
      const user = await tx.user.upsert({
        where: { walletAddress: input.ownerWalletAddress },
        update: {},
        create: { walletAddress: input.ownerWalletAddress },
      });
      const pet = await tx.pet.create({
        data: {
          ownerId: user.id,
          name: input.name,
          species: input.species,
          personality: input.personality,
          hunger: input.stats.hunger,
          happiness: input.stats.happiness,
          energy: input.stats.energy,
          hygiene: input.stats.hygiene,
          xp: input.xp,
          level: input.level,
          passportEvents: {
            create: {
              type: PassportEventType.Adopted,
              title: adoptionEventTitle(input.name),
              description: `${input.name} was adopted.`,
              metadata: { species: input.species, personality: input.personality },
            },
          },
        },
        include: { owner: true },
      });
      return this.mapPet(pet);
    });
  }

  async updatePetAfterCare(petId: string, input: UpdateCareRecord) {
    return this.client.$transaction(async (tx) => {
      await tx.petCareAction.create({
        data: { petId, action: input.actionType, xpGained: input.xpGained },
      });
      const event = await tx.petPassportEvent.create({
        data: {
          petId,
          type: input.passportEvent.type,
          title: input.passportEvent.title,
          description: input.passportEvent.description,
          ...(input.passportEvent.metadata
            ? { metadata: input.passportEvent.metadata as Prisma.InputJsonObject }
            : {}),
        },
      });
      const pet = await tx.pet.update({
        where: { id: petId },
        data: {
          hunger: input.stats.hunger,
          happiness: input.stats.happiness,
          energy: input.stats.energy,
          hygiene: input.stats.hygiene,
          xp: input.xp,
          level: input.level,
          statsUpdatedAt: event.createdAt,
          lastCaredAt: event.createdAt,
          lastCareActionType: input.actionType,
        },
        include: { owner: true },
      });
      return { pet: this.mapPet(pet), passportEvent: this.mapPassportEvent(event) };
    });
  }

  async listPassportEvents(petId: string) {
    const rows = await this.client.petPassportEvent.findMany({
      where: { petId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => this.mapPassportEvent(row));
  }

  async findLastCareActionAt(petId: string, actionType: CarePetInput['actionType']) {
    const row = await this.client.petCareAction.findFirst({
      where: { petId, action: actionType },
      orderBy: { createdAt: 'desc' },
    });
    return row?.createdAt ?? null;
  }

  async listCareActionsForPet(petId: string) {
    const rows = await this.client.petCareAction.findMany({
      where: { petId },
      select: { action: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => ({
      actionType: row.action as CarePetInput['actionType'],
      createdAt: row.createdAt,
    }));
  }

  async findDailyRewardClaim(petId: string, date: string) {
    const row = await this.client.petDailyReward.findUnique({
      where: { petId_date: { petId, date } },
    });
    return row ? this.mapDailyRewardClaim(row) : null;
  }

  async claimDailyReward(petId: string, input: ClaimDailyRewardRecord) {
    try {
      return await this.client.$transaction(async (tx) => {
        const rewardClaim = await tx.petDailyReward.create({
          data: {
            petId,
            date: input.date,
            bonusXp: input.bonusXp,
          },
        });
        const event = await tx.petPassportEvent.create({
          data: {
            petId,
            type: input.passportEvent.type,
            title: input.passportEvent.title,
            description: input.passportEvent.description,
            ...(input.passportEvent.metadata
              ? { metadata: input.passportEvent.metadata as Prisma.InputJsonObject }
              : {}),
          },
        });
        const pet = await tx.pet.update({
          where: { id: petId },
          data: {
            xp: input.xp,
            level: input.level,
          },
          include: { owner: true },
        });
        return {
          pet: this.mapPet(pet),
          passportEvent: this.mapPassportEvent(event),
          rewardClaim: this.mapDailyRewardClaim(rewardClaim),
        };
      });
    } catch (caught) {
      if (caught instanceof Prisma.PrismaClientKnownRequestError && caught.code === 'P2002') {
        throw new ApiError(409, 'DAILY_REWARD_ALREADY_CLAIMED', 'Daily reward already claimed.');
      }
      throw caught;
    }
  }

  private mapPassportEvent(row: {
    id: string;
    petId: string;
    type: string;
    title: string;
    description: string | null;
    metadata: unknown;
    createdAt: Date;
  }): PetPassportEvent {
    return {
      id: row.id,
      petId: row.petId,
      type: row.type as PassportEventType,
      title: row.title,
      description: row.description,
      metadata:
        row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
          ? (row.metadata as Record<string, unknown>)
          : null,
      createdAt: iso(row.createdAt),
    };
  }

  private mapDailyRewardClaim(row: {
    date: string;
    bonusXp: number;
    claimedAt: Date;
  }): DailyRewardClaimRecord {
    return {
      date: row.date,
      bonusXp: row.bonusXp,
      claimedAt: row.claimedAt,
    };
  }
}

let idCounter = 0;
function nextId(prefix: string) {
  idCounter += 1;
  return `${prefix}_${idCounter}`;
}

function idSequence(id: string) {
  return Number(id.split('_').pop() ?? 0);
}

export class InMemoryPetRepository implements PetRepository {
  constructor(private readonly now: () => Date = () => new Date()) {}

  private readonly pets = new Map<string, DbPet>();
  private readonly careActions: {
    petId: string;
    action: CarePetInput['actionType'];
    createdAt: Date;
  }[] = [];
  private readonly dailyRewards: (DailyRewardClaimRecord & { petId: string })[] = [];
  private readonly events: PetPassportEvent[] = [];

  async findActivePetByWallet(walletAddress: string) {
    return [...this.pets.values()].find((pet) => pet.ownerWalletAddress === walletAddress) ?? null;
  }

  async findPetById(petId: string) {
    return this.pets.get(petId) ?? null;
  }

  async createPetWithAdoptionEvent(input: CreatePetRecord) {
    const now = this.now();
    const pet: DbPet = {
      id: nextId('pet'),
      ownerWalletAddress: input.ownerWalletAddress,
      name: input.name,
      species: input.species,
      personality: input.personality,
      hunger: input.stats.hunger,
      happiness: input.stats.happiness,
      energy: input.stats.energy,
      hygiene: input.stats.hygiene,
      xp: input.xp,
      level: input.level,
      createdAt: now,
      updatedAt: now,
      statsUpdatedAt: now,
      lastCaredAt: null,
      lastCareActionType: null,
    };
    this.pets.set(pet.id, pet);
    this.events.push({
      id: nextId('evt'),
      petId: pet.id,
      type: PassportEventType.Adopted,
      title: adoptionEventTitle(input.name),
      description: `${input.name} was adopted.`,
      metadata: { species: input.species, personality: input.personality },
      createdAt: iso(now),
    });
    return pet;
  }

  async updatePetAfterCare(petId: string, input: UpdateCareRecord) {
    const pet = this.pets.get(petId);
    if (!pet) throw new ApiError(404, 'PET_NOT_FOUND', 'Pet not found.');
    const now = this.now();
    this.careActions.push({ petId, action: input.actionType, createdAt: now });
    const event: PetPassportEvent = {
      ...input.passportEvent,
      id: nextId('evt'),
      createdAt: iso(now),
    };
    this.events.push(event);
    const updated: DbPet = {
      ...pet,
      hunger: input.stats.hunger,
      happiness: input.stats.happiness,
      energy: input.stats.energy,
      hygiene: input.stats.hygiene,
      xp: input.xp,
      level: input.level,
      updatedAt: now,
      statsUpdatedAt: now,
      lastCaredAt: now,
      lastCareActionType: input.actionType,
    };
    this.pets.set(petId, updated);
    return { pet: updated, passportEvent: event };
  }

  async listPassportEvents(petId: string) {
    return this.events
      .filter((event) => event.petId === petId)
      .sort((left, right) => {
        const byDate = Date.parse(right.createdAt) - Date.parse(left.createdAt);
        return byDate || idSequence(right.id) - idSequence(left.id);
      });
  }

  async findLastCareActionAt(petId: string, actionType: CarePetInput['actionType']) {
    return (
      this.careActions
        .filter((action) => action.petId === petId && action.action === actionType)
        .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())[0]
        ?.createdAt ?? null
    );
  }

  async listCareActionsForPet(petId: string) {
    return this.careActions
      .filter((action) => action.petId === petId)
      .map((action) => ({ actionType: action.action, createdAt: action.createdAt }));
  }

  async findDailyRewardClaim(petId: string, date: string) {
    const claim = this.dailyRewards.find(
      (reward) => reward.petId === petId && reward.date === date,
    );
    return claim ? { date: claim.date, bonusXp: claim.bonusXp, claimedAt: claim.claimedAt } : null;
  }

  async claimDailyReward(petId: string, input: ClaimDailyRewardRecord) {
    const pet = this.pets.get(petId);
    if (!pet) throw new ApiError(404, 'PET_NOT_FOUND', 'Pet not found.');
    const existing = await this.findDailyRewardClaim(petId, input.date);
    if (existing) {
      throw new ApiError(409, 'DAILY_REWARD_ALREADY_CLAIMED', 'Daily reward already claimed.');
    }

    const now = this.now();
    const rewardClaim = {
      petId,
      date: input.date,
      bonusXp: input.bonusXp,
      claimedAt: now,
    };
    this.dailyRewards.push(rewardClaim);

    const event: PetPassportEvent = {
      ...input.passportEvent,
      id: nextId('evt'),
      createdAt: iso(now),
    };
    this.events.push(event);

    const updated: DbPet = {
      ...pet,
      xp: input.xp,
      level: input.level,
      updatedAt: now,
    };
    this.pets.set(petId, updated);

    return {
      pet: updated,
      passportEvent: event,
      rewardClaim: {
        date: rewardClaim.date,
        bonusXp: rewardClaim.bonusXp,
        claimedAt: rewardClaim.claimedAt,
      },
    };
  }
}
