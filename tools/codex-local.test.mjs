import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";

test("localhost serializes, restores completed results, and fails interrupted commands", { skip: process.platform === "win32" }, async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "codex-local-test-"));
  let child;
  async function stop() {
    if (!child || child.exitCode !== null || child.signalCode) return;
    const exited = new Promise((resolve) => child.once("exit", resolve));
    child.kill("SIGTERM"); await exited;
  }
  t.after(async () => { await stop(); await rm(directory, { recursive: true, force: true }); });
  const executable = join(directory, "fake-codex");
  await writeFile(executable, `#!/usr/bin/env node
import { appendFileSync } from 'node:fs';
if (process.argv[2] !== 'exec') process.exit(0);
let prompt = ''; for await (const part of process.stdin) prompt += part;
appendFileSync('execution.log', 'start:' + prompt + '\\n');
await new Promise(r => setTimeout(r, prompt === 'interrupt' ? 30000 : 500));
appendFileSync('execution.log', 'end:' + prompt + '\\n');
console.log('result:' + prompt);
`, { mode: 0o755 });
  const listener = createServer();
  await new Promise((resolve) => listener.listen(0, "127.0.0.1", resolve));
  const port = listener.address().port;
  await new Promise((resolve) => listener.close(resolve));
  const url = `http://127.0.0.1:${port}`;
  async function start() {
    child = spawn(process.execPath, [fileURLToPath(new URL("./codex-bridge.mjs", import.meta.url)),
      "--local-server", "--local-port", String(port), "--cwd", directory, "--codex-bin", executable],
    { stdio: ["ignore", "pipe", "pipe"] });
    await new Promise((resolve, reject) => {
      let output = "";
      child.stdout.on("data", (chunk) => { output += chunk; if (output.includes("Local Codex bridge listening")) resolve(); });
      child.stderr.on("data", (chunk) => { output += chunk; });
      child.once("exit", () => reject(new Error(output)));
      child.once("error", reject);
    });
  }
  const submit = async (prompt) => (await fetch(`${url}/commands`, { method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, roomId: "test-room" }) })).json();
  const status = async (id) => (await fetch(`${url}/commands/${id}`)).json();
  async function until(id, expected) {
    for (let count = 0; count < 100; count++) {
      const result = await status(id);
      if (result.status === expected) return result;
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    assert.fail(`Command did not become ${expected}`);
  }
  await start();
  const first = await submit("first"); const second = await submit("second");
  await until(second.id, "completed");
  assert.equal(await readFile(join(directory, "execution.log"), "utf8"), "start:first\nend:first\nstart:second\nend:second\n");
  await stop(); await start();
  assert.equal((await status(first.id)).result, "result:first");
  const interrupted = await submit("interrupt"); await until(interrupted.id, "running");
  await stop(); await start();
  assert.equal((await status(interrupted.id)).status, "failed");
  assert.equal((await status(second.id)).status, "completed");
});
