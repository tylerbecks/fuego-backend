-- AlterTable
ALTER TABLE "place_id_cache" ADD COLUMN     "city" TEXT,
ALTER COLUMN "city_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "restaurants" ADD COLUMN     "city" VARCHAR,
ALTER COLUMN "city_id" DROP NOT NULL;
