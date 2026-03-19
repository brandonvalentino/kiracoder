import fs from "node:fs";
import path from "node:path";

export async function pickFolder() {
  const selectedPath = process.env.KIRACODE_FOLDER || process.cwd();
  const resolvedPath = path.resolve(selectedPath);

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Folder does not exist: ${resolvedPath}`);
  }

  if (!fs.statSync(resolvedPath).isDirectory()) {
    throw new Error(`Path is not a directory: ${resolvedPath}`);
  }

  return resolvedPath;
}
