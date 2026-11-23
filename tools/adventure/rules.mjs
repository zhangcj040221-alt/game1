import test from "node:test";
import assert from "node:assert/strict";
import {
  start,
  advance,
  choices,
  play,
  ability,
  end,
  pick,
  alive,
  playable,
  rank,
  map,
} from "../../adventure/engine.js";
import { contribute, edits, edit } from "../../adventure/teacher.js";
import { tastes, dishes, kitchenEdits } from "../../adventure/chef.js";
function hand(s, cards) {
  s.deck = [...cards];
  s.hand = cards.map((_, i) => i);
  s.pile = [];
  s.bin = [];
}
function pair(role) {
  let s = start(role);
  s.phase = "next";
  advance(s, 0);
  return s;
}
test("首战选职、恢复和十三战九成长", () => {
  let s = start("布布");
  for (let n = 0; n < 13; n++) {
    s.hp = 5;
    s.enemies.forEach((e) => {
      e.hp = e.id ? 0 : 1;
      e.armor = 0;
    });
    hand(s, [s.role === "老师" ? "提问" : "重击"]);
    play(s, 0);
    if (n === 12) break;
    assert.equal(s.hp, rank(s) === "普通" ? 10 : rank(s) === "精英" ? 12 : 30);
    assert.ok(advance(s, 0));
  }
  assert.equal(s.phase, "clear");
  assert.equal(s.growth, 9);
  assert.deepEqual(
    s.ledger.filter((x) => [5, 9, 13].includes(x.stage)).map((x) => x.growth),
    [3, 6, 9],
  );
});
test("批改二选一与战内重置", () => {
  let s = pair("老师");
  hand(s, ["板书", "提问"]);
  play(s, 0);
  play(s, 1);
  assert.equal(s.grades, 1);
  ability(s, "改造杂事甲");
  assert.equal(s.progress, 0);
  assert.equal(s.junk.杂事甲, 1);
  s.phase = "next";
  advance(s, 0);
  assert.equal(s.junk.杂事甲, 0);
});
test("长期爆发只一次，逐目标眩晕与死亡", () => {
  let s = pair("老师");
  s.progress = 3;
  s.grades = 1;
  s.enemies[1].hp = 13;
  ability(s, "投入长期");
  assert.equal(s.enemies[0].hp, 0);
  assert.equal(s.enemies[1].hp, 3);
  assert.ok(s.enemies[1].stun);
  let hp = s.hp;
  end(s);
  assert.equal(s.hp, hp);
  assert.equal(s.enemies[1].stun, false);
  assert.equal(s.ap, 4);
});
test("长教案清场直接结算", () => {
  let s = pair("老师");
  s.enemies[1].hp = 10;
  s.progress = 3;
  s.grades = 1;
  ability(s, "投入长期");
  assert.equal(s.phase, "growth");
  assert.equal(s.turn, 1);
});
test("模块替换与强化分开，换主导重置强化", () => {
  let s = start("老师");
  for (const key of ["enhanced", "mastery"])
    edit(
      s.plan,
      edits(s.plan).find((x) => x.key === key),
    );
  assert.equal(s.plan.enhanced, false);
  assert.equal(s.plan.reward.length, 2);
});
test("咸不递归，返回实体，下回合仍花行动", () => {
  let s = pair("厨师");
  hand(s, ["咸", "甜", "咸"]);
  s.hp = 12;
  play(s, 0);
  play(s, 1);
  assert.equal(s.hp, 17);
  end(s);
  assert.ok(s.hand.includes(1));
  play(s, 2);
  play(s, 1);
  assert.equal(s.ap, 1);
  assert.equal(s.fresh.length, 0);
});
test("苦屏蔽甜酸生命效果，酸攻击减半，调和只一次", () => {
  let s = pair("厨师");
  hand(s, ["苦", "酸", "甜"]);
  s.hp = 20;
  play(s, 0);
  play(s, 1);
  assert.equal(s.enemies[0].hp, 8);
  ability(s, "调和");
  play(s, 2);
  assert.equal(s.hp, 20);
  assert.equal(s.ap, 1);
  assert.equal(ability(s, "调和"), false);
});
test("提炼转化做菜替换同一位置，全部五道均可达", () => {
  for (let j = 0; j < 5; j++) {
    let s = start("厨师");
    let x = kitchenEdits(s.deck).find((x) => x.i === 3 && x.v === tastes[j]);
    s.deck[x.i] = x.v;
    assert.ok(kitchenEdits(s.deck).some((x) => x.i === 3 && x.v === dishes[j]));
    assert.equal(s.deck.length, 8);
  }
});
test("精确格挡按顺序，普通剑攻击不衰减", () => {
  let s = pair("骑士");
  s.armor = 7;
  end(s);
  assert.equal(s.enemies[0].stun, false);
  assert.equal(s.enemies[1].stun, true);
  ability(s, "拔剑");
  hand(s, ["斩击"]);
  let hp = s.enemies[0].hp;
  play(s, 0);
  assert.equal(s.enemies[0].hp, hp - 6);
});
test("捕获入手并跨章，移除遗留对照", () => {
  for (const death of [true, false]) {
    let s = pair("一二");
    s.cfg.deathOnCapture = death;
    s.enemies[0].hp = 1;
    s.enemies[0].stun = true;
    s.seed = 0;
    ability(s, "捕获");
    assert.equal(s.enemies[1].buff, death ? 3 : 0);
    assert.equal(s.deck[s.hand.at(-1)], "孢子");
    s.stage = 4;
    s.phase = "next";
    advance(s, 0);
    assert.equal(s.deck.length, 9);
    assert.ok([...s.pile, ...s.hand].includes(8));
  }
});
test("指定教材替换随机抽取，整顿冷却，主导战后重置", () => {
  let s = pair("老师");
  s.active = true;
  s.plan.mastery = "指定教材";
  end(s);
  assert.equal(s.book, 4);
  const id = s.bin[0];
  pick(s, id);
  assert.equal(s.hand.length, 4);
  assert.equal(s.hand[0], id);
  s.phase = "next";
  advance(s, 0);
  assert.equal(s.active, false);
  assert.equal(s.progress, 0);
});
test("短长期同一真实牌序可完成，杂事不算管理", () => {
  let s = pair("老师");
  s.plan.condition = "应对攻势";
  hand(s, ["板书", "点名", "提问", "杂事甲"]);
  play(s, 0);
  play(s, 1);
  play(s, 2);
  assert.equal(s.progress, 1);
  assert.equal(s.grades, 1);
  ability(s, "投入长期");
  assert.equal(s.progress, 2);
  assert.equal(s.ap, 0);
});
test("非递归改造、失败惩罚对照、加课行动封顶", () => {
  for (const penalty of ["补课", "失去留牌"]) {
    let s = start("老师", 8, { penalty });
    s.held = s.hand[0];
    end(s);
    assert.equal(s.debt, penalty === "补课");
    assert.equal(s.hand.length, penalty === "补课" ? 5 : 4);
    s.progress = 3;
    s.grades = 1;
    ability(s, "投入长期");
    assert.equal(s.ap, 4);
    assert.equal(ability(s, "投入长期"), false);
  }
});
test("高阶甜受每战治疗预算约束，辣在跨回合继续支付代价", () => {
  let s = pair("厨师");
  hand(s, ["蜜桃羹", "蜜桃羹", "烈焰椒锅"]);
  s.hp = 10;
  play(s, 0);
  play(s, 1);
  assert.equal(s.hp, 22);
  play(s, 2);
  assert.equal(s.hp, 20);
  s.enemies.forEach((e) => (e.stun = true));
  end(s);
  assert.equal(s.hp, 18);
});
test("首领连击逐段抵甲，完美格挡取消后续一次意图", () => {
  const s = start("骑士");
  s.stage = 7;
  s.phase = "next";
  advance(s, 0);
  s.enemies[0].step = 3;
  s.armor = 3;
  end(s);
  assert.equal(s.hp, 27);
  assert.equal(s.perfect, 1);
  assert.ok(s.enemies[0].stun);
  end(s);
  assert.equal(s.hp, 27);
});
