// Goi Cloudflare Pages Deploy Hook de build lai trang sau khi co bai moi published.
// Can bien moi truong DEPLOY_HOOK_URL (tao trong Cloudflare Pages > Settings > Deploy hooks).

export function isDeployHookConfigured() {
  return Boolean(process.env.DEPLOY_HOOK_URL);
}

export async function triggerDeploy() {
  const url = process.env.DEPLOY_HOOK_URL;
  if (!url) return false;
  const res = await fetch(url, { method: "POST" });
  if (!res.ok) {
    throw new Error(`Goi Deploy Hook that bai (HTTP ${res.status}).`);
  }
  return true;
}
