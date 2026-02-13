/** @type {import('prisma').PrismaConfig} */
module.exports = {
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL || "postgresql://postgres.bcxbiqrsiraypzptplow:o7KdQrDcfu5Nso7n@aws-1-ap-south-1.pooler.supabase.com:5432/postgres",
  },
};