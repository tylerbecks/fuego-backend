-- AlterTable
ALTER TABLE "awards" ADD COLUMN     "metadata" JSONB;

-- AlterTable
ALTER TABLE "restaurants" ADD COLUMN     "chef" VARCHAR,
ADD COLUMN     "country" VARCHAR,
ADD COLUMN     "lat" DOUBLE PRECISION,
ADD COLUMN     "long" DOUBLE PRECISION,
ADD COLUMN     "price" INTEGER;
