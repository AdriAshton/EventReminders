import fs from 'fs';
import path from 'path';

function readEnvFileValue(key: string) {
  const packageJsonPath = process.env.npm_package_json;
  const packageRoot = packageJsonPath ? path.dirname(packageJsonPath) : undefined;
  const candidatePaths = [
    packageRoot ? path.join(packageRoot, '.env.local') : undefined,
    path.join(process.cwd(), '.env.local'),
    path.join(process.cwd(), 'birthday-reminder', '.env.local'),
  ].filter((envPath): envPath is string => Boolean(envPath));

  for (const envPath of candidatePaths) {
    if (!fs.existsSync(envPath)) {
      continue;
    }

    const envFile = fs.readFileSync(envPath, 'utf8');
    const match = envFile.match(new RegExp(`^${key}=(.*)$`, 'm'));
    if (match?.[1]) {
      return match[1].trim().replace(/^['"]|['"]$/g, '');
    }
  }

  return undefined;
}

export function getServerEnv(key: string) {
  return process.env[key] || readEnvFileValue(key);
}