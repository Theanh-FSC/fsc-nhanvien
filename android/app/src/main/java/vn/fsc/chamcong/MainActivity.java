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
        card.addView(label("Mã nhân viên"));
        card.addView(edCode);
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

    private void showMain() {
        onMain = true;
        LinearLayout root = page();

        // Đầu trang: tên + đăng xuất
        LinearLayout head = new LinearLayout(this);
        head.setOrientation(LinearLayout.HORIZONTAL);
        head.setGravity(Gravity.CENTER_VERTICAL);
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
        root.addView(head);
        root.addView(space(14));

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
        TextView lb = label("CHẤM CÔNG 7 NGÀY GẦN ĐÂY");
        hh.addView(lb, new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1));
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

        setContentView(scroll(root));
        capNhatNut();
        batViTri();
        ui.removeCallbacks(tick);
        ui.post(tick);
        taiTrangThai(false);
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
            hienCa(res.optJSONObject("caMo"));
            hienLichSu(res.optJSONArray("ganDay"));
            capNhatGps();
        }, e -> {
            if ("auth".equals(e.code)) { dangXuat(e.getMessage()); return; }
            if (baoLoi || tvShift.getText().toString().equals("…")) {
                tvShift.setText("Chưa tải được dữ liệu");
                tvMsg.setText(e.getMessage());
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
            } else if (diem.length() == 0) {
                setGps("Chưa có tọa độ kho", "Đang tải điểm chấm công… Nếu vẫn báo vậy, báo quản lý cài tọa độ kho.", C_WARN);
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
