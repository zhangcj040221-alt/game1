import { test, expect } from "@playwright/test";
test.use({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
});
for (const [route, role] of [
  ["teacher", "老师"],
  ["chef", "厨师"],
]) {
  test(role + "成长页到下一战，可点牌、换敌、留牌、续局", async ({ page }) => {
    await page.goto("/adventure/?lab=" + route + "&seed=1");
    await page.getByRole("button", { name: "直接试战后编排" }).click();
    await expect(
      page.getByText("第 1 / 9 次成长", { exact: false }).first(),
    ).toBeVisible();
    await page.locator("#option").selectOption({ index: 1 });
    await page.getByText("确认成长").click();
    const scene = await page.locator(".scene").boundingBox();
    expect(scene.height).toBeCloseTo(422, 0);
    await page.locator(".card:enabled").first().click();
    await page.getByText("留一张", { exact: true }).click();
    await page.locator(".card").first().click();
    await page.getByText("结束回合", { exact: true }).click();
    await expect(page.locator(".scene")).toContainText("回合 2");
    await page.reload();
    await page.getByText("继续上次试玩").click();
    await expect(page.locator(".scene")).toContainText("回合 2");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
  });
}
test("布布从无职业首战进入三选一，一二封印路线独立", async ({ page }) => {
  await page.goto("/adventure/?seed=1");
  await page.getByText("布布 · 首战后选职业").click();
  for (let i = 0; i < 18 && (await page.locator(".scene").count()); i++) {
    const hit = page
      .locator(".card:enabled")
      .filter({ hasText: /轻击|重击/ })
      .first();
    if (await hit.count()) await hit.click();
    else await page.getByText("结束回合", { exact: true }).click();
  }
  await page.getByRole("button", { name: "老师", exact: true }).click();
  await expect(page.locator(".enemy")).toHaveCount(2);
  await page.locator(".enemy").last().click();
  await page.getByText("备课指定目标").click();
  await page.getByText(/教案 · 0/).click();
  await expect(page.locator("details").first()).toContainText(
    "备课目标 追击兽",
  );
  await page.goto("/adventure/?seed=1");
  await page.getByText("一二 · 捕获魔法").click();
  await expect(page.locator(".hand")).toContainText(/星弹|双星|回声|镜/);
});
test("共享规则回归", async () => {
  const { execFileSync } = await import("node:child_process");
  execFileSync(process.execPath, ["--test", "tools/adventure/rules.mjs"]);
});
