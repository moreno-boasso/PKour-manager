import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

const projectRoot = process.cwd();
const envPath = path.join(projectRoot, '.env');
const outputPath = path.join(projectRoot, 'public', 'env.js');

const fallback = {
  PKOUR_API_BASE_URL: 'http://localhost:3000/api',
  PKOUR_SPOTS_API_BASE_URL: 'http://localhost:3001/api',
  PKOUR_SPOTS_LIST_ENDPOINT: '/spots/moderation',
  PKOUR_SPOTS_MODERATE_ENDPOINT: '/spots/moderation',
  PKOUR_SPOTS_DETAIL_ENDPOINT: '/spots/moderation',
  PKOUR_REVIEWS_LIST_ENDPOINT: '/reviews/moderation',
  PKOUR_REVIEWS_MODERATE_ENDPOINT: '/reviews/moderation',
  PKOUR_REPORTS_LIST_ENDPOINT: '/reports/moderation',
  PKOUR_REPORTS_MODERATE_ENDPOINT: '/reports/moderation',
  PKOUR_BUG_REPORTS_LIST_ENDPOINT: '/bug-reports/moderation',
  PKOUR_BUG_REPORTS_MODERATE_ENDPOINT: '/bug-reports/moderation',
  PKOUR_PHOTOS_LIST_ENDPOINT: '/photos/moderation',
  PKOUR_PHOTOS_MODERATE_ENDPOINT: '/photos/moderation',
  PKOUR_TRICKS_WRITE_ENDPOINT: '/tricks/upsert-local',
  PKOUR_TRICKS_DELETE_ENDPOINT: '/tricks/delete-local',
};

let parsedEnv = {};
if (fs.existsSync(envPath)) {
  const fileContent = fs.readFileSync(envPath, 'utf-8');
  parsedEnv = dotenv.parse(fileContent);
}

// On Vercel, env vars are in process.env, not .env file
// Priority: process.env > .env file > fallback
const runtimeEnv = {
  ...fallback,
  ...parsedEnv,
  // Override with process.env if available (Vercel deployment)
  ...(process.env.PKOUR_API_BASE_URL && { PKOUR_API_BASE_URL: process.env.PKOUR_API_BASE_URL }),
  ...(process.env.PKOUR_SPOTS_API_BASE_URL && { PKOUR_SPOTS_API_BASE_URL: process.env.PKOUR_SPOTS_API_BASE_URL }),
  ...(process.env.PKOUR_SPOTS_LIST_ENDPOINT && { PKOUR_SPOTS_LIST_ENDPOINT: process.env.PKOUR_SPOTS_LIST_ENDPOINT }),
  ...(process.env.PKOUR_SPOTS_MODERATE_ENDPOINT && { PKOUR_SPOTS_MODERATE_ENDPOINT: process.env.PKOUR_SPOTS_MODERATE_ENDPOINT }),
  ...(process.env.PKOUR_SPOTS_DETAIL_ENDPOINT && { PKOUR_SPOTS_DETAIL_ENDPOINT: process.env.PKOUR_SPOTS_DETAIL_ENDPOINT }),
  ...(process.env.PKOUR_REVIEWS_LIST_ENDPOINT && { PKOUR_REVIEWS_LIST_ENDPOINT: process.env.PKOUR_REVIEWS_LIST_ENDPOINT }),
  ...(process.env.PKOUR_REVIEWS_MODERATE_ENDPOINT && { PKOUR_REVIEWS_MODERATE_ENDPOINT: process.env.PKOUR_REVIEWS_MODERATE_ENDPOINT }),
  ...(process.env.PKOUR_REPORTS_LIST_ENDPOINT && { PKOUR_REPORTS_LIST_ENDPOINT: process.env.PKOUR_REPORTS_LIST_ENDPOINT }),
  ...(process.env.PKOUR_REPORTS_MODERATE_ENDPOINT && { PKOUR_REPORTS_MODERATE_ENDPOINT: process.env.PKOUR_REPORTS_MODERATE_ENDPOINT }),
  ...(process.env.PKOUR_BUG_REPORTS_LIST_ENDPOINT && { PKOUR_BUG_REPORTS_LIST_ENDPOINT: process.env.PKOUR_BUG_REPORTS_LIST_ENDPOINT }),
  ...(process.env.PKOUR_BUG_REPORTS_MODERATE_ENDPOINT && { PKOUR_BUG_REPORTS_MODERATE_ENDPOINT: process.env.PKOUR_BUG_REPORTS_MODERATE_ENDPOINT }),
  ...(process.env.PKOUR_PHOTOS_LIST_ENDPOINT && { PKOUR_PHOTOS_LIST_ENDPOINT: process.env.PKOUR_PHOTOS_LIST_ENDPOINT }),
  ...(process.env.PKOUR_PHOTOS_MODERATE_ENDPOINT && { PKOUR_PHOTOS_MODERATE_ENDPOINT: process.env.PKOUR_PHOTOS_MODERATE_ENDPOINT }),
  ...(process.env.PKOUR_TRICKS_WRITE_ENDPOINT && { PKOUR_TRICKS_WRITE_ENDPOINT: process.env.PKOUR_TRICKS_WRITE_ENDPOINT }),
  ...(process.env.PKOUR_TRICKS_DELETE_ENDPOINT && { PKOUR_TRICKS_DELETE_ENDPOINT: process.env.PKOUR_TRICKS_DELETE_ENDPOINT }),
};

// Never expose local secrets to browser runtime.
delete runtimeEnv.LOCAL_TOOL_SECRET;
delete runtimeEnv.PKOUR_LOCAL_TOOL_SECRET;

const envFileContent = `window.__PKOUR_ENV__ = ${JSON.stringify(runtimeEnv, null, 2)};\n`;

fs.writeFileSync(outputPath, envFileContent, 'utf-8');
console.log(`Generated runtime env file: ${outputPath}`);
console.log('DEBUG: process.env.PKOUR_API_BASE_URL =', process.env.PKOUR_API_BASE_URL);
console.log('DEBUG: runtimeEnv.PKOUR_API_BASE_URL =', runtimeEnv.PKOUR_API_BASE_URL);
