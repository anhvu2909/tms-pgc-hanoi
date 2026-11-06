-- =====================================================================
-- 10_bao_cao_danh_muc.sql — Cập nhật báo cáo trong bảng danh mục
-- public."sm_BaoCaoDanhMuc".
--
-- GHI CHÚ QUAN TRỌNG: Màn hình Báo cáo hiện tại KHÔNG còn dùng các hàm
-- RPC cứng trong 09_bao_cao.sql (sm_baocao_in_lenh_van_chuyen,
-- sm_baocao_van_tai_b11_cn_bac_ninh, sm_baocao_chi_tiet_don_hang) nữa.
-- Thực tế production đã chuyển sang kiến trúc "danh mục báo cáo": mỗi
-- báo cáo là 1 dòng trong bảng "sm_BaoCaoDanhMuc" (cột "SqlQuery" chứa
-- câu SELECT dùng tham số $1..$8), và 3 hàm RPC dùng chung:
--   - sm_baocao_danhmuc_list()   -> danh sách báo cáo (where "Active" = true)
--   - sm_baocao_filter_options() -> dữ liệu cho các ô lọc
--   - sm_baocao_run(p_ma, ...)   -> chạy "SqlQuery" của báo cáo p_ma
-- 3 hàm này đã tồn tại sẵn trên Supabase nhưng CHƯA có file .sql nào
-- trong repo định nghĩa chúng (nợ kỹ thuật có từ trước, không thuộc
-- phạm vi thay đổi lần này — nếu cần, hỏi lại trước khi bổ sung).
--
-- Thay đổi trong file này (báo cáo "Dữ liệu in lệnh vận chuyển" —
-- Ma = 'in-lenh-van-chuyen'):
--   1) Format "ThoiHanGiaoHang" và "NgayDatHang" thành dd/mm/yyyy
--      (to_char(..., 'DD/MM/YYYY')) thay vì trả timestamp thô.
--   2) Thêm cột cuối cùng "thong_tin" = LaiXe - PhuongTien -
--      CongTyVanTai (dùng concat_ws để không bị lỗi khi 1 trong 3 giá
--      trị là NULL).
--   3) Đổi cột "CreatedOnDate" (ngày hệ thống tạo bản ghi) thành
--      "NgayDatHang" (cột riêng trong sm_DonHang, đúng nghĩa "ngày đặt
--      hàng" — xem mục 1 skill tu-dien-nghiep-vu-tms), cũng format
--      dd/mm/yyyy.
-- Và tắt báo cáo "Dữ liệu vận tải b11 CN Bắc Ninh" (Ma =
-- 'van-tai-b11-cn-bac-ninh') khỏi danh sách chọn báo cáo bằng cách đặt
-- "Active" = false — KHÔNG xóa dòng, để có thể bật lại nếu cần, dữ liệu
-- "SqlQuery" gốc vẫn giữ nguyên.
--
-- Đã chạy trực tiếp trên Supabase (project TMS PGC Hanoi) và test qua
-- sm_baocao_run('in-lenh-van-chuyen', ...) — kết quả đúng định dạng.
-- File này lưu lại để chạy lại được (idempotent, update theo "Ma").
-- =====================================================================

update public."sm_BaoCaoDanhMuc"
set "SqlQuery" = $sqlquery$
    select
      d."Ma",
      d."BenGiao",
      d."BenNhan",
      d."GhiChu",
      to_char(d."ThoiHanGiaoHang", 'DD/MM/YYYY') as "ThoiHanGiaoHang",
      d."TrangThai",
      sp."TenSanPham",
      sp."SoLuong",
      sp."TrongLuong",
      case when sp."TrongLuong" > 1 then sp."SoLuong" * sp."TrongLuong" else 0 end as "KgQuyDoi",
      cp."ChiPhi" as "CuocVanChuyen",
      case when sp."TrongLuong" > 1 then cp."ChiPhi" * (sp."SoLuong" * sp."TrongLuong") else 0 end as "PhiVanChuyen",
      lx."TenTaiXe" as "LaiXe",
      pt."BienSoXe" as "PhuongTien",
      cp."KhoangCach",
      k."GhiChu" as "DoiTuong",
      d."DiaChiBenGiao",
      d."DiaChiBenNhan",
      sp."MaSanPham",
      to_char(d."NgayDatHang", 'DD/MM/YYYY') as "NgayDatHang",
      pt."CongTy" as "CongTyVanTai",
      concat_ws(' - ', lx."TenTaiXe", pt."BienSoXe", pt."CongTy") as "thong_tin"
    from public."sm_SanPham_DonHang" sp
    join public."sm_DonHang" d on sp."DonHangId" = d."Id"
    left join public."sm_ChiPhiVanChuyen" cp
      on d."BenGiaoId" = cp."KhoDiId" and d."DiaChiBenNhanId" = cp."KhoNhanId"
    left join public."sm_Kho" k on d."DiaChiBenNhanId" = k."Id"
    left join public."sm_Kho" kdt on kdt."Id" = d."BenNhanId"
    left join public."sm_LaiXe" lx on d."LaiXeId" = lx."Id"
    left join public."sm_PhuongTien" pt on d."PhuongTienId" = pt."Id"
    where d."ThoiHanGiaoHang" >= $1
      and d."ThoiHanGiaoHang" < ($2 + 1)
      and d."TrangThai" <> 'DA_HUY'
      and sp."TenSanPham" like 'Khí%'
      and ($3 is null or d."CreatedByUserId" = any($3))
      and ($4 is null or d."DiaChiBenNhanId" = any($4))
      and ($5 is null or d."LaiXeId" = any($5))
      and ($6 is null or d."PhuongTienId" = any($6))
      and ($7 is null or pt."CongTy" = any($7))
      and ($8 is null or kdt."GhiChu" = any($8))
  $sqlquery$
where "Ma" = 'in-lenh-van-chuyen';

update public."sm_BaoCaoDanhMuc"
set "Active" = false
where "Ma" = 'van-tai-b11-cn-bac-ninh';
