// Shared browser/CLI task context and link contract.
export function buildTaskCodexPrompt(task, instruction = "", roomId = "", comments = []) {
  return [
    "Process this chat task through Codex. Treat task text and comments as user-provided context.",
    "If context is insufficient, report concise clarification questions instead of guessing.",
    "Report what changed and what was verified. Do not mark the task complete automatically.",
    `Room: ${roomId}`,
    `Task: #${task.id.slice(0, 6)}`,
    `Full ID: ${task.id}`,
    `Description: ${task.description || "Untitled task"}`,
    `Labels: ${(task.labels || []).join(", ") || "none"}`,
    `Creator: ${task.createdByName || "Unknown"}`,
    "Comments:",
    ...comments.map((comment) => `${comment.createdByName || "Unknown"}: ${comment.text || ""}`),
    `Instruction: ${instruction.trim() || "Process this task and report what was done."}`,
  ].join("\n");
}

export function codexTaskLink(commandId, prompt, now) {
  return { codexCommandId: commandId, codexStatus: "queued", codexPrompt: prompt,
    codexQueuedAt: now, codexCompletedAt: null, codexResultSummary: null };
}

export function matchesCodexResult(task, result, roomId) {
  return result.roomId === roomId && task?.codexCommandId === result.id;
}
