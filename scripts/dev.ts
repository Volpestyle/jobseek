import { spawn, type ChildProcess } from "node:child_process";

const pnpmCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

interface ManagedProcess {
  name: string;
  process: ChildProcess;
}

function startProcess(name: string, args: string[]): ManagedProcess {
  const child = spawn(pnpmCommand, args, {
    stdio: "inherit",
    env: process.env,
  });

  child.on("error", (error) => {
    console.error(`[${name}] failed to start:`, error);
    shutdown(1);
  });

  return { name, process: child };
}

const managedProcesses: ManagedProcess[] = [
  startProcess("client", ["client:dev"]),
  startProcess("server", ["server:dev"]),
];

let terminating = false;
const exitCodes = new Map<number, number>();

managedProcesses.forEach(({ name, process: child }) => {
  child.on("exit", (code, signal) => {
    if (code !== null) {
      exitCodes.set(child.pid ?? Number.NaN, code);
    }

    if (!terminating) {
      if (code && code !== 0) {
        console.error(`[${name}] exited with code ${code}`);
        shutdown(code);
        return;
      }

      if (signal) {
        console.warn(`[${name}] exited due to signal ${signal}`);
        shutdown(1);
        return;
      }
    }

    if (exitCodes.size === managedProcesses.length) {
      const highestCode = Math.max(...exitCodes.values(), 0);
      process.exit(highestCode);
    }
  });
});

function shutdown(code: number) {
  if (terminating) return;
  terminating = true;

  for (const { process: child } of managedProcesses) {
    if (!child.killed) {
      child.kill();
    }
  }

  process.exit(code);
}

function handleSignal(signal: NodeJS.Signals) {
  terminating = true;
  for (const { process: child } of managedProcesses) {
    if (!child.killed) {
      child.kill(signal);
    }
  }
}

process.on("SIGINT", () => {
  handleSignal("SIGINT");
  process.exit(0);
});

process.on("SIGTERM", () => {
  handleSignal("SIGTERM");
  process.exit(0);
});
