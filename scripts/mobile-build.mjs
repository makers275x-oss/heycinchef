import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

const root = process.cwd();
const apiDir = path.join(root, "app", "api");
const apiBackupDir = path.join(root, "app", "__api_mobile_disabled");

function run(cmd, args, env = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      stdio: "inherit",
      shell: true,
      env: { ...process.env, ...env },
    });

    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} ${args.join(" ")} failed with code ${code}`));
    });
  });
}

function removeDirSafe(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function copyDirSafe(src, dest) {
  fs.cpSync(src, dest, { recursive: true });
}

async function main() {
  const apiExists = fs.existsSync(apiDir);

  if (fs.existsSync(apiBackupDir)) {
    removeDirSafe(apiBackupDir);
  }

  try {
    if (apiExists) {
      copyDirSafe(apiDir, apiBackupDir);
      removeDirSafe(apiDir);
      console.log("app/api geçici olarak kaldırıldı.");
    }

    await run("npx", ["next", "build"], { MOBILE_EXPORT: "1" });

    console.log("Mobil export build tamamlandı.");
  } finally {
    if (fs.existsSync(apiBackupDir)) {
      if (fs.existsSync(apiDir)) {
        removeDirSafe(apiDir);
      }
      copyDirSafe(apiBackupDir, apiDir);
      removeDirSafe(apiBackupDir);
      console.log("app/api geri yüklendi.");
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});