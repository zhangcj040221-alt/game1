import {
  start,
  advance,
  alive,
  choices,
  buttons,
  play,
  playable,
  end,
  pick,
  ability,
  intent,
  segments,
  chapter,
  rank,
  foes,
} from "./engine.js";
import { recipes } from "./chef.js";
import { lessonHint } from "./teacher.js";
const app = document.querySelector("#app"),
  params = new URLSearchParams(location.search),
  route = params.get("lab"),
  save = "mistbook-13-" + (route || "run");
let s,
  keeping = false,
  filter = "",
  menu = false,
  previous;
try {
  previous = JSON.parse(localStorage.getItem(save));
} catch {}
const descriptions = {
  提问: "攻击6",
  小测: "攻击4；目标已被削弱时攻击7",
  板书: "本回合下一次攻击+4",
  点名: "目标此次攻击减4",
  纪律: "全体敌人此次攻击各减2",
  预习: "看牌顶2张，选1入手。与二级杂事共享每回合一次免费",
  杂事甲: "查看牌顶；改造后抽2弃1",
  杂事乙: "查看牌顶；改造后抽1，下回合多抽1",
  轻击: "攻击5",
  重击: "攻击6",
  木盾: "获得4甲",
  步法: "2甲，抽1",
  星弹: "攻击4；追击失衡3，镜可引发失衡",
  镜: "4甲；全挡时反射3并打断",
  回声: "下一张其他魔法重复一次",
  双星: "两段攻击2",
  星印: "附印并攻击2，下张攻击触发失衡",
  折光: "2甲，抽1",
  切片: "攻击5",
  备料: "2甲，抽1",
  翻锅: "攻击4，获得2甲",
  斩击: "剑攻6",
  连斩: "剑攻3×2",
  反击: "剑攻4，失衡时10",
  塔盾: "获得6甲",
  校盾: "护甲微调+1",
  突刺: "剑攻8",
  架势斩: "剑攻4，本回合已切姿则9",
  圆盾: "获得3甲",
  铁壁: "获得8甲",
  孢子: "攻击3，削弱意图3",
  钟鸣: "攻击4，下张魔法重复",
  破甲: "清空目标护甲，攻击5",
  蓄雷: "攻击7",
  王印: "攻击8",
  ...recipes,
};
const btn = (text, a, v = "", cls = "", disabled = false) =>
  '<button class="' +
  cls +
  '" data-a="' +
  a +
  '" data-v="' +
  v +
  '" ' +
  (disabled ? "disabled" : "") +
  ">" +
  text +
  "</button>";
const names = { teacher: "老师", chef: "厨师" };
const image = (role) =>
  '<img alt="" src="../characters/' +
  (role === "一二" ? "yier" : "bubu") +
  '-r05.svg">';
function home() {
  app.innerHTML =
    '<section class="intro"><small>一二布布 · 三章冒险</small><h1>雾林手记</h1><p>十三场遭遇。森林深处，谁会成为你的老师，又有谁能被你收进牌中？</p><div class="panel hero">' +
    image("一二") +
    btn("一二 · 捕获魔法", "new", "一二") +
    '</div><div class="panel hero">' +
    image("布布") +
    btn(
      names[route] ? names[route] + " · 成长试玩" : "布布 · 首战后选职业",
      "new",
      names[route] || "布布",
    ) +
    "</div>" +
    (names[route] ? btn("直接试战后编排", "labedit", names[route]) : "") +
    (previous ? btn("继续上次试玩", "resume") : "") +
    '<details><summary>试玩设置</summary><label>牌序种子<input id="seed" type="number" value="' +
    (Number(params.get("seed")) || Math.floor(Math.random() * 999999)) +
    '"></label><label>教案失败<select id="pen"><option>补课</option><option>失去留牌</option></select></label><label><input id="timing" type="checkbox" checked>后排错峰与终章重击后休整</label><label><input id="death" type="checkbox">捕获触发死亡遗留（对照）</label></details></section>';
}
function formatPlan() {
  const p = s.plan;
  return (
    "<b>短期 · " +
    p.condition +
    "</b>　" +
    lessonHint[p.condition] +
    "<br>奖励　" +
    p.reward.map((r, i) => (r ? r + " " + p.level[i] : "空位")).join(" / ") +
    "<br><b>长期 · " +
    p.challenge +
    "</b>　连续三张，管理与攻击同目标<br>主导　" +
    p.mastery +
    (p.enhanced ? "＋" : "") +
    " · " +
    lessonHint[p.mastery]
  );
}
function school() {
  return (
    '<details class="detail"><summary>教案 · ' +
    s.progress +
    "/" +
    s.cfg.goal +
    "　" +
    (s.active ? "已主导" : s.plan.challenge) +
    "</summary>" +
    formatPlan() +
    "<p>备课目标 " +
    foes[s.enemies[s.planned].kind] +
    " · " +
    (s.short ? "已完成" : "进行中") +
    " · 待批改 " +
    s.grades +
    " · 改造 " +
    Object.values(s.junk).join("/") +
    (s.debt ? " · 待补课" : "") +
    "</p></details>"
  );
}
function scene() {
  return (
    '<section class="scene"><div><small>第 ' +
    chapter(s) +
    " 章　·　第 " +
    (s.stage + 1) +
    " / 13 战</small><h1>" +
    s.enemies.map((e) => foes[e.kind]).join("与") +
    "</h1><b>" +
    rank(s) +
    "　回合 " +
    s.turn +
    '</b></div><div class="actors"><div class="portrait">' +
    image(s.role) +
    "<b>" +
    s.role +
    "　♥ " +
    s.hp +
    "　甲 " +
    s.armor +
    '</b></div><div class="targets">' +
    alive(s)
      .map((e) =>
        btn(
          "<i>" +
            { pressure: "♞", spore: "♣", charger: "ϟ", shell: "⬟", boss: "♜" }[
              e.kind
            ] +
            "</i>" +
            foes[e.kind] +
            "<small>" +
            e.hp +
            "/" +
            e.max +
            "　甲" +
            e.armor +
            "</small><small>" +
            (e.stun
              ? "失衡 · 跳过"
              : intent(s, e)
                ? "攻击 " + segments(s, e).join("＋")
                : e.kind === "shell"
                  ? "援护"
                  : "蓄势") +
            "</small>",
          "target",
          e.id,
          "enemy " + (s.target === e.id ? "on" : ""),
        ),
      )
      .join("") +
    "</div></div></section>"
  );
}
function fight() {
  const pending = s.book || s.discardChoice,
    list = s.book ? s.bin : s.hand;
  return (
    scene() +
    (s.role === "老师"
      ? (s.foresight || s.revealed?.length
          ? '<section class="tray" aria-live="polite"><b>已知牌顶</b>　' +
            (s.revealed.map((i) => s.deck[i]).join(" → ") || "已抽完") +
            (s.canTake && s.revealed.length ? " · 在下方选一张入手" : "") +
            (s.foresight
              ? "<br>下一次意图　" +
                alive(s)
                  .map(
                    (e) =>
                      foes[e.kind] +
                      " · " +
                      (intent(s, { ...e, buff: 0, step: e.step + 1 }) ||
                        "准备"),
                  )
                  .join(" / ")
              : "") +
            "</section>"
          : "") + school()
      : "") +
    '<div class="tray controls"><div class="row"><b>行动 ' +
    s.ap +
    "</b> " +
    (s.role === "骑士"
      ? s.stance + "姿"
      : s.role === "厨师"
        ? "已用 " +
          (s.flavors.join("、") || "无") +
          "　辣+" +
          s.spicy +
          "　苦" +
          s.bitter +
          "　可治疗" +
          s.healLeft +
          (s.salt ? "　待保鲜" : "")
        : "") +
    buttons(s)
      .map((k) => btn(k, "ability", k, "gold"))
      .join("") +
    "</div></div><h3>" +
    (s.book
      ? "指定教材 · 取一张弃牌"
      : s.discardChoice
        ? "整理 · 选择弃牌"
        : keeping
          ? "选一张留牌"
          : "手牌") +
    '</h3><div class="hand">' +
    list
      .map((i) =>
        btn(
          "<b>" +
            s.deck[i] +
            (s.held === i ? " ✓" : "") +
            "</b><small>" +
            (descriptions[s.deck[i]] || "") +
            "</small>",
          "card",
          i,
          "card",
          !pending && !keeping && !playable(s, i),
        ),
      )
      .join("") +
    '</div><div class="row tray">' +
    (s.book
      ? btn("随机抽取", "random")
      : btn(keeping ? "取消留牌" : "留一张", "hold", "", "", !!pending) +
        btn("结束回合", "end", "", "gold", !!pending || s.grades > 0)) +
    "<small>抽 " +
    s.pile.length +
    " · 弃 " +
    s.bin.length +
    '</small></div><div class="chip">' +
    (s.log[0] || "选择敌人后，点手牌发动。") +
    "</div>"
  );
}
function outcome() {
  if (["clear", "lost"].includes(s.phase))
    return (
      '<section class="panel"><h1>' +
      (s.phase === "clear" ? "三章通关" : "冒险结束") +
      "</h1><p>第 " +
      (s.stage + 1) +
      " 战，已完成 " +
      s.growth +
      " 次职业成长。</p>" +
      btn("返回选角", "home") +
      "</section>"
    );
  const all=choices(s);
  if(s.role==="厨师"&&s.phase==="growth"){
    const cards=all.slice(0,-1);
    return '<section class="panel"><small>第 '+(s.growth+1)+' / 9 次成长</small><h1>料理研习</h1>'+
      (cards.length?'<p>选一项替换牌组中的一张牌。</p>':'<p>所有调味料都已做成高级料理。</p>')+
      '<div class="recipe-offers">'+cards.map((x,i)=>btn('<strong>'+x.label+'</strong><small>'+recipes[x.v]+'</small>',"next",i,"card")).join('')+
      '</div>'+btn("保留现有配方，进入下一战","next",cards.length)+'</section>';
  }
  const groups=s.role==="老师"&&s.phase==="growth"?["改编","奖励位","强化","保留"]:[];
  if (groups.length && !groups.includes(filter))
    filter = groups.find((g) => all.some((x) => x.label.startsWith(g)));
  const list = all
    .map((x, i) => ({ ...x, i }))
    .filter((x) => !groups.length || x.label.startsWith(filter));
  return (
    '<section class="panel"><small>第 ' +
    (s.stage + 1) +
    " 战胜利 · 生命 " +
    s.hp +
    "/30</small><h1>" +
    {
      job: "选择职业",
      next: "整装出发",
      growth:
        s.role === "老师"
          ? "编排教案"
          : s.role === "厨师"
            ? "料理研习"
            : "替换招式",
    }[s.phase] +
    "</h1>" +
    (s.phase === "growth" ? "第 " + (s.growth + 1) + " / 9 次成长" : "") +
    (s.role === "老师" ? '<div class="tray">' + formatPlan() + "</div>" : "") +
    '<div class="row">' +
    groups
      .map((g) =>
        btn(
          g,
          "filter",
          g,
          g === filter ? "on" : "",
          !all.some((x) => x.label.startsWith(g)),
        ),
      )
      .join("") +
    '</div><div class="row tray">' +
    (list.length <= 3
      ? list.map((x) => btn(x.label, "next", x.i, "gold")).join("")
      : '<select id="option">' +
        list
          .map((x) => '<option value="' + x.i + '">' + x.label + "</option>")
          .join("") +
        "</select>" +
        btn("确认成长", "confirm", "", "gold")) +
    '</div><p id="effect"></p></section>'
  );
}
function explain() {
  const o = document.querySelector("#option");
  if (!o) return;
  const x = choices(s)[Number(o.value)];
  document.querySelector("#effect").textContent =
    lessonHint[x.value] ||
    descriptions[x.v] ||
    "强化本槽效果，本次消耗一次成长机会。";
}
function render() {
  if (!s) {
    home();
    return;
  }
  app.innerHTML =
    (s.phase === "fight" ? fight() : outcome()) +
    "<details><summary>战斗手记与牌组</summary><p>" +
    s.deck.join(" · ") +
    '</p><div class="log">' +
    s.log.join("<br>") +
    "</div></details>" +
    btn("返回选角", "home");
  explain();
  try {
    localStorage.setItem(save, JSON.stringify(s));
  } catch {}
}
app.onchange = explain;
app.onclick = (ev) => {
  const b = ev.target.closest("button");
  if (!b) return;
  const a = b.dataset.a,
    v = b.dataset.v,
    i = Number(v);
  if (a === "new" || a === "labedit") {
    s = start(v, Number(document.querySelector("#seed").value), {
      penalty: document.querySelector("#pen").value,
      deathOnCapture: document.querySelector("#death").checked,
      staggerPatterns: document.querySelector("#timing").checked,
    });
    if (names[route] === v) {
      s.phase = "next";
      advance(s, 0);
      if (a === "labedit") s.phase = "growth";
    }
  }
  if (a === "resume") s = previous;
  if (a === "home") {
    previous = s;
    s = null;
    keeping = false;
  }
  if (a === "target" && alive(s).some((e) => e.id === i)) s.target = i;
  if (a === "hold") keeping = !keeping;
  if (a === "card") {
    if (s.book || s.discardChoice) pick(s, i);
    else if (keeping) {
      s.held = s.held === i ? null : i;
      keeping = false;
    } else play(s, i);
  }
  if (a === "random") pick(s, -1);
  if (a === "ability") ability(s, v);
  if (a === "end") {
    end(s);
    keeping = false;
  }
  if (a === "filter") filter = v;
  if (a === "next" || a === "confirm") {
    advance(
      s,
      a === "next" ? i : Number(document.querySelector("#option").value),
    );
    filter = "";
    window.scrollTo(0, 0);
  }
  render();
};
home();
