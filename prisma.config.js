const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });

/** @type {import('prisma').PrismaConfig} */
module.exports = {
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  // Use DIRECT_URL for schema operations (db push, migrate). Pooler (DATABASE_URL) can hang.
  datasource: {
    url: process.env.DIRECT_URL || process.env.DATABASE_URL || "postgresql://placeholder:placeholder@localhost:5432/placeholder",
  },
};
