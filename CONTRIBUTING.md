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
