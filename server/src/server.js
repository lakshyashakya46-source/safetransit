import express from "express";
import cors from "cors";
import morgan from "morgan";
import { config } from "./config/env.js";
import { initDatabase } from "./db/connection.js";
import { resetAndSeedDatabase } from "./db/seedData.js";
import authRoutes from "./routes/auth.js";
import apiRoutes from "./routes/api.js";
import { notFound, errorHandler } from "./middleware/errors.js";

const app = express();

app.use(cors({ origin: config.clientUrl, credentials: false }));
app.use(express.json({ limit: "5mb" }));
app.use(morgan("dev"));

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    service: "SafeTransit National Public Transport Safety Engine",
    status: "Operational",
    version: "2.4.0-Enterprise",
    time: new Date().toISOString()
  });
});

app.post("/api/seed/reset", async (req, res) => {
  try {
    await resetAndSeedDatabase();
    res.json({ ok: true, message: "Database reseeded successfully with demo records." });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api", apiRoutes);

app.use(notFound);
app.use(errorHandler);

// Initialize database with automatic fallback and boot server
await initDatabase();

app.listen(config.port, () => {
  console.log(`\n======================================================`);
  console.log(` SafeTransit API Online: http://localhost:${config.port}`);
  console.log(` Client URL Expected:   ${config.clientUrl}`);
  console.log(`======================================================\n`);
});
