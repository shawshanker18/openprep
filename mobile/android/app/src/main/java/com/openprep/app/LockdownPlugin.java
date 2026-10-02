package com.openprep.app;

import android.content.Context;
import android.content.SharedPreferences;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import android.webkit.WebView;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Back button and test lockdown on Android. Normally Back goes to the previous page (and closes the app from the
 * first one). During a test it does nothing, the screen is pinned (Android's screen pinning), and it pins again if
 * the student unpins while the test is still running. The page calls start() when a test begins and stop() when it
 * is finished or ended. The test's address is kept so the app reopens straight into it if it was closed.
 */
@CapacitorPlugin(name = "Lockdown")
public class LockdownPlugin extends Plugin {
    static final String PREFS = "openprep";
    static final String LOCKED_URL = "lockedUrl";

    private boolean on = false;
    /** A test (strict) rather than a focus session, which the student started and can end whenever they like. */
    private boolean test = false;
    /** The running instance, for MainActivity's page-load listener (Capacitor drops listeners added from load()). */
    static LockdownPlugin instance;
    private OnBackPressedCallback back;

    @Override
    public void load() {
        instance = this;
        back = new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (on) return; // no going back out of a test
                if (getBridge().getWebView().canGoBack()) { getBridge().getWebView().goBack(); return; }
                // First page: let Android close the app as usual.
                setEnabled(false);
                getActivity().getOnBackPressedDispatcher().onBackPressed();
                setEnabled(true);
            }
        };
        getActivity().getOnBackPressedDispatcher().addCallback(getActivity(), back);
    }

    /**
     * Every page load (called by MainActivity). Offline page during a test: keep the lock and retry the test. Any other
     * real page of the site that isn't the test (a crash, a sign out): release the lock, so nobody is stuck pinned.
     */
    boolean isLocked() { return on; }

    void pageLoaded(WebView webView) {
        String url = webView.getUrl();
        if (!on || url == null) return;
        if (url.startsWith("https://localhost")) {
            // Offline: a test stays locked and retries; a focus session just ends (its exit button is gone with the page).
            if (test) offlineDuringTest(webView); else release();
            return;
        }
        if (url.startsWith("http") && !url.matches(".*/test/[0-9a-fA-F-]{36}(\\?.*)?$")) release();
    }

    /**
     * The offline page during a locked test: the lock stays on (switching Wi-Fi off is not a way out), the page is
     * told where the test is, and the test is retried every few seconds until the connection is back.
     */
    private void offlineDuringTest(WebView webView) {
        String test = prefs().getString(LOCKED_URL, null);
        if (test == null) return;
        webView.evaluateJavascript("window.openprepTest && window.openprepTest(" + org.json.JSONObject.quote(test) + ")", null);
        webView.postDelayed(() -> {
            String now = webView.getUrl();
            if (on && now != null && now.startsWith("https://localhost")) webView.loadUrl(test);
        }, 5000);
    }

    @PluginMethod
    public void start(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            on = true;
            test = !"focus".equals(call.getString("kind"));
            // Only a test reopens where it was if the app is closed.
            String url = test ? getBridge().getWebView().getUrl() : null;
            if (url == null) prefs().edit().remove(LOCKED_URL).apply();
            else prefs().edit().putString(LOCKED_URL, url.indexOf('?') < 0 ? url : url.substring(0, url.indexOf('?'))).apply();
            pin();
            call.resolve();
        });
    }

    @PluginMethod
    public void stop(PluginCall call) {
        getActivity().runOnUiThread(() -> { release(); call.resolve(); });
    }

    private void release() {
        on = false;
        prefs().edit().remove(LOCKED_URL).apply();
        try { getActivity().stopLockTask(); } catch (Exception ignored) { /* wasn't pinned */ }
    }

    @Override
    protected void handleOnResume() {
        if (on) pin();
    }

    private void pin() {
        try { getActivity().startLockTask(); } catch (Exception ignored) { /* pinning unavailable: the page still records leaving */ }
    }

    private SharedPreferences prefs() {
        return getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }
}
