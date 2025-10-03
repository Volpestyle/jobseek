import { mkdir, readFile, stat } from "fs/promises";
import { spawn } from "child_process";
import path from "path";

interface DiagramEntry {
  id: string;
  markdown: string;
  source: string;
  output: string;
  theme?: string;
  backgroundColor?: string;
  scale?: number;
}

interface Manifest {
  diagrams: DiagramEntry[];
}

async function fileExists(filePath: string) {
  try {
    await stat(filePath);
    return true;
  } catch (error: unknown) {
    if (error && typeof error === "object" && "code" in error && (error as { code?: string }).code === "ENOENT") {
      return false;
    }

    throw error;
  }
}

async function renderDiagram(entry: DiagramEntry, options: { repoRoot: string; docsRoot: string; mermaidRoot: string; mmdcPath: string; argsBase: string[] }) {
  const { repoRoot, docsRoot, mermaidRoot, mmdcPath, argsBase } = options;

  const inputPath = path.join(mermaidRoot, entry.source);
  const outputPath = path.join(docsRoot, entry.output);

  if (!(await fileExists(inputPath))) {
    throw new Error(`Mermaid source not found for diagram "${entry.id}" at ${path.relative(repoRoot, inputPath)}`);
  }

  await mkdir(path.dirname(outputPath), { recursive: true });

  const args = [...argsBase, "-i", inputPath, "-o", outputPath, "-t", entry.theme ?? "default"];

  if (entry.backgroundColor) {
    args.push("-b", entry.backgroundColor);
  }

  if (typeof entry.scale === "number" && Number.isFinite(entry.scale)) {
    args.push("-s", entry.scale.toString());
  }

  await new Promise<void>((resolve, reject) => {
    const child = spawn(mmdcPath, args, { stdio: "inherit" });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Mermaid CLI exited with code ${code} for diagram "${entry.id}"`));
      }
    });
  });
}

async function run() {
  const repoRoot = path.resolve(__dirname, "..");
  const docsRoot = path.join(repoRoot, "docs");
  const mermaidRoot = path.join(docsRoot, "mermaid");
  const manifestPath = path.join(mermaidRoot, "manifest.json");
  const configPath = path.join(mermaidRoot, "config.json");
  const mmdcBinary = process.platform === "win32" ? "mmdc.cmd" : "mmdc";
  const mmdcPath = path.join(repoRoot, "node_modules", ".bin", mmdcBinary);

  const argsBase: string[] = [];
  if (await fileExists(configPath)) {
    argsBase.push("-c", configPath);
  }

  if (!(await fileExists(mmdcPath))) {
    throw new Error("Mermaid CLI binary not found. Did you run `pnpm install`?");
  }

  if (!(await fileExists(manifestPath))) {
    throw new Error(`Mermaid manifest missing at ${path.relative(repoRoot, manifestPath)}`);
  }

  const rawManifest = await readFile(manifestPath, "utf8");
  const { diagrams }: Manifest = JSON.parse(rawManifest);

  if (!Array.isArray(diagrams) || diagrams.length === 0) {
    console.log("No diagrams configured in docs/mermaid/manifest.json");
    return;
  }

  for (const diagram of diagrams) {
    console.log(`Rendering diagram ${diagram.id} for ${diagram.markdown}...`);
    await renderDiagram(diagram, { repoRoot, docsRoot, mermaidRoot, mmdcPath, argsBase });
  }

  console.log("Mermaid diagrams generated successfully.");
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
