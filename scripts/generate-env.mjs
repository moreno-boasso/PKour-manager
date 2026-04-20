import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

const projectRoot = process.cwd();
const envPath = path.join(projectRoot, '.env');
const outputPath = path.join(projectRoot, 'public', 'env.js');

const fallback = {
  PKOUR_API_BASE_URL: 'http://localhost:3000/api',
  PKOUR_TRICKS_WRITE_ENDPOINT: '/tricks/upsert-local',
  PKOUR_TRICKS_DELETE_ENDPOINT: '/tricks/delete-local',
  LOCAL_TOOL_SECRET: '',
  PKOUR_LOCAL_TOOL_SECRET: '',
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

const envFileContent = `window.__PKOUR_ENV__ = ${JSON.stringify(runtimeEnv, null, 2)};\n`;

fs.writeFileSync(outputPath, envFileContent, 'utf-8');
console.log(`Generated runtime env file: ${outputPath}`);
