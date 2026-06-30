# PI micro-VM

`docker build -t agent-ergonomics/pi:latest .` then run AX with
`OOTA_SANDBOX=docker` (and `OPENROUTER_API_KEY` in env). Hermetic, reproducible
agent trials with no host PI install. The runner mounts the subject's docs at
`/work` and invokes `pi --print --mode json …`.
