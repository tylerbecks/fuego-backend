/*
  Warnings:

  - A unique constraint covering the columns `[name,city_id]` on the table `place_id_cache` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[g_place_id]` on the table `restaurants` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "place_id_cache_name_key";

-- CreateIndex
CREATE UNIQUE INDEX "place_id_cache_name_city_id_key" ON "place_id_cache"("name", "city_id");

-- CreateIndex
CREATE UNIQUE INDEX "restaurants_g_place_id_key" ON "restaurants"("g_place_id");
