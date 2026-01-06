import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Platform, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

const SettingsScreen = () => {
  const navigation = useNavigation();
  const [showDisclaimer, setShowDisclaimer] = React.useState(false);
  const [showCooperation, setShowCooperation] = React.useState(false);

  if (showDisclaimer) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => setShowDisclaimer(false)}
          >
            <Text style={styles.headerButtonText}>返回</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>免責聲明</Text>
          <View style={styles.headerRight} />
        </View>
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
          <Text style={styles.title}>【免責聲明與資訊來源聲明】</Text>
          
          <Text style={styles.sectionTitle}>非官方代表：</Text>
          <Text style={styles.paragraph}>本 App 為私人開發之學習工具，不代表任何政府機關。</Text>
          
          <Text style={styles.sectionTitle}>題庫來源：</Text>
          <Text style={styles.paragraph}>
            引用自電子政府採購網 公開題庫（
            <Text 
              style={styles.link} 
              onPress={() => Linking.openURL('https://web.pcc.gov.tw/psms/plrtqdm/questionPublic/indexReadQuestion')}
            >
              https://web.pcc.gov.tw/psms/plrtqdm/questionPublic/indexReadQuestion
            </Text>
            ）。
          </Text>
          
          <Text style={styles.sectionTitle}>AI 解析說明：</Text>
          <Text style={styles.paragraph}>
            本程式之題目詳解部分由 AI 技術自動產出，旨在輔助理解。AI 內容可能包含錯誤，其正確性請使用者自行判斷。如有任何疑義，請以官方公布之法規條文與解釋函令為最終依據。
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
            <Text style={styles.headerButtonText}>返回</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>名師合作</Text>
          <View style={styles.headerRight} />
        </View>
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
          <Text style={styles.title}>【名師/內容合作計劃】</Text>
          
          <Text style={styles.paragraph}>
            您是專業講師或內容創作者嗎？「樂題庫」誠邀各類考試（公職、證照、升學）名師共同開發！
          </Text>
          
          <Text style={styles.sectionTitle}>為什麼選擇與我們合作？</Text>
          <Text style={styles.paragraph}>• 專業開發團隊：為您的題庫量身打造流暢的數位練習體驗。</Text>
          <Text style={styles.paragraph}>• AI 輔助技術：結合生成式 AI 輔助詳解，縮短教材製作週期。</Text>
          <Text style={styles.paragraph}>• 精準用戶群：與數萬名考生直接建立連結。</Text>
          
          <Text style={styles.sectionTitle}>目前熱徵科目：</Text>
          <Text style={styles.paragraph}>法學緒論、行政法、會計學、醫護證照等各類專業學門。</Text>
          
          <Text style={styles.sectionTitle}>立即洽詢：</Text>
          <Text style={styles.paragraph}>
            Email: <Text style={styles.link} onPress={() => Linking.openURL('mailto:jbubuoo@gmail.com')}>jbubuoo@gmail.com</Text>
            {"\n"}
            Line: <Text style={styles.link} onPress={() => Linking.openURL('https://line.me/ti/p/~jbud')}>jbud</Text>
          </Text>
          <Text style={styles.paragraph}>我們將於 3 個工作天內由專人與您聯繫。</Text>
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
          <Text style={styles.headerButtonText}>返回</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>設定</Text>
        <View style={styles.headerRight} />
      </View>
      <View style={styles.container}>
        <TouchableOpacity 
          style={styles.item} 
          onPress={() => setShowDisclaimer(true)}
        >
          <Text style={styles.itemText}>政府資訊來源與免責聲明</Text>
          <Text style={styles.itemArrow}>▶</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.item} 
          onPress={() => setShowCooperation(true)}
        >
          <Text style={styles.itemText}>名師/內容合作計劃</Text>
          <Text style={styles.itemArrow}>▶</Text>
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
    fontSize: 16,
  },
  backButton: {
    width: 60,
  },
  headerRight: {
    width: 60,
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
  itemText: {
    fontSize: 16,
    color: '#000',
  },
  itemArrow: {
    fontSize: 14,
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
