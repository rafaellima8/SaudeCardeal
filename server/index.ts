import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import { db } from "./db";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import seedSIGTAPMappings from "./seed-sigtap";
import { seed as seedMinimal } from "./seed-minimal";
import { seedSpecialtiesAndRules } from "./seed-specialties";

const app = express();

// Session configuration with secure settings
// Using MemoryStore temporarily (SQLite compatibility)
app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev-secret-change-in-production",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
  })
);

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}
app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Seed usuários de teste (apenas em desenvolvimento)
  if (process.env.NODE_ENV === "development") {
    try {
      await seedMinimal();
    } catch (error) {
      console.warn("[STARTUP] Aviso: Seed usuários falhou (pode já estar populado):", error);
    }
  }

  // Garantir seed SIGTAP no startup (SISAB compliance)
  try {
    await seedSIGTAPMappings();
  } catch (error) {
    console.warn("[STARTUP] Aviso: Seed SIGTAP falhou (pode já estar populado):", error);
  }
  
  // Seed de especialidades e regras de encaminhamento inteligente
  try {
    await seedSpecialtiesAndRules();
  } catch (error) {
    console.warn("[STARTUP] Aviso: Seed especialidades falhou (pode já estar populado):", error);
  }
  
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
