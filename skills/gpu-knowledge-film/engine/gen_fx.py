#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""把 gl-transitions 的 GLSL 转成 src/fx_transitions.js。用法：python3 gen_fx.py <gl-transitions/transitions 目录>
带贴图参数的转场跳过。uniform 参数改成 const，默认值写在注释里，特殊调用时在 fx.js 里覆盖。"""
import re, sys, json
from pathlib import Path

src = Path(sys.argv[1])
out = {}
skip = []
for f in sorted(src.glob("*.glsl")):
    s = f.read_text(encoding="utf8")
    if "sampler2D" in s:
        skip.append(f.stem)
        continue
    params = {}

    def rep(m):
        typ, name, val = m.group(1), m.group(2), m.group(3).strip().rstrip("*/ ").strip()
        if typ == "float" and re.fullmatch(r"-?\d+", val):
            val += ".0"
        if typ == "int" and "." in val:
            val = val.split(".")[0]
        params[name] = [typ, val]
        return f"/*@{name}*/"

    s = re.sub(r"uniform\s+(\w+)\s+(\w+)\s*;\s*(?://|/\*)\s*=\s*([^\n]*)", rep, s)
    if re.search(r"^\s*uniform\s", s, re.M):
        skip.append(f.stem + "(无默认值)")
        continue
    s = re.sub(r"^\s*//.*$", "", s, flags=re.M)
    s = re.sub(r"\n{2,}", "\n", s).strip()
    out[f.stem] = {"p": params, "s": s}

js = "// 由 gen_fx.py 生成，来源 gl-transitions（MIT，个别 BSD，原文件头有作者）。别手改。\n"
js += "export const TRANSITIONS = " + json.dumps(out, ensure_ascii=False, indent=0) + ";\n"
Path(__file__).with_name("src").joinpath("fx_transitions.js").write_text(js, encoding="utf8")
print("转场", len(out), "跳过", skip)
