import { NextResponse } from "next/server";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

async function runEpistemicEngine(message: string) {
  const projectPath = process.env.EPISTEMIC_ENGINE_PROJECT || "/home/mytheeramet7/src/Epismetic-Belief-Engine";
  const binaryPath = process.env.EPISTEMIC_ENGINE_BINARY || `${projectPath}/target/debug/scies-task`;
  const args = ["--json", message];

  const command = process.platform === "win32" ? "wsl.exe" : binaryPath;
  const commandArgs = process.platform === "win32"
    ? ["-d", process.env.EPISTEMIC_ENGINE_WSL_DISTRO || "Ubuntu", "--", binaryPath, ...args]
    : args;

  const { stdout, stderr } = await execFileAsync(command, commandArgs, {
    timeout: 15_000,
    windowsHide: true,
    maxBuffer: 1024 * 1024,
  });

  const output = stdout.trim() || stderr.trim();
  if (!output) throw new Error("Epistemic engine returned no output");
  return output;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { messages?: ChatMessage[] };
    const messages = (body.messages || [])
      .filter(
        (message) =>
          ["user", "assistant", "system"].includes(message.role) &&
          typeof message.content === "string"
      )
      .slice(-20)
      .map((message) => ({
        role: message.role,
        content: message.content.slice(0, 4000),
      }));

    if (!messages.length) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const latestUserMessage = [...messages].reverse().find((message) => message.role === "user");
    const response = await runEpistemicEngine(latestUserMessage?.content || "");
    return NextResponse.json({ message: response, mode: "epistemic-engine" });
  } catch (error) {
    console.error("AI chat request failed:", error);
    return NextResponse.json(
      { error: "Epistemic engine is unavailable. Build scies-task in WSL first." },
      { status: 503 }
    );
  }
}
