import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const devDbPath = path.resolve(__dirname, '../prisma/dev.db');
const testDbPath = path.resolve(__dirname, '../prisma/test.db');

// Ensure test.db exists with schema initialized from dev.db
if (!fs.existsSync(testDbPath) && fs.existsSync(devDbPath)) {
  fs.copyFileSync(devDbPath, testDbPath);
}

export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: `file:${testDbPath}`
    }
  }
});

export default prisma;
