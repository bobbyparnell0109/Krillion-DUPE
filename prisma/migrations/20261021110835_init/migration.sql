-- CreateTable
CREATE TABLE "Prompt" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "normalized" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL DEFAULT 'medium',
    "breadth" TEXT NOT NULL DEFAULT 'medium',
    "status" TEXT NOT NULL DEFAULT 'active',
    "source" TEXT NOT NULL DEFAULT 'ai',
    "timesServed" INTEGER NOT NULL DEFAULT 0,
    "totalSubmissions" INTEGER NOT NULL DEFAULT 0,
    "validSubmissions" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Prompt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Answer" (
    "id" TEXT NOT NULL,
    "promptId" TEXT NOT NULL,
    "canonical" TEXT NOT NULL,
    "normalized" TEXT NOT NULL,
    "priorTier" INTEGER NOT NULL DEFAULT 3,
    "count" INTEGER NOT NULL DEFAULT 0,
    "source" TEXT NOT NULL DEFAULT 'ai',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Answer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnswerAlias" (
    "id" TEXT NOT NULL,
    "answerId" TEXT NOT NULL,
    "promptId" TEXT NOT NULL,
    "normalized" TEXT NOT NULL,

    CONSTRAINT "AnswerAlias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Submission" (
    "id" TEXT NOT NULL,
    "promptId" TEXT NOT NULL,
    "answerId" TEXT,
    "runId" TEXT,
    "raw" TEXT NOT NULL,
    "normalized" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "valid" BOOLEAN NOT NULL,
    "tier" INTEGER NOT NULL DEFAULT 0,
    "points" INTEGER NOT NULL DEFAULT 0,
    "matchedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JudgementCache" (
    "id" TEXT NOT NULL,
    "promptId" TEXT NOT NULL,
    "normalized" TEXT NOT NULL,
    "valid" BOOLEAN NOT NULL,
    "answerId" TEXT,
    "reason" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JudgementCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewItem" (
    "id" TEXT NOT NULL,
    "promptId" TEXT NOT NULL,
    "raw" TEXT NOT NULL,
    "normalized" TEXT NOT NULL,
    "occurrences" INTEGER NOT NULL DEFAULT 1,
    "aiVerdict" TEXT NOT NULL DEFAULT 'unjudged',
    "aiReason" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReviewItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyChallenge" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "promptIds" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Run" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "date" TEXT NOT NULL DEFAULT '',
    "playerId" TEXT NOT NULL,
    "ipHash" TEXT NOT NULL,
    "name" TEXT,
    "dailyKey" TEXT,
    "promptIds" TEXT NOT NULL DEFAULT '[]',
    "excludeIds" TEXT NOT NULL DEFAULT '[]',
    "currentIndex" INTEGER NOT NULL DEFAULT 0,
    "currentPromptId" TEXT,
    "promptIssuedAt" TIMESTAMP(3),
    "airMs" INTEGER NOT NULL DEFAULT 0,
    "depth" INTEGER NOT NULL DEFAULT 0,
    "score" INTEGER NOT NULL DEFAULT 0,
    "results" TEXT NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "Run_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimit" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "resetAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "Prompt_normalized_key" ON "Prompt"("normalized");

-- CreateIndex
CREATE INDEX "Prompt_status_timesServed_idx" ON "Prompt"("status", "timesServed");

-- CreateIndex
CREATE INDEX "Prompt_category_idx" ON "Prompt"("category");

-- CreateIndex
CREATE INDEX "Answer_promptId_idx" ON "Answer"("promptId");

-- CreateIndex
CREATE UNIQUE INDEX "Answer_promptId_normalized_key" ON "Answer"("promptId", "normalized");

-- CreateIndex
CREATE UNIQUE INDEX "AnswerAlias_promptId_normalized_key" ON "AnswerAlias"("promptId", "normalized");

-- CreateIndex
CREATE INDEX "Submission_promptId_createdAt_idx" ON "Submission"("promptId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "JudgementCache_promptId_normalized_key" ON "JudgementCache"("promptId", "normalized");

-- CreateIndex
CREATE INDEX "ReviewItem_status_updatedAt_idx" ON "ReviewItem"("status", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewItem_promptId_normalized_key" ON "ReviewItem"("promptId", "normalized");

-- CreateIndex
CREATE UNIQUE INDEX "DailyChallenge_date_key" ON "DailyChallenge"("date");

-- CreateIndex
CREATE UNIQUE INDEX "Run_dailyKey_key" ON "Run"("dailyKey");

-- CreateIndex
CREATE INDEX "Run_mode_status_depth_idx" ON "Run"("mode", "status", "depth");

-- AddForeignKey
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "Prompt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnswerAlias" ADD CONSTRAINT "AnswerAlias_answerId_fkey" FOREIGN KEY ("answerId") REFERENCES "Answer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "Prompt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_answerId_fkey" FOREIGN KEY ("answerId") REFERENCES "Answer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JudgementCache" ADD CONSTRAINT "JudgementCache_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "Prompt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewItem" ADD CONSTRAINT "ReviewItem_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "Prompt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
