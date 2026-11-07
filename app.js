(function () {
  'use strict';
  var C = HaishinCalc.CONST;
  var f = document.getElementById('f');
  function yen(n) { return Math.round(n).toLocaleString('ja-JP') + '円'; }
  function el(id) { return document.getElementById(id); }

  function read() {
    var g = function (n) { return f.elements[n].value; };
    return {
      mode: f.elements.mode.value,
      ytAds: g('ytAds'), ytShorts: g('ytShorts'), ytFan: g('ytFan'),
      other: [g('o1'), g('o2'), g('o3')],
      expenses: g('expenses'), salary: g('salary'),
      age: g('age'), student: f.elements.student.checked
    };
  }

  function v(cls, title, body) {
    return '<div class="v ' + cls + '"><b>' + title + '</b><p>' + body + '</p></div>';
  }

  function render() {
    var inp = read();
    var gross = inp.mode === 'gross';
    el('rAds').textContent = gross ? '× 55%' : '';
    el('rShorts').textContent = gross ? '× 45%' : '';
    el('rFan').textContent = gross ? '× 70%' : '';
    var r = HaishinCalc.calculate(inp);
    el('vRev').textContent = yen(r.revenue);
    el('vInc').textContent = yen(r.income) + (r.deficit ? '（赤字は0）' : '');

    var h = '';
    // 申告
    var F = r.filing;
    if (F.basis === 'salary') {
      if (F.required) {
        h += v('warn', '確定申告：必要になる目安', r.salary > C.SALARY_ALWAYS_FILE && r.income <= C.FILING_LINE
          ? '給与収入が2,000万円を超えるため申告が必要です。'
          : '配信の所得が20万円を超えています（給与1か所のみ・源泉徴収済の場合の目安）。');
      } else {
        h += v('ok', '確定申告：所得税は不要の目安', '配信の所得は20万円以下です。20万円を超えないのは、あと <b>' + yen(F.remaining) + '</b> まで。');
      }
    } else {
      if (F.required) {
        h += v('warn', '確定申告：必要になる目安', '給与がなく、所得が基礎控除104万円を超えています。');
      } else {
        h += v('ok', '確定申告：所得税はかからない目安', '給与がなく、所得が基礎控除104万円以下です（あと ' + yen(F.remaining) + ' まで）。他の所得や控除目的での申告は別です。');
      }
    }
    h += v('info', '住民税は別に申告が要る場合があります',
      '所得が20万円以下でも、住民税の申告が必要なことがあります。お住まいの市区町村に確認してください。');

    // 扶養
    var D = r.dependent;
    if (D.status === 'in') {
      h += v('ok', '扶養（所得税）：扶養親族の範囲内の目安',
        '合計所得 ' + yen(r.total) + '。扶養の目安（62万円）まで、あと <b>' + yen(D.remaining) + '</b>。');
    } else if (D.status === 'tokutei') {
      h += v('warn', '扶養（所得税）：扶養控除からは外れる目安（特定親族特別控除の範囲）',
        '19〜22歳で合計所得 ' + yen(r.total) + '。62万円を超えるため扶養控除ではなく、特定親族特別控除の対象（上限123万円まで、あと ' + yen(D.remaining) + '）。親の控除額は段階的に減ります。');
    } else if (D.reason === 'salary') {
      h += v('warn', '扶養（所得税）：外れる目安', '給与収入が136万円を超えるため、配信を除いても合計所得が62万円を超えます。');
    } else {
      h += v('warn', '扶養（所得税）：外れる目安', '合計所得 ' + yen(r.total) + ' が62万円を超えています' + (inp.age === '19-22' ? '（123万円も超えています）' : '') + '。');
    }
    if (r.salaryOver) { /* total is null */ }

    if (r.student) {
      h += r.student.ok
        ? v('ok', '勤労学生控除：要件の範囲内の目安', '合計所得89万円以下・配信などの所得10万円以下。学校の種類など別の要件もあります。')
        : v('info', '勤労学生控除：目安の範囲外', '合計所得が89万円を超えるか、配信などの所得が10万円を超えています。');
    }
    el('verdicts').innerHTML = h;
  }

  f.addEventListener('input', render);
  f.addEventListener('change', render);
  f.addEventListener('submit', function (e) { e.preventDefault(); });
  render();
})();
