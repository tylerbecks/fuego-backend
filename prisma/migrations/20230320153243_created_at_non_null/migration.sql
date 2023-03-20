/*
  Warnings:

  - Made the column `created_at` on table `_articlestorestaurants` required. This step will fail if there are existing NULL values in that column.
  - Made the column `created_at` on table `articles` required. This step will fail if there are existing NULL values in that column.
  - Made the column `created_at` on table `awards` required. This step will fail if there are existing NULL values in that column.
  - Made the column `created_at` on table `restaurants` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "_articlestorestaurants" ALTER COLUMN "created_at" SET NOT NULL;

-- AlterTable
ALTER TABLE "articles" ALTER COLUMN "created_at" SET NOT NULL;

-- AlterTable
ALTER TABLE "awards" ALTER COLUMN "created_at" SET NOT NULL;

-- AlterTable
ALTER TABLE "place_id_cache" ALTER COLUMN "updated_at" DROP NOT NULL,
ALTER COLUMN "deleted_at" DROP NOT NULL;

-- AlterTable
ALTER TABLE "restaurants" ALTER COLUMN "created_at" SET NOT NULL;
