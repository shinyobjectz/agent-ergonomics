#!/usr/bin/env bun
// Minimal ACP server (JSON-RPC/stdio) for client conformance testing.
let buf = "";
const send = (o: any) => process.stdout.write(JSON.stringify(o) + "\n");
process.stdin.setEncoding("utf8");
process.stdin.on("data", (d: string) => {
  buf += d;
  let nl;
  while ((nl = buf.indexOf("\n")) >= 0) {
    const line = buf.slice(0, nl).trim();
    buf = buf.slice(nl + 1);
    if (!line.startsWith("{")) continue;
    let m: any;
    try { m = JSON.parse(line); } catch { continue; }
    if (m.method === "initialize") send({ jsonrpc: "2.0", id: m.id, result: { protocolVersion: 1, agentCapabilities: {} } });
    else if (m.method === "session/new") send({ jsonrpc: "2.0", id: m.id, result: { sessionId: "sess-1" } });
    else if (m.method === "session/prompt") {
      send({ jsonrpc: "2.0", method: "session/update", params: { sessionId: "sess-1", update: { sessionUpdate: "agent_message_chunk", content: { type: "text", text: "ACP OK" } } } });
      send({ jsonrpc: "2.0", method: "session/update", params: { sessionId: "sess-1", update: { sessionUpdate: "turn" }, tokenUsage: { input: 12, output: 3 } } });
      send({ jsonrpc: "2.0", id: m.id, result: { stopReason: "end_turn" } });
    }
  }
});
