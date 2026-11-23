export const goods = {
  袖箭: { price: 3, uses: 2, cost: 0, desc: "对目标造成4伤害" },
  烟雾弹: { price: 4, uses: 1, cost: 1, desc: "打断目标的下一次意图" },
  折叠盾: { price: 4, uses: 3, cost: 1, desc: "获得7护甲" },
  连发弩: { price: 6, uses: 3, cost: 1, desc: "对目标造成两段4伤害" },
  急救包: { price: 5, uses: 2, cost: 1, desc: "恢复5生命" },
};
export const gearLabel = (item, slot) =>
  "口袋" +
  (slot + 1) +
  " · " +
  item.name +
  "　" +
  item.left +
  "/" +
  goods[item.name].uses +
  "次";
export const machines = {
  绊索: { attack: true, n: 5, desc: "目标下次攻击前触发，伤害5，削弱攻击3" },
  钻地鼠: { attack: false, n: 8, desc: "目标下次准备或援护前触发，钻击8伤害" },
  捕兽夹: { attack: true, n: 8, desc: "目标下次攻击前触发，伤害8" },
  拆甲钻: { attack: false, n: 6, desc: "目标准备时清除其护甲，造成6伤害" },
  弹簧盾: { attack: true, n: 3, desc: "目标攻击前造成3伤害，获得5护甲" },
  发条蜂: { attack: false, n: 5, desc: "目标准备时触发，对全体造成5伤害" },
};
export const gearText = {
  ...Object.fromEntries(Object.entries(machines).map(([k, v]) => [k, v.desc])),
  拆装锤: "攻击5；目标装有机关时改为7",
  探囊: "攻击3，取走目标1金币",
  快刀: "攻击6",
};
export function trigger(s, e, api) {
  const name = e.device,
    m = machines[name];
  if (!m) return;
  e.device = null;
  api.log(name + "触发 · " + m.desc);
  if (name === "绊索") e.reduce += 3;
  if (name === "弹簧盾") s.armor += 5;
  if (name === "拆甲钻") e.armor = 0;
  for (const target of name === "发条蜂" ? api.live() : [e])
    api.hit(target, m.n);
}
export function steal(s, e, n) {
  const take = Math.min(e.coins, n);
  e.coins -= take;
  s.gold += take;
  return take;
}
export function shopStock(s, shuffle) {
  const pool = Object.keys(goods);
  return shuffle(
    { seed: (s.initial ^ Math.imul(s.stage + 1, 2654435761)) >>> 0 },
    pool,
  ).slice(0, 3);
}
export function purchase(s, name, stock) {
  if (
    s.phase !== "shop" ||
    s.role !== "小偷" ||
    !stock.includes(name) ||
    s.sold.includes(name) ||
    s.pocket.length >= 2 ||
    s.gold < goods[name].price
  )
    return false;
  s.gold -= goods[name].price;
  s.pocket.push({ name, left: goods[name].uses });
  s.sold.push(name);
  return true;
}
