# Contributing

## Helpful commands

Execute an individual `.ts` file without compiling:

    ```bash
    npx ts-node-esm my-file.ts
    ```

Spin up the database GUI:

    ```bash
    npx prisma studio
    ```

Important: You need to re-run the prisma generate command after every change that's made to your Prisma schema to update the generated Prisma Client code.

    ```bash
    npx prisma generate
    ```
