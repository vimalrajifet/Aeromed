const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

let datasourceUrl = process.env.DATABASE_URL;

// On Vercel Serverless, root files are read-only. We copy dev.db to /tmp so writes succeed.
if (process.env.VERCEL) {
  const tmpDbPath = path.join('/tmp', 'dev.db');
  if (!fs.existsSync(tmpDbPath)) {
    const candidatePaths = [
      path.join(process.cwd(), 'server', 'prisma', 'dev.db'),
      path.join(__dirname, '..', '..', 'prisma', 'dev.db'),
      path.join(process.cwd(), 'prisma', 'dev.db')
    ];
    for (const src of candidatePaths) {
      if (fs.existsSync(src)) {
        try {
          fs.copyFileSync(src, tmpDbPath);
          console.log(`[Vercel Serverless] Seeded SQLite copied from ${src} to ${tmpDbPath}`);
          break;
        } catch (err) {
          console.warn('[Vercel Serverless] Could not copy SQLite dev.db:', err.message);
        }
      }
    }
  }
  if (fs.existsSync(tmpDbPath)) {
    datasourceUrl = `file:${tmpDbPath}`;
  }
}

const prisma = new PrismaClient({
  datasources: datasourceUrl ? { db: { url: datasourceUrl } } : undefined,
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error']
});

module.exports = prisma;
