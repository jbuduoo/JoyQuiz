//答題頁
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Alert, SafeAreaView, useWindowDimensions, Platform, Linking } from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation';
import { UserAnswer, ViewMode } from '../types';
import { StorageService } from '../services/StorageService';

type QuizScreenRouteProp = RouteProp<RootStackParamList, 'Quiz'>;

const QuizScreen = () => {
  const route = useRoute<QuizScreenRouteProp>();
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  
  // 從導航參數解構出必要的資料
  const { 
    questions: allQuestions, // 傳入的所有題目
    title,                    // 題庫標題
    startIndex = 0,           // 起始題號索引
    viewMode = ViewMode.QUIZ  // 進入模式：QUIZ(測驗), FAVORITE(最愛), WRONG(錯題), MOCK(模擬), REVIEW(檢視)
  } = route.params || { questions: [], title: '測驗', viewMode: ViewMode.QUIZ };

  const [currentIndex, setCurrentIndex] = useState(0); // 當前題目在列表中的索引
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]); // 複選題選中的選項
  const [isSubmitted, setIsSubmitted] = useState(false); // 當前題目是否已提交答案
  const [userStatus, setUserStatus] = useState<Record<string, UserAnswer>>({}); // 用戶所有題目的作答狀態(收藏、錯題數等)
  const [isLoaded, setIsLoaded] = useState(false); // 頁面是否已完成初始載入
  
  // useRef 用於在渲染之間保存不觸發重繪的值
  const lastQuestionId = useRef<string | null>(null); // 紀錄上一題 ID，偵測是否切換題目
  const initialQuestionIds = useRef<string[] | null>(null); // 在 FAVORITE/WRONG 模式下，固定初始的題目清單，避免作答後題目消失

  const isLargeScreen = width > 768;
  const contentWidth = isLargeScreen ? 800 : '100%';

  /**
   * 載入用戶狀態並初始化當前索引
   * 這裡處理了不同模式下，該從哪一題開始練習的邏輯
   */
  const loadUserStatus = async () => {
    const status = await StorageService.getUserAnswers();
    setUserStatus(status);
    
    if (!isLoaded) {
      let initialIdx = startIndex;
      
      const isReQuiz = viewMode === ViewMode.QUIZ && startIndex === 0;

      // 進度恢復邏輯：
      // 如果不是重新測驗，則從 Storage 讀取該模式該分類的最後練習位置
      if (!isReQuiz) {
        const progress = await StorageService.getProgress();
        const progressKey = viewMode === ViewMode.QUIZ ? title : `${viewMode}_${title}`;
        const savedIndex = progress[progressKey];
        if (savedIndex !== undefined) {
          initialIdx = savedIndex;
        }
      }

      // 特殊模式 (最愛、錯題) 的初始化：
      // 在進入時就過濾並固定題目 ID，這樣在練習過程中取消最愛或答對錯題，題目不會立刻從清單消失造成閃爍
      if (viewMode === ViewMode.FAVORITE || viewMode === ViewMode.WRONG) {
        const filteredQuestions = allQuestions.filter(q => {
          const s = status[q.id];
          if (viewMode === ViewMode.FAVORITE) return s?.isFavorite;
          if (viewMode === ViewMode.WRONG) return s && s.isAnswered && !s.isCorrect;
          return false;
        });
        initialQuestionIds.current = filteredQuestions.map(q => q.id);
        
        // 防呆：如果記錄的索引超過了過濾後的清單長度，則從第 0 題開始
        if (initialIdx >= filteredQuestions.length && filteredQuestions.length > 0) {
          initialIdx = 0;
        }
      } else {
        // 一般測驗模式下的防呆檢查
        if (initialIdx >= allQuestions.length && allQuestions.length > 0) {
          initialIdx = 0;
        }
      }
      
      setCurrentIndex(initialIdx);
      setIsLoaded(true);
    }
  };

  useEffect(() => {
    loadUserStatus();
  }, []);

  /**
   * 根據不同模式過濾出當前要練習的題目清單
   */
  const computedQuestions = useMemo(() => {
    if (!isLoaded) return [];

    switch (viewMode) {
      case ViewMode.FAVORITE:
      case ViewMode.WRONG:
        // 如果已固定 ID 清單，則從所有題目中挑出這些 ID 的題目
        if (initialQuestionIds.current) {
          return allQuestions.filter(q => initialQuestionIds.current!.includes(q.id));
        }
        // 若未固定（例如載入中），則即時過濾
        return allQuestions.filter(q => {
          const status = userStatus[q.id];
          if (viewMode === ViewMode.FAVORITE) return status?.isFavorite;
          return status && status.isAnswered && !status.isCorrect;
        });
      
      case ViewMode.REVIEW:
        // 檢視模式：只看「曾經作答過」的題目
        return allQuestions.filter(q => userStatus[q.id]?.isAnswered);
      
      case ViewMode.MOCK:
        // 模擬測驗：直接使用傳入的隨機 50 題 (在 HomeScreen 已隨機化)
        return allQuestions;

      case ViewMode.QUIZ:
      default:
        // 標準模式：顯示分類下的所有題目
        return allQuestions;
    }
  }, [viewMode, allQuestions, userStatus, isLoaded]);

  const currentQuestion = computedQuestions[currentIndex];

  /**
   * 題目切換時的自動處理：
   * 1. 清除/顯示舊的作答狀態
   * 2. 自動儲存當前進度
   */
  useEffect(() => {
    if (currentQuestion) {
      const isNewQuestion = lastQuestionId.current !== currentQuestion.id;
      
      if (isNewQuestion) {
        lastQuestionId.current = currentQuestion.id;
        
        const status = userStatus[currentQuestion.id];
        // 只有在 REVIEW (檢視) 模式下，切換題目時才會自動顯示之前的作答結果
        // 其他模式（測驗、錯題等）則保持未提交狀態，讓用戶重新思考
        const shouldShowOldAnswer = viewMode === ViewMode.REVIEW;

        if (status?.isAnswered && shouldShowOldAnswer) {
          setIsSubmitted(true);
          if (currentQuestion.Type === '複選題') {
            setSelectedAnswers(status.selectedAnswer?.split(',') || []);
          }
        } else {
          setIsSubmitted(false);
          setSelectedAnswers([]);
        }
      }
      
      // 進度記憶：只要不是檢視模式，切換題目就會立刻記錄當前索引，方便下次「繼續測驗」
      if (viewMode !== ViewMode.REVIEW) {
        const progressKey = viewMode === ViewMode.QUIZ ? title : `${viewMode}_${title}`;
        StorageService.saveProgress(progressKey, currentIndex);
      }
    }
  }, [currentIndex, currentQuestion, userStatus, viewMode, title, startIndex]);

  const handleOptionPress = (option: string) => {
    // REVIEW 模式禁用點擊
    if (viewMode === ViewMode.REVIEW) return;
    
    if (isSubmitted && currentQuestion.Type !== '複選題') return;

    if (currentQuestion.Type === '複選題') {
      setSelectedAnswers(prev => 
        prev.includes(option) ? prev.filter(a => a !== option) : [...prev, option].sort()
      );
    } else {
      const isCorrect = option === currentQuestion.Ans;
      submitAnswer(option, isCorrect);
    }
  };

  /**
   * 提交答案並儲存至 Storage
   */
  const submitAnswer = async (answer: string, isCorrect: boolean) => {
    setIsSubmitted(true);
    const questionId = currentQuestion.id;
    const currentStatus = userStatus[questionId];
    
    // 儲存該題的作答結果 (是否正確、選了什麼、增加錯題計數)
    await StorageService.saveUserAnswer({
      questionId,
      isCorrect,
      isAnswered: true,
      selectedAnswer: answer,
      wrongCount: isCorrect ? (currentStatus?.wrongCount || 0) : (currentStatus?.wrongCount || 0) + 1,
    });
    
    // 在標準 QUIZ 模式下，如果作答的是「新題目」(索引大於已儲存的進度)，則更新該題庫的「主進度」
    if (viewMode === ViewMode.QUIZ) {
      const currentProgress = await StorageService.getProgress();
      const savedIndex = currentProgress[title] || 0;
      if (currentIndex + 1 > savedIndex) {
        await StorageService.saveProgress(title, currentIndex + 1);
      }
    }
    
    loadUserStatus(); // 重新載入狀態以更新 UI
  };

  const handleMultiSubmit = () => {
    const userAnswerStr = selectedAnswers.join(',');
    const isCorrect = userAnswerStr === currentQuestion.Ans;
    submitAnswer(userAnswerStr, isCorrect);
  };

  /**
   * 下一題邏輯：若已是最後一題，則觸發完成结算
   */
  const nextQuestion = () => {
    if (currentIndex < computedQuestions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      handleFinish();
    }
  };

  /**
   * 結算邏輯
   */
  const handleFinish = () => {
    // 檢視模式：不計算得分，直接回上一頁
    if (viewMode === ViewMode.REVIEW) {
      if (Platform.OS === 'web') {
        alert('您已完成檢視');
        navigation.goBack();
      } else {
        Alert.alert(
          '完成檢視',
          '您已完成檢視',
          [{ text: '確定', onPress: () => navigation.goBack() }]
        );
      }
      return;
    }

    // 計算得分
    const correctCount = computedQuestions.filter(q => userStatus[q.id]?.isCorrect).length;
    const totalCount = computedQuestions.length;
    const score = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
    
    const message = `答對題數：${correctCount}\n總題數：${totalCount}\n得分：${score} 分`;
    
    // 測驗完成後，將當前進度重置為 0 (下次進入從第一題開始)
    const progressKey = viewMode === ViewMode.QUIZ ? title : `${viewMode}_${title}`;
    StorageService.saveProgress(progressKey, 0);
    
    // 如果是主線 QUIZ 模式，則標記該分類為「已完成」，首頁會出現「檢視」按鈕
    if (viewMode === ViewMode.QUIZ) {
      StorageService.setCategoryCompleted(title);
    }

    if (Platform.OS === 'web') {
      alert(`測驗完成\n\n${message}`);
      navigation.goBack();
    } else {
      Alert.alert(
        '測驗完成',
        message,
        [{ text: '確定', onPress: () => navigation.goBack() }]
      );
    }
  };

  const prevQuestion = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const toggleFavorite = async () => {
    const questionId = currentQuestion.id;
    const isFavorite = !userStatus[questionId]?.isFavorite;
    await StorageService.saveUserAnswer({ questionId, isFavorite });
    loadUserStatus();
  };

  const handleReportIssue = () => {
    const instanceId = currentQuestion.id;
    const googleFormUrl = `https://docs.google.com/forms/d/e/1FAIpQLSfnfLFKCPYCRXbY12_xv5abVfvon_FTULBc0FYd4d7xD2A7ZQ/viewform?usp=pp_url&entry.654895695=${encodeURIComponent(instanceId)}`;
    Linking.openURL(googleFormUrl);
  };

  const handleSearchQuestion = () => {
    const optionsStr = ['A', 'B', 'C', 'D', 'E']
      .map(key => {
        const val = (currentQuestion as any)[key];
        return val ? `${key}.${val}` : '';
      })
      .filter(val => !!val)
      .join(' ');
    const query = encodeURIComponent(`${currentQuestion.content} ${optionsStr}`);
    const googleSearchUrl = `https://www.google.com/search?q=${query}`;
    Linking.openURL(googleSearchUrl);
  };

  if (!isLoaded) return <View style={styles.container}><Text>載入中...</Text></View>;
  if (!currentQuestion) return <View style={styles.container}><Text>查無題目</Text></View>;

  const options = ['A', 'B', 'C', 'D', 'E'].filter(key => !!(currentQuestion as any)[key]);
  const status = userStatus[currentQuestion.id];
  const isCorrect = status?.isCorrect;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.headerInner, isLargeScreen && { width: contentWidth, alignSelf: 'center' }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{title} ({viewMode})</Text>
          <Text style={styles.headerProgress}>{currentIndex + 1}/{computedQuestions.length}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={[
        styles.scrollContent,
        isLargeScreen && { width: contentWidth, alignSelf: 'center' }
      ]}>
        {/* Question */}
        <Text style={styles.questionText}>
          {currentIndex + 1}. {currentQuestion.content}
        </Text>

        {/* Options */}
        <View style={styles.optionsContainer}>
          {options.map((key) => {
            const optionContent = (currentQuestion as any)[key];
            const isSelected = currentQuestion.Type === '複選題' 
              ? selectedAnswers.includes(key)
              : (isSubmitted ? status?.selectedAnswer === key : false);
            
            const isCorrectAns = currentQuestion.Ans.split(',').includes(key);
            
            return (
              <TouchableOpacity 
                key={key} 
                style={[
                  styles.optionBtn,
                  !isSubmitted && isSelected && styles.optionSelected,
                  isSubmitted && isCorrectAns && styles.optionCorrect,
                  isSubmitted && !isCorrectAns && isSelected && styles.optionWrong,
                ]} 
                onPress={() => handleOptionPress(key)}
                disabled={(isSubmitted && currentQuestion.Type !== '複選題') || viewMode === ViewMode.REVIEW}
              >
                <Text style={styles.optionText}>({key}) {optionContent}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {currentQuestion.Type === '複選題' && !isSubmitted && viewMode !== ViewMode.REVIEW && (
          <TouchableOpacity style={styles.submitBtn} onPress={handleMultiSubmit}>
            <Text style={styles.submitBtnText}>提交答案</Text>
          </TouchableOpacity>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={handleSearchQuestion}>
            <Text style={styles.actionBtnText}>查詢問題</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={handleReportIssue}>
            <Text style={styles.actionBtnText}>問題回報</Text>
          </TouchableOpacity>
        </View>

        {/* Feedback */}
        {isSubmitted && (
          <View style={styles.feedbackCard}>
            <View style={styles.feedbackHeader}>
              <Text style={[styles.feedbackStatus, isCorrect ? styles.statusCorrect : styles.statusWrong]}>
                {isCorrect ? 'V 答對了' : 'X 答錯了'}
              </Text>
            </View>
            <Text style={styles.correctAnswerText}>正確答案：{currentQuestion.Ans}</Text>
            <Text style={styles.expText}>
              編號 {currentQuestion.questionNumber}: {currentQuestion.exp || '暫無詳解'}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={[styles.footerInner, isLargeScreen && { width: contentWidth, alignSelf: 'center' }]}>
          <TouchableOpacity 
            style={[styles.footerBtn, styles.btnPrev]} 
            onPress={prevQuestion}
            disabled={currentIndex === 0}
          >
            <Text style={styles.footerBtnText}>上一題</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.footerBtn, styles.btnFav]} 
            onPress={toggleFavorite}
          >
            <Ionicons 
              name={status?.isFavorite ? "heart" : "heart-outline"} 
              size={20} 
              color={status?.isFavorite ? "#ff4d4f" : "#fff"} 
              style={{ marginRight: 6 }}
            />
            <Text style={styles.footerBtnText}>最愛</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.footerBtn, styles.btnNext]} 
            onPress={nextQuestion}
          >
            <Text style={styles.footerBtnText}>
              {currentIndex === computedQuestions.length - 1 ? '完成' : '下一題'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { 
    backgroundColor: '#007bff', 
    paddingVertical: 10, 
    paddingHorizontal: 12 
  },
  headerInner: { flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: 8 },
  headerTitle: { flex: 1, color: '#fff', fontSize: 16, fontWeight: 'bold' },
  headerProgress: { color: '#fff', fontSize: 13 },
  scrollContent: { padding: 12, paddingBottom: 80 },
  questionText: { fontSize: 16, fontWeight: 'bold', marginBottom: 12, color: '#333' },
  optionsContainer: { marginBottom: 4 },
  optionBtn: { 
    backgroundColor: '#f8f9fa', 
    padding: 10, 
    borderRadius: 4, 
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#dee2e6'
  },
  optionSelected: { borderColor: '#007bff', backgroundColor: '#e7f1ff' },
  optionCorrect: { borderColor: '#28a745', backgroundColor: '#d4edda' },
  optionWrong: { borderColor: '#dc3545', backgroundColor: '#f8d7da' },
  optionText: { fontSize: 15, color: '#333' },
  submitBtn: { backgroundColor: '#007bff', padding: 10, borderRadius: 6, alignItems: 'center', marginBottom: 4 },
  submitBtnText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  actionButtonsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  actionBtn: { 
    flex: 0.48, 
    backgroundColor: '#f1f3f5', 
    paddingVertical: 4, 
    borderRadius: 6, 
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#dee2e6'
  },
  actionBtnText: { color: '#666', fontSize: 13, fontWeight: '500' },
  feedbackCard: { 
    backgroundColor: '#f8f9fa', 
    borderRadius: 6, 
    padding: 10, 
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#eee'
  },
  feedbackHeader: { marginBottom: 4 },
  feedbackStatus: { fontSize: 16, fontWeight: 'bold' },
  statusCorrect: { color: '#28a745' },
  statusWrong: { color: '#dc3545' },
  correctAnswerText: { fontSize: 15, color: '#666', marginBottom: 4 },
  expText: { fontSize: 14, color: '#444', lineHeight: 20 },
  footer: { 
    position: 'absolute', 
    bottom: 0, 
    left: 0, 
    right: 0, 
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    padding: 8,
  },
  footerInner: { flexDirection: 'row', justifyContent: 'space-between' },
  footerBtn: { 
    flex: 1, 
    height: 54,
    borderRadius: 6, 
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4
  },
  btnPrev: { backgroundColor: '#007bff' },
  btnFav: { backgroundColor: '#ffc107' },
  btnNext: { backgroundColor: '#007bff' },
  footerBtnText: { color: '#fff', fontSize: 15, fontWeight: 'bold' }
});

export default QuizScreen;

