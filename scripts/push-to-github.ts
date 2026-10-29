import { execSync } from 'child_process';

const repoUrl = process.env.GITHUB_REPO_URL;
const token = process.env.GITHUB_TOKEN;

if (!repoUrl) {
  console.log('Usage: GITHUB_REPO_URL="https://github.com/<user>/<repo>.git" [GITHUB_TOKEN="..."] npx tsx scripts/push-to-github.ts');
  console.log('Or add remote manually: git remote add origin <url> && git push -u origin main');
  process.exit(1);
}

let authenticatedUrl = repoUrl;
if (token && repoUrl.startsWith('https://github.com/')) {
  authenticatedUrl = repoUrl.replace('https://github.com/', `https://${token}@github.com/`);
}

try {
  console.log('Setting remote origin...');
  try {
    execSync('git remote remove origin', { stdio: 'ignore' });
  } catch {}
  execSync(`git remote add origin ${authenticatedUrl}`);
  console.log('Pushing to main branch...');
  execSync('git push -u origin main --force', { stdio: 'inherit' });
  console.log('✅ Successfully pushed all code to GitHub repository!');
} catch (error: any) {
  console.error('Push failed:', error.message);
  process.exit(1);
}
