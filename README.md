# Motion Studio

Trình biên tập video nhiều lớp lấy bố cục từ ảnh tham khảo: tài nguyên, preview, thuộc tính, timeline. Dùng trong Claude Desktop qua MCP Apps hoặc mở editor trong trình duyệt. Chưa showcase; bản web trong Studio tại `/projects/motion-studio/`.

## Chuyển sang Claude Code

Đọc [START-HERE.md](START-HERE.md), [CLAUDE.md](CLAUDE.md) và [HANDOFF.md](HANDOFF.md). Gói đầy đủ gồm source, font, test, MCP và skill; chạy độc lập bằng `npm run web` sau `npm ci`. Tạo cấu hình máy hiện tại bằng `npm run claude:config`. `npm run package:claude` đóng gói lại source sau khi build.

## Cài vào Claude Desktop

**Cách gọn:** tải `app/motion-studio.mcpb` (trong bản web: nút Kết nối Claude), mở tệp bằng Claude Desktop và duyệt cài extension. Gói có server đã bundle, không cần cài dependency npm. Cần phiên bản Claude Desktop hỗ trợ MCP Apps để hiện editor trong cuộc trò chuyện. Chưa kiểm được bản Desktop trên máy người dùng từ container này.

**Cách cấu hình thủ công:** giải nén `motion-studio-desktop.zip`, cài Node.js >=20.19. Không cần chạy npm install vì server trong ZIP đã bundle. Thêm vào `mcpServers` trong `claude_desktop_config.json` (giữ các server đang có):

```json
{"mcpServers":{"motion-studio":{"command":"node","args":["/duong-dan-tuyet-doi/motion-studio/mcp/server.mjs"]}}}
```

Windows dùng đường dẫn thật dạng `C:\\Users\\ten\\motion-studio\\mcp\\server.mjs`. Nếu `node` không có trong PATH của Claude Desktop, dùng đường dẫn tuyệt đối đến node. Thoát hoàn toàn và mở lại Claude Desktop.

Tải `app/video-studio-skill.zip` vào mục Skills của Claude hoặc dán phần hướng dẫn trong `skill/video-studio/SKILL.md` vào Project Instructions. Đây là bước định tuyến câu “tạo video…”, “sửa video…” và các yêu cầu sửa clip, không phải bộ skill motion có sẵn của Claude. Gói dùng các skill animation/motion người dùng đã cài khi chúng có mặt; chưa nối một bộ skill bên ngoài cụ thể.

Thử: “tạo video 12 giây giới thiệu ứng dụng học tiếng Nhật, dọc 9:16, chữ xuất hiện theo nhịp”. Claude cần gọi `open_video_editor`, sau đó `update_video_project` để điền nội dung theo brief. Chỉnh chữ bằng tay rồi thử “đổi tiêu đề thành Học mỗi ngày và cho chữ bật lên”.

## Các câu lệnh chỉnh sửa trong Claude

Sau khi cài bản MCPB và skill mới, có thể gõ:

- “Sửa video đang mở, đổi tiêu đề thành Ra mắt hôm nay.”
- “Chỉnh sửa clip này, cho tiêu đề xuất hiện từ giây 2 đến giây 5.”
- “Thêm chữ Đăng ký ngay từ giây 8 đến giây 12.”
- “Đổi chữ đang chọn sang màu trắng và tăng cỡ lên 80.”
- “Cho tiêu đề bật lên, dòng phụ mờ dần.”
- “Cắt ngắn lớp clip đang chọn còn 5 giây.”
- “Chuyển video thành khung vuông 1:1.”

Skill cũng nhận “chỉnh video”, “sửa clip”, “biên tập video”, “edit video” và cách viết không dấu. Đây là hướng dẫn định tuyến cho Claude, không phải bộ phân tích tiền tố cố định. Yêu cầu sửa dùng dự án hiện tại và đọc revision mới trước khi cập nhật; nếu chưa xác định được dự án/clip, Claude hỏi để chọn đúng. Các câu mẫu cũng có trong **Hướng dẫn** của editor.

## Những gì chạy được

- Be Vietnam Pro thống nhất cho giao diện và mọi lớp chữ, có dấu tiếng Việt; thay cỡ/màu/căn lề, độ trong, vị trí, xoay; kéo chữ trên canvas.
- Nhập PNG/JPEG/WebP, MP4/WebM/MOV, MP3/WAV/OGG/M4A (khả năng đọc codec phụ thuộc trình duyệt). Tối đa 20 MB/tệp; tổng khoảng 28 MB media nhúng.
- Timeline: kéo, trim hai cạnh, tách, nhân đôi, xóa, undo/redo, zoom, playhead.
- Hiệu ứng xuất hiện: fade, slide-up, pop, typewriter; 9:16, 16:9, 1:1; vùng an toàn.
- Lưu trình duyệt bằng IndexedDB; ở MCP lưu JSON vào `$UPLOAD_DIR/motion-studio` hoặc `~/.motion-studio` trên máy chạy server. Không lưu media người dùng vào repo.
- Lưu JSON kèm media để trao đổi; kiểm tra revision giúp tránh ghi đè thay đổi từ UI/Claude.
- Xuất video thực bằng Canvas + MediaRecorder, 720p/1080p, 30fps, trộn âm thanh media. MP4 nếu runtime hỗ trợ; nếu không là WebM. Xuất theo thời gian thực, phải giữ cửa sổ hoạt động. Trong MCP dùng tải tệp qua host; host có thể yêu cầu cho phép.

Chưa có keyframe tự do, animation code tùy ý, phụ đề tự nhận diện, xuất project CapCut hoặc server render MP4. Việc cài extension, gắn skill và kiểm tra trong Claude Desktop thật là bước trên máy người dùng; không khẳng định đã hoàn tất từ bản web.

## Thử trên iPad

Đăng nhập [Studio](https://thaoux.com/studio), rồi mở [Motion Studio](https://thaoux.com/projects/motion-studio/) bằng Safari. Bản web dùng để thử giao diện trên iPad; gói MCPB vẫn cài vào Claude Desktop trên máy tính.

- Có bố cục cảm ứng cho cả chiều ngang và dọc, ở độ rộng 701–1366 CSS px. Bảng Media và Thuộc tính đóng/mở để dành chỗ cho khung hình; các nút chính có vùng chạm tối thiểu 44 px. Khi dùng Split View hẹp hơn, app chuyển sang bố cục cuộn.
- Chạm lớp trên timeline để mở Thuộc tính. Kéo thân clip để dời thời gian, kéo hai cạnh để trim; kéo trên thước thời gian để tua. Kéo chữ trực tiếp trên khung hình để đổi vị trí.
- Xem trước và xuất mặc định 720p để giảm tải; có thể chọn 1080p khi xuất. Giữ Safari ở phía trước cho đến khi xuất xong, sau đó chạm **Lưu video**. Nếu thiết bị hỗ trợ chia sẻ tệp, chọn nơi lưu trong menu chia sẻ; nếu không, app tải tệp xuống trình duyệt.
- Bản web tự lưu trên trình duyệt của thiết bị hiện tại. Nút lưu ở thanh trên tải JSON để giữ bản sao hoặc chuyển dự án sang máy khác; không tự đồng bộ dự án iPad với Claude Desktop.

Đã kiểm thử 7 kích thước màn hình cùng thao tác chạm, lưu dự án và xuất video 720p bằng Chromium mô phỏng iPad. Chưa kiểm trực tiếp Safari trên iPad thật; codec video, bàn phím màn hình và menu chia sẻ hệ thống cần được thử trên thiết bị.


## Phát triển

Trong repo nguồn, chạy `npm install`, `npm run build`, `npm test` tại thư mục dự án. `npm start` chạy MCP stdio; không in log ra stdout. Trong repo cha, website được Express hiện tại phục vụ. Khi giải nén riêng, dùng `npm run web` để phục vụ app trên 0.0.0.0 và PORT (mặc định 3000), không cần database. `node build.mjs` bundle JS/CSS/Phosphor Icons vào HTML và server MCP vào hai gói MCPB/ZIP; không có CDN.

Giao thức theo [MCP Apps SDK](https://apps.extensions.modelcontextprotocol.io/api/) và đóng gói theo [MCPB](https://github.com/modelcontextprotocol/mcpb). Nguồn ảnh tham khảo là ảnh người dùng cung cấp; không đưa ảnh vào gói cài.

Nhận câu “tạo video…”, “sửa video…” và yêu cầu sửa clip là định tuyến bằng skill, server instructions và mô tả tool để Claude chọn công cụ; không cài bộ chặn prompt vào ứng dụng Claude Desktop.
