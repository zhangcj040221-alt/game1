export const tastes = ["酸", "辣", "甜", "咸", "苦"],
  dishes = ["青梅脆藕", "烈焰椒锅", "蜜桃羹", "盐焗卷", "苦瓜清汤"];
export const chefDeck = [
  "酸",
  "辣",
  "甜",
  "切片",
  "切片",
  "备料",
  "翻锅",
  "翻锅",
];
export function flavor(c) {
  let i = tastes.indexOf(c);
  return i >= 0 ? tastes[i] : tastes[dishes.indexOf(c)];
}
export const recipes = {
  酸: "失去2生命，造成两段3点料理伤害",
  辣: "当前及下一回合攻击+2，每个生效回合失去1生命",
  甜: "恢复4生命，每战治疗总额有限",
  咸: "下一张其他味道正向效果+1，下回合返回手牌",
  苦: "本回合屏蔽料理自损与治疗，料理输出减半，结束回甘1",
  青梅脆藕: "失去3生命，两段5伤，抽1",
  烈焰椒锅: "三回合攻击+4，每回合失去2生命",
  蜜桃羹: "恢复7生命",
  盐焗卷: "下一张其他味道正向效果+3，下回合返回手牌",
  苦瓜清汤: "压制两回合，结束回甘2",
};
export function kitchenEdits(deck) {
  return deck.flatMap((c, i) => {
    if (dishes.includes(c)) return [];
    const source = tastes.includes(c),
      options = tastes
        .filter((t) => t !== c)
        .map((v) => ({
          i,
          v,
          label: (source ? "转化" : "提炼") + " · " + c + " → " + v,
        }));
    if (source)
      options.unshift({
        i,
        v: dishes[tastes.indexOf(c)],
        label: "做菜 · " + c + " → " + dishes[tastes.indexOf(c)],
      });
    return options;
  });
}
export function life(s, n) {
  if (s.bitter) return;
  if (n > 0) {
    n = Math.min(n, s.healLeft, 30 - s.hp);
    s.healLeft -= n;
  }
  s.hp = Math.max(0, s.hp + n);
  s.foodLife += n;
}
export function cook(s, i, e, api) {
  const c = s.deck[i],
    t = flavor(c),
    adv = dishes.includes(c);
  if (!t) return false;
  const bonus = t === "咸" ? 0 : s.salt;
  if (bonus) {
    if (!s.returned.includes(i)) s.fresh.push(i);
    s.salt = 0;
  }
  s.flavors = [...new Set([...s.flavors, t])];
  s.cooked++;
  s.tasteCounts[c] = (s.tasteCounts[c] || 0) + 1;
  if (t === "酸") {
    life(s, adv ? -3 : -2);
    if (s.hp) {
      const n = Math.floor(
        ((adv ? 5 : 3) + bonus + s.spicy) * (s.bitter ? 0.5 : 1),
      );
      api.hit(e, n);
      api.hit(e, n);
      if (adv) api.draw(1);
    }
  }
  if (t === "辣") {
    s.spicy = (adv ? 4 : 2) + bonus;
    s.spicyCost = adv ? 2 : 1;
    s.spicyTurns = adv ? 3 : 2;
    life(s, -s.spicyCost);
  }
  if (t === "甜") life(s, (adv ? 7 : 4) + bonus);
  if (t === "苦") {
    s.bitter = adv ? 2 : 1;
    s.aftertaste = (adv ? 2 : 1) + bonus;
  }
  if (t === "咸") s.salt = adv ? 3 : 1;
  return true;
}
