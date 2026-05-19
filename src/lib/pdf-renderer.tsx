import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { ProposalDocument } from "@/components/proposal/ProposalDocument";
import { launchPdfBrowser } from "@/lib/pdf-browser";
import { Proposal } from "@/lib/types";

function mimeTypeForAsset(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  return "application/octet-stream";
}

async function inlinePublicImages(markup: string) {
  const publicDir = path.join(process.cwd(), "public");
  const srcPattern = /src="\/(?!\/)([^"]+)"/g;
  const sources = Array.from(markup.matchAll(srcPattern), (match) => match[1]);
  const replacements = new Map<string, string>();

  await Promise.all(
    sources.map(async (srcPath) => {
      if (replacements.has(srcPath)) return;

      const filePath = path.join(publicDir, decodeURIComponent(srcPath));
      const asset = await fs.readFile(filePath);
      replacements.set(srcPath, `data:${mimeTypeForAsset(filePath)};base64,${asset.toString("base64")}`);
    })
  );

  return markup.replace(srcPattern, (_, srcPath: string) => `src="${replacements.get(srcPath) ?? `/${srcPath}`}"`);
}

export async function renderProposalPdf(proposal: Proposal): Promise<Buffer> {
  const { renderToStaticMarkup } = await import("react-dom/server");
  const css = await fs.readFile(path.join(process.cwd(), "src/styles/proposal.css"), "utf8");
  const markup = await inlinePublicImages(renderToStaticMarkup(<ProposalDocument proposal={proposal} />));
  const publicBase = `${pathToFileURL(path.join(process.cwd())).href}/`;
  const html = `<!doctype html>
    <html lang="nl">
      <head>
        <meta charset="utf-8" />
        <base href="${publicBase}" />
        <style>
          * { box-sizing: border-box; }
          body { margin: 0; }
          ${css}
        </style>
      </head>
      <body>${markup}</body>
    </html>`;

  const browser = await launchPdfBrowser();
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 794, height: 1122, deviceScaleFactor: 1 });
    await page.setContent(html, { waitUntil: "load" });
    await page.emulateMediaType("print");
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all(
        Array.from(document.images).map((img) => {
          if (img.complete && img.naturalWidth > 0) return Promise.resolve();
          if (img.complete && img.naturalWidth === 0) {
            return Promise.reject(new Error(`Kon afbeelding niet laden: ${img.currentSrc || img.src}`));
          }
          return new Promise<void>((resolve, reject) => {
            img.addEventListener("load", () => resolve(), { once: true });
            img.addEventListener("error", () => reject(new Error(`Kon afbeelding niet laden: ${img.currentSrc || img.src}`)), {
              once: true
            });
          });
        })
      );
      await Promise.all(Array.from(document.images).map((img) => img.decode().catch(() => undefined)));
    });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" }
    });

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
