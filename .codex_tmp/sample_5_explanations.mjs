import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const path = "C:/Users/wits/Downloads/採購法_新增資料.xlsx";
const input = await FileBlob.load(path);
const workbook = await SpreadsheetFile.importXlsx(input);
const sheet = workbook.worksheets.getItem("是非題");
const values = sheet.getRange("A1:G193").values;

function normalize(value) {
  return value == null ? "" : String(value).trim();
}

function law(ref) {
  const value = normalize(ref);
  if (!value) return "";
  if (/^第\s*\d+/.test(value)) return `依政府採購法${value}`;
  return `依${value}`;
}

function simpleExplanation(row) {
  const id = row[0];
  const ans = normalize(row[3]);
  const q = normalize(row[4]);
  const ref = law(row[5]);

  if (q.includes("共同供應契約") && q.includes("免再辦理驗收")) {
    return `編號 ${id}：${ans}。共同供應契約只是機關可以利用既有契約向訂約廠商訂購，並不是交貨後就不用驗收。機關收到貨品後，仍應確認交付內容、數量及品質是否符合契約。${ref}。`;
  }
  if (q.includes("公開閱覽") && q.includes("緊急情事")) {
    return `編號 ${id}：${ans}。查核金額以上採購原則上要在公告招標前辦理招標文件公開閱覽，但遇到緊急情事或等標期依法可縮短、合理訂定時，得不辦理公開閱覽。`;
  }
  if (q.includes("查核金額以上") && q.includes("公開閱覽")) {
    return `編號 ${id}：${ans}。公開閱覽制度主要是讓重大採購的招標文件先接受檢視，減少綁標或履約爭議；但是否一律適用，仍要看採購類型及例外規定。`;
  }
  if (q.includes("廠商或民眾意見") && q.includes("密件")) {
    return `編號 ${id}：${ans}。公開閱覽後收到的意見，重點是機關的處理情形要公開透明，不是要求民眾或廠商先用密件方式提出。`;
  }
  if (q.includes("廠商或民眾意見") && q.includes("個別答復")) {
    return `編號 ${id}：${ans}。所謂公開方式處理，是指機關可將意見及處理情形公開或回應，使招標文件處理過程透明；不必把意見先當密件收受。`;
  }
  if (q.includes("景觀專業服務業")) {
    return `編號 ${id}：${ans}。廠商資格可以依採購標的需要訂定；景觀專業技術服務如果確實需要相關專業能力，資格條件列入景觀專業服務業是可以的。`;
  }
  return `編號 ${id}：${ans}。這題要先抓題目中的採購程序、金額門檻與例外條件，再回到相關採購法規判斷是否符合。${ref ? `${ref}。` : ""}`;
}

const samples = values
  .slice(2, 7)
  .map(simpleExplanation);

console.log(samples.join("\n\n"));
