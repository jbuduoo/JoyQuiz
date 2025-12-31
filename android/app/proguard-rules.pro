# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# react-native-reanimated
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# React Native 核心規則
-keep class com.facebook.react.** { *; }
-keep class com.facebook.soloader.** { *; }
-keep class com.facebook.yoga.** { *; }
-keep class com.facebook.stacktrace.** { *; }
-keep class com.facebook.hermes.unicode.** { *; }
-keep class com.facebook.jni.** { *; }

# Expo 模組規則
-keep class expo.modules.** { *; }
-keep class com.google.android.gms.internal.** { *; }

# 忽略警告（有些庫可能引用了不存在的類）
-dontwarn com.facebook.react.**
-dontwarn com.google.android.gms.**
-dontwarn expo.modules.**

# 保持原生方法
-keepclasseswithmembernames class * {
    native <methods>;
}

# 保持 BuildConfig
-keep class com.jbuduoo.joyquiz.BuildConfig { *; }
