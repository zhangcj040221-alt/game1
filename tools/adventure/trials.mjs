import {
  start,
  buy,
  stock,
  choices,
  advance,
  alive,
  playable,
  play,
  ability,
  buttons,
  end,
  intent,
  pick,
} from "../../adventure/engine.js";
import { writeFileSync } from "node:fs";
import { goods, machines } from "../../adventure/workshop.js";
const routes = {
  采购: ["小偷"],
  机关: ["工程师", "精修", "弹簧盾", "发条蜂", "捕兽夹", "拆甲钻"],
  机关纯替换: ["工程师", "弹簧盾", "发条蜂", "捕兽夹", "拆甲钻"],
  纪律: [
    "老师",
    "整顿课堂",
    "应对攻势",
    "成果",
    "强化 · 减势",
    "强化 · 整顿课堂",
    "管攻管",
  ],
  衔接: ["老师", "衔接", "讲管攻", "强化 · 衔接", "强化 · 临时加课", "预读"],
  教材: [
    "老师",
    "指定教材",
    "衔接",
    "预讲攻",
    "预读",
    "强化 · 衔接",
    "强化 · 指定教材",
    "成果",
  ],
  教材无衔接: ["老师", "指定教材", "预读", "预讲攻", "成果", "强化 · 指定教材", "强化 · 成果"],
  酸辣甜: [
    "厨师",
    "青梅脆藕",
    "蜜桃羹",
    "烈焰椒锅",
    "甜",
    "蜜桃羹",
    "酸",
    "青梅脆藕",
  ],
  酸辣苦: ["厨师", "苦", "苦瓜清汤", "青梅脆藕", "烈焰椒锅", "酸", "青梅脆藕"],
  咸辅助: ["厨师", "咸", "盐焗卷", "青梅脆藕", "蜜桃羹", "辣", "烈焰椒锅"],
  剑盾: ["骑士", "突刺", "圆盾", "架势斩", "铁壁"],
  捕获: ["一二"],
  捕获遗留: ["一二"],
  基础牌对照: ["一二"],
};
function reward(s, path) {
  const all = choices(s);
  if (s.phase === "job") return all.findIndex((x) => x.label === path[0]);
  if (s.phase !== "growth") return 0;
  for (let offset = 0; offset < path.length - 1; offset++) {
    const want = path[1 + ((s.growth + offset) % (path.length - 1))];
    const candidates = all
      .map((x, i) => ({ x, i }))
      .filter(({ x }) => x.value === want || x.v === want || x.label === want || x.label.startsWith(want + " ·"));
    candidates.sort((a, b) => priority(b.x) - priority(a.x));
    function priority(x) {
      if (x.key === "reward") return s.plan.reward[x.slot] ? 0 : 5;
      if (x.label.startsWith("提炼")) return 4;
      return 1;
    }
    if (candidates.length) return candidates[0].i;
  }
  return all.length - 1;
}
function score(s) {
  let threat = 0;
  for (const e of alive(s))
    threat += e.stun ? 0 : Math.max(0, intent(s, e) - e.reduce);
  return (
    (s.phase === "lost" ? -1000 : s.phase !== "fight" ? 120 : 0) -
    alive(s).reduce((n, e) => n + e.hp + 4 + e.armor * 0.25, 0) +
    1.65 * s.hp -
    1.5 * Math.max(0, threat - s.armor) +
    s.progress * 15 +
    s.grades * 12 +
    (s.short ? 4 : 0) +
    (s.active ? 20 : 0) +
    s.spicy * 1.3 +
    s.echo * 1.3 +
    s.mirror * 1.5 +
    s.salt * 0.6 +
    (s.role === "小偷" ? Math.min(s.gold, 10) * 1.6 : 0) +
    alive(s).reduce(
      (n, e) =>
        n +
        (e.device
          ? machines[e.device].n *
            (machines[e.device].attack === Boolean(intent(s, e)) ? 0.85 : 0.35)
          : 0),
      0,
    ) +
    s.extraDraw * 0.8
  );
}
function settle(s) {
  if (s.discardChoice)
    pick(s, s.hand.find((i) => s.deck[i].startsWith("杂事")) ?? s.hand[0]);
  if (s.book) pick(s, s.bin.find((i) => s.deck[i] === "提问") ?? -1);
}
function turn(s, reverse, capture, fixedFocus = false) {
  // Deterministic lookahead can see simulated draws. Results describe this controller only.
  let states = [{ s, first: null }],
    best = null;
  for (let depth = 0; depth < 6; depth++) {
    let candidates = [];
    for (const node of states) {
      const pos = node.s;
      if (pos.phase !== "fight") continue;
      const targets = alive(pos);
      if (reverse) targets.reverse();
      if (fixedFocus) targets.splice(1);
      for (const e of targets) {
        const acts = [
          ...pos.hand.filter((i) => playable(pos, i)).map((i) => ["card", i]),
          ...buttons({ ...pos, target: e.id })
            .filter(
              (k) =>
                !["结束批改", "备课指定目标", "校盾减一"].includes(k) &&
                (capture || k !== "捕获"),
            )
            .map((k) => ["core", k]),
        ];
        for (const [type, key] of acts) {
          const n = structuredClone({ ...pos, ledger: [], log: [] });
          n.target = e.id;
          type === "core" ? ability(n, key) : play(n, key);
          settle(n);
          const val =
            score(n) +
            (capture ? n.captures * 3 : 0) +
            (n.role === "老师" &&
            !n.short &&
            n.seq.length &&
            n.seq[0].k ===
              { 随堂提问: "讲", 应对攻势: "管", 预判蓄势: "预" }[
                n.plan.condition
              ]
              ? 1
              : 0) -
            depth * 0.001;
          const entry = { s: n, first: node.first || [e.id, type, key], val };
          if (!best || val > best.val) best = entry;
          candidates.push(entry);
        }
      }
    }
    states = candidates.sort((a, b) => b.val - a.val).slice(0, 3);
    if (!states.length) break;
  }
  return best?.first;
}
const count = Number(process.argv[2] || 3),
  rows = [],
  summary = {};
for (const [name, path] of Object.entries(routes)) {
  let wins = 0;
  for (let seed = 1; seed <= count; seed++)
    for (const reverse of [false, true]) {
      const s = start(path[0] === "一二" ? "一二" : "布布", seed, {
        penalty: process.argv.includes("--retain-penalty")
          ? "失去留牌"
          : "补课",
        deathOnCapture: name === "捕获遗留",
        staggerPatterns: !process.argv.includes("--original"),
      });
      let safety = 0;
      while (!["clear", "lost"].includes(s.phase) && ++safety < 1800) {
        if (s.phase !== "fight") {
          if (s.phase === "shop") {
            const order = stock(s).sort(
              (a, b) => goods[b].uses - goods[a].uses,
            );
            for (const name of order) buy(s, name);
          }
          advance(s, reward(s, path));
          continue;
        }
        if (s.role === "老师" && !s.seq.length && !s.short) {
          const enemies = alive(s).sort((a, b) =>
            reverse ? b.id - a.id : a.id - b.id,
          );
          s.target = (
            enemies.find((e) =>
              s.plan.condition === "预判蓄势"
                ? intent(s, e) === 0
                : intent(s, e) > 0,
            ) || enemies[0]
          ).id;
          ability(s, "备课指定目标");
        }
        settle(s);
        const action = turn(s, reverse, name !== "基础牌对照");
        if (action) {
          s.target = action[0];
          action[1] === "core" ? ability(s, action[2]) : play(s, action[2]);
          continue;
        }
        if (s.grades) ability(s, "结束批改");
        if (s.role === "老师")
          s.held =
            s.hand.find((i) =>
              ["板书", "点名", "提问", "小测"].includes(s.deck[i]),
            ) ?? null;
        end(s);
      }
      if (safety >= 1800) throw Error("回合未收敛");
      wins += s.phase === "clear";
      rows.push(...s.ledger.map((l) => ({ build: name, seed, reverse, ...l })));
    }
  summary[name] = { runs: count * 2, clear: wins };
}
const probes = [];
for (const [name, path] of Object.entries(routes).filter(([, p]) =>
  ["老师", "厨师", "骑士"].includes(p[0]),
)) {
  const trajectory = start(path[0], 1);
  for (let g = 0; g <= 9; g++) {
    if (g % 3 === 0) {
      const p = structuredClone(trajectory);
      p.stage = [0, 3, 7, 11][g / 3];
      p.phase = "next";
      advance(p, 0);
      const composition = p.deck.join("、"),
        plan = structuredClone(p.plan);
      for (let step = 0; p.phase === "fight" && step < 400; step++) {
        settle(p);
        const a = turn(p, false, true);
        if (a) {
          p.target = a[0];
          a[1] === "core" ? ability(p, a[2]) : play(p, a[2]);
        } else {
          if (p.grades) ability(p, "结束批改");
          end(p);
        }
      }
      probes.push({
        name,
        g,
        composition,
        plan,
        phase: p.phase,
        ...p.ledger.at(-1),
      });
    }
    if (g < 9) {
      trajectory.stage = 1;
      trajectory.phase = "growth";
      advance(trajectory, reward(trajectory, path));
    }
  }
}
const focus = [];
for (const [name, path] of Object.entries(routes).filter(
  ([name]) => !["捕获遗留", "基础牌对照"].includes(name),
)) {
  const trained = start(path[0], 1);
  for (let g = 0; g <= 6; g++) {
    if (g % 3 === 0)
      for (const reverse of [false, true]) {
        const p = structuredClone(trained);
        p.stage = [0, 4, 8][g / 3];
        p.phase = "next";
        advance(p, 0);
        for (let step = 0; p.phase === "fight" && step < 400; step++) {
          settle(p);
          const a = turn(p, reverse, true, true);
          if (a) {
            p.target = a[0];
            a[1] === "core" ? ability(p, a[2]) : play(p, a[2]);
          } else {
            if (p.grades) ability(p, "结束批改");
            end(p);
          }
        }
        focus.push({ name, g, reverse, ...p.ledger.at(-1) });
      }
    if (g < 6 && !["一二", "小偷"].includes(trained.role)) {
      trained.stage = 1;
      trained.phase = "growth";
      advance(trained, reward(trained, path));
    }
  }
}
writeFileSync(
  new URL(
    process.argv.includes("--retain-penalty")
      ? "./retain-results.json"
      : "./results.json",
    import.meta.url,
  ),
  JSON.stringify({ summary, rows, probes, focus }),
);
console.log(summary);
