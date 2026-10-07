# Quyết định thiết kế — mv-studio / "The Whole Company Hits Enter" (EN)

| Ngày | Quyết định |
|---|---|
| 2026-10-07 | Engine riêng `studio/`, viết từ đầu (MIT) |
| 2026-10-07 | Look 3D: PBR + clearcoat, sàn phản chiếu, sương mù, DOF bokeh, bloom (look-dev: `projects/lookdev`) |
| 2026-10-07 | Chuyển cảnh: whip · zoom · glitch · flash · dissolve (`cue.transition`) |
| 2026-10-07 | **Nhân vật: option C2** — người tỉ lệ thật (`kit/figure.ts`, style `silhouette`), đen nhám + viền Fresnel cam (trái) / xanh (phải), `rim: 1` mặc định; cảnh có nền sáng phía sau → tự thành C3 (giảm độ sáng nền để không ám màu) |
| 2026-10-07 | Giọng đọc TTS (Gemini) chèn câu AI → SI giữa bài; key trong `.env` ở gốc repo (đã gitignore) |
| 2026-10-07 | Câu thật của Trump (`vo/trump-genius.wav`, White House 23/07/2025) dùng **không chú thích trên màn hình**; nguồn ghi trong `projects/enter-en/vo-sources.md` (có thể đưa vào description) |
| 2026-10-07 | Bỏ khoảng dừng + câu Trump trước drop (thử rồi thấy không hợp); dùng nhạc gốc liền mạch. `tools/song_edit.py` + `edit.json` giữ lại để dùng sau nếu cần |
| 2026-10-07 | **Bỏ nhân vật người (C2)**, thay bằng motif vẽ neon **AI → SI** 3D (`kit/neonbust.ts`): bán thân ống neon xanh tự vẽ ra = AI, glitch, hoá cam-vàng + hào quang = SI. Áp dụng cho các cảnh còn lại |
