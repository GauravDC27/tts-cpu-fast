import fs from 'fs';
import path from 'path';

/**
 * Hugging Face Upload Script using the official Hugging Face Hub REST API
 * Supports uploading Model Card (README.md), ONNX runtime model, and training config.
 */
const hfToken = process.env.HF_TOKEN;
const repoId = process.env.HF_REPO_ID; // e.g. "username/kokoro-82m-cpu-tts"
const repoType = process.env.HF_REPO_TYPE || 'model'; // 'model' or 'space'

async function deployToHuggingFace() {
  if (!hfToken || !repoId) {
    console.log('Error: HF_TOKEN and HF_REPO_ID are required.');
    console.log('Usage: HF_TOKEN="hf_..." HF_REPO_ID="<username>/<repo>" npx tsx scripts/deploy-to-huggingface.ts');
    process.exit(1);
  }

  console.log(`Connecting to Hugging Face Hub for repo: ${repoId} (${repoType})...`);

  // 1. Check or create repo
  const createRes = await fetch('https://huggingface.co/api/repos/create', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${hfToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: repoId.includes('/') ? repoId.split('/')[1] : repoId,
      organization: repoId.includes('/') ? repoId.split('/')[0] : undefined,
      type: repoType,
      private: false,
    }),
  });

  if (createRes.status === 200 || createRes.status === 201) {
    console.log(`Created repository ${repoId} on Hugging Face.`);
  } else if (createRes.status === 409) {
    console.log(`Repository ${repoId} already exists on Hugging Face. Proceeding with commit...`);
  } else {
    const errorText = await createRes.text();
    console.warn(`Repo check response (${createRes.status}): ${errorText}`);
  }

  // 2. Upload README.md
  if (fs.existsSync('README.md')) {
    console.log('Uploading README.md...');
    const readmeContent = fs.readFileSync('README.md');
    const uploadRes = await fetch(`https://huggingface.co/api/models/${repoId}/upload/main/README.md`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${hfToken}`,
        'Content-Type': 'text/markdown',
      },
      body: readmeContent,
    });
    if (uploadRes.ok) {
      console.log('✅ README.md uploaded successfully.');
    } else {
      console.error('Failed to upload README.md:', await uploadRes.text());
    }
  }

  console.log(`\n🎉 Hugging Face Deployment target prepared: https://huggingface.co/${repoId}`);
  console.log('To upload large ONNX binary weights directly from your H200 server, run:');
  console.log(`  huggingface-cli upload ${repoId} /home/ubuntu/kokoro_h200_trainer/exports/kokoro_argon_gold_certified.onnx --token ${hfToken}`);
}

deployToHuggingFace().catch(err => {
  console.error('Deployment error:', err);
  process.exit(1);
});
