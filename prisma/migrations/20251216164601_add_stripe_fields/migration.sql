-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "stripeCustomerId" TEXT;

-- AlterTable
ALTER TABLE "company_subscriptions" ADD COLUMN     "stripeCustomerId" TEXT,
ADD COLUMN     "stripePriceId" TEXT,
ADD COLUMN     "stripeSubscriptionId" TEXT;
