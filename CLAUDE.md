# Motion Studio — bàn giao cho Claude Code

Đọc START-HERE.md và HANDOFF.md trước khi sửa. Đây là mã nguồn editor video đang chạy, không phải bản mockup. Giao tiếp bằng tiếng Việt.

## Yêu cầu đã chốt

- Bố cục editor tương tự CapCut: media, preview, thuộc tính, timeline.
- Font duy nhất Be Vietnam Pro cho UI, preview và video xuất; giữ đủ dấu tiếng Việt và weight 400–900, nhúng font trong bản build.
- Ưu tiên iPad ngang/dọc, thao tác chạm; nút chính tối thiểu 44 px. Không làm mất khả năng dùng desktop.
- Claude Desktop dùng MCP Apps. Tạo video qua “tạo video…”, sửa tiếp qua “sửa video…”, “chỉnh sửa clip…” hoặc câu theo ngữ cảnh; khi sửa giữ projectId và đọc revision mới.
- Giữ các phần không liên quan khi sửa dự án. Không đưa lớp demo vào video đã nhận brief mà không thay nội dung.
- Làm tiếp các bước cần thiết trong phạm vi yêu cầu, tránh hỏi xác nhận lặp lại. Không suy ra quyền phát hành công khai hay chia sẻ dữ liệu từ yêu cầu sửa code.

## Các lệnh

Node.js >=20.19. `npm ci`, `npm run build`, `npm test`. `npm run web` mở HTTP độc lập tại 0.0.0.0:$PORT, mặc định 3000. `npm start` là MCP stdio, không phải HTTP; giữ stdout chỉ dành cho giao thức.

`npm run claude:config` tạo/ghép .mcp.json với đường dẫn tuyệt đối trên máy hiện tại. Không commit file này. Skill cho Claude Code nằm trong .claude/skills/video-studio; bản gốc cho Desktop trong skill/video-studio.

Browser QA: đặt CHROME_BIN tới Chromium/Chrome đã cài, không tải browser tự động trong môi trường thaoux-dev. Đặt MOTION_QA_URL nếu test địa chỉ khác http://127.0.0.1:3000/. `npm run test:browser` và `npm run test:ipad`. Bắt buộc đóng browser sau khi dùng. Không gọi mô phỏng Chromium là kiểm thử Safari/iPad thật.

## Ranh giới và dữ liệu

src/ là nguồn; app/index.html, MCPB/ZIP do build.mjs tạo. Sửa nguồn rồi build. Schema video ở src/model.mjs; renderer ở src/renderer.mjs; app.mjs xử lý UI và MCP bridge. MCP store lưu ngoài code tại UPLOAD_DIR/motion-studio hoặc ~/.motion-studio. Không dùng database cho bản độc lập.

Browser web và MCP là hai kho dự án riêng; chưa có bridge đồng bộ tự động. Không tuyên bố prompt trên web hoạt động khi chưa handshake MCP host. Không tuyên bố Claude Code terminal hiển thị editor nhúng. Các giới hạn sản phẩm nằm trong HANDOFF.md.

Không commit node_modules, upload, .env, mật khẩu, token, project JSON cá nhân hoặc browser storage. Gói không chứa dữ liệu riêng; để chuyển một video đang sửa, người dùng tải JSON từ editor.

## Git và môi trường gốc

Nếu có git remote đã cấu hình: pull trước việc mới; khi một việc hoàn chỉnh đã chạy được, commit tiếng Việt và push theo quyền người dùng đã cấp. Dừng khi pull/push có xung đột; không force push. ZIP không có .git, không tự gắn remote vào repo thaoux hoặc đẩy nhầm toàn bộ root.

Nếu đang trong /code/thaoux: áp dụng AGENTS.md của repo. App chạy nhánh chính, restart bằng touch /code/thaoux/.restart; xem /logs/app.log; kiểm tra http://thaoux-app:3000. Code ở projects/motion-studio. Khi ở máy khác, các đường dẫn/container này không tồn tại: dùng npm run web.
