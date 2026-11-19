import { test } from '@playwright/test';
import { execFileSync } from 'node:child_process';

test('capture the handoff across template poses', () => {
  test.setTimeout(150000);
  execFileSync(process.execPath,['tools/review/handoff.mjs'],{stdio:'inherit',timeout:135000});
});
