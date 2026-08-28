import { load, type Store } from '@tauri-apps/plugin-store';

/**
 * One key: where the vault is. That is genuinely all that needs remembering
 * outside the vault itself - everything else lives in .catprep/state.json, so
 * pointing the app at a folder is enough to recover a full history.
 */
const STORE_FILE = 'prepos.settings.json';
const VAULT_PATH_KEY = 'vaultPath';

let cached: Store | null = null;

async function store(): Promise<Store> {
  if (!cached) cached = await load(STORE_FILE, { autoSave: false });
  return cached;
}

export async function getSavedVaultPath(): Promise<string | null> {
  const s = await store();
  return (await s.get<string>(VAULT_PATH_KEY)) ?? null;
}

export async function saveVaultPath(path: string): Promise<void> {
  const s = await store();
  await s.set(VAULT_PATH_KEY, path);
  await s.save();
}

export async function clearSavedVaultPath(): Promise<void> {
  const s = await store();
  await s.delete(VAULT_PATH_KEY);
  await s.save();
}
