// 配信収益の手取り・申告ライン計算（令和8年分＝2026年の収入）
// 数字はすべて国税庁・YouTubeヘルプで確認済みの物だけ。根拠は README.md 参照。
(function (root) {
  'use strict';

  var MAN = 10000;
  var CONST = {
    YEAR_LABEL: '令和8年分（2026年1〜12月の収入）',
    RATE_ADS: 0.55,        // YouTube 長尺の広告
    RATE_SHORTS: 0.45,     // YouTube ショート（プール割当の45%）
    RATE_FAN: 0.70,        // メンバーシップ・Super Chat等
    FILING_LINE: 20 * MAN, // 給与1か所のみ・源泉済で、他の所得が20万円「超」なら申告
    BASIC_DEDUCTION: 104 * MAN, // 基礎控除（合計所得489万円以下・令和8・9年分）
    DEPENDENT_LIMIT: 62 * MAN,  // 扶養親族の合計所得要件（令和8年分から）
    TOKUTEI_LIMIT: 123 * MAN,   // 特定親族特別控除（19〜22歳）の合計所得の上限
    STUDENT_LIMIT: 89 * MAN,    // 勤労学生控除の合計所得要件（令和8年分から）
    STUDENT_OTHER_LIMIT: 10 * MAN, // 勤労以外の所得の要件
    SALARY_DEDUCTION_MIN: 74 * MAN, // 給与所得控除の最低保障（令和8年分）
    SALARY_BASE_LIMIT: 136 * MAN,   // 給与収入136万円以下なら控除74万円
    SALARY_ALWAYS_FILE: 2000 * MAN  // 給与収入2,000万円超は申告必須
  };

  function num(v) {
    var n = Number(v);
    return isFinite(n) && n > 0 ? Math.floor(n) : 0;
  }

  // input: {mode:'studio'|'gross', ytAds, ytShorts, ytFan, other:[円...], expenses,
  //         salary(給与収入・円。0=なし), age:'19-22'|'other', student:boolean}
  function calculate(input) {
    var i = input || {};
    var gross = i.mode === 'gross';
    var ads = num(i.ytAds), shorts = num(i.ytShorts), fan = num(i.ytFan);
    var yt = gross
      ? Math.floor(ads * CONST.RATE_ADS) + Math.floor(shorts * CONST.RATE_SHORTS) + Math.floor(fan * CONST.RATE_FAN)
      : ads + shorts + fan;
    var other = (i.other || []).reduce(function (s, v) { return s + num(v); }, 0);
    var revenue = yt + other;           // 分配後の受取額
    var expenses = num(i.expenses);
    var rawIncome = revenue - expenses;
    var income = Math.max(0, rawIncome); // 配信の所得（赤字は0として扱う）
    var salary = num(i.salary);
    var hasSalary = salary > 0;

    // 給与所得（136万円以下のときだけ確かな値が出せる）
    var salaryIncome = null, salaryOver = false;
    if (!hasSalary) salaryIncome = 0;
    else if (salary <= CONST.SALARY_BASE_LIMIT) salaryIncome = Math.max(0, salary - CONST.SALARY_DEDUCTION_MIN);
    else salaryOver = true; // 給与だけで合計所得62万円超（136万円で62万円ちょうど）

    var total = salaryIncome === null ? null : salaryIncome + income; // 合計所得（目安）

    // 申告の目安
    var filing;
    if (hasSalary) {
      filing = {
        basis: 'salary',
        required: income > CONST.FILING_LINE || salary > CONST.SALARY_ALWAYS_FILE,
        line: CONST.FILING_LINE,
        remaining: Math.max(0, CONST.FILING_LINE - income) // あと何円まで超えない
      };
    } else {
      filing = {
        basis: 'nosalary',
        required: income > CONST.BASIC_DEDUCTION,
        line: CONST.BASIC_DEDUCTION,
        remaining: Math.max(0, CONST.BASIC_DEDUCTION - income)
      };
    }

    // 扶養（税法上）の目安
    var dependent;
    if (salaryOver) {
      dependent = { status: 'out', remaining: 0, reason: 'salary' };
    } else if (total <= CONST.DEPENDENT_LIMIT) {
      dependent = { status: 'in', remaining: CONST.DEPENDENT_LIMIT - total };
    } else if (i.age === '19-22' && total <= CONST.TOKUTEI_LIMIT) {
      dependent = { status: 'tokutei', remaining: CONST.TOKUTEI_LIMIT - total };
    } else {
      dependent = { status: 'out', remaining: 0 };
    }

    // 勤労学生控除
    var student = null;
    if (i.student) {
      var ok = !salaryOver && total <= CONST.STUDENT_LIMIT && income <= CONST.STUDENT_OTHER_LIMIT;
      student = { ok: ok };
    }

    return {
      yt: yt, other: other, revenue: revenue, expenses: expenses,
      income: income, deficit: rawIncome < 0, salary: salary, salaryIncome: salaryIncome,
      salaryOver: salaryOver, total: total, filing: filing, dependent: dependent, student: student
    };
  }

  var api = { calculate: calculate, CONST: CONST };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.HaishinCalc = api;
})(typeof self !== 'undefined' ? self : this);
