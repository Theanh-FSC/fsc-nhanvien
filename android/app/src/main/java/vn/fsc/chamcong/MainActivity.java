package vn.fsc.chamcong;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.print.PrintManager;
import android.provider.Settings;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;

import org.json.JSONObject;

import java.util.UUID;

/**
 * FSC Chấm Công 2.x: khung app Android chạy giao diện chung với bản iPhone (theanh-fsc.github.io/fsc-nhanvien/app/).
 * Sửa giao diện trên web là app tự có bản mới, không phải cài lại APK.
 * App cung cấp cho giao diện qua window.FSCNative: vị trí GPS gốc (kèm cờ vị trí giả lập), Device ID cũ của app 1.x,
 * phiên đăng nhập cũ (dùng 1 lần), in phiếu lương.
 */
public class MainActivity extends Activity implements LocationListener {

    private static final String APP_URL = "https://theanh-fsc.github.io/fsc-nhanvien/app/?android=2";
    private static final String HOST = "theanh-fsc.github.io";
    private static final int REQ_LOC = 11;
    private static final long VI_TRI_CU_MS = 60000;

    private SharedPreferences sp;
    private LocationManager lm;
    private WebView web;
    private FrameLayout root;
    private View offline;
    private final Handler ui = new Handler(Looper.getMainLooper());
    private volatile Location best;
    private volatile boolean dangNghe;
    private volatile boolean daHoiQuyen;

    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        getWindow().setStatusBarColor(Color.WHITE);
        if (Build.VERSION.SDK_INT >= 23) getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR);
        sp = getSharedPreferences("fsc", MODE_PRIVATE);
        lm = (LocationManager) getSystemService(Context.LOCATION_SERVICE);

        root = new FrameLayout(this);
        root.setBackgroundColor(Color.parseColor("#F6F7FA"));
        web = new WebView(this);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);
        s.setTextZoom(100);
        s.setMediaPlaybackRequiresUserGesture(true);
        s.setUserAgentString(s.getUserAgentString() + " FSCChamCong/" + phienBan());
        web.addJavascriptInterface(new Bridge(), "FSCNative");
        web.setWebChromeClient(new WebChromeClient());
        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {
                Uri u = req.getUrl();
                if (HOST.equals(u.getHost())) return false;
                try { startActivity(new Intent(Intent.ACTION_VIEW, u)); } catch (Exception ignored) { }
                return true;
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest req, WebResourceError err) {
                if (req.isForMainFrame()) hienOffline();
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                if (offline != null && HOST.equals(Uri.parse(url).getHost())) { root.removeView(offline); offline = null; }
            }
        });
        root.addView(web, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        setContentView(root);
        web.loadUrl(APP_URL);
        batViTri(true);
    }

    @Override
    protected void onResume() {
        super.onResume();
        web.onResume();
        batViTri(false);
        web.evaluateJavascript("window.fscOnResume && window.fscOnResume()", null);
    }

    @Override
    protected void onPause() {
        super.onPause();
        web.onPause();
        tatViTri();
    }

    @Override
    public void onBackPressed() {
        if (web.canGoBack()) web.goBack();
        else super.onBackPressed();
    }

    /* ------------------------------------------------------------------ */
    /* Không có mạng                                                       */
    /* ------------------------------------------------------------------ */

    private void hienOffline() {
        if (offline != null) return;
        LinearLayout l = new LinearLayout(this);
        l.setOrientation(LinearLayout.VERTICAL);
        l.setGravity(Gravity.CENTER);
        l.setBackgroundColor(Color.parseColor("#F6F7FA"));
        l.setPadding(dp(32), dp(32), dp(32), dp(32));
        TextView t = new TextView(this);
        t.setText("Không kết nối được");
        t.setTextSize(22);
        t.setTypeface(Typeface.DEFAULT_BOLD);
        t.setTextColor(Color.parseColor("#0E4D39"));
        t.setGravity(Gravity.CENTER);
        TextView m = new TextView(this);
        m.setText("Kiểm tra 4G / Wi-Fi rồi bấm Thử lại.");
        m.setTextSize(15);
        m.setTextColor(Color.parseColor("#6E7A86"));
        m.setGravity(Gravity.CENTER);
        m.setPadding(0, dp(8), 0, dp(20));
        Button bt = new Button(this);
        bt.setText("THỬ LẠI");
        bt.setTextColor(Color.WHITE);
        bt.setTypeface(Typeface.DEFAULT_BOLD);
        GradientDrawable g = new GradientDrawable();
        g.setColor(Color.parseColor("#0E4D39"));
        g.setCornerRadius(dp(14));
        bt.setBackground(g);
        bt.setOnClickListener(v -> web.reload());
        l.addView(t);
        l.addView(m);
        l.addView(bt, new LinearLayout.LayoutParams(dp(200), dp(52)));
        offline = l;
        root.addView(l, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
    }

    /* ------------------------------------------------------------------ */
    /* GPS gốc                                                             */
    /* ------------------------------------------------------------------ */

    private boolean coQuyen() {
        return checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED;
    }

    private boolean dinhViBat() {
        try {
            return lm.isProviderEnabled(LocationManager.GPS_PROVIDER) || lm.isProviderEnabled(LocationManager.NETWORK_PROVIDER);
        } catch (Exception e) {
            return false;
        }
    }

    private void batViTri(boolean hoiQuyen) {
        if (!coQuyen()) {
            if (hoiQuyen) {
                daHoiQuyen = true;
                requestPermissions(new String[]{Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION}, REQ_LOC);
            }
            return;
        }
        if (dangNghe) return;
        try {
            if (lm.getAllProviders().contains(LocationManager.GPS_PROVIDER)) {
                lm.requestLocationUpdates(LocationManager.GPS_PROVIDER, 1000, 0, this, Looper.getMainLooper());
            }
            if (lm.getAllProviders().contains(LocationManager.NETWORK_PROVIDER)) {
                lm.requestLocationUpdates(LocationManager.NETWORK_PROVIDER, 2000, 0, this, Looper.getMainLooper());
            }
            dangNghe = true;
            for (String p : new String[]{LocationManager.GPS_PROVIDER, LocationManager.NETWORK_PROVIDER}) {
                Location l = lm.getLastKnownLocation(p);
                if (l != null) onLocationChanged(l);
            }
        } catch (SecurityException ignored) {
        } catch (Exception ignored) {
        }
    }

    private void tatViTri() {
        if (!dangNghe) return;
        try { lm.removeUpdates(this); } catch (Exception ignored) { }
        dangNghe = false;
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == REQ_LOC) batViTri(false);
    }

    private long tuoiMs(Location l) {
        return (SystemClock.elapsedRealtimeNanos() - l.getElapsedRealtimeNanos()) / 1000000L;
    }

    @SuppressWarnings("deprecation")
    private boolean laViTriGia(Location l) {
        if (l == null) return false;
        if (Build.VERSION.SDK_INT >= 31) return l.isMock();
        return l.isFromMockProvider();
    }

    @Override
    public void onLocationChanged(Location l) {
        if (l == null || tuoiMs(l) > VI_TRI_CU_MS) return;
        Location b = best;
        if (b == null || tuoiMs(b) > 15000 || laViTriGia(l) || l.getAccuracy() <= b.getAccuracy() + 5
                || LocationManager.GPS_PROVIDER.equals(l.getProvider())) {
            best = l;
        }
    }

    // Bắt buộc khai báo đủ để chạy được trên Android 8–10.
    @Override public void onStatusChanged(String provider, int status, Bundle extras) { }
    @Override public void onProviderEnabled(String provider) { }
    @Override public void onProviderDisabled(String provider) { }

    /* ------------------------------------------------------------------ */
    /* Cầu nối cho giao diện web (window.FSCNative)                        */
    /* ------------------------------------------------------------------ */

    private class Bridge {
        @JavascriptInterface
        public String location() {
            Location l = best;
            if (l == null) return "";
            long age = tuoiMs(l);
            if (age > VI_TRI_CU_MS) return "";
            try {
                JSONObject o = new JSONObject();
                o.put("lat", l.getLatitude());
                o.put("lng", l.getLongitude());
                o.put("acc", Math.round(l.getAccuracy()));
                o.put("mock", laViTriGia(l));
                o.put("age", age);
                return o.toString();
            } catch (Exception e) {
                return "";
            }
        }

        /** "permission" chưa cho quyền vị trí chính xác, "disabled" GPS đang tắt, "" bình thường. */
        @JavascriptInterface
        public String locationError() {
            if (!coQuyen()) return daHoiQuyen ? "permission" : "";
            if (!dinhViBat()) return "disabled";
            return "";
        }

        @JavascriptInterface
        public void startLocation() { ui.post(() -> batViTri(false)); }

        @JavascriptInterface
        public void stopLocation() { ui.post(MainActivity.this::tatViTri); }

        /** Nút "Định vị lại": xin quyền / mở cài đặt vị trí / bật lại GPS. */
        @JavascriptInterface
        public void requestLocation() {
            ui.post(() -> {
                if (!coQuyen()) {
                    if (!daHoiQuyen || shouldShowRequestPermissionRationale(Manifest.permission.ACCESS_FINE_LOCATION)) {
                        batViTri(true);
                    } else {
                        try {
                            startActivity(new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.fromParts("package", getPackageName(), null)));
                        } catch (Exception ignored) { }
                    }
                } else if (!dinhViBat()) {
                    try { startActivity(new Intent(Settings.ACTION_LOCATION_SOURCE_SETTINGS)); } catch (Exception ignored) { }
                } else {
                    best = null;
                    tatViTri();
                    batViTri(false);
                }
            });
        }

        /** Device ID của app (giống bản 1.x): "APP-" + ANDROID_ID. */
        @JavascriptInterface
        public String deviceId() {
            String id = sp.getString("device", "");
            if (!id.isEmpty()) return id;
            String a = null;
            try { a = Settings.Secure.getString(getContentResolver(), Settings.Secure.ANDROID_ID); } catch (Exception ignored) { }
            if (a == null || a.isEmpty() || "9774d56d682e549c".equals(a)) a = UUID.randomUUID().toString();
            id = ("APP-" + a).replaceAll("[^A-Za-z0-9-]", "");
            if (id.length() > 64) id = id.substring(0, 64);
            sp.edit().putString("device", id).apply();
            return id;
        }

        /** Phiên đăng nhập của app 1.x (trả về 1 lần rồi xóa), để nhân viên khỏi đăng nhập lại khi lên bản 2. */
        @JavascriptInterface
        public String oldSession() {
            String token = sp.getString("token", "");
            if (token.isEmpty()) return "";
            try {
                JSONObject o = new JSONObject();
                o.put("token", token);
                o.put("code", sp.getString("code", ""));
                o.put("name", sp.getString("name", ""));
                o.put("team", sp.getString("team", ""));
                sp.edit().remove("token").apply();
                return o.toString();
            } catch (Exception e) {
                return "";
            }
        }

        @JavascriptInterface
        public String version() { return phienBan(); }

        @JavascriptInterface
        public void print(final String title) {
            ui.post(() -> {
                try {
                    PrintManager pm = (PrintManager) getSystemService(Context.PRINT_SERVICE);
                    String t = title == null || title.isEmpty() ? "Phieu luong HR FSC" : title;
                    pm.print(t, web.createPrintDocumentAdapter(t), null);
                } catch (Exception ignored) { }
            });
        }
    }

    private String phienBan() {
        try { return getPackageManager().getPackageInfo(getPackageName(), 0).versionName; } catch (Exception e) { return "2.0"; }
    }

    private int dp(float v) { return Math.round(v * getResources().getDisplayMetrics().density); }
}
