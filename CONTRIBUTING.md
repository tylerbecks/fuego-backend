# Contributing

## Helpful commands

### Execute an individual `.ts` file without compiling

```bash
npx ts-node-esm my-file.ts
```

### Debug Playwright Scraper

```bash
PWDEBUG=console npm ts-node-esm <path-to-your-script>
```

[Docs](https://playwright.dev/docs/debug#browser-developer-tools)

### Debug node script

Use the terminal in vs code and start a new JavaScript Debug Terminal.

### Sync the schema with thee database

:::note
Needs to be run if _schema.prisma_ changes.
:::

```bash
npx prisma migrate dev
```

### Sync Prisma schema with generated Prisma Client code

:::note
Needs to be run if _schema.prisma_ changes.
This runs automatically in precommit.
:::

```bash
npx prisma generate
```
