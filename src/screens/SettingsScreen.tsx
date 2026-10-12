import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StorageService } from '../services/StorageService';
import { UserSettings } from '../types';

const SOURCE_URL = 'https://web.pcc.gov.tw/psms/plrtqdm/questionPublic/indexReadQuestion';
const CONTACT_EMAIL = 'jbubuoo@gmail.com';
const CONTACT_LINE_URL = 'https://line.me/ti/p/~jbud';
const FONT_SIZE_OPTIONS: { label: string; value: UserSettings['fontSize'] }[] = [
  { label: '標準', value: 'medium' },
  { label: '大', value: 'large' },
  { label: '特大', value: 'xlarge' },
];

const SettingsScreen = () => {
  const navigation = useNavigation();
  const [showDisclaimer, setShowDisclaimer] = React.useState(false);
  const [showCooperation, setShowCooperation] = React.useState(false);
  const [settings, setSettings] = React.useState<UserSettings>({ theme: 'light', fontSize: 'medium' });

  React.useEffect(() => {
    StorageService.getSettings().then(setSettings);
  }, []);

  const updateFontSize = async (fontSize: UserSettings['fontSize']) => {
    const nextSettings = { ...settings, fontSize };
    setSettings(nextSettings);
    await StorageService.saveSettings(nextSettings);
  };

  if (showDisclaimer) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setShowDisclaimer(false)}
          >
            <Text style={styles.headerButtonText}>
              <Text style={styles.headerBackIcon}>‹</Text>
              {' 返回'}
            </Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>免責聲明</Text>
          <View style={styles.headerRight} />
        </View>
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
          <Text style={styles.title}>政府資訊來源與免責聲明</Text>

          <Text style={styles.sectionTitle}>資料來源</Text>
          <Text style={styles.paragraph}>
            本 App 題目內容參考政府公開資料、公開法規資訊及相關學習資料整理，提供練習與複習使用。
          </Text>

          <Text style={styles.sectionTitle}>官方資料</Text>
          <Text style={styles.paragraph}>
            政府電子採購網公開題庫：
            <Text style={styles.link} onPress={() => Linking.openURL(SOURCE_URL)}>
              {SOURCE_URL}
            </Text>
          </Text>

          <Text style={styles.sectionTitle}>使用提醒</Text>
          <Text style={styles.paragraph}>
            題目、答案與解析可能因法規修正、資料更新或整理過程而有所差異。正式判斷請以主管機關最新公告、最新法規條文及正式考試資訊為準。
          </Text>

          <Text style={styles.sectionTitle}>AI 解析說明</Text>
          <Text style={styles.paragraph}>
            部分詳答由 AI 協助整理，用於幫助理解題目脈絡。若發現答案或解析疑似有誤，歡迎使用題目頁面的「問題回報」協助修正。
          </Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (showCooperation) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setShowCooperation(false)}
          >
            <Text style={styles.headerButtonText}>
              <Text style={styles.headerBackIcon}>‹</Text>
              {' 返回'}
            </Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>內容合作</Text>
          <View style={styles.headerRight} />
        </View>
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
          <Text style={styles.title}>內容合作與回饋</Text>

          <Text style={styles.paragraph}>
            如果你是老師、講師、補教工作者，或手上有適合做成練習題的課程內容，歡迎聯絡討論合作。
          </Text>

          <Text style={styles.sectionTitle}>可合作方向</Text>
          <Text style={styles.paragraph}>
            題庫整理、詳解校正、課程測驗、證照考試、公司內訓、學習工具設計，或其他適合用題庫方式練習的內容。
          </Text>

          <Text style={styles.sectionTitle}>題目回饋</Text>
          <Text style={styles.paragraph}>
            如果只是發現題目、答案或解析疑似有誤，也歡迎透過題目頁面的「問題回報」協助修正。
          </Text>

          <Text style={styles.sectionTitle}>聯絡方式</Text>
          <Text style={styles.paragraph}>
            Email:{' '}
            <Text style={styles.link} onPress={() => Linking.openURL(`mailto:${CONTACT_EMAIL}`)}>
              {CONTACT_EMAIL}
            </Text>
            {'\n'}
            Line:{' '}
            <Text style={styles.link} onPress={() => Linking.openURL(CONTACT_LINE_URL)}>
              jbud
            </Text>
          </Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.headerButtonText}>
            <Text style={styles.headerBackIcon}>‹</Text>
            {' 返回'}
          </Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>設定</Text>
        <View style={styles.headerRight} />
      </View>
      <View style={styles.container}>
        <View style={styles.settingBlock}>
          <Text style={styles.settingLabel}>題目與詳答文字大小</Text>
          <View style={styles.segmentedControl}>
            {FONT_SIZE_OPTIONS.map(option => {
              const isActive = settings.fontSize === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.segmentButton, isActive && styles.segmentButtonActive]}
                  onPress={() => updateFontSize(option.value)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.segmentText, isActive && styles.segmentTextActive]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <TouchableOpacity
          style={styles.item}
          onPress={() => setShowDisclaimer(true)}
        >
          <Text style={styles.itemText}>政府資訊來源與免責聲明</Text>
          <Text style={styles.itemArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.item}
          onPress={() => setShowCooperation(true)}
        >
          <Text style={styles.itemText}>內容合作與回饋</Text>
          <Text style={styles.itemArrow}>›</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#007AFF' },
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  header: {
    height: 50,
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
  },
  headerBackIcon: {
    fontSize: 24,
    lineHeight: 24,
  },
  backButton: {
    width: 82,
    minHeight: 38,
    justifyContent: 'center',
  },
  headerRight: {
    width: 82,
  },
  content: {
    padding: 20,
  },
  item: {
    backgroundColor: '#fff',
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  settingBlock: {
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 12,
  },
  settingLabel: {
    fontSize: 16,
    color: '#000',
    marginBottom: 10,
    fontWeight: '500',
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#E5E5EA',
    borderRadius: 8,
    padding: 2,
  },
  segmentButton: {
    flex: 1,
    minHeight: 36,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentButtonActive: {
    backgroundColor: '#007AFF',
  },
  segmentText: {
    color: '#3A3A3C',
    fontSize: 15,
    fontWeight: '500',
  },
  segmentTextActive: {
    color: '#fff',
  },
  itemText: {
    fontSize: 16,
    color: '#000',
  },
  itemArrow: {
    fontSize: 20,
    color: '#8E8E93',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#000',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    color: '#000',
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 24,
    color: '#3A3A3C',
    marginBottom: 8,
  },
  link: {
    color: '#007AFF',
    textDecorationLine: 'underline',
  },
});

export default SettingsScreen;
