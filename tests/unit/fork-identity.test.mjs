import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PROJECT_REPO_URL, PROJECT_AUTHOR_URL } from '../../src/features/updater/projectLinks.ts';

test('fork project, installer and update feeds use the maintainer repository', () => {
  assert.equal(PROJECT_REPO_URL, 'https://github.com/labubu-9527/clockout-island');
  assert.equal(PROJECT_AUTHOR_URL, 'https://github.com/labubu-9527');
  const config = JSON.parse(readFileSync('src-tauri/tauri.conf.json', 'utf8'));
  assert.equal(config.identifier, 'com.focusd.island');
  assert.equal(config.bundle.publisher, 'labubu-9527');
  assert.ok(config.plugins.updater.endpoints.every(url => url.includes('/labubu-9527/clockout-island/')));
  assert.match(readFileSync('src-tauri/nsis/installer-hooks.nsh', 'utf8'), /"Publisher" "labubu-9527"/);
  assert.match(readFileSync('src-tauri/nsis/installer-hooks.nsh', 'utf8'), /!macroundef SetContext\s+!macro SetContext/);
});
