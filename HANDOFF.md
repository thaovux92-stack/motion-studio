# Trạng thái bàn giao Motion Studio

## Mục tiêu và các quyết định

Người dùng muốn editor kiểu CapCut có thể mở/chỉnh trong Claude Desktop qua MCP Apps khi gõ “tạo video…”. Đã bổ sung định tuyến “sửa video…”, “chỉnh sửa clip…”, “đổi tiêu đề…”, “thêm chữ…”, “đổi hiệu ứng…”. Toàn bộ font đổi thành Be Vietnam Pro. iPad là thiết bị ưu tiên để thử giao diện trước.

Đây là toàn bộ mã nguồn của dự án Motion Studio, kèm các gói build, font/giấy phép, test, skill, cấu hình mẫu và script phát triển. Không phải bản sao toàn bộ portfolio thaoux hay các dự án khác trong đó.

## Hiện trạng đã chạy được

Editor HTML/JS/CSS không framework, build bằng esbuild. Media, nhiều lớp chữ, font/cỡ/màu/vị trí/xoay, opacity, 5 hiệu ứng; timeline kéo/trim/tách/nhân đôi/xóa/undo/redo/tua/zoom; safe zone; 9:16, 16:9, 1:1; lưu/mở JSON. Xuất Canvas + MediaRecorder 720p/1080p, âm thanh media, MP4 nếu trình duyệt hỗ trợ, còn lại WebM. Font Be Vietnam Pro weight 400–900 nhúng trong HTML.

MCP stdio có 5 công cụ: open_video_editor, get_video_project, update_video_project, save_video_project (UI), import_video_asset. Trạng thái có revision; UI và Claude đọc bản mới trước khi sửa. MCP App resource là ui://motion-studio/editor.html. Không cần API key riêng cho server.

UI iPad 701–1366 CSS px: bảng tài nguyên/thuộc tính đóng mở, nút 44 px, kéo bằng cảm ứng, xử lý safe area/bàn phím, preview và xuất mặc định 720p, lưu video qua chia sẻ tệp khi hỗ trợ hoặc download.

## Cấu trúc và lệnh

- src/: UI, CSS, schema dữ liệu, renderer Canvas.
- mcp/: tool server và file store; app/: HTML, MCPB, desktop ZIP và skill ZIP đã build.
- assets/fonts/: Be Vietnam Pro cùng SIL OFL; THIRD_PARTY_NOTICES trong app.
- skill/video-studio/: skill gốc; .claude/skills/video-studio/: hướng dẫn dùng với Claude Code.
- scripts/serve.mjs: HTTP phục vụ app, không có upload/API đọc file tùy ý; scripts/configure-claude.mjs: tạo cấu hình máy hiện tại; scripts/package-handoff.mjs: tạo lại gói chuyển giao.
- test/: model/MCP/bundle, browser/MCP iframe và iPad. Test browser dùng playwright-core và browser đã có qua CHROME_BIN.

`npm ci`, `npm run build`, `npm test`; `npm run web`; `npm start` chạy MCP stdio. `npm run package:claude` tạo app/motion-studio-claude-code.zip sau khi build. CHROME_BIN và MOTION_QA_URL có thể đặt cho các script QA; MOTION_QA_OUTPUT đặt nơi lưu bằng chứng. MOTION_QA_REFERENCE tùy chọn đường dẫn ảnh tham khảo để tạo ảnh so sánh.

## Dữ liệu và tích hợp

Web: IndexedDB trong trình duyệt hiện tại. MCP: thư mục UPLOAD_DIR/motion-studio hoặc ~/.motion-studio trên máy chạy server. Cả hai không tự đồng bộ. Chuyển một video từ web bằng nút Lưu dự án JSON, sau đó cho Claude Code đọc/nhập file đó; từ MCP sang web dùng đúng JSON của projectId rồi “Mở dự án JSON”. Không có dữ liệu người dùng trong gói.

Website gốc https://thaoux.com/projects/motion-studio/ dùng access gate và MariaDB của repo cha. Mật khẩu chỉ có mã băm trong DB; không được mang vào gói. Khi chuyển máy, chạy web độc lập không cần gate này. Không mang nguyên cơ chế đăng nhập owner của thaoux vào server phát triển mới.

Repo gốc: thaovux92-stack/thaoux, nhánh main, thư mục projects/motion-studio. Commit và checksum của snapshot ghi trong PACKAGE-MANIFEST.json trong ZIP. Thay đổi gate ngoài dự án ở commit f67c869 chỉ thêm Cache-Control: private, no-store cho trang mật khẩu; không cần cho bản web độc lập. Muốn làm tiếp trong repo gốc hãy clone repo rồi chỉnh đúng thư mục, không push nội dung ZIP thành root repo thaoux.

## Kiểm thử và giới hạn

Đã kiểm trước bàn giao: 4 kiểm thử model/MCP/bundle; browser desktop/mobile, MCP handshake, UI save, model update, gửi prompt, export/download; iPad mô phỏng 7 kích thước và thao tác chạm; xuất 720p/1080p có media. Bằng chứng/ảnh lịch sử ở design-qa.md. Gói đã được giải nén ngoài repo: npm ci, build, 5 kiểm thử, cấu hình stdio từ cwd khác, browser và iPad đều qua. Xem handoff/verification.json và ảnh trong handoff/.

Chưa xác minh trực tiếp Claude Desktop, Claude Code thực hoặc Safari trên iPad thật ở máy người dùng. Chưa có bridge đồng bộ web–MCP tự động, keyframe tự do, phụ đề tự nhận diện, xuất draft CapCut hoặc server render MP4. Các bộ skill animation/motion bên thứ ba chưa được cung cấp; chỉ có hợp đồng ánh xạ hiệu ứng đang hỗ trợ. Định tuyến câu tự nhiên do mô hình thực hiện, không có hook chặn mọi prompt theo tiền tố.

MCP Apps UI cần host hỗ trợ; không cam kết terminal Claude Code render iframe. Preview web là cách thử UI độc lập. Xuất hiện tại theo thời gian thực, phải giữ tab hoạt động; codec phụ thuộc trình duyệt.

Kiểm thử root repo thaoux trước đây có 1 lỗi DB phân quyền không thuộc Motion Studio (test/village-research-store-db.test.js:93); không mang dependency DB hay test đó vào gói độc lập. Lần sửa gate riêng gần nhất có 51 kiểm thử access/app qua. Không suy ra whole repo hoàn toàn xanh từ test dự án này.
