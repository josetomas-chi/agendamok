CREATE TABLE "client_otps" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "used" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "client_otps_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "client_otps_email_idx" ON "client_otps"("email");

CREATE TABLE "client_sessions" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "client_sessions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "client_sessions_token_key" ON "client_sessions"("token");
CREATE INDEX "client_sessions_email_idx" ON "client_sessions"("email");
CREATE INDEX "client_sessions_token_idx" ON "client_sessions"("token");
