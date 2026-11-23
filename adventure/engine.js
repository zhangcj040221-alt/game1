import {
  goods,
  gearLabel,
  machines,
  trigger,
  steal,
  shopStock,
  purchase,
} from "./workshop.js";
import {
  schoolDeck,
  initialPlan,
  edits,
  edit,
  teach,
  contribute,
} from "./teacher.js";
import { chefDeck, kitchenEdits, flavor, cook, life } from "./chef.js";
export const config = {
  goal: 4,
  burst: 10,
  healBudget: 12,
  capture: 0.4,
  chance: 0.6,
  deathOnCapture: false,
  staggerPatterns: true,
  penalty: "补课",
  shieldEntry: 2,
  swapHit: 4,
  normalHeal: 5,
  eliteHeal: 7,
};
export const foes = {
  pressure: "追击兽",
  spore: "孢子兽",
  shell: "甲壳护卫",
  charger: "蓄能术士",
  boss: "守关首领",
};
export const map = [
  ["pressure", 13],
  ["spore pressure", 10, 13],
  ["shell", 17],
  ["shell charger", 15, 19],
  ["boss", 44],
  ["shell charger", 17, 19],
  ["shell pressure", 17, 19],
  ["shell charger", 24, 26],
  ["boss", 62],
  ["pressure charger", 24, 24],
  ["spore pressure", 24, 26],
  ["shell charger", 30, 38],
  ["boss", 90],
];
const knight = ["斩击", "斩击", "连斩", "反击", "木盾", "塔盾", "校盾", "步法"];
const base = ["轻击", "轻击", "重击", "重击", "木盾", "木盾", "步法", "步法"];
const mage = ["星弹", "星弹", "镜", "镜", "回声", "双星", "星印", "折光"];
export const decks = {
  老师: schoolDeck,
  厨师: chefDeck,
  骑士: knight,
  一二: mage,
  布布: base,
  小偷: ["快刀", "快刀", "探囊", "探囊", "木盾", "木盾", "步法", "重击"],
  工程师: [
    "绊索",
    "绊索",
    "钻地鼠",
    "钻地鼠",
    "拆装锤",
    "拆装锤",
    "木盾",
    "步法",
  ],
};
export const chapter = (s) => (s.stage < 5 ? 1 : s.stage < 9 ? 2 : 3);
export const rank = (s) =>
  [4, 8, 12].includes(s.stage)
    ? "首领"
    : [3, 7, 11].includes(s.stage)
      ? "精英"
      : "普通";
export const alive = (s) => s.enemies.filter((e) => e.hp > 0);
function rand(s) {
  s.seed = (Math.imul(1664525, s.seed) + 1013904223) >>> 0;
  return s.seed / 4294967296;
}
function shuffle(s, a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand(s) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function refill(s) {
  if (!s.pile.length) s.pile = shuffle(s, s.bin.splice(0));
}
function draw(s, n) {
  while (n--) {
    refill(s);
    if (!s.pile.length) break;
    const card = s.pile.pop();
    s.hand.push(card);
    if (s.revealed) s.revealed = s.revealed.filter((i) => i !== card);
  }
}
function log(s, msg) {
  s.log.unshift(msg);
  s.log.length = Math.min(24, s.log.length);
}
export function intent(s, e) {
  const ch = chapter(s),
    cycle = {
      pressure: [4, 5, 0],
      spore: [3, 0, 3],
      shell: [0, 3, 0],
      charger: [0, 0, 9],
      boss: [
        [6, 0, 9, 5],
        [7, 0, 12, 6],
        [9, 0, 15, 7],
      ][ch - 1],
    }[e.kind];
  if (s.cfg.staggerPatterns && e.kind === "boss" && ch === 3)
    cycle.splice(3, 0, 0);
  const d = cycle[e.step % cycle.length];
  return (
    (d && e.kind !== "boss"
      ? d + (ch - 1) * (e.kind === "charger" ? 3 : 1)
      : d) + (d ? e.buff : 0)
  );
}
export function segments(s, e) {
  const total = intent(s, e);
  const split = e.kind === "boss" && chapter(s) > 1 && total === chapter(s) + 4;
  const parts = split ? [3, total - 3] : [total];
  let reduction = e.reduce;
  return parts.map((part) => {
    const blocked = Math.min(part, reduction);
    reduction -= blocked;
    return part - blocked;
  });
}
function hit(s, e, n, pierce = false) {
  if (!e?.hp || n <= 0) return;
  const block = pierce ? 0 : Math.min(n, e.armor);
  e.armor -= block;
  n -= block;
  e.hp = Math.max(0, e.hp - n);
  if (e.kind === "shell" && e.hp && n && !e.shelled) {
    e.armor += 4;
    e.shelled = true;
  }
  if (n || block)
    log(s, foes[e.kind] + " · 生命 −" + n + (block ? "，护甲 −" + block : ""));
  if (!e.hp) removed(s, e, true);
}
function removed(s, e, death) {
  s.order.push(e.kind);
  if (death && e.kind === "spore")
    for (const other of alive(s)) other.buff += chapter(s) + 2;
  if (!s.enemies[s.target].hp) s.target = alive(s)[0]?.id ?? 0;
}
const api = (s) => ({
  live: () => alive(s),
  hit: (e, n, p) => hit(s, e, n, p),
  intent: (e) => intent(s, e),
  draw: (n) => draw(s, n),
  reveal: (n) => {
    refill(s);
    s.revealed = s.pile.slice(-n).reverse();
  },
  log: (m) => log(s, m),
});
export function start(role = "布布", seed = 20261123, options = {}) {
  const s = {
    role,
    initial: seed,
    gold: 5,
    pocket: [],
    sold: [],
    machineQuality: Array(8).fill(0),
    seed,
    stage: 0,
    hp: 30,
    growth: 0,
    deck: [...decks[role]],
    plan: initialPlan(),
    cfg: { ...config, ...options },
    ledger: [],
  };
  enter(s);
  return s;
}
function enter(s) {
  const [team, ...hp] = map[s.stage];
  Object.assign(s, {
    phase: "fight",
    turn: 1,
    ap: 3,
    target: 0,
    armor: 0,
    held: null,
    hand: [],
    pile: shuffle(
      s,
      s.deck.map((_, i) => i),
    ),
    bin: [],
    log: [],
    startHp: s.hp,
    enemies: team.split(" ").map((kind, id) => ({
      kind,
      id,
      hp: hp[id],
      max: hp[id],
      armor: 0,
      step:
        s.cfg.staggerPatterns && kind === "pressure" && id === 1 && s.stage >= 5
          ? 2
          : 0,
      reduce: 0,
      stun: false,
      // 一二对首领的魔法失衡有恢复窗口，其他职业仍照常结算。
      mageBreakReady: true,
      deviceBoost: 0,
      buff: 0,
    })),
    progress: 0,
    active: false,
    grades: 0,
    junk: { 杂事甲: 0, 杂事乙: 0 },
    seq: [],
    revealed: [],
    canTake: false,
    foresight: false,
    lecture: 0,
    short: false,
    accelerated: false,
    debt: false,
    freeJunk: false,
    extraDraw: 0,
    planned: 0,
    rewriteAt: 1,
    authorityUses: 0,
    mastered: null,
    lessons: 0,
    tasteCounts: {},
    discardChoice: false,
    book: false,
    stance: "盾",
    swapped: false,
    perfect: 0,
    spicy: 0,
    spicyTurns: 0,
    acidRatio: 0,
    acidPlus: 0,
    bitter: 0,
    salt: 0,
    fresh: [],
    returned: [],
    flavors: [],
    mixed: false,
    freeTaste: false,
    foodLife: 0,
    cooked: 0,
    plays: 0,
    healLeft: s.cfg.healBudget,
    echo: false,
    mirror: false,
    captures: 0,
    spellUses: 0,
    order: [],
  });
  if (s.role === "小偷")
    for (const e of s.enemies)
      e.coins = chapter(s) + (e.kind === "boss" ? 5 : 2);
  s.plannedAttack = intent(s, s.enemies[0]) > 0;
  draw(s, 4);
}
function finish(s) {
  if (s.phase !== "fight" || (s.hp > 0 && alive(s).length)) return;
  const endHp = s.hp;
  if (!s.hp) s.phase = "lost";
  else if (s.stage === 12) s.phase = "clear";
  else {
    s.hp =
      rank(s) === "首领"
        ? 30
        : Math.min(
            30,
            s.hp + (rank(s) === "精英" ? s.cfg.eliteHeal : s.cfg.normalHeal),
          );
    s.phase =
      s.stage === 0 && s.role === "布布"
        ? "job"
        : s.stage > 0 && rank(s) !== "首领" && s.role !== "一二"
          ? "growth"
          : "next";
  }
  if (s.role === "小偷" && s.hp && s.stage < 12) {
    s.phase = "shop";
    s.sold = [];
  }
  s.ledger.push({
    stage: s.stage + 1,
    growth: s.growth,
    turns: s.turn,
    start: s.startHp,
    end: endHp,
    after: s.hp,
    role: s.role,
    perfect: s.perfect,
    foodLife: s.foodLife,
    cooked: s.cooked,
    tastes: { ...s.tasteCounts },
    lessons: s.lessons,
    plays: s.plays,
    mastered: s.mastered,
    uses: s.authorityUses,
    captures: s.captures,
    spells: s.spellUses,
    deck: s.deck.length,
    order: [...s.order],
  });
}
export const stock = (s) => shopStock(s, shuffle);
export const buy = (s, name) => purchase(s, name, stock(s));
export function choices(s) {
  if (s.phase === "job")
    return ["老师", "厨师", "骑士", "小偷", "工程师"].map((label) => ({
      label,
    }));
  if (s.phase === "next" || s.phase === "shop")
    return [{ label: "进入下一战" }];
  if (s.phase !== "growth") return [];
  if (s.role === "工程师") {
    const pool = [];
    for (const [i, c] of s.deck.entries())
      if (machines[c])
        for (const v of Object.keys(machines))
          if (c !== v && !s.deck.includes(v))
            pool.push({ i, v, label: c + " → " + v });
    const seed = (s.initial ^ Math.imul(s.stage + 1, 2654435761)) >>> 0;
    const options = shuffle({ seed }, pool).slice(0, 2);
    const quality = s.machineQuality || Array(s.deck.length).fill(0);
    const improvements = s.deck.flatMap((c, i) => machines[c] && (quality[i] || 0) < 2
      ? [{ key: "quality", i, label: "精修 · " + c + " 机关伤害+2（" + ((quality[i] || 0) + 1) + "/2）" }]
      : []);
    // 少量随机更换图纸 + 可定向精修已有图纸；最多两级，更换该槽精修归零。
    return [...options, ...improvements, { label: "保留图纸" }];
  }
  if (s.role === "老师") return edits(s.plan);
  if (s.role === "厨师") {
    const pool = [
      ...new Map(kitchenEdits(s.deck).map((x) => [x.label, x])).values(),
    ];
    // A separate seeded stream keeps the offers stable and leaves combat draws untouched.
    shuffle(
      {
        seed: (s.initial ^ Math.imul(s.stage + 1, 2654435761) ^ s.growth) >>> 0,
      },
      pool,
    );
    const offers = [];
    for (const kind of ["提炼", "转化", "做菜"]) {
      const index = pool.findIndex((x) => x.label.startsWith(kind));
      if (index >= 0) offers.push(pool.splice(index, 1)[0]);
    }
    offers.push(...pool.slice(0, 3 - offers.length));
    return [...offers, { label: "保留配方" }];
  }
  return [
    ...s.deck.flatMap((c, i) =>
      ["突刺", "架势斩", "圆盾", "铁壁", "步法"]
        .filter((v) => v !== c)
        .map((v) => ({ i, v, label: c + " → " + v })),
    ),
    { label: "保留招式" },
  ];
}
export function advance(s, i) {
  const x = choices(s)[i];
  if (!x) return false;
  if (s.phase === "job") {
    s.role = x.label;
    s.deck = [...decks[s.role]];
    if (s.role === "小偷") {
      s.gold = 5;
      s.pocket = [];
      s.sold = [];
      s.phase = "shop";
      return true;
    }
  }
  if (s.phase === "growth") {
    s.growth++;
    if (s.role === "老师") edit(s.plan, x);
    else if (s.role === "工程师" && x.key === "quality") s.machineQuality[x.i]++;
    else if (x.v) {
      s.deck[x.i] = x.v;
      if (s.role === "工程师") s.machineQuality[x.i] = 0;
    }
  }
  s.stage++;
  enter(s);
  return true;
}
const swords = ["斩击", "连斩", "反击", "突刺", "架势斩"],
  guards = ["木盾", "塔盾", "圆盾", "铁壁", "校盾"];
export function playable(s, i) {
  const c = s.deck[i];
  if (s.phase !== "fight" || s.book || s.discardChoice || !s.hand.includes(i))
    return false;
  if (s.role === "骑士" && (s.stance === "剑" ? guards : swords).includes(c))
    return false;
  return (
    s.ap > 0 ||
    Boolean(s.freeTaste && flavor(c) && !s.returned.includes(i)) ||
    Boolean((s.junk[c] === 2 || c === "预习") && !s.freeJunk)
  );
}
function ordinary(s, c, e, i) {
  if (machines[c]) {
    e.device = c;
    e.deviceBoost = (s.machineQuality?.[i] || 0) * 2;
    log(s, "已布置" + c + (e.deviceBoost ? " · 精修+" + e.deviceBoost : ""));
    return;
  }
  if (c === "探囊") log(s, "探囊 · 金币 +" + steal(s, e, 1));
  let n = {
    拆装锤: e.device ? 7 : 5,
    快刀: 6,
    探囊: 3,
    轻击: 5,
    重击: 6,
    斩击: 6,
    反击: e.stun ? 10 : 4,
    突刺: 8,
    架势斩: s.swapped ? 9 : 4,
    星弹: 4,
    双星: 2,
    星印: 2,
    切片: 5,
    翻锅: 4,
    钟鸣: 4,
    孢子: 3,
    破甲: 5,
    蓄雷: 7,
    王印: 8,
  }[c];
  if (c === "星印") e.mark = true;
  if (c === "回声") {
    s.echo = true;
    return;
  }
  if (c === "镜") {
    s.mirror = true;
    s.armor += 4;
  }
  if (c === "折光" || c === "步法" || c === "备料") {
    s.armor += 2;
    draw(s, 1);
  }
  if (c === "翻锅") s.armor += 2;
  if (guards.includes(c))
    s.armor += { 木盾: 4, 塔盾: 6, 圆盾: 3, 铁壁: 8, 校盾: 1 }[c];
  if (c === "破甲") e.armor = 0;
  if (c === "孢子") e.reduce += 3;
  if (c === "钟鸣") s.echo = true;
  if (c === "连斩") n = 3;
  if (n) {
    const opened = e.stun;
    const attack = n + Math.floor(s.spicy * (s.bitter ? 0.5 : 1));
    for (let j = 0; j < (["连斩", "双星"].includes(c) ? 2 : 1); j++) hit(s, e, attack);
    if (s.role === "厨师" && s.acidRatio) {
      const extra = Math.ceil((attack * s.acidRatio + s.acidPlus) * (s.bitter ? 0.5 : 1));
      if (extra > 0) hit(s, e, extra);
      s.acidRatio = 0;
      s.acidPlus = 0;
    }
    if (
      e.hp &&
      s.role === "一二" &&
      ((s.mirror && c === "星弹") || (e.mark && c !== "星印"))
    ) {
      // 只限制一二的魔法连锁，不改变骑士拼招与老师主导课堂。
      if (e.kind !== "boss" || e.mageBreakReady) {
        e.stun = true;
        if (e.kind === "boss") e.mageBreakReady = false;
        log(s, "魔法连锁 · 失衡");
      } else log(s, "首领仍在魔法韧性窗口，未再次失衡");
      e.mark = false;
      s.mirror = false;
    }
    if (opened && c === "星弹") hit(s, e, 3);
  }
}
export function play(s, i) {
  if (!playable(s, i)) return false;
  const c = s.deck[i],
    e = s.enemies[s.target];
  s.plays++;
  if (s.freeTaste && flavor(c) && !s.returned.includes(i)) s.freeTaste = false;
  else if ((s.junk[c] === 2 || c === "预习") && !s.freeJunk) s.freeJunk = true;
  else s.ap--;
  if (
    s.active &&
    s.plan.mastery === "临时加课" &&
    s.ap === 0 &&
    !s.fourthUsed
  ) {
    s.authorityUses++;
    s.fourthUsed = true;
  }
  s.hand.splice(s.hand.indexOf(i), 1);
  if (s.held === i) s.held = null;
  log(s, c + " · " + foes[e.kind]);
  if (s.role === "老师") teach(s, c, e, api(s));
  else if (!cook(s, i, e, api(s))) {
    const echo = s.echo && c !== "回声";
    if (echo) s.echo = false;
    ordinary(s, c, e, i);
    if (echo) ordinary(s, c, e, i);
    if (s.role === "一二" && !mage.includes(c)) s.spellUses++;
  }
  if (!s.fresh.includes(i)) s.bin.push(i);
  finish(s);
  return true;
}
export function buttons(s) {
  if (s.phase !== "fight" || s.book || s.discardChoice) return [];
  const e = s.enemies[s.target];
  if (s.role === "小偷")
    return [
      ...(s.ap && e.coins ? ["顺手牵羊"] : []),
      ...s.pocket
        .map(gearLabel)
        .filter((k, i) => s.ap >= goods[s.pocket[i].name].cost),
    ];
  if (s.role === "工程师") return s.ap && e.device ? ["手动启动"] : [];
  if (s.role === "老师")
    return [
      ...(s.canTake
        ? (s.revealed || []).map((i) => "取入手牌 · " + s.deck[i])
        : []),
      ...(!s.seq.length && !s.short ? ["备课指定目标"] : []),
      ...(s.grades
        ? ["投入长期", "改造杂事甲", "改造杂事乙"].filter((x, i) =>
            i === 0 ? !s.active : s.junk[x.slice(2)] < 2,
          )
        : []),
      ...(s.grades ? ["结束批改"] : []),
    ];
  if (s.role === "骑士")
    return [
      ...(s.swapped ? [] : [s.stance === "盾" ? "拔剑" : "举盾"]),
      ...(s.stance === "盾" &&
      s.armor &&
      s.ap &&
      s.hand.some((i) => s.deck[i] === "校盾")
        ? ["校盾减一"]
        : []),
    ];
  if (s.role === "厨师")
    return !s.mixed && s.flavors.length >= 2 ? ["调和"] : [];
  if (s.role === "一二" && s.ap && e.stun && e.hp <= e.max * s.cfg.capture)
    return ["捕获"];
  return [];
}
export function ability(s, k) {
  if (!buttons(s).includes(k)) return false;
  const e = s.enemies[s.target];
  log(s, k);
  if (k === "顺手牵羊") {
    s.ap--;
    log(s, "偷得 " + steal(s, e, intent(s, e) ? 2 : 3) + " 金币");
  } else if (k === "手动启动") {
    s.ap--;
    trigger(s, e, api(s));
  } else if (s.role === "小偷") {
    const slot = s.pocket.findIndex((x, i) => gearLabel(x, i) === k),
      item = s.pocket[slot];
    s.ap -= goods[item.name].cost;
    if (item.name === "袖箭") hit(s, e, 4);
    if (item.name === "折叠盾") s.armor += 7;
    if (item.name === "急救包") s.hp = Math.min(30, s.hp + 5);
    if (item.name === "连发弩") {
      hit(s, e, 4);
      hit(s, e, 4);
    }
    if (item.name === "烟雾弹") e.stun = true;
    if (!--item.left) s.pocket.splice(slot, 1);
  } else if (k.startsWith("取入手牌 · ")) {
    const i = s.revealed.find((i) => k === "取入手牌 · " + s.deck[i]);
    s.pile.splice(s.pile.indexOf(i), 1);
    s.hand.push(i);
    s.revealed = s.revealed.filter((x) => x !== i);
    s.canTake = false;
  } else if (k === "备课指定目标") {
    s.planned = e.id;
    s.plannedAttack = intent(s, e) > 0;
  } else if (k === "投入长期") {
    s.grades--;
    contribute(s, api(s));
  } else if (k.startsWith("改造")) {
    s.grades--;
    s.junk[k.slice(2)]++;
  } else if (k === "校盾减一") {
    s.armor = Math.max(0, s.armor - 1);
    s.bin.push(
      s.hand.splice(
        s.hand.findIndex((i) => s.deck[i] === "校盾"),
        1,
      )[0],
    );
    s.ap--;
  } else if (k === "结束批改") s.grades = 0;
  else if (k === "调和") {
    s.freeTaste = true;
    s.mixed = true;
  } else if (k === "拔剑" || k === "举盾") {
    s.swapped = true;
    s.stance = k === "拔剑" ? "剑" : "盾";
    if (s.stance === "盾") s.armor += s.cfg.shieldEntry;
    else hit(s, e, Math.floor(s.cfg.swapHit * (e.stun ? 1.5 : 0.5)));
  } else if (k === "捕获") {
    s.ap--;
    if (
      rand(s) <
      s.cfg.chance + (1 - s.cfg.chance) * (1 - e.hp / (e.max * s.cfg.capture))
    ) {
      e.hp = 0;
      removed(s, e, s.cfg.deathOnCapture);
      s.captures++;
      s.hand.push(s.deck.length);
      s.deck.push(
        {
          boss: "王印",
          spore: "孢子",
          pressure: "钟鸣",
          charger: "蓄雷",
          shell: "破甲",
        }[e.kind],
      );
      log(s, "捕获成功 · 新魔法入手");
    } else {
      e.stun = false;
      s.hp = Math.max(0, s.hp - 2);
      log(s, "捕获失败 · 反噬2");
    }
  }
  finish(s);
  return true;
}
export function pick(s, i) {
  if (s.phase !== "fight") return false;
  if (s.discardChoice && s.hand.includes(i)) {
    s.bin.push(i);
    s.hand.splice(s.hand.indexOf(i), 1);
    s.discardChoice = false;
    if (s.held === i) s.held = null;
    return true;
  }
  if (s.book && (i === -1 || s.bin.includes(i))) {
    if (i !== -1) {
      s.hand.push(i);
      s.bin.splice(s.bin.indexOf(i), 1);
      s.authorityUses++;
    }
    draw(s, s.book - (i === -1 ? 0 : 1));
    s.book = false;
    return true;
  }
  return false;
}
export function end(s) {
  if (s.phase !== "fight" || s.grades || s.discardChoice || s.book)
    return false;
  if (!s.short && s.role === "老师") {
    if (s.cfg.penalty === "补课") s.debt = true;
    else s.held = null;
  }
  for (const e of alive(s)) {
    if (!e.hp) continue;
    const wasStunned = e.stun;
    const d = intent(s, e);
    if (!e.stun && e.device && machines[e.device].attack === Boolean(d)) {
      trigger(s, e, api(s));
      if (!e.hp) continue;
    }
    if (e.stun) {
      log(s, foes[e.kind] + "失衡 · 跳过意图");
      e.stun = false;
    } else if (d) {
      for (const n of segments(s, e)) {
        if (!s.hp || !e.hp) break;
        if (n > 0 && n === s.armor && s.role === "骑士" && s.stance === "盾") {
          e.stun = true;
          s.perfect++;
          log(s, "完美格挡");
        }
        const lost = Math.max(0, n - s.armor);
        s.armor = Math.max(0, s.armor - n);
        s.hp = Math.max(0, s.hp - lost);
        log(s, foes[e.kind] + "攻击 " + n + " · 受到 " + lost + " 伤害");
        if (!lost && s.mirror) {
          s.mirror = false;
          if (e.kind !== "boss" || e.mageBreakReady) {
            e.stun = true;
            if (e.kind === "boss") e.mageBreakReady = false;
          }
          hit(s, e, 3);
        }
      }
      e.buff = 0;
    } else if (e.kind === "shell") {
      const target = alive(s).find((x) => x !== e) || e;
      target.armor = chapter(s) + 1;
    }
    // 首领完整执行过一次意图后，魔法连锁才可重新使其失衡。
    if (e.kind === "boss" && !wasStunned && !e.stun) e.mageBreakReady = true;
    e.step++;
    e.reduce = 0;
    if (!s.hp) break;
  }
  finish(s);
  if (s.phase !== "fight") return true;
  if (s.bitter && !--s.bitter) life(s, s.aftertaste);
  if (s.spicyTurns && --s.spicyTurns) life(s, -s.spicyCost);
  else s.spicy = 0;
  finish(s);
  if (s.phase !== "fight") return true;
  s.bin.push(...s.hand.filter((i) => i !== s.held));
  s.hand = s.hand.filter((i) => i === s.held);
  s.held = null;
  s.returned = s.fresh;
  s.hand.push(...s.fresh);
  s.fresh = [];
  Object.assign(s, {
    turn: s.turn + 1,
    fourthUsed: false,
    armor: 0,
    seq: [],
    revealed: [],
    canTake: false,
    foresight: false,
    lecture: 0,
    short: false,
    accelerated: false,
    freeJunk: false,
    swapped: false,
    flavors: [],
    mixed: false,
    freeTaste: false,
    ap: s.active && s.plan.mastery === "临时加课" ? 4 : 3,
    planned: s.target,
    plannedAttack: intent(s, s.enemies[s.target]) > 0,
  });
  const n =
    4 +
    s.extraDraw +
    (s.active && s.plan.enhanced && s.plan.mastery === "临时加课" ? 1 : 0);
  s.extraDraw = 0;
  if (s.active && s.plan.mastery === "指定教材" && s.bin.length)
    s.book = n + (s.plan.enhanced ? 1 : 0);
  else draw(s, n);
  return true;
}
