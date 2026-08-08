# 📱 VEGI BILLING APP — Expo Android APK Build Guide

This directory (`expo-apk-wrapper`) contains everything ready to build your **`VEGI BILLING APP` Android APK** using Expo and EAS Build.

---

## 🚀 Quick Start Commands (Build APK in 3 Steps)

### Step 1: Install Dependencies
Open your PowerShell/Terminal in this folder:
```powershell
cd "d:\Trail websites\my vegetable manager app(2)\expo-apk-wrapper"
npm install
```

### Step 2: Configure EAS CLI & Login
```powershell
npm install -g eas-cli
eas login
```
*(If you don't have a free Expo account, create one at [expo.dev](https://expo.dev/signup) in 1 minute)*

### Step 3: Run the APK Cloud Build Command
```powershell
eas build -p android --profile preview
```

Expo's cloud builders will compile the Android package. When finished, you will get:
1. A **direct `.apk` download link**.
2. A **QR code** you can scan on your Android phone to install the app directly!

---

## ⚙️ Configuration Details

- **App Name on Home Screen**: `VEGI BILLING APP`
- **Package Name**: `com.vegimanager.vegibillingapp`
- **Icon**: Located at `assets/logo.png`
- **Output Format**: Direct standalone `.apk` (no Google Play Store account required).
