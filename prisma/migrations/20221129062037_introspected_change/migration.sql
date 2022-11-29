-- CreateTable
CREATE TABLE "articles" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),
    "deleted_at" TIMESTAMPTZ(6),
    "url" VARCHAR NOT NULL,
    "title" VARCHAR NOT NULL,
    "article_source" VARCHAR NOT NULL,
    "city_id" INTEGER NOT NULL,

    CONSTRAINT "articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "awards" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),
    "deleted_at" TIMESTAMPTZ(6),
    "restaurant_id" INTEGER NOT NULL,
    "award_source" VARCHAR NOT NULL,
    "award_type" VARCHAR NOT NULL,
    "year" INTEGER NOT NULL,
    "url" VARCHAR NOT NULL,
    "chef" VARCHAR,

    CONSTRAINT "awards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cities" (
    "city" VARCHAR NOT NULL,
    "state" VARCHAR,
    "country" VARCHAR NOT NULL,
    "id" SERIAL NOT NULL,

    CONSTRAINT "cities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "restaurants" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),
    "deleted_at" TIMESTAMPTZ(6),
    "name" VARCHAR NOT NULL,
    "g_place_id" VARCHAR,
    "city_id" INTEGER NOT NULL,

    CONSTRAINT "restaurants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_articlestorestaurants" (
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),
    "deleted_at" TIMESTAMPTZ(6),
    "article_id" INTEGER NOT NULL,
    "restaurant_id" INTEGER NOT NULL,
    "id" INTEGER NOT NULL DEFAULT nextval('_articlestorestaurants_id_seq'::regclass),

    CONSTRAINT "_articlestorestaurants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "unique_url" ON "articles"("url");

-- CreateIndex
CREATE UNIQUE INDEX "cities_city_state_country_key" ON "cities"("city", "state", "country");

-- AddForeignKey
ALTER TABLE "articles" ADD CONSTRAINT "fk_city_id" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "awards" ADD CONSTRAINT "awards_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "restaurants" ADD CONSTRAINT "fk_city_id" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "_articlestorestaurants" ADD CONSTRAINT "articles_restaurants_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "articles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "_articlestorestaurants" ADD CONSTRAINT "articles_restaurants_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
