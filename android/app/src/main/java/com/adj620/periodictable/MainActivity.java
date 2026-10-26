package com.adj620.periodictable;

import android.app.DownloadManager;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.webkit.DownloadListener;
import android.widget.Toast;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // 안드로이드 WebView 다운로드 리스너: APK/ZIP 다운로드 클릭 시 시스템 DownloadManager로 자동 다운로드 실행
        if (bridge != null && bridge.getWebView() != null) {
            bridge.getWebView().setDownloadListener(new DownloadListener() {
                @Override
                public void onDownloadStart(String url, String userAgent, String contentDisposition, String mimetype, long contentLength) {
                    try {
                        DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
                        String filename = "periodic-table.apk";
                        request.setTitle("원소 주기율표 최신 업데이트 다운로드");
                        request.setDescription("최신 버전 APK 파일을 다운로드 중입니다...");
                        request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                        request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, filename);
                        request.setMimeType("application/vnd.android.package-archive");

                        DownloadManager dm = (DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE);
                        if (dm != null) {
                            dm.enqueue(request);
                            Toast.makeText(MainActivity.this, "📥 최신 업데이트 다운로드를 시작합니다. 상단 알림창을 확인하세요.", Toast.LENGTH_LONG).show();
                        } else {
                            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                            startActivity(intent);
                        }
                    } catch (Exception e) {
                        try {
                            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                            startActivity(intent);
                        } catch (Exception ex) {
                            Toast.makeText(MainActivity.this, "다운로드 실패: " + ex.getMessage(), Toast.LENGTH_LONG).show();
                        }
                    }
                }
            });
        }
    }
}
