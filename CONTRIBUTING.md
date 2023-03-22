# Contributing

## Helpful commands

Execute an individual `.ts` file without compiling:

    ```bash
    npx ts-node-esm my-file.ts
    ```

Important: You need to re-run the prisma generate command after every change that's made to your Prisma schema to update the generated Prisma Client code. This runs in postinstall.

    ```bash
    npx prisma generate
    ```

To update the schema, first change _schema.prisma_, then run:

    ```bash
    npx prisma migrate dev
    ```

## Article Scraping Flow

1. Get URLs from database
1. For each URL, scrape restaurants
1. Query PlaceIdCache by name/cityId to get placeId
   1. If it doesn't exist, query google client to cache placeId
1. Find or create restaurant from restaurants table with smae placeId
1. Query all restaurants for that URL that don't have the current date and mark them with deletedAt
