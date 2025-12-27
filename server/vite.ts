import { createServer as createViteServer } from "vite";
import type { Express } from "express";
import type { Server } from "http";
import express from "express";
import fs from "fs";
import path from "path";

export function log(message: string) {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [express] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  console.log('[VITE] Creating Vite server...');
  
  // Add timeout protection
  const vitePromise = createViteServer({
    server: {
      middlewareMode: true,
      hmr: {
        server: server,
      },
    },
    appType: "spa",
    clearScreen: false,
    logLevel: 'info',
  });
  
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Vite server creation timed out after 30 seconds')), 30000);
  });
  
  const vite = await Promise.race([vitePromise, timeoutPromise]);
  console.log('[VITE] Vite server created successfully');

  app.use(vite.middlewares);
  app.use(async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(process.cwd(), "index.html");
      let template = fs.readFileSync(clientTemplate, "utf-8");
      template = await vite.transformIndexHtml(url, template);

      res.status(200).set({ "Content-Type": "text/html" }).end(template);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(process.cwd(), "dist");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  app.use(express.static(distPath));

  app.use((_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
