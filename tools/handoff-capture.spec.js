import {test} from '@playwright/test';
import {execFileSync} from 'node:child_process';
test('capture revised star handoff',()=>{
  test.setTimeout(150000);
  execFileSync(process.execPath,['tools/review/handoff.mjs'],{stdio:'inherit',timeout:135000});
});
