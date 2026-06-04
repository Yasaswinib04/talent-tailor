import express from "express";
import { createServer as createViteServer } from "vite";
import sessionsRouter from "./src/server/routes/sessions.js";
import uploadRouter from "./src/server/routes/upload.js";
import bugsRouter from "./src/server/routes/bugs.js";
import { initDb, isDbConnected, dbError } from "./src/server/db.js";
import { extractSkillsFromJD } from "./src/server/services/ai/jdSkillExtractor.js";
import axios from "axios";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const envKeys = Object.keys(process.env).filter(k =>
    k.toLowerCase().includes('database') || k.toLowerCase().includes('supabase') ||
    k.toLowerCase().includes('gemini') || k.toLowerCase().includes('api_key') ||
    k.toLowerCase().includes('database_url')
  );
  console.log("[ENV] Matching env vars found:", envKeys.length > 0 ? envKeys : '(none)');
  console.log("[ENV] Raw entry point. DATABASE_URL type:", typeof process.env.DATABASE_URL, "| length:", process.env.DATABASE_URL?.length || 0);
  console.log("[ENV] Startup environment check:", {
    DATABASE_URL: process.env.DATABASE_URL ? '✓ found' : '✗ missing',
    SUPABASE_URL: process.env.SUPABASE_URL ? '✓ found' : '✗ missing',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? '✓ found' : '✗ missing',
    GEMINI_API_KEY: process.env.GEMINI_API_KEY ? '✓ found' : '✗ missing',
    NODE_ENV: process.env.NODE_ENV || 'not set',
    PORT: process.env.PORT || '3001 (default)',
  });

  const app = express();
  const PORT = Number(process.env.PORT) || 3001;

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

  // Routes that don't need PostgreSQL
  app.post("/api/hr/sessions/extract-skills", async (req, res) => {
    try {
      const { jdText, roleType, experienceTier } = req.body;
      if (!jdText || jdText.trim().length < 50) {
        res.status(400).json({ error: 'JD text is too short to extract skills.' });
        return;
      }
      const skills = await extractSkillsFromJD(jdText, roleType || 'Other', experienceTier || 'Senior');
      res.json(skills);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Skill extraction failed' });
    }
  });

  // Middleware to check database connection status for database-dependent API endpoints
  // Note: DB check is handled per-route with client-side localStorage fallbacks.
  // When DB is unavailable, routes return errors and the frontend falls back to local storage.
  app.use(["/api/hr/sessions", "/api/hr/bugs"], (req, res, next) => {
    next();
  });

  app.use("/api/hr/sessions", sessionsRouter);
  app.use("/api/hr/upload", uploadRouter);
  app.use("/api/hr/bugs", bugsRouter);

  app.get("/api/health", (_req, res) => {
    res.json({
      status: "running",
      dbConnected: isDbConnected,
      dbError: dbError || null,
      env: {
        hasDatabaseUrl: !!process.env.DATABASE_URL,
        hasGeminiKey: !!process.env.GEMINI_API_KEY,
        hasSupabaseUrl: !!process.env.SUPABASE_URL,
        hasSupabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      },
      timestamp: new Date().toISOString()
    });
  });

  // API Route to fetch URL content
  app.get("/api/proxy", async (req, res) => {
    const { url } = req.query;
    if (!url || typeof url !== "string") {
      return res.status(400).json({ error: "URL is required" });
    }

    try {
      console.log(`Fetching URL: ${url}`);
      const response = await axios.get(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        },
        timeout: 10000,
      });

      // Simple HTML to Text or just send raw if it's manageable
      // But we should handle different types
      const contentType = response.headers["content-type"];
      if (typeof contentType === "string" && contentType.includes("application/pdf")) {
        return res.status(400).json({ error: "PDF URLs are not supported via proxy yet. Please download and upload the file." });
      }

      res.json({ content: response.data });
    } catch (error: any) {
      console.error("Proxy Error:", error.message);
      res.status(500).json({ error: "Failed to fetch URL content. It might be protected or inaccessible." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error("Unhandled API Error:", err.message || err);
    res.status(err.status || 500).json({
      error: err.message || "Internal Server Error",
    });
  });

  await initDb();

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`AI Pipeline Server running on port ${PORT}`);
  });
}

startServer();
