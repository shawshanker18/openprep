package com.openprep.app;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.webkit.WebView;
import androidx.core.splashscreen.SplashScreen;
import com.getcapacitor.WebViewListener;
import android.view.WindowManager;
import android.util.Base64;
import android.webkit.CookieManager;
import android.webkit.WebSettings;
import java.security.SecureRandom;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    static final String SITE = "https://openprep-opal.vercel.app";
    private volatile boolean pageReady = false;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Keep the launch screen up until the first page has loaded (no blank white screen), 10 seconds at most.
        SplashScreen.installSplashScreen(this).setKeepOnScreenCondition(() -> !pageReady);
        new Handler(Looper.getMainLooper()).postDelayed(() -> pageReady = true, 10_000);
        registerPlugin(LockdownPlugin.class);
        registerPlugin(SignInPlugin.class);
        ensureInstallCookie();
        super.onCreate(savedInstanceState);
        getBridge().addWebViewListener(new WebViewListener() {
            @Override
            public void onPageLoaded(WebView webView) {
                pageReady = true; // the offline page counts too
                if (LockdownPlugin.instance != null) LockdownPlugin.instance.pageLoaded(webView);
            }

            // The page's renderer died (out of memory, etc.): rebuild the screen instead of letting Android close the
            // app. A locked test reopens (and re-locks) through resumeLockedTest.
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
        if (!openAuthLink(getIntent())) resumeLockedTest();
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        openAuthLink(intent);
    }

    /**
     * This install's lockdown secret: an HttpOnly cookie in the app's private WebView storage. A test locked here can
     * only be carried on with it (see the site's server/lockdown.ts), so a browser faking the app gets nothing.
     */
    private void ensureInstallCookie() {
        CookieManager cookies = CookieManager.getInstance();
        String value = null;
        String existing = cookies.getCookie(SITE);
        if (existing != null) for (String part : existing.split(";")) {
            String p = part.trim();
            if (p.startsWith("openprep_app=")) value = p.substring("openprep_app=".length());
        }
        if (value == null || value.isEmpty()) {
            byte[] secret = new byte[24];
            new SecureRandom().nextBytes(secret);
            value = Base64.encodeToString(secret, Base64.URL_SAFE | Base64.NO_PADDING | Base64.NO_WRAP);
        }
        // Set every launch (keeping the value) so older installs get these attributes too. Lax, not strict: the
        // offline page's "Try again" counts as coming from another site, and strict cookies aren't sent then.
        cookies.setCookie(SITE, "openprep_app=" + value + "; Path=/; Max-Age=315360000; HttpOnly; SameSite=Lax"
            + (SITE.startsWith("https:") ? "; Secure" : ""));
        cookies.flush();
    }

    /** The app was closed during a locked test: open that test again (it locks itself; if it has ended it moves on). */
    private void resumeLockedTest() {
        String url = getSharedPreferences(LockdownPlugin.PREFS, Context.MODE_PRIVATE).getString(LockdownPlugin.LOCKED_URL, null);
        if (url == null || !url.matches("\\Q" + SITE + "\\E/test/[0-9a-fA-F-]{36}")) return;
        // ?resumed=1: the test page counts the app having been closed mid-test as leaving the test window.
        getBridge().getWebView().post(() -> getBridge().getWebView().loadUrl(url + "?resumed=1"));
    }

    /**
     * openprep://auth?code=… finishes an email sign-in requested inside this app (the PKCE verifier is here), and
     * openprep://auth?google=<ID token> a Google one (only usable with the nonce this app kept; it goes in the fragment
     * so it's never sent to a server in the address).
     */
    private boolean openAuthLink(Intent intent) {
        Uri data = intent == null ? null : intent.getData();
        if (data == null || !"openprep".equals(data.getScheme()) || !"auth".equals(data.getHost())) return false;
        // Never during a locked test: loading another page would be a way out of it.
        if (LockdownPlugin.instance != null && LockdownPlugin.instance.isLocked()) return false;
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
