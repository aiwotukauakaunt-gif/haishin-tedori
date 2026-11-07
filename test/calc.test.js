const test = require('node:test');
const assert = require('node:assert/strict');
const { calculate: c, CONST } = require('../calc.js');

const M = 10000;
const base = { mode: 'studio', salary: 0, age: 'other' };

test('分配率: 視聴者支払額モード 広告55%・ショート45%・ファン70%', () => {
  const r = c({ mode: 'gross', ytAds: 100000, ytShorts: 100000, ytFan: 100000 });
  assert.equal(r.yt, 55000 + 45000 + 70000);
});

test('Studio表示額モードは率を掛けない・他プラットフォームは足すだけ', () => {
  const r = c({ ...base, ytAds: 100000, ytFan: 50000, other: [30000, 20000] });
  assert.equal(r.revenue, 200000);
});

test('経費を引いて所得。赤字は0', () => {
  assert.equal(c({ ...base, ytAds: 100000, expenses: 40000 }).income, 60000);
  const r = c({ ...base, ytAds: 10000, expenses: 40000 });
  assert.equal(r.income, 0);
  assert.equal(r.deficit, true);
});

test('境界: 給与あり 所得20万円ちょうどは申告不要の目安、1円超で要', () => {
  const s = { ...base, salary: 3000000 };
  assert.equal(c({ ...s, ytAds: 200000 }).filing.required, false);
  assert.equal(c({ ...s, ytAds: 200000 }).filing.remaining, 0);
  assert.equal(c({ ...s, ytAds: 200001 }).filing.required, true);
  assert.equal(c({ ...s, ytAds: 199999 }).filing.remaining, 1);
});

test('境界: 経費を引いた所得で20万円を判定（収入25万・経費5万＝20万）', () => {
  const r = c({ ...base, salary: 3000000, ytAds: 250000, expenses: 50000 });
  assert.equal(r.income, 200000);
  assert.equal(r.filing.required, false);
});

test('給与2,000万円超は必ず申告', () => {
  assert.equal(c({ ...base, salary: 20000001 }).filing.required, true);
});

test('給与なし: 基礎控除104万円まで所得税の申告は不要の目安', () => {
  assert.equal(c({ ...base, ytAds: 1040000 }).filing.required, false);
  assert.equal(c({ ...base, ytAds: 1040001 }).filing.required, true);
});

test('境界: 扶養 給与なしで所得62万円ちょうどは扶養内、超で外れる', () => {
  assert.equal(c({ ...base, ytAds: 620000 }).dependent.status, 'in');
  assert.equal(c({ ...base, ytAds: 620000 }).dependent.remaining, 0);
  assert.equal(c({ ...base, ytAds: 620001 }).dependent.status, 'out');
});

test('境界: 給与136万円は給与所得62万円＝配信所得0なら扶養内、1円で外れる', () => {
  const s = { ...base, salary: 1360000 };
  assert.equal(c(s).salaryIncome, 620000);
  assert.equal(c(s).dependent.status, 'in');
  assert.equal(c({ ...s, ytAds: 1 }).dependent.status, 'out');
  assert.equal(c({ ...base, salary: 1360001 }).dependent.status, 'out');
});

test('給与100万円なら給与所得26万円、配信所得36万円まで扶養内', () => {
  const r = c({ ...base, salary: 1000000, ytAds: 360000 });
  assert.equal(r.salaryIncome, 260000);
  assert.equal(r.total, 620000);
  assert.equal(r.dependent.status, 'in');
  assert.equal(c({ ...base, salary: 1000000, ytAds: 360001 }).dependent.status, 'out');
});

test('19〜22歳: 62万円超〜123万円以下は特定親族特別控除、超えると外れる', () => {
  const y = { ...base, age: '19-22' };
  assert.equal(c({ ...y, ytAds: 620001 }).dependent.status, 'tokutei');
  assert.equal(c({ ...y, ytAds: 1230000 }).dependent.status, 'tokutei');
  assert.equal(c({ ...y, ytAds: 1230001 }).dependent.status, 'out');
  assert.equal(c({ ...base, ytAds: 620001 }).dependent.status, 'out');
});

test('勤労学生: 合計所得89万円以下かつ配信所得10万円以下', () => {
  const s = { ...base, student: true, salary: 1300000 }; // 給与所得56万円
  assert.equal(c({ ...s, ytAds: 100000 }).student.ok, true);
  assert.equal(c({ ...s, ytAds: 100001 }).student.ok, false);
  assert.equal(c({ ...base, student: true, salary: 1500000, ytAds: 0 }).student.ok, false); // 136万超
});

test('不正入力は0扱い', () => {
  const r = c({ mode: 'studio', ytAds: 'abc', ytFan: -5, other: [null, ''] });
  assert.equal(r.revenue, 0);
});

test('定数が確認済みの数字', () => {
  assert.equal(CONST.FILING_LINE, 20 * M);
  assert.equal(CONST.DEPENDENT_LIMIT, 62 * M);
  assert.equal(CONST.SALARY_DEDUCTION_MIN + CONST.DEPENDENT_LIMIT, CONST.SALARY_BASE_LIMIT);
});
