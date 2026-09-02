const path = require('path');
const fs = require('fs');

// Ensure SQLite DB exists in /tmp for write access on Vercel Serverless
if (process.env.VERCEL) {
  const tmpDb = path.join('/tmp', 'dev.db');
  if (!fs.existsSync(tmpDb)) {
    const candidatePaths = [
      path.join(process.cwd(), 'server', 'prisma', 'dev.db'),
      path.join(__dirname, '..', 'server', 'prisma', 'dev.db'),
      path.join(process.cwd(), 'prisma', 'dev.db')
    ];
    for (const src of candidatePaths) {
      if (fs.existsSync(src)) {
        try {
          fs.copyFileSync(src, tmpDb);
          console.log(`[Vercel Serverless] Seeded SQLite database copied to ${tmpDb}`);
          break;
        } catch (err) {
          console.error('[Vercel Serverless] Error copying SQLite database:', err);
        }
      }
    }
  }
}

const app = require('../server/src/app');

module.exports = app;
