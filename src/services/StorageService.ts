import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserAnswer, UserSettings, QuizProgress } from '../types';

const KEYS = {
  USER_ANSWERS: '@quiz:userAnswers',
  SELECTED_TEST: '@quiz:selectedTestName',
  USER_SETTINGS: '@quiz:userSettings',
  QUIZ_PROGRESS: '@quiz:quizProgress',
  COMPLETED_CATEGORIES: '@quiz:completedCategories',
};

export class StorageService {
  /**
   * 儲存用戶回答，並同步收藏與錯題本狀態
   */
  static async saveUserAnswer(answer: Partial<UserAnswer> & { questionId: string }): Promise<void> {
    try {
      const existingAnswersRaw = await AsyncStorage.getItem(KEYS.USER_ANSWERS);
      const allAnswers: Record<string, UserAnswer> = existingAnswersRaw ? JSON.parse(existingAnswersRaw) : {};
      
      const current = allAnswers[answer.questionId] || {
        questionId: answer.questionId,
        isCorrect: false,
        isAnswered: false,
        isFavorite: false,
        isInWrongBook: false,
        isUncertain: false,
        wrongCount: 0,
      };

      const updated: UserAnswer = { ...current, ...answer };

      // 核心邏輯：同步收藏與錯題本
      if (answer.isFavorite !== undefined) {
        updated.isInWrongBook = answer.isFavorite;
      } else if (answer.isInWrongBook !== undefined) {
        updated.isFavorite = answer.isInWrongBook;
      }

      allAnswers[answer.questionId] = updated;
      await AsyncStorage.setItem(KEYS.USER_ANSWERS, JSON.stringify(allAnswers));
    } catch (e) {
      console.error('Failed to save user answer', e);
    }
  }

  static async getUserAnswers(): Promise<Record<string, UserAnswer>> {
    try {
      const data = await AsyncStorage.getItem(KEYS.USER_ANSWERS);
      return data ? JSON.parse(data) : {};
    } catch (e) {
      return {};
    }
  }

  static async saveSettings(settings: UserSettings): Promise<void> {
    await AsyncStorage.setItem(KEYS.USER_SETTINGS, JSON.stringify(settings));
  }

  static async getSettings(): Promise<UserSettings> {
    const data = await AsyncStorage.getItem(KEYS.USER_SETTINGS);
    return data ? JSON.parse(data) : { theme: 'light', fontSize: 'medium' };
  }

  static async saveProgress(testName: string, index: number): Promise<void> {
    const data = await AsyncStorage.getItem(KEYS.QUIZ_PROGRESS);
    const progress: QuizProgress = data ? JSON.parse(data) : {};
    progress[testName] = index;
    await AsyncStorage.setItem(KEYS.QUIZ_PROGRESS, JSON.stringify(progress));
  }

  static async getProgress(): Promise<QuizProgress> {
    const data = await AsyncStorage.getItem(KEYS.QUIZ_PROGRESS);
    return data ? JSON.parse(data) : {};
  }

  static async setCategoryCompleted(categoryTitle: string): Promise<void> {
    try {
      const data = await AsyncStorage.getItem(KEYS.COMPLETED_CATEGORIES);
      const completed: Record<string, boolean> = data ? JSON.parse(data) : {};
      completed[categoryTitle] = true;
      await AsyncStorage.setItem(KEYS.COMPLETED_CATEGORIES, JSON.stringify(completed));
    } catch (e) {
      console.error('Failed to set category completed', e);
    }
  }

  static async getCompletedCategories(): Promise<Record<string, boolean>> {
    try {
      const data = await AsyncStorage.getItem(KEYS.COMPLETED_CATEGORIES);
      return data ? JSON.parse(data) : {};
    } catch (e) {
      return {};
    }
  }

  static async clearCategoryCompleted(categoryTitle: string): Promise<void> {
    try {
      const data = await AsyncStorage.getItem(KEYS.COMPLETED_CATEGORIES);
      const completed: Record<string, boolean> = data ? JSON.parse(data) : {};
      delete completed[categoryTitle];
      await AsyncStorage.setItem(KEYS.COMPLETED_CATEGORIES, JSON.stringify(completed));
    } catch (e) {
      console.error('Failed to clear category completed', e);
    }
  }

  static async clearUserAnswers(questionIds: string[]): Promise<void> {
    try {
      const existingAnswersRaw = await AsyncStorage.getItem(KEYS.USER_ANSWERS);
      if (!existingAnswersRaw) return;
      const allAnswers: Record<string, UserAnswer> = JSON.parse(existingAnswersRaw);
      
      questionIds.forEach(id => {
        if (allAnswers[id]) {
          // 重置答題相關欄位，保留收藏狀態、錯題次數及最後正誤紀錄
          allAnswers[id] = {
            ...allAnswers[id],
            isAnswered: false,
            selectedAnswer: undefined,
          };
        }
      });
      
      await AsyncStorage.setItem(KEYS.USER_ANSWERS, JSON.stringify(allAnswers));
    } catch (e) {
      console.error('Failed to clear user answers', e);
    }
  }
}

