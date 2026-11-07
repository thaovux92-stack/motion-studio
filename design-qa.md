# Kiểm tra Motion Studio

final result: passed

Mục tiêu là giao diện editor tương tự vùng làm việc trong ảnh người dùng cung cấp, chuyển thành app desktop responsive. Không phải tái tạo màn hình TikTok bao quanh hoặc sao chép pixel từ ảnh chụp nghiêng.

## Bằng chứng

- Nguồn: `/tmp/codex-remote-attachments/01a1b3b7-1145-7121-8c34-6a130540932c/EE9654E0-965A-4F7C-9CCB-5E095801027E/1-Ảnh-1.jpg` (ảnh 590 × 1280; editor là một phần ảnh chụp màn hình).
- Desktop: `/tmp/motion-studio-qa/desktop.png`, viewport 1440 × 900 CSS px, deviceScaleFactor 1, ảnh 1440 × 900; trạng thái mẫu mặc định, chọn lớp tiêu đề, paused tại 1.2 giây.
- Mobile: `/tmp/motion-studio-qa/mobile.png`, viewport 390 × 844 CSS px, ảnh toàn trang; state sau khi nhập clip và tách. Mobile cho cuộn dọc để giữ khung preview và các thao tác có thể dùng được.
- MCP: `/tmp/motion-studio-qa/mcp-iframe.png`, host viewport 1440 × 1050, sandbox `allow-scripts allow-downloads` không có allow-forms hoặc allow-same-origin. Dùng AppBridge chính thức, dữ liệu từ server MCP thật.
- So sánh chung: `/tmp/motion-studio-qa/comparison.png`, đặt phần editor trong ảnh nguồn và ảnh desktop trên cùng một hình. Nguồn được crop để bỏ phần lớn giao diện TikTok; ảnh implementation thu nhỏ từ 1440 × 900 để so bố cục. Đây là so sánh cấu trúc và thứ bậc, không đo độ lệch pixel của ảnh chụp nghiêng.
- Vùng chi tiết: đã mở desktop ở độ phân giải gốc để kiểm bảng chữ, timeline, header và lựa chọn lớp; đã mở ảnh iframe sau khi cập nhật từ model. Những chi tiết nhỏ trong nguồn không đủ nét để suy ra chính xác font, cỡ hay token màu gốc.

## Đánh giá

- Typography: font Geist nhúng, có bộ tiếng Việt và Latin. Nội dung video dùng font nhúng, UI và timeline dùng cỡ nhỏ theo bố cục editor. Sửa lỗi dấu tiếng Việt ở canvas do font môi trường không đầy đủ; tăng cỡ thông điệp mẫu từ 34 lên 44 px tại canvas 1080p. Không nhận là khớp font gốc từ ảnh không rõ.
- Layout: tài nguyên bên trái, preview trung tâm, thuộc tính bên phải và timeline dưới. Desktop không che toolbar; panel dài cuộn độc lập. Mobile đưa tài nguyên xuống dưới timeline, thuộc tính mở thành panel khi chọn lớp, không tràn ngang. Đây là điều chỉnh có chủ đích cho bố cục sử dụng được trên điện thoại.
- Màu: nền sáng trung tính, lớp video màu peach, accent tím, timeline dùng màu theo loại lớp. Đây là hướng màu thống nhất để phân biệt vùng làm việc, không tuyên bố lấy đúng palette ảnh nguồn.
- Hình ảnh: không dùng ảnh chụp người trong video làm tài sản của app. Preview mặc định là nội dung chữ được renderer vẽ; khi nhập video/ảnh, app hiển thị media thật. Icon Phosphor có giấy phép, không dùng hình vẽ giả làm asset.
- Nội dung: tiếng Việt, tên thao tác gắn với chữ, hiệu ứng, timeline, vùng an toàn, lưu và xuất. Chế độ web ghi chưa kết nối Claude; chỉ hiện đã kết nối khi handshake MCP thành công.

Không còn phát hiện P0/P1/P2 có thể hành động trong phạm vi editor này. Dấu và chữ đã đọc được; điều khiển bị che trong panel dài có thể tiếp cận bằng cuộn. Font serif/mono dựa vào font của runtime, chưa có font nhúng riêng.

## Lịch sử sửa và kiểm lại

1. Canvas dùng fallback font không ổn định với tiếng Việt: đã nhúng Geist; capture desktop và iframe mới xác nhận dấu được hiển thị.
2. Thay đổi thuộc tính khi blur gây render lồng và lỗi replaceChildren: đã thêm guard khi render; kiểm lại toàn bộ luồng browser không còn pageerror.
3. Prompt dùng submit form bị sandbox MCP chặn: chuyển nút gửi sang button thường, gửi qua SDK; test trong iframe không có allow-forms xác nhận host nhận message.

## Kiểm thử

- `npm run build`: thành công, HTML tự chứa, server bundle, MCPB/ZIP/skill ZIP.
- `npm test` tại dự án: 4/4 qua, gồm tool/resource MCP, revision, media, chặn URL/SVG, gói stdio chạy không node_modules từ cwd khác.
- Browser: chỉnh chữ rồi reload giữ nội dung; nhân đôi, xóa, undo/redo; đổi aspect; kéo lớp; bật safe zone; nhập PNG/WAV; xuất MP4 1080 × 1920 có track âm thanh và phát lại được; nhập MP4 đã xuất và tách clip (trimStart của đoạn sau được giữ).
- MCP iframe: handshake; lưu UI; đọc lại server; model sửa tiếp và UI nhận lại; gửi prompt về host; xuất và tải video qua `downloadFile`.
- Console/page errors trong lượt cuối: 0.
- Manifest: công cụ chính thức `@anthropic-ai/mcpb` xác thực thành công.
- Repo: `npm run check` qua. `npm test` repo: 1760/1761 qua; một test phân quyền MariaDB ở `test/village-research-store-db.test.js:93` lỗi và tái hiện khi chạy riêng. Không sửa code hay test thuộc phần đó.

## Giới hạn bàn giao

Chưa cài hoặc chạy trong ứng dụng Claude Desktop thật trên máy người dùng; đã kiểm với giao thức SDK, sandbox iframe và bundle stdio. Cần cài MCPB và skill/Project Instructions trên máy đó. Bộ skill motion bên ngoài chưa được cung cấp; gói có hợp đồng lớp và hướng dẫn dùng các skill có sẵn. Chưa có xuất project CapCut hay keyframe tự do.

## Cập nhật iPad — 2026-11-07

- Bố cục cảm ứng 2 cột: thanh công cụ và vùng preview/timeline; Media và Thuộc tính là bảng đóng/mở. Điều khiển chính 44 px, cạnh trim rộng hơn, chữ nhập 16 px, có safe-area và điều chỉnh bảng theo visualViewport khi bàn phím mở.
- Xem trước mặc định 720p và xuất mặc định 720p trên thiết bị cảm ứng; nút Lưu video gọi chia sẻ tệp khi có hỗ trợ, còn lại tải xuống. Chỉ lưu sau thao tác chạm của người dùng.
- Đã sửa nút Undo/Redo không cập nhật sau khi kéo clip, kéo chữ hoặc chỉnh bằng thanh trượt. Sửa chọn nhầm font Latin-ext khi build font Latin; giữ đủ dấu tiếng Việt. Rà ảnh đã phát hiện và sửa ô cỡ chữ lấn ô chọn font.
- Viewport: 820×1180, 1180×820, 768×1024, 1024×768, 744×1133, 1024×1366, 1366×1024 CSS px; deviceScaleFactor 2, hasTouch, isMobile. Không tràn ngang, khung xem trước và toolbar nằm trong màn hình; bảng mở/đóng dùng được.
- Ảnh gốc tại /tmp/motion-studio-ipad/ipad-WxH.png và ipad-properties.png; đã mở ảnh ngang, dọc và bảng thuộc tính để kiểm tra.
- test/ipad-qa.mjs: sự kiện chạm qua CDP để chọn, kéo, trim, tua và di chuyển chữ; hoàn tác khôi phục vị trí/độ dài; reload giữ chữ; xuất và tải video 720p. Chờ trình duyệt kết thúc nhận diện cử chỉ trước khi chạm nút kế tiếp. Kết quả: /tmp/motion-studio-ipad/results.json.
- Kiểm lại test/browser-qa.mjs: desktop/mobile, xuất 1080p, nhập/tách clip, MCP handshake, lưu UI, model sửa tiếp, prompt và tải qua host đều qua; không có pageerror. npm test tại dự án 4/4 và npm run check ở repo đều qua.

Đây là Chromium mô phỏng kích thước và cảm ứng iPad, không phải Safari trên thiết bị thật. Chưa xác minh bàn phím, hiệu năng, codec Safari và bảng chia sẻ iPadOS thực tế. Bản web cần đăng nhập Studio và chưa tự đồng bộ với MCP Desktop; dùng JSON để chuyển dự án.

## Be Vietnam Pro và câu lệnh sửa video — v1.1.0

- Thay font UI, canvas và mọi lớp chữ bằng Be Vietnam Pro. Nhúng đủ weight 400–900, các bộ Latin, Latin-ext và tiếng Việt; tải font trước khi vẽ. Xóa asset Geist cũ, cập nhật giấy phép SIL OFL trong bundle. Khóa font serif/mono trong dự án cũ vẫn đọc được và hiển thị Be Vietnam Pro.
- Skill và MCP instructions nhận sửa video, chỉnh video, chỉnh sửa video/clip, sửa clip, biên tập video, edit video và câu ngắn khi đang ở ngữ cảnh video. Hướng dẫn giữ projectId, đọc revision mới, bảo toàn lớp không liên quan; hỏi mục tiêu khi chưa rõ. Đây là định tuyến của mô hình, không phải parser hoặc bộ chặn prompt.
- Thêm câu mẫu trong Hướng dẫn của editor và README; cập nhật cả MCPB, ZIP và skill ZIP.
- npm test 4/4, npm run check qua; browser desktop/mobile và MCP iframe qua; iPad 7 kích thước và các thao tác cảm ứng qua. Xuất 1080p và 720p thành công, không có pageerror. Đã mở ảnh iPad có bảng thuộc tính để rà font và dấu tiếng Việt. Kết quả ở /tmp/motion-font-regression.log và /tmp/motion-ipad-font.log.
- Chưa chạy Claude Desktop hay Safari trên iPad thật; chưa kiểm trực tiếp việc mô hình chọn công cụ từ từng câu tự nhiên.
