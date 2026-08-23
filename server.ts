import "dotenv/config";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import helmet from "helmet";
import { requireAuth, AuthRequest } from "./src/middleware/auth.ts";
import { apiLimiter, createUrlLimiter, authLimiter, redirectLimiter } from "./src/middleware/rateLimit.ts";
import { getOrCreateUser, getUserByUid } from "./src/db/users.ts";
import { db } from "./src/db/index.ts";
import { urls, clicks, users } from "./src/db/schema.ts";
import { eq, desc, and, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { UAParser } from "ua-parser-js";
import geoip from "geoip-lite";
import crypto from "crypto";
import { logger } from "./src/lib/logger.ts";
import { redis } from "./src/lib/redis.ts";
import { analyticsQueue } from "./src/lib/queue.ts";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.set("trust proxy", 1);

  
  app.use(helmet({
    contentSecurityPolicy: false, // Vite dev server needs some relaxed CSP
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  }));
  app.use(express.json());
  
  
  app.get("/api/health", (req, res) => res.json({ status: "ok" }));

 
  
  // 1. Sync User
  app.post("/api/auth/sync", authLimiter, requireAuth, async (req: AuthRequest, res): Promise<any> => {
    try {
      const user = await getOrCreateUser(req.user!.uid, req.user!.email || "");
      logger.info(`User synced: ${user.id}`);
      res.json(user);
    } catch (error: any) {
      logger.error("Sync user error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // 2. Create Short URL
  app.post("/api/urls", createUrlLimiter, requireAuth, async (req: AuthRequest, res): Promise<any> => {
    try {
      const { originalUrl, customAlias, expiresAt } = req.body;
      if (!originalUrl) return res.status(400).json({ error: "originalUrl is required" });

      const user = await getUserByUid(req.user!.uid);
      if (!user) return res.status(401).json({ error: "User not synced" });
      
      
      try {
        const parsedUrl = new URL(originalUrl);
        if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
          return res.status(400).json({ error: "Only HTTP/HTTPS URLs are allowed" });
        }
      } catch (e) {
        return res.status(400).json({ error: "Invalid URL" });
      }

      let alias = customAlias;
      let result;
      let attempts = 0;
      const MAX_ATTEMPTS = 5;

      while (attempts < MAX_ATTEMPTS) {
        if (!alias) alias = nanoid(6);
        
        try {
          result = await db.insert(urls).values({
            userId: user.id,
            originalUrl,
            alias,
            expiresAt: expiresAt ? new Date(expiresAt) : null,
          }).returning();
          break; // Success
        } catch (err: any) {
          
          const errStr = String(err.code) + String(err.cause?.code) + String(err.message) + String(err.cause?.constraint) + String(err.detail);
          const isUniqueViolation = errStr.includes('23505') || errStr.includes('urls_alias_unique') || errStr.includes('already exists');
                                    
          if (isUniqueViolation && !customAlias) {
            attempts++;
            alias = ''; // Reset to generate a new one
          } else if (isUniqueViolation && customAlias) {
            return res.status(400).json({ error: "Alias is already taken" });
          } else {
            throw err;
          }
        }
      }

      if (!result) {
        return res.status(500).json({ error: "Failed to generate unique alias after multiple attempts" });
      }

    
      await redis.set(`url:${result[0].alias}`, JSON.stringify(result[0]), 'EX', 60 * 60 * 24 * 7); // Cache for 7 days

      logger.info(`URL created: ${result[0].alias} by user ${user.id}`);
      res.json(result[0]);
    } catch (error: any) {
      logger.error("Create URL error:", error);
      res.status(500).json({ error: "Failed to create short URL" });
    }
  });

  
  app.get("/api/urls", apiLimiter, requireAuth, async (req: AuthRequest, res): Promise<any> => {
    try {
      const user = await getUserByUid(req.user!.uid);
      if (!user) return res.status(401).json({ error: "User not synced" });

      const userUrls = await db.select().from(urls)
        .where(eq(urls.userId, user.id))
        .orderBy(desc(urls.createdAt));
        
      res.json(userUrls);
    } catch (error: any) {
      logger.error("List URLs error:", error);
      res.status(500).json({ error: "Failed to fetch URLs" });
    }
  });

  
  app.get("/api/urls/:id/analytics", apiLimiter, requireAuth, async (req: AuthRequest, res): Promise<any> => {
    try {
      const urlId = parseInt(req.params.id, 10);
      const user = await getUserByUid(req.user!.uid);
      if (!user) return res.status(401).json({ error: "User not synced" });

      // Ensure ownership
      const urlRecord = await db.select().from(urls).where(and(eq(urls.id, urlId), eq(urls.userId, user.id)));
      if (urlRecord.length === 0) return res.status(404).json({ error: "URL not found" });

      const [
        [{ count }],
        browsers,
        devices,
        osList,
        countries
      ] = await Promise.all([
        db.select({ count: sql<number>`count(*)::int` }).from(clicks).where(eq(clicks.urlId, urlId)),
        db.select({
          name: sql<string>`COALESCE(browser, 'Unknown')`,
          count: sql<number>`count(*)::int`
        }).from(clicks).where(eq(clicks.urlId, urlId)).groupBy(sql`COALESCE(browser, 'Unknown')`),
        db.select({
          name: sql<string>`COALESCE(device_type, 'Unknown')`,
          count: sql<number>`count(*)::int`
        }).from(clicks).where(eq(clicks.urlId, urlId)).groupBy(sql`COALESCE(device_type, 'Unknown')`),
        db.select({
          name: sql<string>`COALESCE(os, 'Unknown')`,
          count: sql<number>`count(*)::int`
        }).from(clicks).where(eq(clicks.urlId, urlId)).groupBy(sql`COALESCE(os, 'Unknown')`),
        db.select({
          name: sql<string>`COALESCE(country, 'Unknown')`,
          count: sql<number>`count(*)::int`
        }).from(clicks).where(eq(clicks.urlId, urlId)).groupBy(sql`COALESCE(country, 'Unknown')`)
      ]);

      res.json({
        totalClicks: count,
        browsers,
        devices,
        os: osList,
        countries,
      });
    } catch (error: any) {
      logger.error("Analytics error:", error);
      res.status(500).json({ error: "Failed to fetch analytics" });
    }
  });

  
  app.delete("/api/urls/:id", apiLimiter, requireAuth, async (req: AuthRequest, res): Promise<any> => {
    try {
      const urlId = parseInt(req.params.id, 10);
      const user = await getUserByUid(req.user!.uid);
      if (!user) return res.status(401).json({ error: "User not synced" });

      const urlRecord = await db.select().from(urls).where(and(eq(urls.id, urlId), eq(urls.userId, user.id)));
      if (urlRecord.length === 0) return res.status(404).json({ error: "URL not found" });

      const alias = urlRecord[0].alias;

      await db.delete(clicks).where(eq(clicks.urlId, urlId));
      await db.delete(urls).where(eq(urls.id, urlId));
      
      await redis.del(`url:${alias}`);

      logger.info(`URL deleted: ${alias} by user ${user.id}`);
      res.json({ success: true });
    } catch (error: any) {
      logger.error("Delete URL error:", error);
      res.status(500).json({ error: "Failed to delete URL" });
    }
  });

  app.get("/r/:alias", redirectLimiter, async (req, res): Promise<any> => {
    try {
      const alias = req.params.alias;
      
      let target: any = null;
      const cached = await redis.get(`url:${alias}`);
      
      if (cached) {
        target = JSON.parse(cached);
      } else {
        const urlRecord = await db.select().from(urls).where(eq(urls.alias, alias));
        if (urlRecord.length > 0) {
          target = urlRecord[0];
          
          await redis.set(`url:${alias}`, JSON.stringify(target), 'EX', 60 * 60 * 24 * 7);
        }
      }
      
      if (!target) {
        return res.status(404).send("URL not found");
      }

      if (target.expiresAt && new Date(target.expiresAt) < new Date()) {
        return res.status(410).send("This link has expired");
      }
      res.redirect(target.originalUrl);

      const ua = req.headers["user-agent"];
      const parser = new UAParser(ua);
      
      const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "";
      const ipStr = Array.isArray(ip) ? ip[0] : ip;
      
      const geo = geoip.lookup(ipStr);
      
      const ipHash = crypto.createHash('sha256').update(ipStr).digest('hex').substring(0, 16);

      analyticsQueue.add('click', {
        urlId: target.id,
        ipHash,
        country: geo?.country || null,
        region: geo?.region || null,
        city: geo?.city || null,
        browser: parser.getBrowser().name,
        os: parser.getOS().name,
        deviceType: parser.getDevice().type || "desktop",
        referrer: req.headers.referer || null,
      }).catch(err => logger.error("Failed to queue analytics", err));

    } catch (error) {
      logger.error("Redirect error:", error);
      res.status(500).send("Internal Server Error");
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
  app.listen(PORT, "localhost", () => {
    logger.info(`Server running at http://localhost:${PORT}`);
  });
}

startServer();



