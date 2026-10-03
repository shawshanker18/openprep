package com.openprep.app;

import android.content.Intent;
import android.net.Uri;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Google won't sign in inside an app's WebView, so the sign-in page opens in the phone's browser, which hands the
 * result back through openprep://auth (see MainActivity.openAuthLink). Only our own Google sign-in page can be opened.
 */
@CapacitorPlugin(name = "SignIn")
public class SignInPlugin extends Plugin {
    @PluginMethod
    public void openInBrowser(PluginCall call) {
        String url = call.getString("url", "");
        if (!url.matches("\\Q" + MainActivity.SITE + "\\E/auth/google\\?n=[0-9a-f]{64}")) { call.reject("Not allowed."); return; }
        try {
            getActivity().startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)).addCategory(Intent.CATEGORY_BROWSABLE));
            call.resolve();
        } catch (Exception e) {
            call.reject("No browser."); // the page says so and offers the email link
        }
    }
}
