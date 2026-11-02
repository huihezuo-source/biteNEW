#!/usr/bin/env python3
"""检查一份字幕稿。用法：python3 check_copy.py 稿子.txt [--dur 160]
稿子一行一句，行首可以带 [时间]，# 开头的行跳过。
只报数和列出可疑的句子，判断留给人。范围取自比特新语 23 条的字幕统计。"""
import re, sys

JARGON = """遍历 几何平均 算术平均 对数 凯利 夏普 贝塔 阿尔法 方差 标准差 波动率 期望值 中位数 均值
维持担保 融资盘 两融 基点 估值 市盈率 市净率 边际 定价权 流动性 反身性 有效市场 资产配置 回撤 风险溢价
非线性 概率分布 正态 样本 系统性 结构性 赛道 底层逻辑 认知""".split()
STALE = ["真相", "残酷", "扎心", "揭秘", "底裤", "内幕", "血淋淋"]
RISK = ["稳赚", "必涨", "翻倍", "抄底", "买入", "推荐", "满仓干", "内幕消息", "保本"]
AI_TONE = [r"不是.{1,16}而是", r"不是.{1,16}是", "值得注意", "总而言之", "换句话说", "本质上", "某种意义上"]


def load(path):
    out = []
    for line in open(path, encoding="utf8"):
        s = line.strip()
        if not s or s.startswith("#"):
            continue
        s = re.sub(r"^\[[^\]]*\]\s*", "", s)
        out.append(s)
    return out


def plain(s):
    return re.sub(r"[\s，。！？、：；“”‘’「」《》（）—…,.!?:;\"'()\-]", "", s)


def main():
    args = sys.argv[1:]
    if not args:
        sys.exit(__doc__)
    dur = None
    if "--dur" in args:
        k = args.index("--dur")
        dur = float(args[k + 1])
        del args[k : k + 2]
    lines = load(args[0])
    n = [len(plain(s)) for s in lines]
    total = sum(n)
    print(f"句数 {len(lines)}（比特新语 30–70，多数 45–60）")
    print(f"总字数 {total}，平均每句 {total / max(1, len(lines)):.1f} 字（比特新语 10–18）")
    if dur:
        print(f"每秒 {total / dur:.2f} 字（比特新语约 3.5–7）")
    print(f"问句 {sum('？' in s or '?' in s for s in lines)} 句（比特新语 0–5）")
    print(f"带“你”的 {sum('你' in s for s in lines)} 句（比特新语 1–14）")
    arabic = [len(re.findall(r"\d[\d.,]*", s)) for s in lines]
    print(f"阿拉伯数字 {sum(arabic)} 个，带数字的 {sum(n > 0 for n in arabic)} 句")
    print(f"第一句 {len(plain(lines[0]))} 字：{lines[0]}")

    def report(title, hits):
        if hits:
            print(f"\n{title}")
            for h in hits:
                print("  " + h)

    runs = [k for k in range(len(lines) - 2) if all(arabic[k + d] for d in range(3))]
    report("连续三句带数字（小白容易掉）：", [f"{k + 1}. {lines[k]}" for k in runs])
    report("超过 20 字的句子（手机上一行放不下）：", [f"{k + 1}. {s}" for k, s in enumerate(lines) if len(plain(s)) > 20])
    report("术语（小白看不懂，能换成生活里的东西就换）：", [f"{k + 1}. [{w}] {s}" for k, s in enumerate(lines) for w in JARGON if w in s])
    report("用烂的词（抖音数据里不带量）：", [f"{k + 1}. [{w}] {s}" for k, s in enumerate(lines) for w in STALE if w in s])
    report("合规要看一眼的词：", [f"{k + 1}. [{w}] {s}" for k, s in enumerate(lines) for w in RISK if w in s])
    report("AI 腔（“不是…是…”全片最多一次，放在反转）：", [f"{k + 1}. {s}" for k, s in enumerate(lines) if any(re.search(p, s) for p in AI_TONE)])


if __name__ == "__main__":
    main()
