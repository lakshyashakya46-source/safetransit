import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: Number(process.env.PORT || 5005),
  databaseUrl:
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URI ||
    `postgresql://${process.env.PGUSER || "postgres"}:${process.env.PGPASSWORD || "postgres"}@${process.env.PGHOST || "localhost"}:${process.env.PGPORT || 5433}/${process.env.PGDATABASE || "safetransit"}`,
  jwtSecret: process.env.JWT_SECRET || "local-demo-secret-change-me",
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173"
};
