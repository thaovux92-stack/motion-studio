---
name: video-studio
description: Dùng MCP Motion Studio để tạo video, tạo clip, sửa video, chỉnh sửa clip, đổi chữ, cắt clip hoặc đổi hiệu ứng trong ngữ cảnh video. Phân biệt yêu cầu biên tập video với yêu cầu lập trình editor.
---

Đọc [workflow gốc](../../../skill/video-studio/SKILL.md) và [định dạng dự án](../../../skill/video-studio/references/project-format.md) trước khi gọi các công cụ chỉnh video.

Trong Claude Code:

- Yêu cầu sửa mã nguồn editor: làm theo CLAUDE.md; không gọi công cụ biên tập video thay cho sửa code.
- Yêu cầu tạo/sửa nội dung video: dùng MCP đã kết nối, giữ projectId khi sửa và đọc revision mới nhất.
- Nếu chưa có công cụ, chạy `npm run claude:config` từ thư mục dự án sau `npm ci`, sau đó kiểm tra `/mcp`; có thể cần mở lại phiên và chấp thuận server trong Claude Code.
- Không giả định terminal Claude Code hiển thị được UI MCP Apps. Có thể dùng `npm run web` để xem editor trong trình duyệt, nhưng bản web đó lưu riêng trong IndexedDB và chưa tự đồng bộ với dữ liệu MCP.
- Muốn chuyển dự án MCP sang web: lấy đúng file JSON của projectId từ `UPLOAD_DIR/motion-studio` hoặc `~/.motion-studio`, sau đó dùng “Mở dự án JSON”. Không tìm tệp khác ngoài dự án người dùng đã xác định.
