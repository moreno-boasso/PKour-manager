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
  PKOUR_TRICKS_WRITE_ENDPOINT: '/tricks/upsert-local',
  PKOUR_TRICKS_DELETE_ENDPOINT: '/tricks/delete-local',
};

let parsedEnv = {};
if (fs.existsSync(envPath)) {
  const fileContent = fs.readFileSync(envPath, 'utf-8');
  parsedEnv = dotenv.parse(fileContent);
}

const runtimeEnv = {
  ...fallback,
  ...parsedEnv,
};

// Never expose local secrets to browser runtime.
delete runtimeEnv.LOCAL_TOOL_SECRET;
delete runtimeEnv.PKOUR_LOCAL_TOOL_SECRET;

const envFileContent = `window.__PKOUR_ENV__ = ${JSON.stringify(runtimeEnv, null, 2)};\n`;

fs.writeFileSync(outputPath, envFileContent, 'utf-8');
console.log(`Generated runtime env file: ${outputPath}`);
