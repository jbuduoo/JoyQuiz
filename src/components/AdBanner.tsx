import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Constants from 'expo-constants';

const AdBanner = ({ style }: { style?: any }) => {
  const isExpoGo = Constants.appOwnership === 'expo';

  if (isExpoGo) {
    // 在 Expo Go 中顯示佔位符，避免引用原生組件
    return (
      <View style={[styles.container, style, { height: 50, justifyContent: 'center' }]}>
        <Text style={{ color: '#ccc', fontSize: 10 }}>廣告區域 (Expo Go 隱藏)</Text>
      </View>
    );
  }

  try {
    const ads = require('react-native-google-mobile-ads');
    const { BannerAd, BannerAdSize, TestIds } = ads;
    
    // 判斷是否為 AAB 正式打包模式
    const isProdMode = process.env.EXPO_PUBLIC_AD_MODE === 'production';
    
    // 只有在非開發環境且環境變數為 production 時才使用正式 ID
    const adUnitId = (!__DEV__ && isProdMode) 
      ? 'ca-app-pub-2743734879673730/8352690129' 
      : TestIds.ADAPTIVE_BANNER;

    return (
      <View style={[styles.container, style]}>
        <BannerAd
          unitId={adUnitId}
          size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        />
      </View>
    );
  } catch (e) {
    return null;
  }
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
});

export default AdBanner;
