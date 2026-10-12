import type { ChildProcessWithoutNullStreams } from "node:child_process";
import { createInterface } from "node:readline";
export function rpc(process: ChildProcessWithoutNullStreams) {
  let id = 0;
  const pending = new Map<
    number,
    { resolve: (value: any) => void; reject: (error: Error) => void }
  >();
  const lines = createInterface({ input: process.stdout });
  lines.on("line", (line) => {
    const result = JSON.parse(line);
    const waiter = pending.get(result.id);
    if (!waiter) return;
    pending.delete(result.id);
    if (result.error)
      waiter.reject(
        new Error(typeof result.error === "string" ? result.error : result.error.message),
      );
    else waiter.resolve(result.result);
  });
  process.on("exit", () => {
    for (const waiter of pending.values()) waiter.reject(new Error("Rust process exited"));
  });
  return (message: object) =>
    new Promise<any>((resolve, reject) => {
      const next = ++id;
      pending.set(next, { resolve, reject });
      process.stdin.write(JSON.stringify({ ...message, id: next }) + "\n");
    });
}
