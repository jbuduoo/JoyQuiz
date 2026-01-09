# Android Debug 流程與修復記錄

## 板本用市面上穩定的板本。
-  環境參數：目前專案所使用的穩定版本清單。
## 開啟apk除錯模式。

## 手機用開發者模式。
為什麼會閃退？
因為 Debug APK 必須配合 Metro 運作。請確認以下步驟：
啟動 Metro：在你的電腦終端機執行：
    npx expo start
確保手機連線：
執行你之前成功的反向代理指令：
    C:\Users\wits\Downloads\platform-tools\adb.exe reverse tcp:8081 tcp:8081
重新打開 App：這時你應該會看到手機螢幕顯示 Loading... 或 Bundling... 的進度條。
如果你想要抓到真正的閃退原因，請這樣做：
目前 Log 太亂了，請在你的 PowerShell 執行以下「清理並抓取」指令：
清除舊日誌：
    C:\Users\wits\Downloads\platform-tools\adb.exe logcat -c
開啟 App 直到它閃退。
抓取崩潰專用日誌：
    C:\Users\wits\Downloads\platform-tools\adb.exe logcat *:E | Select-String "AndroidRuntime", "FATAL", "com.jbuduoo.joyquiz"
💡
除錯工具：常用的 adb 指令與抓取 Log 的方法。
## 2. 運行期錯誤 (Runtime Crashes)

### 問題 E: AdMob 初始化崩潰 (已修復)
*   **錯誤日誌**: `java.lang.IllegalStateException: Invalid application ID.`
*   **原因**: 缺少 AdMob App ID。
*   **解決方案**: 在 `AndroidManifest.xml` 加入 `<meta-data>` 並使用 `tools:replace="android:value"`。

### 問題 F: 原生庫缺失 (libreact_featureflagsjni.so) - 最終標準提取方案
*   **錯誤日誌**: `com.facebook.soloader.SoLoaderDSONotFoundError: couldn't find DSO to load: libreact_featureflagsjni.so`
*   **原因**: React Native 0.81.5 引入了新的核心組件。在 Android 14+ 設備上，必須讓 OS 執行解壓動作，並確保 SoLoader 不進入 Exo/Legacy 模式。
*   **解決方案**: 
    1. 在 `android/gradle.properties` 設置 `expo.useLegacyPackaging=false`。
    2. 在 `AndroidManifest.xml` 的 `<application>` 標籤中設置 `android:extractNativeLibs="true"`。
    3. 在 `MainApplication.kt` 中將 `SoLoader.init(this, false)` 保持為 `false`。
    4. **關鍵**：安裝前必須先「手動解除安裝」舊版 App，否則系統不會執行 `extractNativeLibs` 的動作。

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
這代表 adb 反向代理已成功建立！現在你的手機已經可以透過 USB 連接線讀取到電腦上的 Metro 服務了。
接下來請按照以下步驟操作：
1. 啟動 Metro 服務
在電腦終端機執行：
npx expo start
（如果之前已經在跑了，請按 r 重啟）
2. 開啟手機上的 App
在手機上點開剛剛安裝的 Debug APK。
如果連線成功：你會看到手機螢幕開始加載 JS Bundle。
如果 JS 有錯：手機螢幕會直接彈出紅色警告視窗。
3. 查看 Log 記錄
如果你想在電腦上看到詳細的錯誤日誌（尤其是閃退時的原生錯誤），請執行：

---

## 4. 當前穩定環境配置
*   **Node.js**: 22
*   **JDK**: 21
*   **Gradle**: 8.13
*   **AGP**: 8.11.0
*   **Android SDK**: 36
*   **Kotlin**: 2.1.20
