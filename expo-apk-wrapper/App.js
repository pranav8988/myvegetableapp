import React, { useRef, useState, useEffect } from 'react';
import {
  StyleSheet,
  SafeAreaView,
  StatusBar,
  BackHandler,
  Platform,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';

// Production Cloud / GitHub Pages live URL (with offline local IP support)
const DEFAULT_URL = 'https://pranav8988.github.io/myvegetableapp/';

// Bridge polyfills for Android WebView: Injects native Web Share API and Download hooks
const INJECTED_BRIDGE_JS = `
  (function() {
    // 1. Polyfill navigator.share for native Android share sheet with images
    window.navigator.canShare = function() { return true; };
    window.navigator.share = function(data) {
      return new Promise(function(resolve, reject) {
        try {
          if (data && data.files && data.files.length > 0) {
            var file = data.files[0];
            var reader = new FileReader();
            reader.onload = function() {
              if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'SHARE_FILE',
                  dataUrl: reader.result,
                  filename: file.name || 'Invoice.png',
                  title: data.title || 'Invoice Receipt'
                }));
              }
              resolve();
            };
            reader.onerror = function(e) { reject(e); };
            reader.readAsDataURL(file);
          } else {
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'SHARE_TEXT',
                text: data.text || '',
                title: data.title || 'Invoice'
              }));
            }
            resolve();
          }
        } catch (err) {
          reject(err);
        }
      });
    };

    // 2. Intercept download anchor clicks for native mobile saving
    document.addEventListener('click', function(e) {
      var target = e.target.closest('a[download]');
      if (target && target.href) {
        var href = target.href;
        var downloadName = target.getAttribute('download') || 'download';
        if (href.startsWith('data:') || href.startsWith('blob:')) {
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'DOWNLOAD_FILE',
              url: href,
              filename: downloadName
            }));
          }
        }
      }
    }, true);
  })();
  true;
`;

export default function App() {
  const webViewRef = useRef(null);
  const [currentUrl, setCurrentUrl] = useState(DEFAULT_URL);
  const [inputUrl, setInputUrl] = useState(DEFAULT_URL);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Handle Android Hardware Back Button navigation
  useEffect(() => {
    if (Platform.OS === 'android') {
      const onBackPress = () => {
        if (webViewRef.current && !hasError) {
          webViewRef.current.goBack();
          return true;
        }
        return false;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }
  }, [hasError]);

  // Handle messages from Web App (Sharing, Downloads, Printing)
  const handleMessage = async (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      if (data.type === 'SHARE_FILE' || data.type === 'DOWNLOAD_FILE') {
        const { dataUrl, filename, title } = data;
        if (!dataUrl) return;

        // Parse base64 content
        let base64Data = dataUrl;
        if (dataUrl.includes('base64,')) {
          base64Data = dataUrl.split('base64,')[1];
        }

        const safeFilename = filename || `Receipt-${Date.now()}.png`;
        const fileUri = `${FileSystem.cacheDirectory}${safeFilename}`;

        // Write file to device cache
        await FileSystem.writeAsStringAsync(fileUri, base64Data, {
          encoding: FileSystem.EncodingType.Base64,
        });

        // Trigger native Android Share & Save sheet
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, {
            mimeType: safeFilename.endsWith('.xlsx')
              ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
              : 'image/png',
            dialogTitle: title || `Save / Share ${safeFilename}`,
            UTI: safeFilename.endsWith('.xlsx')
              ? 'com.microsoft.excel.xlsx'
              : 'public.png',
          });
        } else {
          Alert.alert('File Saved', `Saved to ${fileUri}`);
        }
      } else if (data.type === 'SHARE_TEXT') {
        if (await Sharing.isAvailableAsync()) {
          const tempTextFile = `${FileSystem.cacheDirectory}invoice_summary.txt`;
          await FileSystem.writeAsStringAsync(tempTextFile, data.text || '');
          await Sharing.shareAsync(tempTextFile, {
            mimeType: 'text/plain',
            dialogTitle: data.title || 'Share Invoice',
          });
        }
      } else if (data.type === 'PRINT') {
        if (data.html) {
          await Print.printAsync({ html: data.html });
        }
      }
    } catch (err) {
      console.warn('Native message handling error:', err);
    }
  };

  const handleConnect = () => {
    let formatted = inputUrl.trim();
    if (!formatted.startsWith('http://') && !formatted.startsWith('https://')) {
      formatted = 'https://' + formatted;
    }
    setHasError(false);
    setIsLoading(true);
    setCurrentUrl(formatted);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#059669" />

      {/* Main WebView */}
      {!hasError ? (
        <View style={styles.webContainer}>
          <WebView
            ref={webViewRef}
            source={{ uri: currentUrl }}
            style={styles.webview}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            scalesPageToFit={true}
            allowsInlineMediaPlayback={true}
            allowFileAccess={true}
            allowFileAccessFromFileURLs={true}
            allowUniversalAccessFromFileURLs={true}
            injectedJavaScriptBeforeContentLoaded={INJECTED_BRIDGE_JS}
            injectedJavaScript={INJECTED_BRIDGE_JS}
            onMessage={handleMessage}
            originWhitelist={['*']}
            mixedContentMode="always"
            cacheEnabled={false}
            incognito={false}
            onLoadStart={() => setIsLoading(true)}
            onLoadEnd={() => setIsLoading(false)}
            onError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              setHasError(true);
              setErrorMessage(nativeEvent.description || 'Unable to connect to server');
              setIsLoading(false);
            }}
            onHttpError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              setHasError(true);
              setErrorMessage(`HTTP Error: ${nativeEvent.statusCode}`);
              setIsLoading(false);
            }}
            renderLoading={() => (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color="#059669" />
                <Text style={styles.loadingText}>Loading VEGI BILLING APP...</Text>
              </View>
            )}
          />
        </View>
      ) : (
        /* Connection Error & IP Configuration Screen */
        <View style={styles.errorContainer}>
          <View style={styles.errorCard}>
            <Text style={styles.errorIcon}>🥬</Text>
            <Text style={styles.errorTitle}>VEGI BILLING APP</Text>
            <Text style={styles.errorSubtitle}>Connection Settings</Text>

            <View style={styles.warningBox}>
              <Text style={styles.warningText}>
                {errorMessage || 'Cannot connect to server.'}
              </Text>
            </View>

            <Text style={styles.inputLabel}>Server URL / IP Address:</Text>
            <TextInput
              style={styles.input}
              value={inputUrl}
              onChangeText={setInputUrl}
              placeholder="e.g. https://pranav8988.github.io/myvegetableapp/"
              placeholderTextColor="#94a3b8"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />

            <TouchableOpacity style={styles.connectButton} onPress={handleConnect}>
              <Text style={styles.connectButtonText}>Connect & Open App</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => {
                setHasError(false);
                setIsLoading(true);
              }}
            >
              <Text style={styles.retryButtonText}>Retry Default URL</Text>
            </TouchableOpacity>

            <Text style={styles.helpText}>
              💡 Tip: The app loads your live cloud store on GitHub Pages. You can also connect to a local development IP if testing locally.
            </Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#059669',
  },
  webContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  webview: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#059669',
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  errorCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: 0.5,
  },
  errorSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 16,
  },
  warningBox: {
    width: '100%',
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 16,
  },
  warningText: {
    fontSize: 11,
    color: '#b91c1c',
    textAlign: 'center',
    fontWeight: '500',
  },
  inputLabel: {
    alignSelf: 'flex-start',
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  input: {
    width: '100%',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0f172a',
    backgroundColor: '#f8fafc',
    marginBottom: 16,
  },
  connectButton: {
    width: '100%',
    backgroundColor: '#059669',
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  connectButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  retryButton: {
    width: '100%',
    backgroundColor: '#f1f5f9',
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  retryButtonText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '600',
  },
  helpText: {
    fontSize: 10.5,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 15,
  },
});
