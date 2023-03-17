/*
  Warnings:

  - You are about to drop the column `description` on the `restaurants` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "_articlestorestaurants" ADD COLUMN     "description" VARCHAR;

-- AlterTable
ALTER TABLE "restaurants" DROP COLUMN "description";

-- CreateTable
CREATE TABLE "place_id_cache" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6) NOT NULL,
    "place_id" VARCHAR NOT NULL,
    "name" VARCHAR NOT NULL,
    "city_id" INTEGER NOT NULL,

    CONSTRAINT "place_id_cache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "place_id_cache_name_key" ON "place_id_cache"("name");
