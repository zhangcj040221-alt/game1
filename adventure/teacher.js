export const schoolDeck = [
  "提问",
  "小测",
  "板书",
  "点名",
  "纪律",
  "预习",
  "杂事甲",
  "杂事乙",
];
export const categories = ["攻", "攻", "讲", "管", "管", "预", "杂", "杂"];
export const modules = {
  condition: ["应对攻势", "预判蓄势", "随堂提问"],
  reward: ["减势", "成果", "预读", "衔接"],
  challenge: ["讲管攻", "预讲攻", "管攻管"],
  mastery: ["整顿课堂", "临时加课", "指定教材"],
};
export const lessonHint = {
  应对攻势: "攻击意图：对指定敌人依次管理、攻击",
  预判蓄势: "非攻击意图：预习后攻击指定敌人",
  随堂提问: "任意意图：讲授后攻击指定敌人",
  减势: "降低目标此次攻击",
  成果: "追加伤害",
  预读: "下回合多抽牌",
  衔接: "推进长期；主导后改为抽牌",
  整顿课堂: "短教案成功时干预目标，冷却两回合",
  临时加课: "每回合多一次行动",
  指定教材: "回合抽牌前可指定弃牌替代随机抽取",
};
export const initialPlan = () => ({
  condition: "随堂提问",
  reward: ["减势", null],
  level: [1, 0],
  challenge: "讲管攻",
  mastery: "临时加课",
  enhanced: false,
});
export function edits(p) {
  const edits = [];
  for (const key of ["condition", "challenge", "mastery"])
    for (const value of modules[key])
      if (value !== p[key])
        edits.push({
          key,
          value,
          label:
            "改编" +
            {
              condition: "短期条件",
              challenge: "长期挑战",
              mastery: "主导权限",
            }[key] +
            " · " +
            value,
        });
  for (const slot of [0, 1]) {
    for (const value of modules.reward)
      if (!p.reward.includes(value))
        edits.push({
          key: "reward",
          slot,
          value,
          label: "奖励位" + (slot + 1) + " · " + value,
        });
    if (p.reward[slot] && p.level[slot] < 2)
      edits.push({ key: "level", slot, label: "强化 · " + p.reward[slot] });
  }
  if (!p.enhanced)
    edits.push({ key: "enhanced", label: "强化 · " + p.mastery });
  edits.push({ key: "keep", label: "保留教案" });
  return edits;
}
export function edit(p, x) {
  if (x.key === "keep") return;
  if (x.key === "reward") {
    p.reward[x.slot] = x.value;
    p.level[x.slot] = 1;
  } else if (x.key === "level") p.level[x.slot]++;
  else if (x.key === "enhanced") p.enhanced = true;
  else {
    p[x.key] = x.value;
    if (x.key === "mastery") p.enhanced = false;
  }
}
export function contribute(s, api) {
  if (s.active || !api.live().length) return;
  if (++s.progress < s.cfg.goal) return;
  s.active = true;
  s.mastered = s.turn;
  for (const e of api.live()) api.hit(e, s.cfg.burst, true);
  for (const e of api.live()) e.stun = true;
  api.log(
    "主导课堂开启 · 全体 " + s.cfg.burst + " 伤害，幸存目标各跳过一次意图",
  );
  if (s.plan.mastery === "临时加课") {
    s.ap++;
    if (s.plan.enhanced) api.draw(1);
  }
}
export function teach(s, c, e, api) {
  const k = categories[schoolDeck.indexOf(c)],
    t = s.plan;
  if (k === "攻") {
    api.hit(e, (c === "提问" ? 6 : 4) + s.lecture);
    s.lecture = 0;
  }
  if (k === "管") e.reduce += c === "点名" ? 3 : 2;
  if (k === "讲") s.lecture += 2;
  if (k === "预" || k === "杂")
    api.log(
      "牌顶 · " +
        s.pile
          .slice(-2)
          .reverse()
          .map((i) => s.deck[i])
          .join("、"),
    );
  if (k === "杂") {
    if (s.junk[c]) {
      if (c === "杂事甲") {
        api.draw(2);
        s.discardChoice = s.hand.length > 0;
      } else {
        api.draw(1);
        s.extraDraw = 1;
      }
    }
    return;
  }
  s.seq.push({ k, id: e.id });
  const prev = s.seq.slice(0, -1),
    req =
      t.condition === "随堂提问"
        ? "讲"
        : t.condition === "预判蓄势"
          ? "预"
          : "管";
  if (
    !s.short &&
    e.id === s.planned &&
    k === "攻" &&
    prev.some((x) => x.k === req && (req !== "管" || x.id === e.id)) &&
    (req === "讲" || (req === "管") === s.plannedAttack)
  ) {
    s.short = true;
    if (s.debt) s.debt = false;
    else s.grades++;
    api.log("短教案完成");
    e.reduce += 2;
    t.reward.forEach((r, i) => {
      const lv = t.level[i];
      if (r === "减势") e.reduce += lv * 2;
      if (r === "成果") api.hit(e, lv * 2);
      if (r === "预读") s.extraDraw = Math.max(lv, s.extraDraw);
      if (r === "衔接") {
        if (s.active) api.draw(lv);
        else if (!s.accelerated) {
          s.accelerated = true;
          contribute(s, api);
          if (lv === 2) api.draw(1);
        }
      }
    });
    if (
      s.active &&
      t.mastery === "整顿课堂" &&
      s.turn >= s.rewriteAt &&
      e.hp &&
      api.intent(e) > 0
    ) {
      if (e.kind === "boss") e.reduce += t.enhanced ? 8 : 6;
      else e.stun = true;
      s.rewriteAt = s.turn + 2;
      s.authorityUses++;
    }
  }
  const last = s.seq.slice(-3);
  if (
    !s.accelerated &&
    last.map((x) => x.k).join("") === t.challenge &&
    new Set(last.filter((x) => "管攻".includes(x.k)).map((x) => x.id)).size ===
      1
  ) {
    s.accelerated = true;
    contribute(s, api);
  }
}
