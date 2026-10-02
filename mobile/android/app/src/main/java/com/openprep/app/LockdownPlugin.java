package com.openprep.app;

import android.content.Context;
import android.content.SharedPreferences;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
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
    private OnBackPressedCallback back;

    @Override
    public void load() {
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

    @PluginMethod
    public void start(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            on = true;
            prefs().edit().putString(LOCKED_URL, getBridge().getWebView().getUrl()).apply();
            pin();
            call.resolve();
        });
    }

    @PluginMethod
    public void stop(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            on = false;
            prefs().edit().remove(LOCKED_URL).apply();
            try { getActivity().stopLockTask(); } catch (Exception ignored) { /* wasn't pinned */ }
            call.resolve();
        });
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
