#!/usr/bin/env python3
"""Float-leak guard for the deterministic engine.

The engine is base-10 Decimal only, Context(prec=28, ROUND_HALF_EVEN); a single
binary float (a `0.65` literal, a `float(...)`, a `math`/`numpy` import) silently
shifts a digit and fails a golden — the exact invisible bug class that makes the
Decimal rule feel scary. This scans src/nourishops/domain/ and fails the build if
it finds one, turning that bug into a commit-time error.

ponytail: high-signal static scan, not a proof. The real guarantee is the Decimal
context at runtime + the golden tests; this catches the common case early. Escape
hatch: end a line with '# allow-float' for a deliberate, reviewed exception.

Run: python3 scripts/check_no_float.py [path ...]   (default: src/nourishops/domain)
"""
from __future__ import annotations

import ast
import sys
from pathlib import Path

ALLOW = "# allow-float"
BANNED_MODULES = {"math", "numpy"}
DEFAULT_ROOTS = ["src/nourishops/domain"]


def scan_source(src: str, filename: str = "<string>") -> list[str]:
    """Return 'file:line: reason' findings for binary-float leakage in `src`."""
    lines = src.splitlines()
    try:
        tree = ast.parse(src, filename=filename)
    except SyntaxError as e:
        return [f"{filename}:{e.lineno}: syntax error: {e.msg}"]

    def allowed(lineno: int) -> bool:
        return 1 <= lineno <= len(lines) and lines[lineno - 1].rstrip().endswith(ALLOW)

    findings: list[str] = []
    for node in ast.walk(tree):
        if isinstance(node, ast.Constant) and isinstance(node.value, float):
            if not allowed(node.lineno):
                findings.append(f'{filename}:{node.lineno}: float literal {node.value!r} — use Decimal("...")')
        elif isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and node.func.id == "float":
            if not allowed(node.lineno):
                findings.append(f"{filename}:{node.lineno}: float() call — use Decimal")
        elif isinstance(node, ast.Import):
            for a in node.names:
                if a.name.split(".")[0] in BANNED_MODULES and not allowed(node.lineno):
                    findings.append(f"{filename}:{node.lineno}: import {a.name} — banned in engine (use decimal)")
        elif isinstance(node, ast.ImportFrom):
            if (node.module or "").split(".")[0] in BANNED_MODULES and not allowed(node.lineno):
                findings.append(f"{filename}:{node.lineno}: from {node.module} import — banned in engine (use decimal)")
    return findings


def scan_path(root: Path) -> list[str]:
    findings: list[str] = []
    if not root.exists():
        return findings
    for py in sorted(root.rglob("*.py")):
        findings.extend(scan_source(py.read_text(), str(py)))
    return findings


def _self_check() -> None:
    """The guard's own logic, verified on every run (ponytail: one runnable check)."""
    bad = "x = 0.65\ny = float(z)\nimport math\n"
    good = 'from decimal import Decimal\nx = Decimal("0.65")\ny = a / b\nz = 1.0  # allow-float\n'
    assert len(scan_source(bad)) == 3, scan_source(bad)
    assert scan_source(good) == [], scan_source(good)


def main(argv: list[str]) -> int:
    _self_check()
    roots = [Path(p) for p in (argv or DEFAULT_ROOTS)]
    findings: list[str] = []
    for r in roots:
        findings.extend(scan_path(r))
    if findings:
        print(f"FLOAT LEAK — {len(findings)} finding(s):")
        for f in findings:
            print(f"  {f}")
        return 1
    print(f"no float leakage in: {', '.join(str(r) for r in roots)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
