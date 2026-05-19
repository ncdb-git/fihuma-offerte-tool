import { existsSync } from "node:fs";
import path from "node:path";
import chromium from "@sparticuz/chromium";
import puppeteer, { type Browser } from "puppeteer-core";

const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_VERSION);

function resolveLocalChromePath(): string {
  const candidates = [
    process.env.CHROME_EXECUTABLE_PATH,
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    process.platform === "darwin" ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" : undefined,
    process.platform === "linux" ? "/usr/bin/google-chrome" : undefined,
    process.platform === "linux" ? "/usr/bin/chromium-browser" : undefined,
    path.join(
      process.cwd(),
      ".playwright-browsers/chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"
    )
  ].filter((value): value is string => Boolean(value));

  const hit = candidates.find((candidate) => existsSync(candidate));
  if (!hit) {
    throw new Error(
      "Geen Chrome/Chromium gevonden voor lokale PDF-export. Installeer Google Chrome of zet CHROME_EXECUTABLE_PATH."
    );
  }
  return hit;
}

/** Browser voor PDF — @sparticuz/chromium op Vercel, lokale Chrome in development. */
export async function launchPdfBrowser(): Promise<Browser> {
  if (isServerless) {
    return puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless
    });
  }

  return puppeteer.launch({
    executablePath: resolveLocalChromePath(),
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
  });
}
