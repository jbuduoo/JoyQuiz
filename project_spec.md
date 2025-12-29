# Quiz App 專案開發規格書

## 1. 專案概觀
一個基於 Expo (React Native) 的題庫測驗應用程式，支援多種題目類型、進度儲存、錯題本（收藏）功能，並具備匯入外部題庫的能力。

## 2. 技術棧
- **框架**: Expo (React Native 0.81+)
- **語言**: TypeScript
- **導航**: React Navigation (Native Stack, Bottom Tabs)
- **儲存**: @react-native-async-storage/async-storage
- **平台**: iOS, Android, Web

## 3. 核心資料結構 (TypeScript)

### 題目模型
```typescript
type QuestionType = '選擇題' | '複選題' | '是非題' | '問答題';

interface Question {
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
```

### 用戶狀態模型
```typescript
interface UserAnswer {
  questionId: string;
  isCorrect: boolean;
  isAnswered: boolean;
  selectedAnswer?: string;
  isFavorite: boolean;      // 關鍵：收藏 = 加入錯題本
  isInWrongBook: boolean;   // 與 isFavorite 同步
  isUncertain: boolean;     // 標記不確定
  wrongCount: number;
}
```

## 4. 資料儲存結構

### AsyncStorage Keys
- `@quiz:userAnswers`: 儲存所有 `UserAnswer` 的 Record (以 `questionId` 為 Key)。
- `@quiz:selectedTestName`: 當前選擇的測驗分類。
- `@quiz:userSettings`: 使用者偏好（主題、字體大小）。
- `@quiz:quizProgress`: 儲存各測驗目前的進度索引。

### 題庫索引 (assets/data/questions/questions.json)
支援「單層檔案列表」與「二層分組結構」：
- `questionFiles`: 扁平檔案列表。
- `questionListFiles`: 分組結構，包含 `children` 陣列。
- `config`: 全域配置（如 `enableImport`, `enableTrash` 等）。

## 5. 核心邏輯規範

### 5.1 題目載入邏輯
1. 從 `questions.json` 讀取索引。
2. 依據 `filePath` 解析或從索引中獲取 `testName`, `subject`, `series_no`。
3. 載入對應 JSON 檔案後，將原始欄位（如 `Q`, `Exp`）標準化為 `Question` 物件。
4. **ID 生成**: 必須確保全域唯一，建議格式為 `{series_no}_{original_id}`。

### 5.2 錯題本與收藏同步邏輯
- **核心規則**: 「收藏」與「錯題本」共用同一套狀態。
- 當用戶點擊「收藏」時，`isFavorite` 與 `isInWrongBook` 同步設為 `true`。
- 從錯題本移除時，兩者同步設為 `false`。

### 5.3 測驗流程
- 支援循序作答。
- 即時判斷正誤：單選題點選即判定，複選題需提交判定。
- 支援「不確定」標記。
- 完成測驗時計算分數並存檔。

### 5.4 匯入功能 (ImportService)
- 支援從遠端 URL 下載 JSON 或讀取本地檔案。
- 解析檔名以自動判定分類資訊。
- 匯入資料儲存於 AsyncStorage 中，並與內建題庫索引合併顯示。

## 6. UI/UX 需求
- **夜間模式**: 支援 Light / Dark Theme 切換。
- **字體縮放**: 支援小、中、大三種字體設定，影響題目顯示。
- **作答反饋**:  
  - 正確：顯示綠色選項背景。
  - 錯誤：顯示紅色選項背景，並高亮正確選項。
  - 顯示詳解區塊。

## 7. JSON 範例 (題目檔案)
```json
[
  {
    "Id": "1",
    "Type": "選擇題",
    "Q": "題目內容",
    "A": "選項A",
    "B": "選項B",
    "C": "選項C",
    "D": "選項D",
    "Ans": "A",
    "Exp": "解釋說明"
  }
]
```

