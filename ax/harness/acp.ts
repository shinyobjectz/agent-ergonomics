/**
 * AcpRunner — drive an EXPLICIT harness via the Agent Client Protocol
 * (agentclientprotocol.com): JSON-RPC 2.0 over stdio. Used in harness-specific
 * mode to benchmark a particular agent (Claude Code, Gemini CLI, custom) instead
 * of the PI baseline. The agent command is configured via OOTA_ACP_AGENT and is
 * run inside the sandbox when relevant.
 *
 * NOTE: implemented to spec; pending validation against a live ACP agent. Gated
 * so it errors actionably rather than faking a run.
 */
import { spawn } from "node:child_process";
import type { AgentRunner, TrialInput, TrialRun } from "./agent.ts";

export class AcpRunner implements AgentRunner {
  id = "acp";
  private agentCmd = process.env.OOTA_ACP_AGENT || ""; // e.g. "claude-code-acp" or "docker run … <acp-agent>"

  async run(input: TrialInput, seed: number): Promise<TrialRun> {
    if (!this.agentCmd)
      throw new Error("AcpRunner needs OOTA_ACP_AGENT set to the ACP agent command (it speaks JSON-RPC over stdio). Use --agent pi for the baseline.");
    const [bin, ...baseArgs] = this.agentCmd.split(/\s+/);
    const t0 = performance.now();
    const child = spawn(bin, baseArgs, { stdio: ["pipe", "pipe", "pipe"], cwd: input.docsAvailable ? input.subjectPath : undefined });

    let buf = "";
    let answer = "";
    let tokensIn = 0, tokensOut = 0, turns = 0, compaction = 0;
    let id = 0;
    const send = (method: string, params: any) =>
      child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id: ++id, method, params }) + "\n");

    const done = new Promise<void>((resolve, reject) => {
      child.stdout.on("data", (d) => {
        buf += d.toString();
        let nl;
        while ((nl = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (!line.startsWith("{")) continue;
          let msg: any;
          try { msg = JSON.parse(line); } catch { continue; }
          // streaming agent updates
          if (msg.method === "session/update") {
            const u = msg.params?.update ?? {};
            if (u.sessionUpdate === "agent_message_chunk" && u.content?.type === "text") answer += u.content.text;
            if (u.sessionUpdate === "turn" ) turns++;
            if (u.tokenUsage) { tokensIn += u.tokenUsage.input ?? 0; tokensOut += u.tokenUsage.output ?? 0; }
          }
          // responses to our requests
          if (msg.id != null && msg.result !== undefined) {
            if (msg.result.protocolVersion) send("session/new", { cwd: input.subjectPath, mcpServers: [] });
            else if (msg.result.sessionId) send("session/prompt", { sessionId: msg.result.sessionId, prompt: [{ type: "text", text: input.intent }] });
            else if (msg.result.stopReason) resolve(); // prompt completed
          }
          if (msg.error) reject(new Error(`ACP error: ${msg.error.message}`));
        }
      });
      child.on("error", reject);
      child.on("exit", () => resolve());
      setTimeout(() => { child.kill(); resolve(); }, 180000);
    });

    send("initialize", { protocolVersion: 1, clientCapabilities: {} });
    await done;
    child.kill();
    const wallMs = performance.now() - t0;
    return {
      runId: `acp-${input.probeId}-${seed}`,
      success: answer.length > 0,
      turns: Math.max(turns, 1),
      tokensIn,
      tokensOut,
      retries: 0,
      timeToFirstActionMs: wallMs,
      wallMs,
      exit: 0,
      artifacts: answer.length > 0 ? ["(agent answer)"] : [],
      extra: { acp: true, agent: this.agentCmd, compaction },
    };
  }
}
