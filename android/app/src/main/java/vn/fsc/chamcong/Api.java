package vn.fsc.chamcong;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/** Gọi Apps Script FSC_WebApi (cùng máy chủ với web nhân viên). Chạy trên luồng nền. */
final class Api {
    static final String API_URL =
            "https://script.google.com/macros/s/AKfycbwPZitbwnMuiqy4u0_2gQQJR57l03DPp50CYgab-d_RjQYavIznZyz_8P25tC86cGd-/exec";

    /** Lỗi trả về từ máy chủ (ok = false). */
    static final class ApiError extends Exception {
        final String code;
        ApiError(String msg, String code) { super(msg); this.code = code == null ? "" : code; }
    }

    private Api() {}

    /** POST JSON; tự thử lại 3 lần (2/4/6 giây) khi máy chủ báo bận. */
    static JSONObject call(JSONObject body) throws Exception {
        long[] cho = {2000, 4000, 6000};
        for (int lan = 0; ; lan++) {
            JSONObject res;
            try {
                res = postOnce(body);
            } catch (ApiError e) {
                throw e;
            } catch (Exception e) {
                throw new ApiError("Không kết nối được máy chủ. Kiểm tra mạng (4G/Wi-Fi) rồi thử lại.", "net");
            }
            if (res.optBoolean("ok", false)) return res;
            String code = res.optString("code", "");
            if ("busy".equals(code) && lan < cho.length) {
                Thread.sleep(cho[lan]);
                continue;
            }
            throw new ApiError(res.optString("error", "Máy chủ gặp lỗi, vui lòng thử lại."), code);
        }
    }

    private static JSONObject postOnce(JSONObject body) throws Exception {
        byte[] data = body.toString().getBytes("UTF-8");
        HttpURLConnection c = (HttpURLConnection) new URL(API_URL).openConnection();
        c.setInstanceFollowRedirects(false);
        c.setConnectTimeout(20000);
        c.setReadTimeout(45000);
        c.setRequestMethod("POST");
        c.setDoOutput(true);
        c.setRequestProperty("Content-Type", "text/plain;charset=utf-8");
        OutputStream os = c.getOutputStream();
        os.write(data);
        os.close();
        int status = c.getResponseCode();
        // Apps Script trả 302 sang script.googleusercontent.com: đọc kết quả bằng GET.
        int hops = 0;
        while (status >= 300 && status < 400 && hops < 5) {
            String loc = c.getHeaderField("Location");
            c.disconnect();
            if (loc == null) break;
            c = (HttpURLConnection) new URL(loc).openConnection();
            c.setInstanceFollowRedirects(false);
            c.setConnectTimeout(20000);
            c.setReadTimeout(45000);
            c.setRequestMethod("GET");
            status = c.getResponseCode();
            hops++;
        }
        InputStream is = status >= 400 ? c.getErrorStream() : c.getInputStream();
        String text = is == null ? "" : readAll(is);
        c.disconnect();
        try {
            return new JSONObject(text);
        } catch (Exception e) {
            throw new ApiError("Máy chủ trả về dữ liệu không đọc được (HTTP " + status + "). Thử lại sau.", "bad");
        }
    }

    private static String readAll(InputStream is) throws Exception {
        ByteArrayOutputStream bo = new ByteArrayOutputStream();
        byte[] buf = new byte[8192];
        int n;
        while ((n = is.read(buf)) > 0) bo.write(buf, 0, n);
        is.close();
        return bo.toString("UTF-8");
    }
}
