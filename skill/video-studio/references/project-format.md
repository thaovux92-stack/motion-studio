# Định dạng lớp Motion Studio v1

`get_video_project` trả dự án không chứa dữ liệu base64; `update_video_project` giữ media gốc trên server. Chỉ gửi các trường cần thay trong `changes`: `title`, `aspect` (`9:16`, `16:9`, `1:1`), `duration` (0.5–180 giây), `background` (màu hex 6 ký tự), `layers`. Khi giảm thời lượng, sửa hoặc loại các lớp vượt thời lượng mới.

Ví dụ thay toàn bộ các lớp bằng tiêu đề:

```json
{
  "projectId": "ID nhận từ công cụ",
  "expectedRevision": 1,
  "changes": {
    "title": "Khởi đầu mới",
    "duration": 8,
    "background": "#efcab2",
    "layers": [{
      "id": "title-1", "type": "text", "name": "Tiêu đề",
      "text": "MỘT KHỞI ĐẦU\nHOÀN TOÀN MỚI.",
      "start": 0, "end": 8, "x": 50, "y": 45,
      "size": 100, "color": "#26271f", "background": "transparent",
      "font": "sans", "weight": 800, "align": "center",
      "animation": "slide-up", "opacity": 1, "rotation": 0
    }]
  }
}
```

Mỗi lớp: `id` duy nhất gồm chữ, số, gạch ngang hoặc gạch dưới; `name`; `type`; `start` và `end` theo giây; `x`, `y` là phần trăm tâm khung; `size` 8–400 px với text, % phủ khung với media; `opacity` 0–1; `rotation` -180–180 độ; `animation`: `none`, `fade`, `slide-up`, `pop`, `typewriter`.

Text thêm `text` (tối đa 2000 ký tự), `color` hex, `background`: `transparent`, `#000000`, `#ffffff`; `font`: dùng `sans` cho Be Vietnam Pro; `serif` và `mono` được nhận để đọc dự án cũ nhưng cũng hiển thị Be Vietnam Pro; `weight`: 400, 500, 600, 700, 800, 900; `align`: `left`, `center`, `right`.

Lớp `image`, `video`, `audio` thêm `mediaId` đã nhập, `trimStart` (giây bắt đầu đọc media), `volume` 0–1. Không thêm URL tùy ý vào dự án. Để tạo media mới, dùng công cụ nhập tệp rồi đọc lại danh sách lớp.

Hiệu ứng có thời gian xuất hiện 0.55 giây; typewriter điều chỉnh theo độ dài chữ. Tối đa 80 lớp, 20 media, tổng dữ liệu dự án khoảng 28 MB media nhúng. Chưa hỗ trợ keyframe tự do, chuyển cảnh giữa clip, đọc hoặc xuất draft CapCut.
