# Tome API

## Pre-requisites

Make sure you have the following installed:

[**Bun**](https://bun.sh/) - A fast javascript runtime based on JSC. We use it to run Elysia, our http framework.
[**Bruno**](https://www.usebruno.com/) - A simple, open-source alternative to Postman, that allows you to test your API endpoints.

## Getting Started

Install dependencies if not already, and copy `.env.template` into a new file called `.env` which you can use to develop locally:

```bash
cp .env.template .env
```

The first time you run this repository, you will need to run the migrations to create a database file and tables:

```bash
pnpm db:migrate
```

## Development

To start the development server run:

```bash
pnpm dev
```

To test the API endpoints, use Bruno to open the `.bruno` folder in this directory. If you make changes to the calls inside Bruno, they can be commited so everyone has access to them.

## Database

You can access the database using Drizzle studio:

```base
pnpm db:studio
```
