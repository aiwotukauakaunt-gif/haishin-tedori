const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function ld() {
  const m = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert.ok(m, 'FAQPage の JSON-LD がある');
  return JSON.parse(m[1]);
}

test('FAQPage の構造化データが正しい形式で、質問が5〜8個', () => {
  const d = ld();
  assert.equal(d['@type'], 'FAQPage');
  assert.ok(d.mainEntity.length >= 5 && d.mainEntity.length <= 8);
  for (const q of d.mainEntity) {
    assert.equal(q['@type'], 'Question');
    assert.ok(q.name && q.acceptedAnswer.text);
  }
});

test('構造化データの質問が、画面の summary と一致する', () => {
  const d = ld();
  const sums = [...html.matchAll(/<summary>([\s\S]*?)<\/summary>/g)].map(m => m[1].replace(/&amp;/g, '&'));
  assert.deepEqual(d.mainEntity.map(q => q.name), sums);
});

test('title・description・canonical・GA が残っている', () => {
  assert.match(html, /<title>[^<]*確定申告[^<]*<\/title>/);
  assert.match(html, /<meta name="description" content="[^"]*確定申告/);
  assert.match(html, /<link rel="canonical" href="https:\/\/aiwotukauakaunt-gif\.github\.io\/haishin-tedori\/">/);
  assert.match(html, /G-Y8JEGHCG0G/);
  assert.match(html, /og:title/);
});

test('FAQ に未確認の税率・税額は書かない（％・税額・円の税率表現がない）', () => {
  const faq = html.match(/<section class="faq"[\s\S]*?<\/section>/)[0];
  assert.doesNotMatch(faq, /[0-9]％|[0-9]%|税率/);
});
