/** Ports of the two browser-test servers (see playwright.config.ts). */
export const PORT = Number(process.env.E2E_PORT ?? 3100);
export const BASE_URL = `http://localhost:${PORT}`;
/** Second server with a deterministic mock AI provider and fixture audio files. */
export const LAB_URL = `http://localhost:${PORT + 1}`;
