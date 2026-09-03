import { functions } from './appwrite.js';

// Calls an Appwrite Function synchronously and unwraps its HTTP-shaped
// response. The caller's identity reaches the Function automatically via
// the reserved x-appwrite-user-id header Appwrite attaches to executions
// made under an authenticated session — no manual JWT plumbing needed.
export async function callFn(functionId, path, method, body) {
  const execution = await functions.createExecution({
    functionId,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    async: false,
    xpath: path,
    method,
  });
  let parsed = null;
  try { parsed = execution.responseBody ? JSON.parse(execution.responseBody) : null; } catch { /* not JSON */ }
  if (execution.responseStatusCode >= 400) {
    throw new Error(parsed?.error ?? `Function selhala (HTTP ${execution.responseStatusCode})`);
  }
  return parsed;
}
