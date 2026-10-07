package com.openprep.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.webkit.WebView;
import androidx.core.splashscreen.SplashScreen;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.WebViewListener;
import android.view.WindowManager;
import android.webkit.WebSettings;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    static final String SITE = "https://openprep-opal.vercel.app";
    private volatile boolean pageReady = false;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Keep the launch screen up until the first page has loaded (no blank white screen), 10 seconds at most.
        SplashScreen.installSplashScreen(this).setKeepOnScreenCondition(() -> !pageReady);
        new Handler(Looper.getMainLooper()).postDelayed(() -> pageReady = true, 10_000);
        registerPlugin(SignInPlugin.class);
        super.onCreate(savedInstanceState);
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override public void handleOnBackPressed() {
                if (getBridge().getWebView().canGoBack()) { getBridge().getWebView().goBack(); return; }
                setEnabled(false);
                getOnBackPressedDispatcher().onBackPressed();
                setEnabled(true);
            }
        });
        getBridge().addWebViewListener(new WebViewListener() {
            @Override
            public void onPageLoaded(WebView webView) {
                pageReady = true; // the offline page counts too
            }

            // The page's renderer died (out of memory, etc.): rebuild the screen instead of letting Android close the
            // app. Recreate the renderer.
            @Override
            public boolean onRenderProcessGone(WebView webView, android.webkit.RenderProcessGoneDetail detail) {
                runOnUiThread(MainActivity.this::recreate);
                return true;
            }
        });
        // Questions can't be screenshotted or screen recorded, and the app is blank in the recent apps view.
        getWindow().setFlags(WindowManager.LayoutParams.FLAG_SECURE, WindowManager.LayoutParams.FLAG_SECURE);
        // The site needs no files, content providers or location: switch them off in the WebView.
        WebSettings web = getBridge().getWebView().getSettings();
        web.setAllowFileAccess(false);
        web.setAllowContentAccess(false);
        web.setGeolocationEnabled(false);
        openAuthLink(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        openAuthLink(intent);
    }

    /**
     * openprep://auth?code=… finishes an email sign-in requested inside this app (the PKCE verifier is here), and
     * openprep://auth?google=<ID token> a Google one (only usable with the nonce this app kept; it goes in the fragment
     * so it's never sent to a server in the address).
     */
    private boolean openAuthLink(Intent intent) {
        Uri data = intent == null ? null : intent.getData();
        if (data == null || !"openprep".equals(data.getScheme()) || !"auth".equals(data.getHost())) return false;
        String code = data.getQueryParameter("code");
        String google = data.getQueryParameter("google");
        String to;
        if (code != null && code.matches("[A-Za-z0-9_-]{8,200}")) to = SITE + "/auth/callback?code=" + code;
        else if (google != null && google.length() <= 8192 && google.matches("[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+")) to = SITE + "/auth/google/finish#t=" + google;
        else return false;
        getBridge().getWebView().post(() -> getBridge().getWebView().loadUrl(to));
        return true;
    }
}
