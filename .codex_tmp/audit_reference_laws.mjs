import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const path = "C:/Users/wits/Documents/程式專區/JoyQuiz/outputs/procurement-law/採購法_新增資料_法條詳解版_法源校正版.xlsx";
const input = await FileBlob.load(path);
const workbook = await SpreadsheetFile.importXlsx(input);

function normalize(value) {
  return value == null ? "" : String(value).replace(/\s+/g, "");
}

function auditSheet(sheetName, rangeAddress, refCol, expCol) {
  const sheet = workbook.worksheets.getItem(sheetName);
  const values = sheet.getRange(rangeAddress).values;
  const misses = [];
  let refs = 0;
  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    if (String(row[0] || "").trim() === "例:") continue;
    const ref = row[refCol];
    if (!String(ref || "").trim()) continue;
    refs++;
    const refNorm = normalize(ref);
    const expNorm = normalize(row[expCol]);
    if (!expNorm.includes(refNorm)) {
      misses.push({
        sheetName,
        rowNumber: r + 1,
        id: row[0],
        referenceLaw: ref,
        explanation: row[expCol],
      });
    }
  }
  return { sheetName, refs, misses };
}

const results = [
  auditSheet("是非題", "A1:G193", 5, 6),
  auditSheet("選擇題", "A1:K28", -1, 5),
];

console.log(JSON.stringify(results, null, 2));
