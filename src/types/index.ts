export type QuestionType = '選擇題' | '複選題' | '是非題' | '問答題';

export enum ViewMode {
  QUIZ = 'QUIZ',
  REVIEW = 'REVIEW',
  FAVORITE = 'FAVORITE',
  MOCK = 'MOCK',
  WRONG = 'WRONG',
}

/**
 * 測驗模式行為策略配置
 */
export interface QuizModeConfig {
  mode: ViewMode;
  canAnswer: boolean;          // 是否允許作答
  showAnswerInstantly: boolean; // 是否在作答後立即顯示答案與詳解
  showExpDirectly: boolean;    // 是否直接顯示詳解 (不需作答)
  saveProgress: boolean;       // 是否紀錄最後練習題號
  isReadOnly: boolean;         // 介面是否為唯讀
  clearOnFinish: boolean;      // 完成後是否清除本次作答數據
}

export const QUIZ_CONFIGS: Record<ViewMode, QuizModeConfig> = {
  [ViewMode.QUIZ]: {
    mode: ViewMode.QUIZ,
    canAnswer: true,
    showAnswerInstantly: true,
    showExpDirectly: false,
    saveProgress: true,
    isReadOnly: false,
    clearOnFinish: false,
  },
  [ViewMode.REVIEW]: {
    mode: ViewMode.REVIEW,
    canAnswer: false,
    showAnswerInstantly: true,
    showExpDirectly: true,
    saveProgress: false,
    isReadOnly: true,
    clearOnFinish: false,
  },
  [ViewMode.FAVORITE]: {
    mode: ViewMode.FAVORITE,
    canAnswer: true,
    showAnswerInstantly: true,
    showExpDirectly: false,
    saveProgress: true,
    isReadOnly: false,
    clearOnFinish: true,
  },
  [ViewMode.WRONG]: {
    mode: ViewMode.WRONG,
    canAnswer: true,
    showAnswerInstantly: true,
    showExpDirectly: false,
    saveProgress: true,
    isReadOnly: false,
    clearOnFinish: true,
  },
  [ViewMode.MOCK]: {
    mode: ViewMode.MOCK,
    canAnswer: true,
    showAnswerInstantly: true,
    showExpDirectly: false,
    saveProgress: true,
    isReadOnly: false,
    clearOnFinish: true,
  },
};

export interface Question {
  id: string;              // 格式：{series_no}_{Id}
  content: string;         // 題目內文
  A: string;               // 選項 A
  B: string;               // 選項 B
  C: string;               // 選項 C
  D: string;               // 選項 D
  E?: string;              // 選項 E (可選，複選題用)
  Ans: string;             // 正確答案 (單選如 "A", 複選如 "A,B")
  exp: string;             // 詳解
  Type?: QuestionType;     // 題目類型
  testName?: string;       // 測驗分類名稱
  subject?: string;        // 科目分類名稱
  series_no: string;       // 期數/卷號
  questionNumber: number;  // 題號
}

export interface UserAnswer {
  questionId: string;
  isCorrect: boolean;
  isAnswered: boolean;
  selectedAnswer?: string;
  isFavorite: boolean;      // 關鍵：收藏 = 加入錯題本
  isInWrongBook: boolean;   // 與 isFavorite 同步
  isUncertain: boolean;     // 標記不確定
  wrongCount: number;
}

export interface QuizProgress {
  [testName: string]: number; // 儲存各測驗目前的進度索引
}

export interface UserSettings {
  theme: 'light' | 'dark';
  fontSize: 'small' | 'medium' | 'large';
}

export interface QuestionFile {
  filePath: string;
  testName: string;
  subject?: string;
  series_no: string;
  isQuestionFile?: boolean;
}

export interface QuestionGroup {
  name: string;
  children: (QuestionFile | QuestionGroup)[];
}

export interface QuestionsConfig {
  enableImport: boolean;
  enableTrash: boolean;
  HomeScreenHeaderTitle?: string;
  enableSample?: boolean;
  isFavorite?: boolean;
  isWrong?: boolean;
  isMock?: boolean;
  [key: string]: any;
}

export interface QuestionsIndex {
  questionFiles: QuestionFile[];
  questionListFiles: QuestionGroup[];
  config: QuestionsConfig;
}

