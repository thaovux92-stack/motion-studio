---
name: video-studio
description: Tạo và sửa video trong Motion Studio qua MCP trên Claude Desktop. Dùng cho “tạo video”, “tạo clip”, “sửa video”, “chỉnh video”, “chỉnh sửa video”, “sửa clip”, “chỉnh sửa clip”, “biên tập video”, “edit video”; hoặc khi người dùng muốn sửa chữ, cắt clip, thêm nhạc, đổi hiệu ứng, thời gian hay tỉ lệ của video đang mở. Nhận câu tự nhiên, không phân biệt hoa/thường, có hoặc không dấu; chỉ định tuyến các yêu cầu sửa chữ/hiệu ứng khi ngữ cảnh là video. Kết hợp skill animation/motion có sẵn; cần MCP Motion Studio để mở editor tương tác.
---

# Video Studio

## Chọn tạo mới hay sửa tiếp

- “Tạo video…”, “tạo clip…”: tạo dự án bằng `open_video_editor`. Lấy nội dung, tỉ lệ và thời lượng từ yêu cầu; mặc định dọc 9:16, 12 giây. Dùng `update_video_project` thay các lớp mẫu bằng nội dung đã yêu cầu. Không coi mẫu “MAKE IT MOVE” là video hoàn thành theo brief.
- “Sửa video…”, “chỉnh video…”, “chỉnh sửa video…”, “sửa clip…”, “chỉnh sửa clip…”, “biên tập video…” hoặc “edit video…”: sửa dự án được chỉ định hay đang mở. Dùng `projectId` từ tool result hoặc ngữ cảnh editor gần nhất; không gọi `open_video_editor` thiếu `projectId` vì sẽ tạo dự án mới. Khi cần hiện lại editor, truyền đúng `projectId` vào `open_video_editor`.
- Khi đang làm video, các câu ngắn như “đổi tiêu đề…”, “thêm chữ…”, “cắt clip…”, “thêm nhạc…”, “đổi hiệu ứng…” cũng là yêu cầu sửa tiếp; không bắt người dùng lặp lại tiền tố. Ưu tiên dự án/lớp mà người dùng nêu rõ, sau đó mới dùng lớp đang chọn trong editor.
- Nếu chưa có dự án hoặc media được xác định, hỏi ngắn “Bạn muốn sửa video nào? Mở dự án trong Motion Studio hoặc chọn clip cần sửa.” Nếu nhiều dự án có thể phù hợp, hỏi chọn dự án; không đoán ID, tìm tệp riêng hoặc mở dự án trắng thay cho video cần sửa.
- Nếu người dùng cung cấp clip mới để sửa, nhập tệp bằng `import_video_asset` với đường dẫn thật. Khi cần tạo dự án chứa clip đó, bỏ toàn bộ lớp demo trước khi nhập và xác định thời lượng từ thông tin người dùng cung cấp hoặc hỏi khi thiếu; không lặng lẽ cắt clip về 12 giây. Nếu chỉ có tệp đính kèm mà chưa có đường dẫn trên máy chạy MCP, hướng dẫn chọn tệp qua **Media → Nhập media**.

Các cách gọi trên là hướng dẫn để Claude chọn công cụ, không phải bộ chặn prompt hoặc cú pháp slash command. Nếu chưa thấy công cụ Motion Studio, hướng dẫn cài `motion-studio.mcpb` rồi khởi động lại Claude Desktop. Không tuyên bố editor đã mở khi chỉ tạo mã hoặc mô tả.

## Sửa đúng dự án

1. Gọi `get_video_project(projectId)` để lấy trạng thái và revision mới nhất, kể cả thay đổi người dùng vừa làm trực tiếp.
2. Đọc [định dạng dự án](references/project-format.md). Xác định lớp bằng ID/tên/nội dung hoặc lớp đang chọn từ ngữ cảnh; hỏi lại nếu mục tiêu chưa rõ.
3. Gọi `update_video_project` với `expectedRevision` vừa đọc. `layers` thay toàn bộ danh sách: giữ các lớp và media không liên quan. Chỉ sửa thuộc tính được yêu cầu; yêu cầu “sửa” không có nghĩa là tạo lại video.
4. Nếu có xung đột, đọc lại và áp dụng vào bản mới, không ghi đè từ bản lớp cũ. Báo ngắn phần đã đổi sau khi công cụ trả thành công.

## Câu người dùng có thể gõ

| Câu mẫu | Thao tác |
| --- | --- |
| Sửa video đang mở, đổi tiêu đề thành “Ra mắt hôm nay”. | Đổi nội dung lớp tiêu đề; giữ các lớp khác. |
| Chỉnh sửa clip này, cho dòng tiêu đề xuất hiện từ giây 2 đến giây 5. | Sửa `start` và `end` của lớp chữ được chỉ định. |
| Thêm chữ “Đăng ký ngay” từ giây 8 đến giây 12. | Thêm lớp chữ; kiểm tra thời lượng dự án. |
| Đổi chữ đang chọn sang màu trắng và tăng cỡ lên 80. | Sửa `color`, `size` trên đúng lớp đang chọn. |
| Cho tiêu đề bật lên, dòng phụ mờ dần. | Dùng `pop` và `fade` ở hai lớp tương ứng. |
| Cắt ngắn lớp clip đang chọn còn 5 giây. | Giữ điểm bắt đầu, đổi điểm kết thúc; không thay thời gian lớp khác. |
| Dời dòng “Đăng ký ngay” lên trên để nằm trong vùng an toàn. | Sửa vị trí chữ, chừa khoảng cho giao diện mạng xã hội. |
| Chuyển video thành khung vuông 1:1. | Đổi `aspect`; kiểm tra lại vị trí và xuống dòng. |
| Thêm nhạc từ tệp tôi đã chọn, giảm âm lượng còn 30%. | Nhập media được cung cấp hoặc dùng media đã có; đặt `volume: 0.3`. |

Khi rút ngắn thời lượng dự án, điều chỉnh/loại các khoảng vượt thời lượng mới. Khi trim đầu của video/audio, cập nhật `trimStart` tương ứng; khi tách clip, đoạn sau phải trỏ tới đúng vị trí nguồn. Lớp đặt sau vẽ trên lớp đặt trước. Dùng Be Vietnam Pro cho tất cả chữ, `font: sans`; các khóa font cũ vẫn được chấp nhận nhưng hiển thị cùng font này.

Chừa trên 8%, hai bên 9%, dưới 19% cho giao diện mạng xã hội; vùng an toàn là chỉ dẫn trong editor. Khi có skill animation/motion phù hợp trong phiên, dùng nó để lập nhịp và chuyển động rồi ánh xạ sang `none`, `fade`, `slide-up`, `pop`, `typewriter`. Không tự cài hoặc giả vờ gọi skill chưa có.

Media tối đa 20 MB/tệp. Không bịa đường dẫn và không đọc tệp riêng khác để tìm clip. Người dùng xuất video bằng nút **Xuất video**; MP4 khi trình duyệt hỗ trợ, còn lại WebM. Không tuyên bố đã xuất tệp khi chưa có kết quả. Chưa hỗ trợ phụ đề tự nhận diện, xuất project CapCut, keyframe tùy ý hoặc render motion code/Remotion; nêu rõ nếu người dùng yêu cầu các chức năng này.
