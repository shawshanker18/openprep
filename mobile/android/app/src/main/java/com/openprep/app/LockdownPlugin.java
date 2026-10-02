package com.openprep.app;

import android.content.Context;
import android.content.SharedPreferences;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Test lockdown on Android: pins the screen (Android's screen pinning), swallows the back button, and pins again if
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
        back = new OnBackPressedCallback(false) {
            @Override
            public void handleOnBackPressed() { /* no going back out of a test */ }
        };
        getActivity().getOnBackPressedDispatcher().addCallback(getActivity(), back);
    }

    @PluginMethod
    public void start(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            on = true;
            back.setEnabled(true);
            prefs().edit().putString(LOCKED_URL, getBridge().getWebView().getUrl()).apply();
            pin();
            call.resolve();
        });
    }

    @PluginMethod
    public void stop(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            on = false;
            back.setEnabled(false);
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
