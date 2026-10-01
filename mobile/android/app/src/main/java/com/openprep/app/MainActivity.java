package com.openprep.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final String SITE = "https://openprep-opal.vercel.app";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        openAuthLink(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        openAuthLink(intent);
    }

    /** openprep://auth?code=… finishes an email sign-in that was requested inside this app (the PKCE verifier is here). */
    private void openAuthLink(Intent intent) {
        Uri data = intent == null ? null : intent.getData();
        if (data == null || !"openprep".equals(data.getScheme()) || !"auth".equals(data.getHost())) return;
        String code = data.getQueryParameter("code");
        if (code == null || !code.matches("[A-Za-z0-9_-]{8,200}")) return;
        getBridge().getWebView().post(() -> getBridge().getWebView().loadUrl(SITE + "/auth/callback?code=" + code));
    }
}
