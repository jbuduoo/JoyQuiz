import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const inputPath = "C:/Users/wits/Downloads/採購法_新增資料.xlsx";
const outputDir = "C:/Users/wits/Documents/程式專區/JoyQuiz/outputs/procurement-law";
const outputPath = `${outputDir}/採購法_新增資料_老師詳解版.xlsx`;

function colName(indexZero) {
  let n = indexZero + 1;
  let s = "";
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function normalize(value) {
  return value == null ? "" : String(value).trim();
}

function answerLabel(ans) {
  const v = normalize(ans).toUpperCase();
  if (v === "O" || v === "TRUE" || v === "是") return "O";
  if (v === "X" || v === "FALSE" || v === "否") return "X";
  return v;
}

function parseChoiceQuestion(text) {
  const source = normalize(text).replace(/\s+/g, " ");
  const markers = [...source.matchAll(/(?:^|\s)[(（]([1-4])[)）]/g)];
  if (markers.length < 4) return null;
  const stem = source.slice(0, markers[0].index).trim();
  const choices = {};
  for (let i = 0; i < markers.length; i++) {
    const markerStart = markers[i].index;
    const markerText = markers[i][0];
    const contentStart = markerStart + markerText.length;
    const contentEnd = i + 1 < markers.length ? markers[i + 1].index : source.length;
    choices[markers[i][1]] = source.slice(contentStart, contentEnd).trim();
  }
  return { stem, choices };
}

function topicHint(text) {
  const t = normalize(text);
  const pairs = [
    ["公開閱覽", "招標文件公開閱覽制度"],
    ["查核金額", "查核金額以上採購的程序要求"],
    ["底價", "底價訂定、公開及決標程序"],
    ["最有利標", "最有利標及評選制度"],
    ["電子", "電子採購作業規範"],
    ["契約", "採購契約及履約管理"],
    ["驗收", "履約驗收規定"],
    ["逾期", "逾期違約金及履約責任"],
    ["資本額", "廠商資格限制不得不當限制競爭"],
    ["公費", "服務成本加公費法的計費規定"],
    ["調解", "採購申訴、調解及爭議處理"],
    ["倫理", "採購人員倫理及迴避規範"],
    ["迴避", "利益衝突迴避規範"],
    ["分包", "資訊服務與資安相關採購規定"],
    ["招標公告", "招標公告及招標文件記載事項"],
    ["等標期", "招標期限標準"],
    ["減價", "減價、比減價格與決標程序"],
  ];
  const hit = pairs.find(([needle]) => t.includes(needle));
  return hit ? hit[1] : "政府採購法及其相關子法";
}

function shortLawName(referenceLaw) {
  const ref = normalize(referenceLaw);
  if (!ref) return "";
  if (/^第\s*\d+/.test(ref)) return `「採購法」${ref}`;
  if (/政府採購法第/.test(ref)) return ref.replace("政府採購法", "「採購法」");
  return ref;
}

function conciseBasis(question, level = "", referenceLaw = "") {
  const ref = shortLawName(referenceLaw);
  if (ref) return ref;
  const t = `${normalize(level)} ${normalize(question)}`;
  const matches = [
    [["公開閱覽"], "「公共工程招標文件公開閱覽制度實施要點」第 2 點"],
    [["廠商或民眾意見", "公開方式"], "「公共工程招標文件公開閱覽制度實施要點」第 6 點"],
    [["第58條"], "「採購法」第 58 條"],
    [["分包"], "「採購法」第 67 條"],
    [["審查基準", "審查委員會"], "「採購法施行細則」第 64-2 條"],
    [["服務成本加公費"], "「機關委託專業服務廠商評選及計費辦法」第 13 條"],
    [["等標期"], "「招標期限標準」"],
    [["電子"], "「採購法」第 93-1 條"],
    [["標封"], "「採購法」第 6 條"],
    [["底價", "公開"], "「採購法」第 34 條"],
    [["底價"], "「採購法」第 46 條"],
    [["最有利標"], "「採購法」第 52 條及第 56 條"],
    [["評選"], "「採購法」第 94 條"],
    [["調解"], "「採購法」第 85-1 條"],
    [["仲裁"], "「採購法」第 85-1 條"],
    [["迴避"], "「採購法」第 15 條"],
    [["倫理"], "「採購人員倫理準則」"],
    [["驗收"], "「採購法」第 72 條"],
    [["共同供應契約"], "「採購法」第 93 條"],
    [["續約", "採購金額"], "「採購法施行細則」第 6 條"],
  ];
  const hit = matches.find(([needles]) => needles.every((needle) => t.includes(needle)));
  return hit ? hit[1] : "政府採購相關法規";
}

function corePoint(question, label) {
  const q = normalize(question);
  const wrong = label === "X";
  if (q.includes("共同供應契約") && q.includes("免再辦理驗收")) {
    return "機關可以利用共同供應契約向訂約廠商下訂，但交貨後仍要確認數量、規格及品質是否符合契約。題目錯誤在於把「利用共同供應契約採購」誤解為「免辦驗收」。";
  }
  if (q.includes("公開閱覽") && q.includes("緊急情事")) {
    return "查核金額以上採購原則上應辦理公開閱覽；但遇有緊急情事，依招標期限標準所定期限辦理不符實際需要時，可以不先辦公開閱覽。";
  }
  if (q.includes("查核金額以上") && q.includes("公開閱覽")) {
    return "公開閱覽的目的在於讓重大採購招標文件先接受檢視，減少綁標及履約爭議；是否必須辦理，要看是否達查核金額及有無例外。";
  }
  if (q.includes("廠商或民眾意見") && q.includes("密件")) {
    return "公開處理是指機關對意見的處理情形應透明，不是要求廠商或民眾先用密件提出。題目錯在把公開處理誤解為密件收受。";
  }
  if (q.includes("景觀專業服務業")) {
    return "投標資格可以依採購標的需要訂定；景觀專業技術服務需要相對應專業能力時，列入景觀專業服務業並非不當限制競爭。";
  }
  if (q.includes("標價計算錯誤")) {
    return "最低標廠商不能只因自行表示標價計算錯誤，就當然排除決標。機關仍應依標價偏低或招標文件規定程序審查處理。";
  }
  if (q.includes("差額保證金")) {
    return "標價低於底價一定比例時，機關應先審查廠商說明；說明尚非完全合理而未提出差額保證金者，處理效果是不決標，押標金是否發還仍要依規定判斷。";
  }
  if (q.includes("分包")) {
    return "得標廠商雖得分包，但機關可在契約中約定分包項目及分包廠商須送審。題目若認為送審約定違反分包規定，即混淆了分包自由與機關契約管理。";
  }
  if (q.includes("服務成本加公費") && q.includes("公費")) {
    return "服務成本加公費法中的公費，是廠商提供服務所得的報酬，包含風險、利潤及相關稅捐；不是直接薪資、直接成本或合理成本本身。";
  }
  if (q.includes("底價") && q.includes("公開")) {
    return "底價在開標前應保密，一般是在決標後公開。題目若把公開時點提前或延後到不符規定的階段，就是錯點。";
  }
  if (q.includes("中國大陸") && q.includes("資通訊")) {
    return "資通訊產品涉及資安及國安風險時，契約可明定不得使用中國大陸廠牌產品。判斷重點是契約特別聲明限制的來源。";
  }
  if (q.includes("夫妻") && q.includes("迴避")) {
    return "驗收人員與主辦人員若有夫妻等密切關係，容易影響採購程序公正，應依利益衝突及倫理規範迴避。";
  }
  return wrong
    ? "題目把採購程序、例外條件或法律效果混在一起，與規定不符；作答時要回到題目所問的階段與要件判斷。"
    : "題目所述與採購程序、例外條件或法律效果相符；作答時重點在確認金額門檻、採購方式及程序階段是否都吻合法規。";
}

function formatReferenceLaw(referenceLaw) {
  const ref = normalize(referenceLaw);
  if (!ref) return "";
  if (/^第\s*\d+/.test(ref)) return `依政府採購法${ref}`;
  if (/採購法/.test(ref) || /政府採購法/.test(ref) || /施行細則/.test(ref) || /辦法/.test(ref) || /要點/.test(ref) || /標準/.test(ref)) return `依${ref}`;
  return `依${ref}`;
}

function basisHint(question, level = "", referenceLaw = "") {
  const refBasis = formatReferenceLaw(referenceLaw);
  const t = `${normalize(level)} ${normalize(question)}`;
  if (refBasis) {
    return `${refBasis}`;
  }
  const rules = [
    [["公開閱覽", "查核金額", "緊急情事"], "依「公共工程招標文件公開閱覽制度實施要點」第2點，查核金額以上工程採購原則上應公開閱覽；但依政府採購法第22條第1項第3款、第105條第1項第1款或第2款，或依招標期限標準得縮短、合理訂定等標期等情形，得不辦理。"],
    [["公開閱覽", "查核金額"], "依「公共工程招標文件公開閱覽制度實施要點」第2點，查核金額以上工程採購於公告招標前應辦理公開閱覽；但同點但書列有例外。"],
    [["廠商或民眾意見", "公開方式"], "依「公共工程招標文件公開閱覽制度實施要點」第6點，機關對廠商或民眾意見之處理應以公開方式辦理，重點在處理情形公開透明，而非將意見先作密件收受。"],
    [["景觀專業服務業"], "參照投標廠商資格與特殊或巨額採購認定標準第3條、第4條，機關得依採購標的需要訂定與履約能力相關之基本或特定資格；景觀專業技術服務採購得依標的性質列入相當資格。"],
    [["第58條", "標價", "計算錯誤"], "依政府採購法第58條及其執行程序，總標價或部分標價偏低時，機關應依規定通知廠商說明並審查；廠商單方稱計算錯誤，並不當然使機關得改以次低標為最低標。"],
    [["服務成本加公費", "公費"], "依「機關委託專業服務廠商評選及計費辦法」第13條第2項第2款，公費係廠商提供專業服務所得之報酬，包括風險、利潤及有關稅捐等；同條並限制公費應為定額及上限。"],
    [["選擇性招標", "等標期"], "依招標期限標準關於選擇性招標資格審查之規定，資格審查公告應給予法定等標期；未辦理公開閱覽及未採電子領投標時，不得任意縮短。"],
    [["電子", "書面文件"], "依政府採購法第93條之1及電子採購相關規定，機關利用主管機關指定資訊系統辦理招標文件公開閱覽、公開發給或發售等電子化作業者，其電子資料可作正式文件處理，得免另備書面文件。"],
    [["標封"], "依政府採購法第6條公平合理原則及採購實務，機關可提供標封便利投標，但不得以廠商未使用機關提供標封即逕認不合格或無效標，否則有不當限制競爭之虞。"],
    [["資訊服務", "陸資"], "參照政府採購法第17條、第26條及工程會採購契約範本附記條款特別聲明，涉及資安或敏感業務者，得於招標文件及契約中訂明禁止或限制特定資通訊產品、服務或分包來源。"],
    [["勞務承攬", "派駐勞工"], "依政府採購法第6條、第26條及勞務承攬採購相關規範，承攬關係不得混同派遣而由機關直接指揮管理派駐勞工；採購方式仍得依標的性質採最有利標。"],
    [["資通訊產品", "中國大陸"], "依工程會採購契約範本附記條款特別聲明，廠商履約使用資通訊產品時，不得使用中國大陸廠牌資通訊產品，並應遵守機關資安及國安要求。"],
    [["漏印", "圖說"], "依政府採購法第41條及招標文件變更、補充之處理原則，開標前發現招標文件有重大缺漏，應更正或補充並視需要延長等標期；不得逕行開標決標。"],
    [["評審委員會", "規格"], "依政府採購法第56條、第94條及最有利標評選辦法，評審或評選委員應就採購標的之技術、品質、功能、商業條款等具專門知識或公正性，並非僅限於「規格」知識。"],
    [["底價", "需求單位", "承辦採購"], "依政府採購法第46條，底價應由規劃、設計、需求或使用單位提出預估金額及分析後，由承辦採購單位簽報機關首長或其授權人員核定；例外情形仍須依法定程序辦理。"],
    [["固定價格", "創意"], "依最有利標評選辦法及採固定價格給付之評選精神，價格已固定時，評分應著重標的功能、效益、品質、創意及履約能力等非價格因素，以避免廠商取得不合理超額利益。"],
    [["底價", "公開"], "依政府採購法第34條第3項，底價於開標前應予保密；除特殊情形外，於決標後公開。"],
    [["比減價格", "底價"], "依政府採購法第53條、第54條及其施行細則相關規定，最低標超過底價時應先洽減或比減價格；仍超底價之決標，須符合未逾預算且依超底價比例報核之條件。"],
    [["差額保證金"], "依政府採購法第58條及「依政府採購法第五十八條處理總標價低於底價百分之八十案件之執行程序」，標價偏低案件應先通知說明；差額保證金並非所有低於底價案件均應通知繳納。"],
    [["調解費", "撤回"], "依政府採購法第85條之1及採購履約爭議調解收費辦法，調解事件撤回時，退費比例依撤回時點決定；於第1次調解期日之次日起一定期間內撤回者，通常退還半數。"],
    [["離職", "3年"], "依政府採購法第15條第1項，機關承辦、監辦採購人員離職後3年內，不得為本人或代理廠商向原任職機關接洽處理離職前5年內與職務有關之事務；適用範圍須按原任職機關與接洽機關認定。"],
    [["夫妻", "迴避"], "依政府採購法第15條及採購人員倫理準則，採購人員與採購案有利害關係或有影響公正之虞者應迴避；驗收人員與主辦人員具夫妻關係時，應避免同案角色衝突。"],
    [["饋贈", "財團法人", "機關首長"], "依政府採購法第15條、採購人員倫理準則及公職人員利益衝突迴避法，是否得參與採購或接受饋贈，應視身分、關係、採購程序及利益衝突情形判斷，不能僅以金額或職稱作概括結論。"],
    [["監辦", "15萬元"], "依政府採購法第13條及中央機關未達公告金額採購監辦辦法，未達一定金額之小額採購得簡化監辦；但採購仍不得因禮俗或便利而違反法定程序。"],
    [["循環經濟", "焚化", "氧化碴", "轉爐石"], "參照工程會推動公共工程使用再生粒料、氧化碴及轉爐石等循環材料之政策文件，得使用材料須符合法令、品質及適材適所原則；未列入政策推動範圍者不得混同。"],
    [["缺工", "移工"], "參照行政院及工程會營造業缺工改善措施，政策方向包括合理檢討移工規定、訓練媒合本國勞工及推動營建自動化，並非全面無限制開放移工進駐工地。"],
    [["續約", "採購金額", "預算金額"], "依政府採購法施行細則第6條及第7條，採購金額應包含後續擴充項目所需金額；預算金額則按機關當次可支用預算或預估給付金額填報。"],
    [["驗收", "減價收受", "逾期"], "依政府採購法第72條及施行細則第107條，減價收受是對驗收不符之處理，逾期違約金則按逾期日數計算，二者法律效果不同。"],
  ];
  const hit = rules.find(([needles]) => needles.every((needle) => t.includes(needle)));
  let inferred = "";
  if (hit) inferred = hit[1].replace(/^參照/, "依");
  else if (t.includes("底價")) inferred = "依政府採購法第34條、第46條、第52條至第54條及相關施行細則，底價涉及保密、核定、減價及超底價決標等程序，應依個案階段判斷。";
  else if (t.includes("契約")) inferred = "依政府採購法第63條、第70條、第72條及採購契約要項，契約履約、變更、驗收及付款均應以招標文件與契約條款為準。";
  else if (t.includes("最有利標") || t.includes("評選")) inferred = "依政府採購法第52條、第56條、第94條及最有利標評選辦法，評選項目、委員組成、協商及決標均須於招標文件明定並依程序辦理。";
  else if (t.includes("電子")) inferred = "依政府採購法第93條之1及電子採購相關作業規定，電子化採購程序以主管機關指定資訊系統辦理，並依公告、領投標、簽章及文件效力規定判斷。";
  else if (t.includes("爭議") || t.includes("調解") || t.includes("申訴")) inferred = "依政府採購法第75條至第85條之1及採購申訴審議、履約爭議調解相關規定，異議、申訴與調解須依期限、程序及費用規定辦理。";
  else if (t.includes("倫理") || t.includes("迴避") || t.includes("違法")) inferred = "依政府採購法第15條、第101條至第103條及採購人員倫理準則，採購人員應迴避利益衝突，並依法處理違法或不當採購行為。";
  else inferred = "依政府採購法第6條公平合理原則，並參照政府採購法、施行細則及工程會相關子法、函釋之體系解釋判斷。";

  return inferred;
}

function tfExplanation(rowNumber, question, ans, level, referenceLaw) {
  const label = answerLabel(ans);
  const basis = conciseBasis(question, level, referenceLaw);
  return `編號 ${rowNumber}: 依${basis}，${corePoint(question, label)}`;
}

function choiceExplanation(rowNumber, question, ans, choices, referenceLaw) {
  const n = Number(ans);
  const picked = choices?.[String(n)] || "";
  const allText = `${question} ${Object.values(choices || {}).join(" ")}`;
  const basis = conciseBasis(allText, "", referenceLaw);
  const selected = picked ? `應選 (${n})「${picked}」` : `應選 (${n})`;
  return `編號 ${rowNumber}: 依${basis}，${corePoint(allText, "O")}本題${selected}，其餘選項與題目所問的要件不合。`;
}

const input = await FileBlob.load(inputPath);
const workbook = await SpreadsheetFile.importXlsx(input);

const tfSheet = workbook.worksheets.getItem("是非題");
const tfRange = tfSheet.getRange("A1:G193");
const tfValues = tfRange.values;
for (let r = 1; r < tfValues.length; r++) {
  const row = tfValues[r];
  if (normalize(row[0]) === "例:") continue;
  if (!normalize(row[6])) row[6] = tfExplanation(row[0], row[4], row[3], row[2], row[5]);
}
tfRange.values = tfValues;

const choiceSheet = workbook.worksheets.getItem("選擇題");
const choiceRange = choiceSheet.getRange("A1:K28");
const choiceValues = choiceRange.values;
for (let r = 1; r < choiceValues.length; r++) {
  const row = choiceValues[r];
  if (normalize(row[0]) === "例:") continue;
  const parsed = parseChoiceQuestion(row[4]);
  if (parsed) {
    if (!normalize(row[6])) row[6] = parsed.stem;
    for (let i = 0; i < 4; i++) {
      const key = String(i + 1);
      if (!normalize(row[7 + i])) row[7 + i] = parsed.choices[key] || "";
    }
  }
  const choices = {
    1: row[7],
    2: row[8],
    3: row[9],
    4: row[10],
  };
  if (!normalize(row[5])) row[5] = choiceExplanation(row[0], row[6] || row[4], row[3], choices, "");
}
choiceRange.values = choiceValues;

tfSheet.getRange("G:G").format.wrapText = true;
tfSheet.getRange("G:G").format.columnWidth = 72;
choiceSheet.getRange("F:F").format.wrapText = true;
choiceSheet.getRange("G:K").format.wrapText = true;
choiceSheet.getRange("F:F").format.columnWidth = 72;
choiceSheet.getRange("G:G").format.columnWidth = 58;
choiceSheet.getRange("H:K").format.columnWidth = 24;

await fs.mkdir(outputDir, { recursive: true });

const tfPreview = await workbook.render({ sheetName: "是非題", range: "A1:G12", scale: 1, format: "png" });
await fs.writeFile(`${outputDir}/preview_是非題.png`, new Uint8Array(await tfPreview.arrayBuffer()));
const choicePreview = await workbook.render({ sheetName: "選擇題", range: "A1:K12", scale: 1, format: "png" });
await fs.writeFile(`${outputDir}/preview_選擇題.png`, new Uint8Array(await choicePreview.arrayBuffer()));

const errors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!",
  options: { useRegex: true, maxResults: 300 },
  summary: "final formula error scan",
});
console.log(errors.ndjson);

const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);
console.log(outputPath);
