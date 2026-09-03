import { Client, Account, TablesDB, Teams, Functions, Storage } from 'appwrite';

// Appwrite Cloud pilot project "ISMS" (region fra) — viz plán
// jazzy-stargazing-kettle: walking skeleton pro Appwrite migraci,
// zatím jen katalog opatření (Controls) + lokální e-mail/heslo přihlášení.
// Odděleno od zbytku appky (isms-api/Express zůstává beze změny) — viz
// src/pilot/.
export const APPWRITE_ENDPOINT = import.meta.env.VITE_APPWRITE_ENDPOINT ?? 'https://fra.cloud.appwrite.io/v1';
export const APPWRITE_PROJECT_ID = import.meta.env.VITE_APPWRITE_PROJECT_ID ?? '6a980a56002e899380f4';
export const APPWRITE_DATABASE_ID = 'isms';
export const APPWRITE_TEAM_ID = 'isms-staff';
// Free-tier project caps buckets at 1 — this single bucket holds both
// policy documents and study materials (see project_isms.md memory).
export const APPWRITE_DOCUMENTS_BUCKET_ID = 'policies';

export const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID);

export const account = new Account(client);
export const tablesDB = new TablesDB(client);
export const teams = new Teams(client);
export const functions = new Functions(client);
export const storage = new Storage(client);
