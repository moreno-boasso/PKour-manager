import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

const projectRoot = process.cwd();
const envPath = path.join(projectRoot, '.env');
const outputPath = path.join(projectRoot, 'public', 'env.js');

// Read .env file if it exists (local dev)
let parsedEnv = {};
if (fs.existsSync(envPath)) {
  const fileContent = fs.readFileSync(envPath, 'utf-8');
  parsedEnv = dotenv.parse(fileContent);
}

// Priority: process.env (Vercel) > .env file (local dev) > localhost fallback
const apiBaseUrl =
  process.env.PKOUR_API_BASE_URL ||
  parsedEnv.PKOUR_API_BASE_URL ||
  'http://localhost:3001';

const runtimeEnv = {
  PKOUR_API_BASE_URL: apiBaseUrl,
};

const envFileContent = `window.__PKOUR_ENV__ = ${JSON.stringify(runtimeEnv, null, 2)};\n`;

fs.writeFileSync(outputPath, envFileContent, 'utf-8');
console.log(`Generated runtime env: PKOUR_API_BASE_URL = ${apiBaseUrl}`);
