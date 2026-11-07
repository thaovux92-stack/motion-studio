# Bắt đầu trong Claude Code

Giải nén gói, mở terminal trong thư mục `motion-studio` (nơi có package.json).

```sh
npm ci
npm run build
npm test
npm run claude:config
claude
```

Mở `/mcp` trong Claude Code để kiểm tra Motion Studio và chấp thuận server nếu Claude Code yêu cầu. File `.mcp.json` được tạo theo đường dẫn thực tế nên không cần sửa tay. Máy cần có Node.js >=20.19 và Claude Code đã cài/đăng nhập. Không cần thêm API key cho Motion Studio.

Dán yêu cầu này vào Claude Code:

> Đọc CLAUDE.md và HANDOFF.md, kiểm tra build/test rồi mở bản web bằng npm run web. Tiếp tục phát triển Motion Studio từ trạng thái bàn giao, giữ Be Vietnam Pro, bố cục iPad và các câu lệnh tạo/sửa video. Trước tiên cho tôi biết cách chạy bản hiện tại và các giới hạn còn tồn tại.

Để xem editor, chạy trong terminal thứ hai:

```sh
npm run web
```

Mở `http://localhost:3000/`. Bản web độc lập không có màn hình mật khẩu của website thaoux. Đổi cổng bằng biến môi trường `PORT` nếu 3000 đang dùng. Lệnh này chỉ phục vụ editor và các gói tải trong `app/`, không phục vụ mã nguồn hay cấu hình máy.

MCP cho phép Claude Code gọi công cụ tạo/sửa dữ liệu video; UI nhúng phụ thuộc host. Bản web độc lập lưu riêng trong trình duyệt, chưa tự đồng bộ với MCP. Xem HANDOFF.md để chuyển JSON giữa hai bên. Gói MCPB trong `app/` dành cho Claude Desktop.

Tài liệu chính thức đã dùng để chuẩn bị gói: [CLAUDE.md](https://code.claude.com/docs/en/memory), [cấu hình MCP](https://code.claude.com/docs/en/mcp), [project skills](https://code.claude.com/docs/en/skills).
