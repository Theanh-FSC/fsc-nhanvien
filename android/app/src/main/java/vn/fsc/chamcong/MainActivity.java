package vn.fsc.chamcong;

import android.Manifest;
import android.app.Activity;
import android.app.AlertDialog;
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
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.provider.Settings;
import android.text.InputFilter;
import android.text.InputType;
import android.view.Gravity;
import android.view.View;
import android.view.inputmethod.InputMethodManager;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;
import java.util.UUID;

/**
 * FSC Chấm Công: đăng nhập bằng Mã NV + mật khẩu, xác nhận giờ vào / giờ ra khi đang ở trong vùng GPS của kho.
 * Không quét mã vạch. Máy chủ (FSC_WebApi.gs) kiểm tra lại khoảng cách, sai số GPS và vị trí giả lập.
 */
public class MainActivity extends Activity implements LocationListener {

    private static final int REQ_LOC = 11;
    private static final long VI_TRI_CU_MS = 60000;      // vị trí cũ hơn 60 giây thì không dùng
    private static final TimeZone TZ = TimeZone.getTimeZone("Asia/Ho_Chi_Minh");

    // Màu
    private static final int C_BG = Color.parseColor("#F3F5F4");
    private static final int C_PRIMARY = Color.parseColor("#0F6E56");
    private static final int C_OUT = Color.parseColor("#C2571A");
    private static final int C_TEXT = Color.parseColor("#1D2420");
    private static final int C_MUTED = Color.parseColor("#66706B");
    private static final int C_OK = Color.parseColor("#1E8A4C");
    private static final int C_BAD = Color.parseColor("#C0392B");
    private static final int C_WARN = Color.parseColor("#B7791F");
    private static final int C_DISABLED = Color.parseColor("#B9C1BD");

    private SharedPreferences sp;
    private final Handler ui = new Handler(Looper.getMainLooper());
    private LocationManager lm;
    private Location best;
    private boolean dangNghe;

    // Dữ liệu từ máy chủ
    private JSONArray diem = new JSONArray();
    private double banKinh = 200;
    private double saiSoToiDa = 100;
    private boolean dangTrongCa;

    // Màn chính
    private boolean onMain;
    private boolean busy;
    private TextView tvClock, tvDate, tvGps, tvGpsSub, tvShift, tvRecent, tvMsg;
    private Button btnIn, btnOut;
    private boolean trongVung;
    private String tenDiem = "";
    private int khoangCach = -1;

    private final Runnable tick = new Runnable() {
        @Override public void run() {
            if (!onMain) return;
            Date now = new Date();
            tvClock.setText(fmt("HH:mm:ss", now));
            tvDate.setText(thu(now) + ", " + fmt("dd/MM/yyyy", now));
            capNhatGps();
            ui.postDelayed(this, 1000);
        }
    };

    /* ------------------------------------------------------------------ */
    /* Vòng đời                                                            */
    /* ------------------------------------------------------------------ */

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        getWindow().setStatusBarColor(C_PRIMARY);
        sp = getSharedPreferences("fsc", MODE_PRIVATE);
        lm = (LocationManager) getSystemService(Context.LOCATION_SERVICE);
        if (sp.getString("token", "").isEmpty()) showLogin(null);
        else showMain();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (onMain) {
            batViTri();
            ui.removeCallbacks(tick);
            ui.post(tick);
            taiTrangThai(false);
        }
    }

    @Override
    protected void onPause() {
        super.onPause();
        tatViTri();
        ui.removeCallbacks(tick);
    }

    /* ------------------------------------------------------------------ */
    /* Đăng nhập                                                           */
    /* ------------------------------------------------------------------ */

    private void showLogin(String msg) {
        onMain = false;
        tatViTri();
        ui.removeCallbacks(tick);
        LinearLayout root = page();
        root.setGravity(Gravity.CENTER_HORIZONTAL);
        root.addView(space(40));
        root.addView(title("FSC Chấm Công", 28, C_PRIMARY));
        root.addView(text("Đăng nhập bằng Mã NV và mật khẩu", 15, C_MUTED));
        root.addView(space(28));

        LinearLayout card = card();
        final EditText edCode = input("Mã NV (ví dụ F018)", InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_FLAG_CAP_CHARACTERS);
        edCode.setFilters(new InputFilter[]{new InputFilter.AllCaps(), new InputFilter.LengthFilter(20)});
        edCode.setText(sp.getString("code", ""));
        final EditText edPin = input("Mật khẩu", InputType.TYPE_CLASS_NUMBER | InputType.TYPE_NUMBER_VARIATION_PASSWORD);
        edPin.setFilters(new InputFilter[]{new InputFilter.LengthFilter(12)});
        final TextView err = text(msg == null ? "" : msg, 14, C_BAD);
        final Button btn = bigButton("ĐĂNG NHẬP", C_PRIMARY);
        final TextView tvTen = text("", 14, C_OK);
        tvTen.setPadding(dp(4), dp(4), 0, 0);
        card.addView(label("Mã nhân viên"));
        card.addView(edCode);
        card.addView(tvTen);
        final Runnable traTen = () -> {
            final String ma = edCode.getText().toString().trim().toUpperCase(Locale.ROOT);
            if (ma.length() < 2) { tvTen.setText(""); return; }
            tvTen.setTextColor(C_MUTED);
            tvTen.setText("Đang tìm…");
            chay(() -> {
                JSONObject req = base("lookup");
                req.put("code", ma);
                return Api.call(req);
            }, res -> {
                if (!ma.equals(edCode.getText().toString().trim().toUpperCase(Locale.ROOT))) return;
                String to = res.optString("team");
                tvTen.setTextColor(C_OK);
                tvTen.setText("✓ " + res.optString("name") + (to.isEmpty() ? "" : " · " + to));
            }, e -> {
                if (!ma.equals(edCode.getText().toString().trim().toUpperCase(Locale.ROOT))) return;
                tvTen.setTextColor(C_BAD);
                tvTen.setText(e.getMessage());
            });
        };
        edCode.addTextChangedListener(new android.text.TextWatcher() {
            @Override public void beforeTextChanged(CharSequence c, int a, int b, int d) { }
            @Override public void onTextChanged(CharSequence c, int a, int b, int d) { }
            @Override public void afterTextChanged(android.text.Editable e) {
                ui.removeCallbacks(traTen);
                ui.postDelayed(traTen, 600);
            }
        });
        if (edCode.getText().length() >= 2) ui.post(traTen);
        card.addView(space(12));
        card.addView(label("Mật khẩu"));
        card.addView(edPin);
        card.addView(space(8));
        card.addView(err);
        card.addView(space(8));
        card.addView(btn);
        card.addView(space(10));
        card.addView(text("Lần đầu đăng nhập: dùng mật khẩu mặc định do quản lý cung cấp, sau đó đặt mật khẩu riêng 4–8 số.", 13, C_MUTED));
        root.addView(card);
        root.addView(space(16));
        root.addView(text("Phiên bản " + phienBan(), 12, C_MUTED));
        setContentView(scroll(root));

        btn.setOnClickListener(v -> {
            final String code = edCode.getText().toString().trim().toUpperCase(Locale.ROOT);
            final String pin = edPin.getText().toString().trim();
            if (code.isEmpty() || pin.isEmpty()) { err.setText("Nhập Mã NV và mật khẩu."); return; }
            anBanPhim(edPin);
            err.setText("");
            btn.setEnabled(false);
            btn.setText("Đang đăng nhập…");
            chay(() -> {
                JSONObject req = base("login");
                req.put("code", code);
                req.put("pin", pin);
                return Api.call(req);
            }, res -> {
                sp.edit().putString("code", code).apply();
                if (res.optBoolean("mustSetPin")) {
                    showSetPin(res.optString("setupToken"), res.optJSONObject("profile"));
                } else {
                    luuPhien(res);
                    showMain();
                }
            }, e -> {
                btn.setEnabled(true);
                btn.setText("ĐĂNG NHẬP");
                err.setText(e.getMessage());
            });
        });
    }

    private void showSetPin(final String setupToken, JSONObject profile) {
        LinearLayout root = page();
        root.setGravity(Gravity.CENTER_HORIZONTAL);
        root.addView(space(40));
        root.addView(title("Đặt mật khẩu mới", 24, C_PRIMARY));
        if (profile != null) root.addView(text(profile.optString("name") + " – " + profile.optString("code"), 15, C_TEXT));
        root.addView(space(20));
        LinearLayout card = card();
        final EditText p1 = input("4–8 chữ số", InputType.TYPE_CLASS_NUMBER | InputType.TYPE_NUMBER_VARIATION_PASSWORD);
        final EditText p2 = input("Nhập lại", InputType.TYPE_CLASS_NUMBER | InputType.TYPE_NUMBER_VARIATION_PASSWORD);
        p1.setFilters(new InputFilter[]{new InputFilter.LengthFilter(8)});
        p2.setFilters(new InputFilter[]{new InputFilter.LengthFilter(8)});
        final TextView err = text("", 14, C_BAD);
        final Button btn = bigButton("LƯU MẬT KHẨU", C_PRIMARY);
        card.addView(label("Mật khẩu mới"));
        card.addView(p1);
        card.addView(space(12));
        card.addView(label("Nhập lại mật khẩu"));
        card.addView(p2);
        card.addView(space(8));
        card.addView(err);
        card.addView(space(8));
        card.addView(btn);
        root.addView(card);
        setContentView(scroll(root));

        btn.setOnClickListener(v -> {
            final String a = p1.getText().toString().trim();
            if (!a.matches("\\d{4,8}")) { err.setText("Mật khẩu gồm 4 đến 8 chữ số."); return; }
            if (!a.equals(p2.getText().toString().trim())) { err.setText("Hai lần nhập không giống nhau."); return; }
            anBanPhim(p2);
            btn.setEnabled(false);
            chay(() -> {
                JSONObject req = base("setPin");
                req.put("setupToken", setupToken);
                req.put("newPin", a);
                return Api.call(req);
            }, res -> {
                luuPhien(res);
                showMain();
            }, e -> {
                btn.setEnabled(true);
                err.setText(e.getMessage());
                if ("auth".equals(e.code)) showLogin("Hết thời gian đặt mật khẩu, đăng nhập lại.");
            });
        });
    }

    private void luuPhien(JSONObject res) {
        JSONObject p = res.optJSONObject("profile");
        SharedPreferences.Editor ed = sp.edit().putString("token", res.optString("token"));
        if (p != null) {
            ed.putString("name", p.optString("name")).putString("team", p.optString("team")).putString("code", p.optString("code"));
        }
        ed.apply();
    }

    private void dangXuat(String msg) {
        sp.edit().remove("token").apply();
        showLogin(msg);
    }

    /* ------------------------------------------------------------------ */
    /* Màn chấm công                                                       */
    /* ------------------------------------------------------------------ */

    // Khung chính: đầu trang + nội dung theo tab + thanh tab dưới
    private static final String[][] TABS = {
            {"scan", "⏱", "Chấm công"}, {"cong", "📅", "Ngày công"}, {"sl", "📦", "Sản lượng"},
            {"luong", "💵", "Lương"}, {"nghi", "📝", "Xin nghỉ"}};
    private String tab = "scan";
    private LinearLayout content;
    private ScrollView contentScroll;
    private View scanView;
    private LinearLayout nav;
    private JSONObject me;              // dữ liệu action 'me' (ngày công, sản lượng, lương, đơn nghỉ)
    private String meErr;
    private boolean dangTaiMe;
    private String statusErr;           // lỗi tải trạng thái chấm công / điểm GPS
    private boolean statusOk;
    private String loaiNghi = "";
    private String ngayNghi = "";
    private String ghiChuNghi = "";

    private void showMain() {
        onMain = true;
        LinearLayout shell = new LinearLayout(this);
        shell.setOrientation(LinearLayout.VERTICAL);
        shell.setBackgroundColor(C_BG);

        // Đầu trang: tên + đăng xuất
        LinearLayout head = new LinearLayout(this);
        head.setOrientation(LinearLayout.HORIZONTAL);
        head.setGravity(Gravity.CENTER_VERTICAL);
        head.setPadding(dp(18), dp(14), dp(18), dp(8));
        LinearLayout who = new LinearLayout(this);
        who.setOrientation(LinearLayout.VERTICAL);
        who.addView(title(sp.getString("name", ""), 20, C_TEXT));
        String team = sp.getString("team", "");
        who.addView(text(sp.getString("code", "") + (team.isEmpty() ? "" : " · " + team), 14, C_MUTED));
        head.addView(who, new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1));
        TextView out = text("Đăng xuất", 14, C_PRIMARY);
        out.setPadding(dp(12), dp(8), 0, dp(8));
        out.setOnClickListener(v -> new AlertDialog.Builder(this)
                .setMessage("Đăng xuất khỏi điện thoại này?")
                .setPositiveButton("Đăng xuất", (d, w) -> dangXuat(null))
                .setNegativeButton("Hủy", null).show());
        head.addView(out);
        shell.addView(head);

        contentScroll = new ScrollView(this);
        contentScroll.setFillViewport(true);
        content = new LinearLayout(this);
        content.setOrientation(LinearLayout.VERTICAL);
        content.setPadding(dp(18), dp(6), dp(18), dp(24));
        contentScroll.addView(content);
        shell.addView(contentScroll, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, 0, 1));

        nav = new LinearLayout(this);
        nav.setOrientation(LinearLayout.HORIZONTAL);
        nav.setBackgroundColor(Color.WHITE);
        nav.setElevation(dp(8));
        for (final String[] t : TABS) {
            LinearLayout item = new LinearLayout(this);
            item.setOrientation(LinearLayout.VERTICAL);
            item.setGravity(Gravity.CENTER);
            item.setPadding(0, dp(7), 0, dp(7));
            item.setTag(t[0]);
            TextView ic = text(t[1], 18, C_TEXT);
            ic.setGravity(Gravity.CENTER);
            TextView lb = text(t[2], 11, C_MUTED);
            lb.setGravity(Gravity.CENTER);
            lb.setSingleLine(true);
            item.addView(ic);
            item.addView(lb);
            item.setOnClickListener(v -> chonTab(t[0]));
            nav.addView(item, new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1));
        }
        shell.addView(nav);
        setContentView(shell);

        scanView = buildScan();
        chonTab(tab);
        capNhatNut();
        batViTri();
        ui.removeCallbacks(tick);
        ui.post(tick);
        taiTrangThai(false);
        taiMe(null);
    }

    private void chonTab(String t) {
        tab = t;
        for (int i = 0; i < nav.getChildCount(); i++) {
            LinearLayout item = (LinearLayout) nav.getChildAt(i);
            boolean on = t.equals(item.getTag());
            ((TextView) item.getChildAt(1)).setTextColor(on ? C_PRIMARY : C_MUTED);
            ((TextView) item.getChildAt(1)).setTypeface(on ? Typeface.DEFAULT_BOLD : Typeface.DEFAULT);
            item.setBackgroundColor(on ? Color.parseColor("#E7F2EE") : Color.WHITE);
        }
        content.removeAllViews();
        if ("scan".equals(t)) content.addView(scanView);
        else renderTab();
        contentScroll.scrollTo(0, 0);
    }

    private View buildScan() {
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);

        // Đồng hồ
        LinearLayout clock = card();
        clock.setGravity(Gravity.CENTER_HORIZONTAL);
        tvClock = title("--:--:--", 44, C_TEXT);
        tvClock.setTypeface(Typeface.create("sans-serif-medium", Typeface.NORMAL));
        tvDate = text("", 15, C_MUTED);
        clock.addView(tvClock);
        clock.addView(tvDate);
        root.addView(clock);
        root.addView(space(12));

        // Vị trí
        LinearLayout gps = card();
        gps.addView(label("VỊ TRÍ"));
        tvGps = title("Đang lấy vị trí GPS…", 18, C_WARN);
        tvGpsSub = text("", 14, C_MUTED);
        gps.addView(tvGps);
        gps.addView(tvGpsSub);
        gps.setOnClickListener(v -> xuLyBamViTri());
        root.addView(gps);
        root.addView(space(12));

        // Ca
        LinearLayout ca = card();
        ca.addView(label("CA LÀM VIỆC"));
        tvShift = title("…", 17, C_TEXT);
        ca.addView(tvShift);
        root.addView(ca);
        root.addView(space(16));

        // Nút chấm công
        btnIn = bigButton("XÁC NHẬN GIỜ VÀO", C_PRIMARY);
        btnOut = bigButton("XÁC NHẬN GIỜ RA", C_OUT);
        btnIn.setOnClickListener(v -> xacNhan("IN"));
        btnOut.setOnClickListener(v -> xacNhan("OUT"));
        root.addView(btnIn);
        root.addView(space(12));
        root.addView(btnOut);
        root.addView(space(8));
        tvMsg = text("", 14, C_MUTED);
        tvMsg.setGravity(Gravity.CENTER_HORIZONTAL);
        root.addView(tvMsg);
        root.addView(space(12));

        // Lịch sử
        LinearLayout hist = card();
        LinearLayout hh = new LinearLayout(this);
        hh.setOrientation(LinearLayout.HORIZONTAL);
        hh.addView(label("CHẤM CÔNG 7 NGÀY GẦN ĐÂY"), new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1));
        TextView reload = text("Tải lại", 14, C_PRIMARY);
        reload.setOnClickListener(v -> taiTrangThai(true));
        hh.addView(reload);
        hist.addView(hh);
        tvRecent = text("…", 14, C_TEXT);
        tvRecent.setLineSpacing(dp(3), 1f);
        hist.addView(tvRecent);
        root.addView(hist);
        root.addView(space(10));
        root.addView(text("Phiên bản " + phienBan() + " · Chỉ chấm công được khi ở trong vùng của kho.", 12, C_MUTED));
        return root;
    }

    /* ------------------------------------------------------------------ */
    /* Ngày công, sản lượng, lương, xin nghỉ (action 'me')                 */
    /* ------------------------------------------------------------------ */

    private void taiMe(String ky) {
        if (dangTaiMe) return;
        dangTaiMe = true;
        meErr = null;
        if (!"scan".equals(tab) && me == null) renderTab();
        final String k = ky == null ? (me == null ? "" : me.optString("ky")) : ky;
        chay(() -> {
            JSONObject req = base("me");
            req.put("ky", k);
            return Api.call(req);
        }, res -> {
            dangTaiMe = false;
            me = res;
            if (onMain && !"scan".equals(tab)) renderTab();
        }, e -> {
            dangTaiMe = false;
            if ("auth".equals(e.code)) { dangXuat(e.getMessage()); return; }
            meErr = e.getMessage();
            if (onMain && !"scan".equals(tab)) renderTab();
        });
    }

    private void renderTab() {
        content.removeAllViews();
        if (me == null) {
            LinearLayout c = card();
            if (meErr != null) {
                c.addView(text(meErr, 15, C_BAD));
                c.addView(space(10));
                Button b = bigButton("THỬ LẠI", C_PRIMARY);
                b.setOnClickListener(v -> taiMe(null));
                c.addView(b);
            } else {
                c.addView(text("Đang tải dữ liệu…", 15, C_MUTED));
            }
            content.addView(c);
            return;
        }
        if (!"nghi".equals(tab)) {
            content.addView(chonKy());
            content.addView(space(12));
        }
        if ("cong".equals(tab)) renderCong();
        else if ("sl".equals(tab)) renderSl();
        else if ("luong".equals(tab)) renderLuong();
        else if ("nghi".equals(tab)) renderNghi();
    }

    /** Chọn kỳ lương 26–25: ◀ kỳ trước · kỳ sau ▶ */
    private View chonKy() {
        LinearLayout c = card();
        c.setOrientation(LinearLayout.HORIZONTAL);
        c.setGravity(Gravity.CENTER_VERTICAL);
        c.setPadding(dp(6), dp(6), dp(6), dp(6));
        JSONArray ds = me.optJSONArray("dsKy");
        final String ky = me.optString("ky");
        int idx = -1;
        if (ds != null) for (int i = 0; i < ds.length(); i++) if (ky.equals(ds.optString(i))) idx = i;
        final String truoc = ds != null && idx >= 0 && idx + 1 < ds.length() ? ds.optString(idx + 1) : null;
        final String sau = ds != null && idx > 0 ? ds.optString(idx - 1) : null;
        TextView l = title("◀", 20, truoc == null ? C_DISABLED : C_PRIMARY);
        l.setPadding(dp(14), dp(8), dp(14), dp(8));
        if (truoc != null) l.setOnClickListener(v -> taiMe(truoc));
        TextView r = title("▶", 20, sau == null ? C_DISABLED : C_PRIMARY);
        r.setPadding(dp(14), dp(8), dp(14), dp(8));
        if (sau != null) r.setOnClickListener(v -> taiMe(sau));
        LinearLayout mid = new LinearLayout(this);
        mid.setOrientation(LinearLayout.VERTICAL);
        mid.setGravity(Gravity.CENTER);
        mid.addView(title(dangTaiMe ? "Đang tải…" : kyTen(ky), 16, C_TEXT));
        mid.addView(text(kyKhoang(ky), 13, C_MUTED));
        c.addView(l);
        c.addView(mid, new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1));
        c.addView(r);
        return c;
    }

    private void renderCong() {
        JSONArray rows = me.optJSONArray("ngayCong");
        if (rows == null) rows = new JSONArray();
        String ky = me.optString("ky");
        double tong = 0, tc = 0;
        java.util.TreeMap<String, String[]> ds = new java.util.TreeMap<>(java.util.Collections.reverseOrder());
        for (int i = 0; i < rows.length(); i++) {
            JSONObject r = rows.optJSONObject(i);
            if (r == null) continue;
            tong += r.optDouble("cong", 0);
            tc += r.optDouble("tangCa", 0);
            StringBuilder sub = new StringBuilder(r.optString("trangThai"));
            if (!r.optString("vao").isEmpty()) sub.append(" · vào ").append(r.optString("vao"));
            if (!r.optString("ra").isEmpty()) sub.append(" · ra ").append(r.optString("ra"));
            if (r.optDouble("tangCa", 0) > 0) sub.append(" · tăng ca ").append(num(r.optDouble("tangCa"), 1)).append(" giờ");
            ds.put(r.optString("ngay"), new String[]{num(r.optDouble("cong", 0), 1) + " công", sub.toString(), "1"});
        }
        // Ngày đã chấm công trên app/web nhưng Dashboard chưa duyệt (chưa có trong NgayCong)
        int choDuyet = 0;
        java.util.Map<String, String[]> ca = caTuQuet(me.optJSONArray("quet"));
        String[] khoang = kyTuDen(ky);
        for (java.util.Map.Entry<String, String[]> e : ca.entrySet()) {
            String ngay = e.getKey();
            if (ds.containsKey(ngay) || khoang == null || ngay.compareTo(khoang[0]) < 0 || ngay.compareTo(khoang[1]) > 0) continue;
            String[] g = e.getValue();
            String sub = "Đã chấm công · chờ Dashboard duyệt"
                    + (g[0].isEmpty() ? " · chưa có giờ vào" : " · vào " + g[0])
                    + (g[1].isEmpty() ? " · chưa có giờ ra" : " · ra " + g[1]);
            ds.put(ngay, new String[]{"chờ duyệt", sub, "0"});
            choDuyet++;
        }
        LinearLayout s = card();
        s.addView(stats(num(tong, 1), "Ngày công đã duyệt", String.valueOf(choDuyet), "Ngày chờ duyệt"));
        String cn = me.optString("capNhatLuc");
        s.addView(space(6));
        s.addView(text((tc > 0 ? "Giờ tăng ca: " + num(tc, 1) + " giờ. " : "")
                + "Ngày công theo bảng chấm công đã duyệt trên Dashboard" + (cn.isEmpty() ? "" : ", cập nhật lúc " + cn)
                + ". Ngày \"chờ duyệt\" là ngày đã chấm công, sẽ tính công sau khi quản lý cập nhật Dashboard.", 12, C_MUTED));
        content.addView(s);
        content.addView(space(12));
        LinearLayout c = card();
        if (ds.isEmpty()) c.addView(text("Chưa có ngày công trong kỳ này.", 14, C_MUTED));
        int n = 0;
        for (java.util.Map.Entry<String, String[]> e : ds.entrySet()) {
            n++;
            String[] v = e.getValue();
            View d = dongNgay(thuNgan(e.getKey()) + " " + dm(e.getKey()), v[0], v[1], n < ds.size());
            if ("0".equals(v[2])) d.setAlpha(0.75f);
            c.addView(d);
        }
        content.addView(c);
    }

    /** Ghép ca từ các lượt chấm công hợp lệ (giống máy chủ): ngày vào ca → {giờ vào, giờ ra}. Ra trong 16 giờ sau vào. */
    private static java.util.Map<String, String[]> caTuQuet(JSONArray quet) {
        java.util.Map<String, String[]> out = new java.util.HashMap<>();
        if (quet == null) return out;
        long moMs = -1;
        String moNgay = null;
        for (int i = 0; i < quet.length(); i++) {
            JSONObject q = quet.optJSONObject(i);
            if (q == null || !q.optBoolean("hopLe")) continue;
            String loai = q.optString("loai"), ngay = q.optString("ngay"), gio = q.optString("gio");
            long ms = q.optLong("ms");
            if ("IN".equals(loai)) {
                String[] g = out.get(ngay);
                if (g == null) out.put(ngay, new String[]{gio, ""});
                else if (g[0].isEmpty() || gio.compareTo(g[0]) < 0) g[0] = gio;
                moMs = ms;
                moNgay = ngay;
            } else if ("OUT".equals(loai)) {
                if (moNgay != null && ms - moMs <= 16L * 3600000L) {
                    out.get(moNgay)[1] = gio;
                } else {
                    String[] g = out.get(ngay);
                    if (g == null) out.put(ngay, new String[]{"", gio});
                    else g[1] = gio;
                }
            }
        }
        return out;
    }

    /** Kỳ "2026-11" → {"2026-10-26", "2026-11-25"}. */
    private static String[] kyTuDen(String ky) {
        String[] p = ky == null ? new String[0] : ky.split("-");
        if (p.length != 2) return null;
        int y = Integer.parseInt(p[0]), m = Integer.parseInt(p[1]);
        int py = m == 1 ? y - 1 : y, pm = m == 1 ? 12 : m - 1;
        return new String[]{String.format(Locale.ROOT, "%04d-%02d-26", py, pm), String.format(Locale.ROOT, "%04d-%02d-25", y, m)};
    }

    private void renderSl() {
        JSONArray rows = me.optJSONArray("sanLuong");
        if (rows == null) rows = new JSONArray();
        double slKfm = 0, tien = 0;
        java.util.TreeMap<String, java.util.List<JSONObject>> byDay = new java.util.TreeMap<>(java.util.Collections.reverseOrder());
        for (int i = 0; i < rows.length(); i++) {
            JSONObject r = rows.optJSONObject(i);
            if ("KFM".equals(r.optString("nguon"))) slKfm += r.optDouble("soLuong", 0);
            tien += r.optDouble("thanhTien", 0);
            String d = r.optString("ngay");
            if (!byDay.containsKey(d)) byDay.put(d, new java.util.ArrayList<JSONObject>());
            byDay.get(d).add(r);
        }
        LinearLayout s = card();
        s.addView(stats(num(slKfm, 0), "Sản lượng KFM", money(tien), "Tiền sản lượng (KFM + CPG)"));
        content.addView(s);
        content.addView(space(12));
        LinearLayout c = card();
        if (byDay.isEmpty()) c.addView(text("Chưa có sản lượng trong kỳ này.", 14, C_MUTED));
        int n = 0;
        for (java.util.Map.Entry<String, java.util.List<JSONObject>> e : byDay.entrySet()) {
            double t = 0;
            StringBuilder sub = new StringBuilder();
            for (JSONObject r : e.getValue()) {
                t += r.optDouble("thanhTien", 0);
                if (sub.length() > 0) sub.append('\n');
                sub.append(r.optString("nguon")).append(" · ").append(r.optString("congViec")).append(" · ")
                        .append(num(r.optDouble("soLuong", 0), 2)).append(' ').append(r.optString("dvt"))
                        .append(" × ").append(num(r.optDouble("donGia", 0), 2)).append(" đ");
            }
            n++;
            c.addView(dongNgay(thuNgan(e.getKey()) + " " + dm(e.getKey()), money(t), sub.toString(), n < byDay.size()));
        }
        content.addView(c);
    }

    private void renderLuong() {
        JSONArray ls = me.optJSONArray("luong");
        if (ls == null || ls.length() == 0) {
            LinearLayout c = card();
            c.addView(text("Chưa có bảng lương kỳ này.", 14, C_MUTED));
            content.addView(c);
            return;
        }
        boolean dangChay = me.optString("ky").equals(me.optString("kyHienTai"));
        for (int i = 0; i < ls.length(); i++) {
            JSONObject l = ls.optJSONObject(i);
            LinearLayout c = card();
            c.addView(title("Phiếu lương " + kyTen(me.optString("ky")), 17, C_TEXT));
            if (dangChay) {
                c.addView(space(6));
                c.addView(text("Kỳ đang chạy: số tạm tính, sẽ thay đổi đến cuối kỳ.", 13, C_WARN));
            }
            c.addView(space(6));
            c.addView(dong("Hình thức lương", l.optString("hinhThuc"), true));
            c.addView(dong("Ngày công", num(l.optDouble("ngayCong", 0), 1), true));
            c.addView(dong("Giờ tăng ca", num(l.optDouble("gioTangCa", 0), 1), l.optDouble("gioTangCa", 0) > 0));
            c.addView(dong("Sản lượng KFM", num(l.optDouble("slKfm", 0), 0), l.optDouble("slKfm", 0) > 0));
            JSONObject ct = me.optJSONObject("chiTiet");
            JSONArray thu = ct == null ? null : ct.optJSONArray("thu");
            if (thu != null) {
                // 08/11/2026: phiếu lương chi tiết giống Dashboard (khoản thu / khấu trừ theo bảng lương mới nhất).
                c.addView(space(8));
                c.addView(label("KHOẢN THU"));
                for (int k = 0; k < thu.length(); k++) {
                    JSONArray x = thu.optJSONArray(k);
                    if (x != null && x.optDouble(1, 0) != 0) c.addView(dong(x.optString(0), money(x.optDouble(1, 0)), true));
                }
            } else {
                c.addView(dong("Tiền sản lượng KFM", money(l.optDouble("tienKfm", 0)), l.optDouble("tienKfm", 0) > 0));
                c.addView(dong("Tiền CPG", money(l.optDouble("tienCpg", 0)), l.optDouble("tienCpg", 0) > 0));
                c.addView(dong("Lương ngày", money(l.optDouble("luongNgay", 0)), l.optDouble("luongNgay", 0) > 0));
                c.addView(dong("Tiền tăng ca", money(l.optDouble("tienTangCa", 0)), l.optDouble("tienTangCa", 0) > 0));
                c.addView(dong("Phụ cấp", money(l.optDouble("phuCap", 0)), l.optDouble("phuCap", 0) > 0));
            }
            c.addView(dong("Tổng thu nhập", money(l.optDouble("tongThuNhap", 0)), true));
            JSONArray tru = ct == null ? null : ct.optJSONArray("tru");
            if (thu != null && tru != null) {
                c.addView(space(8));
                c.addView(label("KHOẢN KHẤU TRỪ"));
                for (int k = 0; k < tru.length(); k++) {
                    JSONArray x = tru.optJSONArray(k);
                    if (x != null && (k == 0 || x.optDouble(1, 0) != 0)) c.addView(dong(x.optString(0), "− " + money(x.optDouble(1, 0)), true));
                }
            } else {
                c.addView(dong("Thuế TNCN (10%)", "− " + money(l.optDouble("thue", 0)), true));
                c.addView(dong("Tạm ứng", "− " + money(l.optDouble("tamUng", 0)), l.optDouble("tamUng", 0) > 0));
            }
            View line = new View(this);
            line.setBackgroundColor(Color.parseColor("#E1E6E3"));
            c.addView(line, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(1)));
            LinearLayout tot = new LinearLayout(this);
            tot.setPadding(0, dp(10), 0, dp(4));
            tot.addView(title("Thực nhận", 17, C_TEXT), new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1));
            tot.addView(title(money(l.optDouble("thucNhan", 0)), 19, C_PRIMARY));
            c.addView(tot);
            String chot = l.optString("chotLuc");
            c.addView(text((chot.isEmpty() ? "" : "Chốt lúc " + chot + ". ") + "Thắc mắc về lương, liên hệ quản lý.", 12, C_MUTED));
            content.addView(c);
            content.addView(space(12));
            JSONArray hs = ct == null ? null : ct.optJSONArray("hoSo");
            if (hs != null && hs.length() > 0) {
                LinearLayout h = card();
                h.addView(title("Lương & phụ cấp theo hồ sơ", 17, C_TEXT));
                h.addView(space(4));
                h.addView(text("Chi phí nhân công / tháng theo hồ sơ nhân sự. Tham khảo, không cộng vào Thực nhận.", 12, C_MUTED));
                h.addView(space(6));
                for (int k = 0; k < hs.length(); k++) {
                    JSONArray x = hs.optJSONArray(k);
                    if (x != null) h.addView(dong(x.optString(0), money(x.optDouble(1, 0)), true));
                }
                h.addView(dong("Cộng chi phí nhân công", money(ct.optDouble("hoSoTong", 0)), true));
                h.addView(dong("NLĐ đóng BHXH (10,5%)", money(ct.optDouble("hoSoNld", 0)), ct.optDouble("hoSoNld", 0) > 0));
                LinearLayout t2 = new LinearLayout(this);
                t2.setPadding(0, dp(10), 0, dp(4));
                t2.addView(title("Tổng chi phí 1 NV / tháng", 15, C_TEXT), new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1));
                t2.addView(title(money(ct.optDouble("hoSoNet", 0)), 17, C_PRIMARY));
                h.addView(t2);
                content.addView(h);
                content.addView(space(12));
            }
        }
    }

    private void renderNghi() {
        final String[][] loai = {{"PHEP", "Nghỉ phép"}, {"NUA_NGAY", "Nghỉ nửa ngày"}, {"OM", "Nghỉ ốm"}, {"KHONG_LUONG", "Nghỉ không lương"}};
        if (ngayNghi.isEmpty()) ngayNghi = fmt("yyyy-MM-dd", new Date());
        LinearLayout c = card();
        c.addView(title("Xin nghỉ", 17, C_TEXT));
        c.addView(space(10));
        c.addView(label("LOẠI NGHỈ"));
        for (int row = 0; row < 2; row++) {
            LinearLayout hr = new LinearLayout(this);
            hr.setOrientation(LinearLayout.HORIZONTAL);
            for (int col = 0; col < 2; col++) {
                final String[] it = loai[row * 2 + col];
                boolean on = it[0].equals(loaiNghi);
                TextView b = text(it[1], 15, on ? Color.WHITE : C_TEXT);
                b.setGravity(Gravity.CENTER);
                b.setPadding(dp(6), dp(12), dp(6), dp(12));
                GradientDrawable g = new GradientDrawable();
                g.setColor(on ? C_PRIMARY : Color.parseColor("#F7F9F8"));
                g.setCornerRadius(dp(10));
                g.setStroke(dp(1), on ? C_PRIMARY : Color.parseColor("#CBD3CF"));
                b.setBackground(g);
                b.setOnClickListener(v -> { loaiNghi = it[0]; renderTab(); });
                LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1);
                lp.setMargins(col == 0 ? 0 : dp(5), dp(4), col == 0 ? dp(5) : 0, dp(4));
                hr.addView(b, lp);
            }
            c.addView(hr);
        }
        c.addView(space(10));
        c.addView(label("NGÀY NGHỈ"));
        TextView ngay = text("📅  " + thuNgan(ngayNghi) + " " + dmy(ngayNghi), 17, C_TEXT);
        ngay.setPadding(dp(12), dp(12), dp(12), dp(12));
        GradientDrawable g = new GradientDrawable();
        g.setColor(Color.parseColor("#F7F9F8"));
        g.setCornerRadius(dp(10));
        g.setStroke(dp(1), Color.parseColor("#CBD3CF"));
        ngay.setBackground(g);
        ngay.setOnClickListener(v -> chonNgayNghi());
        c.addView(ngay);
        c.addView(space(10));
        c.addView(label("LÝ DO (KHÔNG BẮT BUỘC)"));
        final EditText note = input("Lý do", InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_FLAG_CAP_SENTENCES);
        note.setFilters(new InputFilter[]{new InputFilter.LengthFilter(200)});
        note.setText(ghiChuNghi);
        c.addView(note);
        c.addView(space(10));
        final TextView msg = text("", 14, C_BAD);
        final Button gui = bigButton("GỬI ĐƠN NGHỈ", C_PRIMARY);
        c.addView(gui);
        c.addView(space(6));
        c.addView(msg);
        c.addView(text("Gửi đơn từ 7 ngày trước đến 60 ngày tới. Đơn tự cập nhật vào bảng chấm công. Gửi lại cùng ngày sẽ thay đơn cũ. Hủy được khi ngày nghỉ chưa qua.", 12, C_MUTED));
        content.addView(c);
        gui.setOnClickListener(v -> {
            if (loaiNghi.isEmpty()) { msg.setTextColor(C_BAD); msg.setText("Chọn loại nghỉ."); return; }
            ghiChuNghi = note.getText().toString().trim();
            anBanPhim(note);
            gui.setEnabled(false);
            gui.setText("Đang gửi…");
            final String loaiGui = loaiNghi, ngayGui = ngayNghi, lyDo = ghiChuNghi;
            chay(() -> {
                JSONObject req = base("leave");
                req.put("type", loaiGui);
                req.put("date", ngayGui);
                req.put("note", lyDo);
                return Api.call(req);
            }, res -> {
                try { me.put("nghi", res.optJSONArray("nghi")); } catch (Exception ignored) { }
                ghiChuNghi = "";
                String ten = loaiGui;
                for (String[] it : loai) if (it[0].equals(loaiGui)) ten = it[1];
                loaiNghi = "";
                renderTab();
                new AlertDialog.Builder(this).setTitle("Đã gửi đơn")
                        .setMessage("Đã gửi " + ten + " ngày " + dmy(ngayGui) + ".").setPositiveButton("OK", null).show();
            }, e -> {
                if ("auth".equals(e.code)) { dangXuat(e.getMessage()); return; }
                gui.setEnabled(true);
                gui.setText("GỬI ĐƠN NGHỈ");
                msg.setTextColor(C_BAD);
                msg.setText(e.getMessage());
            });
        });

        // Danh sách đơn
        JSONArray ds = me.optJSONArray("nghi");
        if (ds == null || ds.length() == 0) return;
        content.addView(space(12));
        LinearLayout l = card();
        l.addView(title("Đơn nghỉ của bạn", 17, C_TEXT));
        l.addView(space(6));
        String homNay = fmt("yyyy-MM-dd", new Date());
        for (int i = 0; i < ds.length(); i++) {
            final JSONObject n = ds.optJSONObject(i);
            boolean huy = "Đã hủy".equals(n.optString("trangThai"));
            LinearLayout r = new LinearLayout(this);
            r.setOrientation(LinearLayout.HORIZONTAL);
            r.setGravity(Gravity.CENTER_VERTICAL);
            r.setPadding(0, dp(8), 0, dp(8));
            LinearLayout left = new LinearLayout(this);
            left.setOrientation(LinearLayout.VERTICAL);
            left.addView(title(thuNgan(n.optString("ngay")) + " " + dmy(n.optString("ngay")) + " · " + n.optString("loaiTen"), 15, C_TEXT));
            String sub = (huy ? "Đã hủy" : "Đã gửi") + (n.optString("lyDo").isEmpty() ? "" : " · " + n.optString("lyDo"));
            left.addView(text(sub, 13, huy ? C_BAD : C_OK));
            r.addView(left, new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1));
            if (!huy && n.optString("ngay").compareTo(homNay) >= 0) {
                final TextView b = text("Hủy", 14, C_BAD);
                b.setPadding(dp(14), dp(8), dp(4), dp(8));
                b.setOnClickListener(v -> new AlertDialog.Builder(this)
                        .setMessage("Hủy đơn " + n.optString("loaiTen") + " ngày " + dmy(n.optString("ngay")) + "?")
                        .setPositiveButton("Hủy đơn", (d, w) -> {
                            b.setEnabled(false);
                            chay(() -> {
                                JSONObject req = base("cancelLeave");
                                req.put("id", n.optString("id"));
                                return Api.call(req);
                            }, res -> {
                                try { me.put("nghi", res.optJSONArray("nghi")); } catch (Exception ignored) { }
                                renderTab();
                            }, e -> {
                                if ("auth".equals(e.code)) { dangXuat(e.getMessage()); return; }
                                b.setEnabled(true);
                                new AlertDialog.Builder(this).setMessage(e.getMessage()).setPositiveButton("OK", null).show();
                            });
                        })
                        .setNegativeButton("Không", null).show());
                r.addView(b);
            }
            l.addView(r);
        }
        content.addView(l);
    }

    private void chonNgayNghi() {
        java.util.Calendar c = java.util.Calendar.getInstance(TZ);
        String[] p = ngayNghi.split("-");
        int y = Integer.parseInt(p[0]), m = Integer.parseInt(p[1]) - 1, d = Integer.parseInt(p[2]);
        android.app.DatePickerDialog dlg = new android.app.DatePickerDialog(this, (view, yy, mm, dd) -> {
            ngayNghi = String.format(Locale.ROOT, "%04d-%02d-%02d", yy, mm + 1, dd);
            renderTab();
        }, y, m, d);
        long now = c.getTimeInMillis();
        dlg.getDatePicker().setMinDate(now - 7L * 86400000L);
        dlg.getDatePicker().setMaxDate(now + 60L * 86400000L);
        dlg.show();
    }

    private View stats(String v1, String k1, String v2, String k2) {
        LinearLayout r = new LinearLayout(this);
        r.setOrientation(LinearLayout.HORIZONTAL);
        for (String[] s : new String[][]{{v1, k1}, {v2, k2}}) {
            LinearLayout b = new LinearLayout(this);
            b.setOrientation(LinearLayout.VERTICAL);
            b.addView(title(s[0], 22, C_PRIMARY));
            b.addView(text(s[1], 12, C_MUTED));
            r.addView(b, new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1));
        }
        return r;
    }

    private View dong(String k, String v, boolean show) {
        LinearLayout r = new LinearLayout(this);
        if (!show) { r.setVisibility(View.GONE); return r; }
        r.setPadding(0, dp(6), 0, dp(6));
        r.addView(text(k, 15, C_MUTED), new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1));
        r.addView(title(v, 15, C_TEXT));
        return r;
    }

    private View dongNgay(String trai, String phai, String sub, boolean ke) {
        LinearLayout box = new LinearLayout(this);
        box.setOrientation(LinearLayout.VERTICAL);
        box.setPadding(0, dp(8), 0, dp(8));
        LinearLayout r = new LinearLayout(this);
        r.addView(title(trai, 15, C_TEXT), new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1));
        r.addView(title(phai, 15, C_TEXT));
        box.addView(r);
        if (sub != null && !sub.isEmpty()) {
            TextView s = text(sub, 13, C_MUTED);
            s.setLineSpacing(dp(2), 1f);
            box.addView(s);
        }
        if (ke) {
            LinearLayout wrap = new LinearLayout(this);
            wrap.setOrientation(LinearLayout.VERTICAL);
            wrap.addView(box);
            View line = new View(this);
            line.setBackgroundColor(Color.parseColor("#EEF1EF"));
            wrap.addView(line, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(1)));
            return wrap;
        }
        return box;
    }

    private static String num(double x, int dec) {
        if (Math.abs(x - Math.rint(x)) < 1e-9) dec = 0;
        String s = String.format(Locale.ROOT, "%,." + dec + "f", x);
        return s.replace(",", "\u0001").replace(".", ",").replace("\u0001", ".");
    }

    private static String money(double x) { return num(Math.round(x), 0) + " đ"; }

    private static String kyTen(String ky) {
        String[] p = ky == null ? new String[0] : ky.split("-");
        return p.length == 2 ? "Kỳ " + p[1] + "/" + p[0] : ky;
    }

    private static String kyKhoang(String ky) {
        String[] p = ky == null ? new String[0] : ky.split("-");
        if (p.length != 2) return "";
        int m = Integer.parseInt(p[1]);
        int truoc = m == 1 ? 12 : m - 1;
        return String.format(Locale.ROOT, "26/%02d – 25/%02d", truoc, m);
    }

    private static String dmy(String iso) {
        String[] p = iso == null ? new String[0] : iso.split("-");
        return p.length == 3 ? p[2] + "/" + p[1] + "/" + p[0] : "";
    }

    private static String thuNgan(String iso) {
        try {
            SimpleDateFormat f = new SimpleDateFormat("yyyy-MM-dd", Locale.ROOT);
            f.setTimeZone(TZ);
            java.util.Calendar c = java.util.Calendar.getInstance(TZ);
            c.setTime(f.parse(iso));
            String[] t = {"CN", "T2", "T3", "T4", "T5", "T6", "T7"};
            return t[c.get(java.util.Calendar.DAY_OF_WEEK) - 1];
        } catch (Exception e) {
            return "";
        }
    }

    private void taiTrangThai(final boolean baoLoi) {
        if (!onMain) return;
        chay(() -> Api.call(base("status")), res -> {
            if (!onMain) return;
            JSONArray d = res.optJSONArray("diem");
            diem = d == null ? new JSONArray() : d;
            banKinh = res.optDouble("banKinh", 200);
            saiSoToiDa = res.optDouble("saiSoToiDa", 100);
            JSONObject p = res.optJSONObject("profile");
            if (p != null) sp.edit().putString("name", p.optString("name")).putString("team", p.optString("team")).apply();
            statusOk = true;
            statusErr = null;
            hienCa(res.optJSONObject("caMo"));
            hienLichSu(res.optJSONArray("ganDay"));
            capNhatGps();
        }, e -> {
            if ("auth".equals(e.code)) { dangXuat(e.getMessage()); return; }
            // Máy chủ còn bản code cũ (chưa có action 'status'): báo rõ để quản lý triển khai phiên bản mới.
            statusErr = e.getMessage().contains("Không rõ thao tác")
                    ? "Máy chủ chưa cập nhật bản mới cho app (FSC_WebApi.gs 06/11). Báo quản lý triển khai phiên bản mới."
                    : e.getMessage();
            capNhatGps();
            if (baoLoi || !statusOk) {
                tvShift.setText("Chưa tải được dữ liệu");
                tvMsg.setTextColor(C_BAD);
                tvMsg.setText(statusErr);
            }
        });
    }

    private void hienCa(JSONObject caMo) {
        JSONObject vao = caMo == null ? null : caMo.optJSONObject("vao");
        JSONObject ra = caMo == null ? null : caMo.optJSONObject("ra");
        if (vao == null) {
            dangTrongCa = false;
            tvShift.setText("Chưa vào ca");
            tvShift.setTextColor(C_MUTED);
        } else if (ra == null) {
            dangTrongCa = true;
            tvShift.setText("Đang trong ca · vào " + vao.optString("gio") + " ngày " + dm(vao.optString("ngay")));
            tvShift.setTextColor(C_OK);
        } else {
            dangTrongCa = false;
            tvShift.setText("Ca gần nhất: vào " + vao.optString("gio") + " – ra " + ra.optString("gio") + " (" + dm(vao.optString("ngay")) + ")");
            tvShift.setTextColor(C_TEXT);
        }
        capNhatNut();
    }

    private void hienLichSu(JSONArray ds) {
        if (ds == null || ds.length() == 0) { tvRecent.setText("Chưa có lượt chấm công."); return; }
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < ds.length(); i++) {
            JSONObject q = ds.optJSONObject(i);
            if (q == null) continue;
            String loai = "IN".equals(q.optString("loai")) ? "VÀO" : "OUT".equals(q.optString("loai")) ? "RA " : "—  ";
            sb.append(dm(q.optString("ngay"))).append("  ").append(q.optString("gio")).append("   ").append(loai);
            if (q.optBoolean("hopLe")) sb.append("   ✓");
            else sb.append("   ✗ ").append(q.optString("lyDo"));
            if (i < ds.length() - 1) sb.append('\n');
        }
        tvRecent.setText(sb.toString());
    }

    /* ------------------------------------------------------------------ */
    /* Chấm công                                                           */
    /* ------------------------------------------------------------------ */

    private void xacNhan(final String mode) {
        if (busy) return;
        final Location loc = viTriDung();
        if (loc == null || !trongVung) { capNhatGps(); return; }
        String gio = fmt("HH:mm", new Date());
        String loai = "IN".equals(mode) ? "GIỜ VÀO" : "GIỜ RA";
        String them = "";
        if ("IN".equals(mode) && dangTrongCa) them = "\n\nBạn đang trong ca (chưa xác nhận giờ ra). Chắc chắn muốn xác nhận GIỜ VÀO?";
        if ("OUT".equals(mode) && !dangTrongCa) them = "\n\nChưa thấy giờ vào của ca này. Chắc chắn muốn xác nhận GIỜ RA?";
        new AlertDialog.Builder(this)
                .setTitle("Xác nhận " + loai)
                .setMessage(loai + " lúc " + gio + "\nTại: " + tenDiem + " (cách " + khoangCach + " m)" + them)
                .setPositiveButton("Xác nhận", (d, w) -> guiChamCong(mode, loc))
                .setNegativeButton("Hủy", null)
                .show();
    }

    private void guiChamCong(final String mode, final Location loc) {
        busy = true;
        capNhatNut();
        tvMsg.setTextColor(C_MUTED);
        tvMsg.setText("Đang gửi…");
        chay(() -> {
            JSONObject req = base("scan");
            req.put("mode", mode);
            req.put("lat", loc.getLatitude());
            req.put("lng", loc.getLongitude());
            req.put("acc", Math.round(loc.getAccuracy()));
            req.put("mock", laViTriGia(loc));
            req.put("app", "android-" + phienBan());
            return Api.call(req);
        }, res -> {
            busy = false;
            boolean vao = "IN".equals(res.optString("loai"));
            String loai = vao ? "GIỜ VÀO" : "GIỜ RA";
            String msg;
            if (res.optBoolean("trungLap")) {
                msg = "Đã ghi nhận " + loai + " lúc " + res.optString("gio") + " trước đó (trong 5 phút). Không ghi thêm.";
            } else {
                msg = "Đã ghi nhận " + loai + " lúc " + res.optString("gio") + "\nTại " + res.optString("kho");
                if (!vao && !res.optString("gioVao").isEmpty()) msg += "\nCa vào lúc " + res.optString("gioVao");
            }
            String cb = res.optString("canhBao");
            if (!cb.isEmpty()) msg += "\n\n⚠ " + cb;
            tvMsg.setTextColor(C_OK);
            tvMsg.setText("✓ " + loai + " " + res.optString("gio"));
            new AlertDialog.Builder(this).setTitle(cb.isEmpty() ? "Thành công" : "Đã ghi nhận – có lưu ý")
                    .setMessage(msg).setPositiveButton("OK", null).show();
            taiTrangThai(false);
            taiMe(null);
            capNhatNut();
        }, e -> {
            busy = false;
            capNhatNut();
            if ("auth".equals(e.code)) { dangXuat(e.getMessage()); return; }
            tvMsg.setTextColor(C_BAD);
            tvMsg.setText(e.getMessage());
            new AlertDialog.Builder(this).setTitle("Chưa chấm công được").setMessage(e.getMessage())
                    .setPositiveButton("OK", null).show();
            taiTrangThai(false);
        });
    }

    private void capNhatNut() {
        if (btnIn == null) return;
        boolean ok = trongVung && !busy;
        styleButton(btnIn, ok ? C_PRIMARY : C_DISABLED);
        styleButton(btnOut, ok ? C_OUT : C_DISABLED);
        btnIn.setEnabled(ok);
        btnOut.setEnabled(ok);
        // Gợi ý nút nên bấm theo ca đang mở
        btnIn.setText(dangTrongCa ? "XÁC NHẬN GIỜ VÀO" : "▶  XÁC NHẬN GIỜ VÀO");
        btnOut.setText(dangTrongCa ? "▶  XÁC NHẬN GIỜ RA" : "XÁC NHẬN GIỜ RA");
    }

    /* ------------------------------------------------------------------ */
    /* GPS                                                                 */
    /* ------------------------------------------------------------------ */

    private boolean coQuyenViTri() {
        return checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED;
    }

    private boolean coQuyenGanDung() {
        return checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED;
    }

    private boolean dinhViBat() {
        try {
            return lm.isProviderEnabled(LocationManager.GPS_PROVIDER) || lm.isProviderEnabled(LocationManager.NETWORK_PROVIDER);
        } catch (Exception e) {
            return false;
        }
    }

    private void batViTri() {
        if (!coQuyenViTri()) {
            if (!sp.getBoolean("hoiQuyen", false) || shouldShowRequestPermissionRationale(Manifest.permission.ACCESS_FINE_LOCATION)) {
                sp.edit().putBoolean("hoiQuyen", true).apply();
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
        if (requestCode == REQ_LOC && onMain) {
            batViTri();
            capNhatGps();
        }
    }

    private void xuLyBamViTri() {
        if (!coQuyenViTri()) {
            if (shouldShowRequestPermissionRationale(Manifest.permission.ACCESS_FINE_LOCATION)) {
                requestPermissions(new String[]{Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION}, REQ_LOC);
            } else {
                Intent i = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, android.net.Uri.fromParts("package", getPackageName(), null));
                startActivity(i);
            }
        } else if (!dinhViBat()) {
            startActivity(new Intent(Settings.ACTION_LOCATION_SOURCE_SETTINGS));
        } else {
            taiTrangThai(true);
        }
    }

    private long tuoiMs(Location l) {
        return (SystemClock.elapsedRealtimeNanos() - l.getElapsedRealtimeNanos()) / 1000000L;
    }

    /** Vị trí mới nhất còn dùng được (không quá 60 giây). */
    private Location viTriDung() {
        if (best == null || tuoiMs(best) > VI_TRI_CU_MS) return null;
        return best;
    }

    @SuppressWarnings("deprecation")
    private boolean laViTriGia(Location l) {
        if (l == null) return false;
        if (Build.VERSION.SDK_INT >= 31) return l.isMock();
        return l.isFromMockProvider();
    }

    @Override
    public void onLocationChanged(Location l) {
        if (l == null) return;
        if (tuoiMs(l) > VI_TRI_CU_MS) return;
        if (best == null || tuoiMs(best) > 15000 || laViTriGia(l)
                || l.getAccuracy() <= best.getAccuracy() + 5
                || LocationManager.GPS_PROVIDER.equals(l.getProvider())) {
            best = l;
        }
        if (onMain) capNhatGps();
    }

    // Bắt buộc khai báo đủ để chạy được trên Android 8–10.
    @Override public void onStatusChanged(String provider, int status, Bundle extras) { }
    @Override public void onProviderEnabled(String provider) { if (onMain) capNhatGps(); }
    @Override public void onProviderDisabled(String provider) { if (onMain) capNhatGps(); }

    private void capNhatGps() {
        if (tvGps == null) return;
        boolean vung = false;
        if (!coQuyenViTri()) {
            setGps(coQuyenGanDung() ? "Cần bật “Vị trí chính xác”" : "Chưa cho phép dùng vị trí",
                    "Chạm vào đây → Quyền → Vị trí → Cho phép khi dùng ứng dụng + Vị trí chính xác.", C_BAD);
        } else if (!dinhViBat()) {
            setGps("Định vị (GPS) đang tắt", "Chạm vào đây để bật Vị trí trên điện thoại.", C_BAD);
        } else {
            Location l = viTriDung();
            if (l == null) {
                setGps("Đang lấy vị trí GPS…", "Đứng chỗ thoáng, chờ vài giây.", C_WARN);
            } else if (laViTriGia(l)) {
                setGps("Phát hiện vị trí giả lập", "Tắt ứng dụng giả lập vị trí (Fake GPS) để chấm công.", C_BAD);
            } else if (!statusOk && statusErr != null) {
                setGps("Chưa tải được điểm chấm công", statusErr + "\nChạm vào đây để thử lại.", C_BAD);
            } else if (!statusOk) {
                setGps("Đang tải điểm chấm công…", "Chờ vài giây.", C_WARN);
            } else if (diem.length() == 0) {
                setGps("Chưa có tọa độ kho", "Báo quản lý điền Vĩ độ / Kinh độ của kho trong tab DiemQuet.", C_BAD);
            } else {
                // Điểm chấm công gần nhất
                double minD = Double.MAX_VALUE;
                String ten = "";
                double bk = banKinh;
                float[] out = new float[1];
                for (int i = 0; i < diem.length(); i++) {
                    JSONObject d = diem.optJSONObject(i);
                    if (d == null) continue;
                    Location.distanceBetween(l.getLatitude(), l.getLongitude(), d.optDouble("lat"), d.optDouble("lng"), out);
                    if (out[0] < minD) {
                        minD = out[0];
                        String kho = d.optString("kho");
                        ten = kho.isEmpty() ? d.optString("ma") : kho;
                        bk = d.optDouble("banKinh", banKinh);
                    }
                }
                int kc = (int) Math.round(minD);
                int acc = Math.round(l.getAccuracy());
                tenDiem = ten;
                khoangCach = kc;
                String sub = "Cách " + ten + " " + kc + " m · sai số ±" + acc + " m · phạm vi " + (int) bk + " m";
                if (acc > saiSoToiDa) {
                    setGps("Tín hiệu GPS yếu", sub + "\nRa chỗ thoáng, chờ vài giây.", C_WARN);
                } else if (kc > bk) {
                    setGps("Ngoài vùng chấm công", sub, C_BAD);
                } else {
                    setGps("Trong vùng chấm công ✓", sub, C_OK);
                    vung = true;
                }
            }
        }
        if (vung != trongVung) {
            trongVung = vung;
            capNhatNut();
        }
    }

    private void setGps(String t, String sub, int color) {
        tvGps.setText(t);
        tvGps.setTextColor(color);
        tvGpsSub.setText(sub);
    }

    /* ------------------------------------------------------------------ */
    /* Tiện ích                                                            */
    /* ------------------------------------------------------------------ */

    interface Job { JSONObject run() throws Exception; }
    interface Ok { void on(JSONObject res); }
    interface Fail { void on(Api.ApiError e); }

    private void chay(final Job job, final Ok ok, final Fail fail) {
        new Thread(() -> {
            try {
                final JSONObject res = job.run();
                ui.post(() -> { if (!isFinishing()) ok.on(res); });
            } catch (final Api.ApiError e) {
                ui.post(() -> { if (!isFinishing()) fail.on(e); });
            } catch (final Exception e) {
                ui.post(() -> { if (!isFinishing()) fail.on(new Api.ApiError("Có lỗi: " + e.getMessage(), "")); });
            }
        }).start();
    }

    private JSONObject base(String action) throws Exception {
        JSONObject o = new JSONObject();
        o.put("action", action);
        o.put("deviceId", deviceId());
        String token = sp.getString("token", "");
        if (!token.isEmpty()) o.put("token", token);
        return o;
    }

    /** Device ID của app: "APP-" + ANDROID_ID (giữ nguyên khi cài lại app cùng chữ ký). */
    private String deviceId() {
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

    private String phienBan() {
        try { return getPackageManager().getPackageInfo(getPackageName(), 0).versionName; } catch (Exception e) { return "1.0"; }
    }

    private static String fmt(String p, Date d) {
        SimpleDateFormat f = new SimpleDateFormat(p, Locale.ROOT);
        f.setTimeZone(TZ);
        return f.format(d);
    }

    private static String thu(Date d) {
        java.util.Calendar c = java.util.Calendar.getInstance(TZ);
        c.setTime(d);
        String[] t = {"Chủ nhật", "Thứ hai", "Thứ ba", "Thứ tư", "Thứ năm", "Thứ sáu", "Thứ bảy"};
        return t[c.get(java.util.Calendar.DAY_OF_WEEK) - 1];
    }

    private static String dm(String iso) {
        String[] p = iso == null ? new String[0] : iso.split("-");
        return p.length == 3 ? p[2] + "/" + p[1] : "";
    }

    private void anBanPhim(View v) {
        InputMethodManager imm = (InputMethodManager) getSystemService(Context.INPUT_METHOD_SERVICE);
        if (imm != null) imm.hideSoftInputFromWindow(v.getWindowToken(), 0);
    }

    private int dp(float v) { return Math.round(v * getResources().getDisplayMetrics().density); }

    private LinearLayout page() {
        LinearLayout l = new LinearLayout(this);
        l.setOrientation(LinearLayout.VERTICAL);
        l.setPadding(dp(18), dp(18), dp(18), dp(24));
        return l;
    }

    private ScrollView scroll(View child) {
        ScrollView s = new ScrollView(this);
        s.setBackgroundColor(C_BG);
        s.setFillViewport(true);
        s.addView(child);
        return s;
    }

    private LinearLayout card() {
        LinearLayout l = new LinearLayout(this);
        l.setOrientation(LinearLayout.VERTICAL);
        l.setPadding(dp(16), dp(14), dp(16), dp(14));
        GradientDrawable g = new GradientDrawable();
        g.setColor(Color.WHITE);
        g.setCornerRadius(dp(14));
        g.setStroke(dp(1), Color.parseColor("#E1E6E3"));
        l.setBackground(g);
        l.setLayoutParams(new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT));
        return l;
    }

    private TextView text(String s, float sp, int color) {
        TextView t = new TextView(this);
        t.setText(s);
        t.setTextSize(sp);
        t.setTextColor(color);
        return t;
    }

    private TextView title(String s, float sp, int color) {
        TextView t = text(s, sp, color);
        t.setTypeface(Typeface.DEFAULT_BOLD);
        return t;
    }

    private TextView label(String s) {
        TextView t = text(s, 12, C_MUTED);
        t.setTypeface(Typeface.DEFAULT_BOLD);
        t.setLetterSpacing(0.06f);
        t.setPadding(0, 0, 0, dp(4));
        return t;
    }

    private View space(int h) {
        View v = new View(this);
        v.setLayoutParams(new LinearLayout.LayoutParams(1, dp(h)));
        return v;
    }

    private EditText input(String hint, int type) {
        EditText e = new EditText(this);
        e.setHint(hint);
        e.setInputType(type);
        e.setSingleLine(true);
        e.setTextSize(18);
        e.setTextColor(C_TEXT);
        e.setPadding(dp(12), dp(12), dp(12), dp(12));
        GradientDrawable g = new GradientDrawable();
        g.setColor(Color.parseColor("#F7F9F8"));
        g.setCornerRadius(dp(10));
        g.setStroke(dp(1), Color.parseColor("#CBD3CF"));
        e.setBackground(g);
        return e;
    }

    private Button bigButton(String s, int color) {
        Button b = new Button(this);
        b.setText(s);
        b.setTextSize(18);
        b.setTypeface(Typeface.DEFAULT_BOLD);
        b.setTextColor(Color.WHITE);
        b.setAllCaps(false);
        b.setStateListAnimator(null);
        b.setLayoutParams(new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(64)));
        styleButton(b, color);
        return b;
    }

    private void styleButton(Button b, int color) {
        GradientDrawable g = new GradientDrawable();
        g.setColor(color);
        g.setCornerRadius(dp(14));
        b.setBackground(g);
    }
}
