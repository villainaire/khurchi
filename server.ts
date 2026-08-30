// server.ts
import express from "express";
import cors from "cors";
import path from "path";
import { createServer as createViteServer } from "vite";
import worker from "./worker/index";
import { createLocalD1 } from "./worker/local-d1";
import type { Env } from "./worker/types";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize local D1 SQLite database
  const localDb = createLocalD1();

  const env: Env = {
    DB: localDb,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    JWT_SECRET: process.env.JWT_SECRET || "khurchi_jwt_secret_mumbai_2026",
    ADMIN_EMAIL: process.env.ADMIN_EMAIL || "info@khurchi.com",
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || "ulhasnagar@khurchi",
    NOTIFICATION_EMAIL: process.env.NOTIFICATION_EMAIL || "akashkamble.jb007@gmail.com",
    BUSINESS_EMAIL: process.env.BUSINESS_EMAIL || "info@khurchi.com",
  };

  // Enable CORS
  app.use(cors());

  // Intercept all /api requests and route into Cloudflare Worker
  app.use("/api", async (req, res) => {
    try {
      const fullUrl = `http://${req.headers.host || "localhost:3000"}${req.originalUrl}`;

      const headers = new Headers();
      for (const [key, value] of Object.entries(req.headers)) {
        if (value) {
          if (Array.isArray(value)) {
            for (const v of value) headers.append(key, v);
          } else {
            headers.set(key, value);
          }
        }
      }

      let body: any = undefined;
      if (req.method !== "GET" && req.method !== "HEAD") {
        const chunks: Buffer[] = [];
        for await (const chunk of req) {
          chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
        }
        body = Buffer.concat(chunks);
      }

      const workerReq = new Request(fullUrl, {
        method: req.method,
        headers,
        body,
        // @ts-ignore
        duplex: "half",
      });

      const workerRes = await worker.fetch(workerReq, env, {
        waitUntil: () => {},
        passThroughOnException: () => {},
      } as any);

      res.status(workerRes.status);
      workerRes.headers.forEach((val, key) => {
        res.setHeader(key, val);
      });

      const resBuf = Buffer.from(await workerRes.arrayBuffer());
      res.send(resBuf);
    } catch (err: any) {
      console.error("Local Worker handler error:", err);
      res.status(500).json({ detail: err?.message || "Internal server error" });
    }
  });

  // Vite middleware in development or static serving in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.use((_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Khurchi.com Cloudflare Worker dev server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
