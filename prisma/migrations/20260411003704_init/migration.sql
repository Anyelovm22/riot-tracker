-- CreateTable
CREATE TABLE "PlayerMatchCache" (
    "id" TEXT NOT NULL,
    "puuid" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "queueId" INTEGER NOT NULL,
    "gameCreation" BIGINT NOT NULL,
    "gameDuration" INTEGER NOT NULL,
    "championName" TEXT NOT NULL,
    "kills" INTEGER NOT NULL,
    "deaths" INTEGER NOT NULL,
    "assists" INTEGER NOT NULL,
    "win" BOOLEAN NOT NULL,
    "totalMinionsKilled" INTEGER NOT NULL DEFAULT 0,
    "neutralMinionsKilled" INTEGER NOT NULL DEFAULT 0,
    "totalDamageDealtToChampions" INTEGER NOT NULL DEFAULT 0,
    "totalDamageTaken" INTEGER NOT NULL DEFAULT 0,
    "visionScore" INTEGER NOT NULL DEFAULT 0,
    "timeCCingOthers" INTEGER NOT NULL DEFAULT 0,
    "damageDealtToObjectives" INTEGER NOT NULL DEFAULT 0,
    "turretTakedowns" INTEGER NOT NULL DEFAULT 0,
    "goldEarned" INTEGER NOT NULL DEFAULT 0,
    "individualPosition" TEXT,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayerMatchCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerSyncState" (
    "id" TEXT NOT NULL,
    "puuid" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "lastMatchStart" INTEGER NOT NULL DEFAULT 0,
    "lastFullSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerSyncState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerRankSnapshot" (
    "id" TEXT NOT NULL,
    "puuid" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "queueType" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "rank" TEXT NOT NULL,
    "leaguePoints" INTEGER NOT NULL,
    "wins" INTEGER NOT NULL,
    "losses" INTEGER NOT NULL,
    "snapshotAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayerRankSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlayerMatchCache_matchId_key" ON "PlayerMatchCache"("matchId");

-- CreateIndex
CREATE INDEX "PlayerMatchCache_puuid_platform_gameCreation_idx" ON "PlayerMatchCache"("puuid", "platform", "gameCreation");

-- CreateIndex
CREATE INDEX "PlayerMatchCache_puuid_platform_queueId_gameCreation_idx" ON "PlayerMatchCache"("puuid", "platform", "queueId", "gameCreation");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerSyncState_puuid_platform_key" ON "PlayerSyncState"("puuid", "platform");

-- CreateIndex
CREATE INDEX "PlayerRankSnapshot_puuid_platform_queueType_snapshotAt_idx" ON "PlayerRankSnapshot"("puuid", "platform", "queueType", "snapshotAt");
