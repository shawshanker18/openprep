package com.openprep.app;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.view.WindowManager;
import android.webkit.WebSettings;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final String SITE = "https://openprep-opal.vercel.app";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(LockdownPlugin.class);
        super.onCreate(savedInstanceState);
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

    /** The app was closed during a locked test: open that test again (it locks itself; if it has ended it moves on). */
    private void resumeLockedTest() {
        String url = getSharedPreferences(LockdownPlugin.PREFS, Context.MODE_PRIVATE).getString(LockdownPlugin.LOCKED_URL, null);
        if (url == null || !url.matches("\\Q" + SITE + "\\E/test/[0-9a-fA-F-]{36}")) return;
        getBridge().getWebView().post(() -> getBridge().getWebView().loadUrl(url));
    }

    /** openprep://auth?code=… finishes an email sign-in that was requested inside this app (the PKCE verifier is here). */
    private boolean openAuthLink(Intent intent) {
        Uri data = intent == null ? null : intent.getData();
        if (data == null || !"openprep".equals(data.getScheme()) || !"auth".equals(data.getHost())) return false;
        String code = data.getQueryParameter("code");
        if (code == null || !code.matches("[A-Za-z0-9_-]{8,200}")) return false;
        getBridge().getWebView().post(() -> getBridge().getWebView().loadUrl(SITE + "/auth/callback?code=" + code));
        return true;
    }
}
