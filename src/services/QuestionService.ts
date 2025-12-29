import { Question, QuestionType, QuestionFile } from '../types';

export class QuestionService {
  /**
   * 將原始 JSON 資料標準化為 Question 物件
   */
  static transformRawQuestion(raw: any, fileInfo: Partial<QuestionFile>): Question {
    const series_no = raw.series_no || fileInfo.series_no || 'default';
    const id = `${series_no}_${raw.Id}`;
    
    return {
      id,
      content: raw.Q || raw.content,
      A: raw.A,
      B: raw.B,
      C: raw.C,
      D: raw.D,
      E: raw.E,
      Ans: raw.Ans,
      exp: raw.Exp || raw.exp || '',
      Type: (raw.Type as QuestionType) || '選擇題',
      testName: raw.testName || fileInfo.testName,
      subject: raw.subject || fileInfo.subject,
      series_no,
      questionNumber: parseInt(raw.Id, 10) || 0,
    };
  }

  /**
   * 根據檔名解析測驗資訊 (用於匯入功能)
   */
  static parseFileInfoFromPath(path: string): Partial<QuestionFile> {
    // 假設格式為: testName_subject_seriesNo.json
    const fileName = path.split('/').pop() || '';
    const parts = fileName.replace('.json', '').split('_');
    
    return {
      testName: parts[0] || '未分類',
      subject: parts[1] || '',
      series_no: parts[2] || '1',
    };
  }

  /**
   * 模擬從靜態資源加載題目 (實際環境需處理動態 require 或 fetch)
   */
  static async loadQuestionsFromStatic(rawData: any[], fileInfo: Partial<QuestionFile>): Promise<Question[]> {
    return rawData.map(raw => this.transformRawQuestion(raw, fileInfo));
  }
}

