import { appendFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";

const logDir = join(process.cwd(), "logs");
const logFile = join(logDir, "debug.log");

export function debugLog(message: string) {
  try {
    if (!existsSync(logDir)) mkdirSync(logDir);
    appendFileSync(logFile, `[${new Date().toISOString()}] ${message}\n`);
  } catch (err) {
    // If logging fails, fallback to stderr
    process.stderr.write(`[LOGGER ERROR] ${err}\n`);
  }
}