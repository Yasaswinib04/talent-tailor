import express from "express";
import { createServer as createViteServer } from "vite";
import sessionsRouter from "./src/server/routes/sessions.js";
import uploadRouter from "./src/server/routes/upload.js";
import axios from "axios";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3001;

  app.use(express.json());

  app.use("/api/hr/sessions", sessionsRouter);
  app.use("/api/hr/upload", uploadRouter);

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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
