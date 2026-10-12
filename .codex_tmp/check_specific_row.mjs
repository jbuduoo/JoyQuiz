import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const path = "C:/Users/wits/Documents/程式專區/JoyQuiz/outputs/procurement-law/採購法_新增資料_老師詳解版.xlsx";
const input = await FileBlob.load(path);
const workbook = await SpreadsheetFile.importXlsx(input);
const sheet = workbook.worksheets.getItem("是非題");
const values = sheet.getRange("A1:G193").values;
const row = values.find((item) => String(item[4] || "").includes("共同供應契約向訂約廠商下訂"));
console.log(JSON.stringify(row, null, 2));
