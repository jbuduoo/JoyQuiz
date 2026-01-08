# Android Debug 流程與修復記錄

本文件記錄了 React Native 0.81.5 與 Expo 54 專案在 Android 編譯及運行過程中遇到的問題與解決方案。

## 1. 編譯期錯誤 (Build Errors)

### 問題 A: Node.js 版本過低
*   **錯誤訊息**: `TypeError: configs.toReversed is not a function`
*   **原因**: `toReversed()` 是 Node.js 20+ 才支援的語法，GitHub Actions 預設使用的 Node 18 不支援。
*   **解決方案**: 更新 `.github/workflows/android_build.yml`，將 `node-version` 提升至 `22`。

### 問題 B: Expo Gradle 插件相容性
*   **錯誤訊息**: `Unresolved reference 'extensions'` 或 `Unresolved reference 'extra'`
*   **原因**: Expo 54 的內部插件使用了 Gradle 8.8+ 已移除的內部 API。
*   **解決方案**: 在 `android/settings.gradle` 中加入熱修復腳本，動態將 `extra` 替換為 `extensions.extraProperties`。

### 問題 C: Gradle 與 AGP 版本不匹配
*   **錯誤訊息**: `Minimum supported Gradle version is 8.13. Current version is 8.10.2.`
*   **原因**: React Native 0.81.5 使用的 Android Gradle Plugin (AGP) 8.11.0 需要更高版本的 Gradle。
*   **解決方案**: 
    *   `gradle-wrapper.properties` 升級至 `8.13`。
    *   `android/build.gradle` 指定 AGP 為 `8.11.0`。
    *   CI 環境升級至 **JDK 21**。

### 問題 D: 自動連結 (Autolinking) 找不到封裝名稱
*   **錯誤訊息**: `Could not find project.android.packageName in react-native config output!`
*   **原因**: React Native CLI 無法從 Gradle 檔案中自動偵測 `packageName`。
*   **解決方案**: 
    *   在 `android/app/src/main/AndroidManifest.xml` 補上 `package="com.jbuduoo.joyquiz"`。
    *   建立 `react-native.config.js` 並指定 `sourceDir: './android'`。

---

## 2. 運行期錯誤 (Runtime Crashes)

### 問題 E: AdMob 初始化崩潰 (閃退主因)
*   **錯誤日誌**: 
    ```
    java.lang.RuntimeException: Unable to get provider com.google.android.gms.ads.MobileAdsInitProvider: 
    java.lang.IllegalStateException: Invalid application ID.
    ```
*   **原因**: `react-native-google-mobile-ads` 要求在 `AndroidManifest.xml` 中必須有 `APPLICATION_ID` 的元數據。
*   **解決方案**: 在 `AndroidManifest.xml` 的 `<application>` 標籤中手動加入：
    ```xml
    <meta-data
        android:name="com.google.android.gms.ads.APPLICATION_ID"
        android:value="ca-app-pub-2743734879673730~8116708793"/>
    ```

---

## 3. 常用除錯指令

### 反向代理 (使手機連上 Metro)
```powershell
C:\Users\wits\Downloads\platform-tools\adb.exe reverse tcp:8081 tcp:8081
```

### 抓取崩潰日誌
```powershell
C:\Users\wits\Downloads\platform-tools\adb.exe logcat *:E | Select-String "AndroidRuntime", "FATAL", "com.jbuduoo.joyquiz"
```

### 清理 Gradle 快取
```powershell
cd android
./gradlew clean
cd ..
```

---

## 4. 當前穩定環境配置
*   **Node.js**: 22
*   **JDK**: 21
*   **Gradle**: 8.13
*   **AGP**: 8.11.0
*   **Android SDK**: 36
*   **Kotlin**: 2.1.20
