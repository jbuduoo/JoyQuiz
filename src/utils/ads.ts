import Constants from 'expo-constants';

export const initAds = () => {
  // 檢查是否為 Expo Go 環境
  const isExpoGo = Constants.appOwnership === 'expo';
  
  if (isExpoGo) {
    console.log('運行於 Expo Go，自動跳過 AdMob 初始化');
    return;
  }

  try {
    const mobileAds = require('react-native-google-mobile-ads').default;
    mobileAds()
      .initialize()
      .then(() => {
        // 初始化完成
      });
  } catch (e) {
    console.log('AdMob 初始化失敗，可能缺少原生模組', e);
  }
};
