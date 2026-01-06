//首頁

import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, useWindowDimensions, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import { StorageService } from '../services/StorageService';
import { QuestionService } from '../services/QuestionService';
import { getQuestionData } from '../utils/questionLoader';
import { Question, ViewMode, QUIZ_CONFIGS } from '../types';

interface QuestionListItem {
  series_no: string;
  displayName: string;
  file: string;
  total?: number;
}

interface QuestionGroup {
  typeName: string;
  items: QuestionListItem[];
}

interface Category {
  id: string;
  title: string;
  total: number;
  fileName?: string;
}

const HomeScreen = () => {
  // 定義導航與螢幕狀態
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const isFocused = useIsFocused(); // 監聽當前頁面是否處於焦點
  const { width } = useWindowDimensions();
  
  // 定義狀態 (State)
  const [progressMap, setProgressMap] = useState<Record<string, number>>({}); // 紀錄各題庫練習進度
  const [completedMap, setCompletedMap] = useState<Record<string, boolean>>({}); // 紀錄已完成的題庫
  const [categories, setCategories] = useState<Category[]>([]); // 存放題庫分類清單
  const [questionGroups, setQuestionGroups] = useState<QuestionGroup[]>([]); // 存放分組題庫
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set()); // 紀錄展開的分組
  const [isQuestionListMode, setIsQuestionListMode] = useState(false); // 是否為分組模式
  const [headerTitle, setHeaderTitle] = useState('政府採購法題庫'); // 標題文字

  // 回應式佈局 (RWD) 配置
  const isLargeScreen = width > 768;
  const contentWidth = isLargeScreen ? 800 : '100%';

  // 初始載入：獲取題庫分類
  useEffect(() => {
    loadCategories();
  }, []);

  // 當回到此頁面時，重新整理練習進度
  useEffect(() => {
    if (isFocused) {
      loadProgress();
    }
  }, [isFocused]);

  /**
   * 載入題庫分類清單
   * 讀取 JSON 配置，並根據檔案動態計算各分類的總題數
   */
  const loadCategories = async () => {
    const questionsIndex = require('../../assets/data/questions/questions.json');
    const isListMode = questionsIndex.config?.isQuestionListFile === true;
    setIsQuestionListMode(isListMode);
    
    // 設置頁面標題
    if (questionsIndex.config?.HomeScreenHeaderTitle) {
      setHeaderTitle(questionsIndex.config.HomeScreenHeaderTitle);
    }

    let dynamicCategories: Category[] = [];
    let dynamicGroups: QuestionGroup[] = [];

    if (isListMode && questionsIndex.questionListFiles) {
      dynamicGroups = questionsIndex.questionListFiles.map((group: any) => ({
        typeName: group.typeName,
        items: group.items.map((item: any) => {
          let totalCount = 0;
          try {
            const data = getQuestionData(item.file);
            if (Array.isArray(data)) {
              totalCount = data.length;
            } else if (data && typeof data === 'object' && Array.isArray(data.questions)) {
              totalCount = data.questions.length;
            }
          } catch (e) {
            console.error(`Error loading count for ${item.file}`, e);
          }
          return {
            series_no: item.series_no,
            displayName: item.displayName,
            file: item.file,
            total: totalCount,
          };
        }),
      }));
      setQuestionGroups(dynamicGroups);
    } else {
      // 原有的單層結構處理
      dynamicCategories = questionsIndex.questionFiles
        .filter((file: any) => {
          if (file.id === 'sample' && questionsIndex.config?.enableSample === false) {
            return false;
          }
          // 只有 isQuestionFile 為 true 的才會顯示
          return file.isQuestionFile === true;
        })
        .map((file: any) => {
          let totalCount = file.count;
          if (file.fileName) {
            try {
              const data = getQuestionData(file.fileName);
              if (Array.isArray(data)) {
                totalCount = data.length;
              } else if (data && typeof data === 'object' && Array.isArray(data.questions)) {
                totalCount = data.questions.length;
              }
            } catch (e) {
              console.error(`Error loading count for ${file.fileName}`, e);
            }
          }
          return {
            id: file.id,
            title: file.displayName,
            total: totalCount,
            fileName: file.fileName,
          };
        });
    }

    // 從本地儲存 (Storage) 獲取用戶答題紀錄與完成狀態
    const userAnswers = await StorageService.getUserAnswers();
    const completed = await StorageService.getCompletedCategories();
    setCompletedMap(completed);
    const answersArray = Object.values(userAnswers);
    
    // 建立所有有效題目 ID 的索引，用於過濾「我的最愛」與「錯題」
    let allQuestionIds = new Set<string>();
    const filesToProcess = isListMode 
      ? dynamicGroups.flatMap(g => g.items.map(i => ({ id: i.series_no, fileName: i.file })))
      : questionsIndex.questionFiles.filter((f: any) => f.isQuestionFile === true);

    for (const file of filesToProcess) {
      if (file.fileName || (file as any).file) {
        const fName = (file as any).fileName || (file as any).file;
        try {
          const data = getQuestionData(fName);
          const questions = Array.isArray(data) ? data : (data?.questions || []);
          questions.forEach((q: any) => allQuestionIds.add(`${file.id || (file as any).series_no}_${q.Id}`));
        } catch (e) {}
      }
    }

    // 計算收藏數與錯題數
    // 修正：統一判定邏輯。錯題定義為：(曾答錯且目前非正確)。
    // 並確保該題目 ID 存在於目前的題庫清單中 (allQuestionIds)。
    const favoriteCount = answersArray.filter(a => a.isFavorite && allQuestionIds.has(a.questionId)).length;
    const wrongCount = answersArray.filter(a => 
      (a.wrongCount > 0 && !a.isCorrect) && allQuestionIds.has(a.questionId)
    ).length;

    const specialCategories: Category[] = [];
    
    // 根據配置加入特殊分類：最愛、錯題、模擬測驗
    if (questionsIndex.config?.isFavorite !== false) {
      specialCategories.push({ id: 'favorite', title: '最愛練習', total: favoriteCount });
    }
    if (questionsIndex.config?.isWrong !== false) {
      specialCategories.push({ id: 'wrong', title: '錯題複習', total: wrongCount });
    }
    if (questionsIndex.config?.isMock !== false) {
      specialCategories.push({ id: 'mock', title: '模擬測驗', total: 50 });
    }

    setCategories(isListMode ? specialCategories : [...dynamicCategories, ...specialCategories]);
  };

  /**
   * 載入並更新用戶練習進度
   */
  const loadProgress = async () => {
    const [progress, completed] = await Promise.all([
      StorageService.getProgress(),
      StorageService.getCompletedCategories()
    ]);
    setProgressMap(progress);
    setCompletedMap(completed);

    // 重新計算收藏與錯題數量，確保 UI 數字即時更新
    const userAnswers = await StorageService.getUserAnswers();
    const answersArray = Object.values(userAnswers);
    
    // 獲取所有有效的題目 ID，用來驗證儲存的答案是否屬於當前題庫
    const questionsIndex = require('../../assets/data/questions/questions.json');
    const isListMode = questionsIndex.config?.isQuestionListFile === true;
    
    let allQuestionIds = new Set<string>();
    
    if (isListMode && questionsIndex.questionListFiles) {
      for (const group of questionsIndex.questionListFiles) {
        for (const item of group.items) {
          try {
            const data = getQuestionData(item.file);
            const questions = Array.isArray(data) ? data : (data?.questions || []);
            questions.forEach((q: any) => allQuestionIds.add(`${item.series_no}_${q.Id}`));
          } catch (e) {}
        }
      }
    } else {
      for (const file of questionsIndex.questionFiles.filter((f: any) => f.isQuestionFile === true)) {
        if (file.fileName) {
          try {
            const data = getQuestionData(file.fileName);
            const questions = Array.isArray(data) ? data : (data?.questions || []);
            questions.forEach((q: any) => allQuestionIds.add(`${file.id}_${q.Id}`));
          } catch (e) {}
        }
      }
    }

    // 修正：統一判定邏輯。錯題定義為：(曾答錯且目前非正確)。
    // 這樣即便在清空答案 (isAnswered = false) 後，錯題依然會保留在清單中直到被答對。
    const favoriteCount = answersArray.filter(a => a.isFavorite && allQuestionIds.has(a.questionId)).length;
    const wrongCount = answersArray.filter(a => 
      (a.wrongCount > 0 && !a.isCorrect) && allQuestionIds.has(a.questionId)
    ).length;

    setCategories(prev => prev.map(cat => {
      if (cat.id === 'favorite') return { ...cat, total: favoriteCount };
      if (cat.id === 'wrong') return { ...cat, total: wrongCount };
      return cat;
    }));
  };

  /**
   * 啟動測驗 Session (Session Launcher)
   * 負責處理進入測驗前的資料準備、進度讀取與環境清理
   */
  const handleStartQuiz = async (category: Category, mode: ViewMode = ViewMode.QUIZ) => {
    let questions: Question[] = [];
    let viewMode = mode;
    const quizConfig = QUIZ_CONFIGS[viewMode];

    // 1. 題目準備階段
    if (category.id === 'favorite' || category.id === 'review' || category.id === 'wrong' || category.id === 'mock') {
      if (category.id === 'favorite') viewMode = ViewMode.FAVORITE;
      if (category.id === 'wrong') viewMode = ViewMode.WRONG;
      if (category.id === 'mock') viewMode = ViewMode.MOCK;
      
      const questionsIndex = require('../../assets/data/questions/questions.json');
      let allLoadedQuestions: Question[] = [];
      
      const filesToProcess = questionsIndex.config?.isQuestionListFile === true
        ? (questionsIndex.questionListFiles || []).flatMap((g: any) => g.items.map((i: any) => ({ displayName: i.displayName, id: i.series_no, fileName: i.file })))
        : (questionsIndex.questionFiles || []).filter((f: any) => f.isQuestionFile === true);

      for (const file of filesToProcess) {
        if (file.fileName) {
          const rawData = getQuestionData(file.fileName);
          const loaded = await QuestionService.loadQuestionsFromStatic(rawData, {
            testName: file.displayName,
            series_no: file.id
          });
          allLoadedQuestions = [...allLoadedQuestions, ...loaded];
        }
      }

      if (viewMode === ViewMode.MOCK) {
        questions = allLoadedQuestions.sort(() => Math.random() - 0.5).slice(0, 50);
      } else if (viewMode === ViewMode.WRONG) {
        const userAnswers = await StorageService.getUserAnswers();
        questions = allLoadedQuestions.filter(q => {
          const status = userAnswers[q.id];
          return status && (status.wrongCount > 0 && !status.isCorrect);
        });
      } else {
        questions = allLoadedQuestions;
      }
    } else if (category.fileName) {
      try {
        const rawData = getQuestionData(category.fileName);
        questions = await QuestionService.loadQuestionsFromStatic(rawData, {
          testName: category.title,
          series_no: category.id
        });
      } catch (e) {
        console.error('Failed to load questions', e);
      }
    }

    // 2. 策略執行階段 (Session Initialization)
    const isSpecial = ['favorite', 'wrong', 'mock'].includes(category.id);
    const progressKey = isSpecial ? `${viewMode}_${category.title}` : category.title;
    const currentProgress = progressMap[progressKey] || 0;

    // 決定是否為「全新開始」：(進度為0) 或是 (模式策略要求完成後清除)
    const isRestarting = currentProgress === 0;
    const shouldClearAnswers = (mode === ViewMode.QUIZ || quizConfig.clearOnFinish) && isRestarting;

    if (shouldClearAnswers) {
      // 若是主線測驗重新開始，清除「已完成」標記
      if (mode === ViewMode.QUIZ && completedMap[category.title]) {
        await StorageService.clearCategoryCompleted(category.title);
      }

      // 重置進度索引
      await StorageService.saveProgress(progressKey, 0);
      
      // 抹除作答紀錄痕跡，確保進入後是「空白」狀態
      if (questions.length > 0) {
        await StorageService.clearUserAnswers(questions.map(q => q.id));
      }
    }

    // 3. 導向階段
    navigation.navigate('Quiz', {
      questions,
      title: category.title,
      viewMode,
      startIndex: quizConfig.saveProgress ? (progressMap[progressKey] || 0) : 0
    });
  };

  const toggleGroup = (typeName: string) => {
    setExpandedGroups(prev => {
      if (prev.has(typeName)) {
        return new Set();
      }
      return new Set([typeName]);
    });
  };

  const renderCategoryCard = (category: Category) => {
    const isSpecial = ['favorite', 'wrong', 'mock'].includes(category.id);
    const progressKey = isSpecial ? `${ViewMode[category.id.toUpperCase() as keyof typeof ViewMode]}_${category.title}` : category.title;
    const currentProgress = progressMap[progressKey] || 0;
    const isCompleted = completedMap[category.title] === true;
    const displayProgress = (isCompleted && currentProgress === 0) ? category.total : currentProgress;
    const hasProgress = currentProgress > 0;
    const progressPercent = category.total > 0 ? (displayProgress / category.total) * 100 : 0;
    const isDisabled = isSpecial && (category.id === 'favorite' || category.id === 'wrong') && category.total === 0;

    return (
      <View 
        key={category.id} 
        style={[styles.card, isLargeScreen && styles.cardLarge]} 
      >
        <View style={styles.cardLeft}>
          <Text style={[styles.cardTitle, isDisabled && { color: '#8E8E93' }]} numberOfLines={1}>
            {category.title}
            {isSpecial && (category.id === 'favorite' || category.id === 'wrong') ? `(${category.total})` : ''}
          </Text>
          {!isSpecial && (
            <>
              <Text style={styles.cardProgressText}>
                完成 {displayProgress}/{category.total} 題
              </Text>
              <View style={styles.progressBarTrack}>
                <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
              </View>
            </>
          )}
          {isSpecial && (
            <Text style={styles.cardProgressText}>
              {category.id === 'favorite' && '練習您收藏的題目'}
              {category.id === 'wrong' && '針對答錯的題目進行複習'}
              {category.id === 'mock' && '隨機挑選 50 題進行模擬測試'}
            </Text>
          )}
        </View>

        <View style={styles.buttonGroup}>
          {!isSpecial && isCompleted && (
            <TouchableOpacity 
              style={[styles.reviewButton, isLargeScreen && styles.quizButtonLarge]}
              onPress={() => handleStartQuiz(category, ViewMode.REVIEW)}
            >
              <Text style={[styles.quizButtonText, isLargeScreen && styles.quizButtonTextLarge]}>
                {'檢\n視'}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity 
            style={[
              styles.quizButton, 
              isLargeScreen && styles.quizButtonLarge, 
              isSpecial && { backgroundColor: '#FF9500' },
              isDisabled && styles.disabledButton
            ]}
            onPress={() => handleStartQuiz(category, isSpecial ? ViewMode[category.id.toUpperCase() as keyof typeof ViewMode] : ViewMode.QUIZ)}
            disabled={isDisabled}
          >
            <Text style={[styles.quizButtonText, isLargeScreen && styles.quizButtonTextLarge]}>
              {isSpecial ? '開始\n測驗' : (isCompleted ? '重新\n測驗' : (hasProgress ? '繼續\n測驗' : '開始\n測驗'))}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderGroup = (group: QuestionGroup) => {
    const isExpanded = expandedGroups.has(group.typeName);
    return (
      <View key={group.typeName} style={styles.groupContainer}>
        <TouchableOpacity 
          style={styles.groupHeader} 
          onPress={() => toggleGroup(group.typeName)}
          activeOpacity={0.7}
        >
          <Text style={styles.groupTitle}>{group.typeName}</Text>
          <Text style={styles.groupIcon}>{isExpanded ? '▼' : '▶'}</Text>
        </TouchableOpacity>
        {isExpanded && (
          <View style={styles.groupItems}>
            {group.items.map(item => renderCategoryCard({
              id: item.series_no,
              title: item.displayName,
              total: item.total || 0,
              fileName: item.file
            }))}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.headerLeft} />
        <Text style={styles.headerTitle}>{headerTitle}</Text>
        <TouchableOpacity 
          style={styles.headerRight} 
          onPress={() => navigation.navigate('Settings')}
        >
          <Text style={styles.settingsButtonText}>設定</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.container}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
        >
          {isQuestionListMode ? (
            <>
              {questionGroups.map(renderGroup)}
              {categories.map(renderCategoryCard)}
            </>
          ) : (
            categories.map(renderCategoryCard)
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#007AFF' },
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  scrollContent: { paddingVertical: 8, flexGrow: 1 },
  groupContainer: {
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  groupTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  groupIcon: {
    fontSize: 16,
    color: '#8E8E93',
  },
  groupItems: {
    backgroundColor: '#F2F2F7',
    paddingLeft: 0,
  },
  header: { 
    height: Platform.OS === 'web' ? 60 : 50,
    backgroundColor: '#007AFF', 
    flexDirection: 'row',
    justifyContent: 'space-between', 
    alignItems: 'center',
    paddingHorizontal: 16,
    elevation: 4,
    ...(Platform.OS === 'web' 
      ? { boxShadow: '0px 1px 2px rgba(0,0,0,0.1)' } 
      : {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.1,
          shadowRadius: 2,
        }
    ),
  },
  headerLeft: {
    width: 40,
  },
  headerRight: {
    width: 40,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  settingsButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  headerTitle: { 
    fontSize: 22, 
    fontWeight: 'bold', 
    color: '#fff',
    letterSpacing: 1,
  },
  card: { 
    backgroundColor: '#fff', 
    flexDirection: 'row',
    borderRadius: 0, 
    padding: 12,
    marginBottom: 2,
    alignItems: 'center',
    width: '100%',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 1px 1px rgba(0,0,0,0.05)' }
      : {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 1,
        }
    ),
    elevation: 1,
  },
  cardLarge: {
    padding: 16, 
  },
  cardLeft: { flex: 1, marginRight: 8 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#000', marginBottom: 4 },
  cardProgressText: { fontSize: 13, color: '#8E8E93', marginBottom: 4 },
  progressBarTrack: { 
    height: 4, 
    backgroundColor: '#E5E5EA', 
    borderRadius: 2,
    overflow: 'hidden'
  },
  progressBarFill: { 
    height: '100%', 
    backgroundColor: '#007AFF' 
  },
  buttonGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewButton: {
    backgroundColor: '#FF9500', 
    borderRadius: 6, 
    paddingVertical: 6,
    paddingHorizontal: 8,
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  quizButton: { 
    backgroundColor: '#007AFF', 
    borderRadius: 6, 
    paddingVertical: 6,
    paddingHorizontal: 8,
    width: 60,
    alignItems: 'center',
    justifyContent: 'center'
  },
  quizButtonLarge: {
    width: 100, 
    height: 50,  
    borderRadius: 8,
  },
  quizButtonText: { 
    color: '#fff', 
    fontSize: 14, 
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 18,
  },
  quizButtonTextLarge: {
    fontSize: 18, 
    lineHeight: 22,
  },
  disabledButton: {
    backgroundColor: '#C7C7CC',
  },
});

export default HomeScreen;

