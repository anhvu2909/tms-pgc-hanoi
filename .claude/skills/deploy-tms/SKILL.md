---
name: deploy-tms
description: Deploy dự án TMS lên nhánh main (git push), kích hoạt Vercel tự động build & deploy. LUÔN dùng skill này khi người dùng đã test xong trên môi trường dev và gọi lệnh "/deploy-tms" hoặc nói "deploy lên git main", "đẩy lên production", "deploy giúp tôi".
---

# Deploy TMS lên git main

Dự án này không có backend riêng — deploy nghĩa là **push code lên nhánh `main` trên GitHub**, Vercel sẽ tự động build & deploy (xem skill `dich-man-hinh-tms`, mục Hosting). Việc người dùng chủ động gọi skill này chính là xác nhận cho phép push lên main — không cần hỏi lại lần nữa, nhưng vẫn phải dừng lại nếu phát hiện bất thường (xem bước 4).

## Các bước thực hiện

1. **Kiểm tra trạng thái git**
   - `git status` — liệt kê các file đã thay đổi/chưa tracked.
   - Nếu không có gì để commit và local đã ngang bằng remote `main` → báo cho người dùng "không có thay đổi để deploy", dừng lại.

2. **Kiểm tra chất lượng code trước khi deploy**
   - Chạy `npx tsc --noEmit` (typecheck) — nếu lỗi, dừng lại, báo lỗi cụ thể cho người dùng, không tự sửa bừa rồi push.
   - Chạy `npm run build` để chắc chắn build production không vỡ (Vercel dùng đúng lệnh build này) — nếu lỗi, dừng lại và báo.

3. **Xác nhận đang ở đúng nhánh**
   - Đảm bảo đang ở nhánh `main` (hoặc hỏi người dùng nếu đang ở nhánh khác — không tự ý merge/switch nhánh mà không hỏi).
   - Nếu local `main` đang lùi sau remote `main` (`git fetch` rồi so sánh), báo cho người dùng và hỏi cách xử lý (pull/rebase) thay vì tự ý force push.

4. **Rà soát nội dung trước khi commit**
   - Sau khi `git add` các file liên quan, chạy `git status`/`git diff --stat` để xem lại — nếu thấy file khả nghi (`.env`, credentials, file lạ không liên quan đến thay đổi) thì dừng lại hỏi người dùng trước, không add bừa bằng `git add -A`.

5. **Commit**
   - Viết commit message ngắn gọn, tập trung vào "why", theo đúng văn phong các commit gần đây trong repo (`git log`).
   - Kết thúc message bằng dòng `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`.

6. **Push lên `origin main`**
   - `git push origin main` (không dùng `--force` trừ khi người dùng yêu cầu rõ ràng).
   - Nếu push bị từ chối do remote có commit mới hơn, dừng lại và hỏi người dùng cách xử lý (không tự ý force).

7. **Báo cáo kết quả**
   - Xác nhận đã push thành công, cho biết Vercel sẽ tự build & deploy từ commit vừa push.
   - Nếu người dùng có sẵn link Vercel dashboard/project, nhắc họ theo dõi tiến trình build ở đó (Claude không tự động kiểm tra được trạng thái build trên Vercel dashboard trừ khi được cung cấp quyền truy cập).

## Nguyên tắc cứng
- Không bỏ qua bước kiểm tra typecheck/build để deploy nhanh hơn.
- Không tự ý sửa code để "cho qua" lỗi build — nếu có lỗi, báo cáo và hỏi hướng xử lý.
- Không dùng `git push --force` lên `main` trừ khi được yêu cầu rõ ràng bằng lời.
- Không commit file `.env`, `.env.*` hoặc bất kỳ file chứa secret nào.
