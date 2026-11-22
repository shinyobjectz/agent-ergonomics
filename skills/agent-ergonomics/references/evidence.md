# Gathering evidence

Write scripts to a scratch directory, not the project. Rerun them after each phase, so the numbers in the decision
log stay current. Adapt the patterns to the languages in the repo.

## File lists

List the project's own code first, so vendored and generated files don't skew anything:

```sh
git ls-files -- '*.rs' '*.ts' '*.tsx' '*.py' '*.go' ':!vendor/*' ':!**/node_modules/**' ':!*.gen.*' > files.txt
```

Check for code that git doesn't show but an agent's search will find: entries in `.git/info/exclude`, untracked
folders, and stale build output.

## Skeleton

Strip function bodies and keep signatures, types and doc comments, so the whole codebase fits in context. For most
languages, a tree-sitter query for function bodies replaced with `{ ... }` is enough. Without tree-sitter, keep lines
that declare something (`fn`, `function`, `class`, `struct`, `interface`, `type`, `export`, `pub`, `def`) plus doc
comments. Have subagents summarize areas from the skeleton when even that is too large.

## Dependency graph

Use the build system's own graph where it has one, such as `cargo metadata --no-deps`, `go list -deps -json`, or the
workspace's package.json files. For each module, record its own lines, fan-in (how many depend on it), fan-out (how
many it depends on) and its folder. Then look for:

- the highest fan-in modules, and whether they hold one job or several
- the highest fan-out modules, which are often hubs split by size rather than by reason
- small modules with one user
- imports that point from stable code to volatile code (compare with change frequency from git)

## Co-change

Map each changed file to its module (the nearest folder holding a manifest such as Cargo.toml, package.json or
go.mod), then count how often pairs of modules change in the same commit:

```python
# python3 cochange.py  (run from the repo root)
import subprocess, os, itertools, collections
log = subprocess.run(["git", "log", "--no-merges", "--name-only", "--format=@@", "-n", "1000"],
                     capture_output=True, text=True).stdout
MARKERS = ("Cargo.toml", "package.json", "go.mod", "pyproject.toml")
def module(path):
    d = os.path.dirname(path)
    while d and not any(os.path.isfile(os.path.join(d, m)) for m in MARKERS):
        d = os.path.dirname(d)
    return d or path.split("/")[0]
commits = [{module(f) for f in c.split("\n") if f.strip()} for c in log.split("@@")]
alone, pairs = collections.Counter(), collections.Counter()
for c in commits:
    alone.update(c)
    if 1 < len(c) <= 12:
        pairs.update(itertools.combinations(sorted(c), 2))
for (a, b), n in sorted(pairs.items(), key=lambda kv: -kv[1] / (alone[kv[0][0]] + alone[kv[0][1]] - kv[1])):
    if n >= 4:
        print(f"{n:4} {n / (alone[a] + alone[b] - n):.2f}  {a} <-> {b}")
```

Pairs in different folders with a high ratio are hidden links or a feature split by layer. Leave docs, lockfiles and
generated files out of the count, or they pair with everything. Then read four or five commits that touch a pair, to
see what one change had to do in each place.

## Special-case census

Count each pattern per file and per module, so the decision log can name where they cluster. Put the patterns in a
script file: some harnesses refuse shell commands whose text looks like a sleep loop.

| Pattern | Rust | TypeScript | Python |
| --- | --- | --- | --- |
| Environment and globals | `env::var(` | `process.env.` | `os.environ` |
| Swallowed errors | `let _ = `, `.ok();`, `unwrap_or_default()` | `catch {}`, `catch (_) {}` | `except: pass` |
| Sleeps and polls | `thread::sleep` | `setTimeout(`, `sleep(` | `time.sleep(` |
| Disabled tests | `#[ignore]` | `.skip(`, `.todo(` | `@skip`, `pytest.mark.skip` |
| Branches on one literal | `== "..."` | `=== "..."` | `== "..."` |
| Type escapes | `unsafe`, `as` casts | `as any`, `@ts-ignore` | `# type: ignore` |
| Hand-parsed flags | `== "--` | `=== "--` | `== "--` |

Also count copies of common helpers (hash functions by their constants, colour parsers, number readers), and how many
distinct environment variable names appear.

## Agent behaviour

- Collect transcripts of agents doing the system's real tasks: harness logs, CI agent runs, bug reports agents filed,
  support threads.
- If there are none, run five to ten real tasks with an agent in the system's usual harness, saving every transcript
  to disk before reading it.
- Read the raw calls and responses, not only the final answers. What the agent left out matters as much as what it
  did.
- Code each failure with the friction codes in `agents.md`, then cluster by root cause.
