-- =====================================================================
-- 09_bao_cao.sql — Màn hình menu Báo cáo: 3 báo cáo, mỗi báo cáo 1 hàm
-- RPC nhận tham số p_tu_ngay/p_den_ngay (lọc theo "ThoiHanGiaoHang"),
-- chỉ ĐỌC — không phân trang vì mục đích là xuất toàn bộ dữ liệu ra Excel.
--
-- Nguồn: 3 câu SQL gốc do Bạn cung cấp (đặt tên hàm bám theo đúng tên file
-- Bạn gửi), CHỈ sửa phần lọc ngày (cứng theo tháng/năm) thành 2 tham số
-- p_tu_ngay/p_den_ngay để màn hình Báo cáo truyền vào từ ô "Từ ngày - Đến
-- ngày". Toàn bộ điều kiện nghiệp vụ khác giữ nguyên như Bạn viết.
--
-- GIẢ ĐỊNH CHƯA XÁC NHẬN (cần Bạn xác nhận khi test):
--   1) Lọc theo "ThoiHanGiaoHang" (timestamp), khoảng đóng ở 2 đầu theo
--      NGÀY: p_tu_ngay 00:00:00 đến hết ngày p_den_ngay (dùng
--      "ThoiHanGiaoHang" < p_den_ngay + 1 ngày để không cắt mất giờ trong
--      ngày cuối, thay vì <=).
--   2) Báo cáo "sm_baocao_van_tai_b11_cn_bac_ninh" giữ nguyên 2 điều kiện
--      cứng theo đúng SQL gốc, KHÔNG biến thành tham số vì đây là báo cáo
--      đặc thù 1 chi nhánh/1 nhóm sản phẩm cố định:
--        - "MaDonVi" LIKE '412%' (mã điểm bán CN Bắc Ninh)
--        - "TenSanPham" IN ('Khí dầu mỏ hóa lỏng B11VN',
--                            'Vỏ bình khí dầu mỏ hóa lỏng B11VN')
--      Nếu sau này cần đổi chi nhánh/sản phẩm mà không sửa SQL, báo lại để
--      chuyển 2 điều kiện này thành tham số.
--   3) Báo cáo "sm_baocao_in_lenh_van_chuyen" giữ nguyên điều kiện cứng
--      "TenSanPham" LIKE 'Khí%' theo đúng SQL gốc.
--   4) "sm_baocao_van_tai_b11_cn_bac_ninh": SQL gốc có tính thêm các cột
--      KgQuyDoi/CuocVanChuyen/PhiVanChuyen/LaiXe/PhuongTien/KhoangCach/
--      DoiTuong ở CTE "base" nhưng SELECT cuối không dùng tới — đã bỏ các
--      cột và JOIN không cần thiết (sm_ChiPhiVanChuyen, sm_Kho k) để hàm
--      gọn và nhanh hơn, kết quả cột trả về không đổi so với SQL gốc.
--   5) Không giới hạn số dòng trả về (phục vụ xuất Excel toàn bộ khoảng
--      ngày đã chọn). Nếu khoảng ngày quá rộng khiến chậm, cân nhắc giới
--      hạn số tháng tối đa ngay trên UI — hỏi lại nếu cần.
--
-- RLS: 4 bảng dùng trong file này (sm_DonHang, sm_SanPham_DonHang,
-- sm_ChiPhiVanChuyen, sm_Kho) đã bật RLS + policy authenticated_full_access
-- từ 02_kho.sql/03_don_hang.sql — không cần khai báo lại ở đây.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Báo cáo "Dữ liệu vận tải b11 CN Bắc Ninh"
--    public.sm_baocao_van_tai_b11_cn_bac_ninh(p_tu_ngay, p_den_ngay)
-- ---------------------------------------------------------------------
drop function if exists public.sm_baocao_van_tai_b11_cn_bac_ninh(date, date);

create or replace function public.sm_baocao_van_tai_b11_cn_bac_ninh(
    p_tu_ngay date,
    p_den_ngay date
  )
returns table (
    "Ngày" text,
    "Tên kho" text,
    "Mã đơn vị" text,
    "Bình nhập" numeric,
    "Vỏ trả" numeric,
    "Mã đơn hàng" text
  )
language plpgsql
security invoker
as $$
begin
  return query
  with base as (
      select
        d."Ma",
        d."BenNhan",
        d."ThoiHanGiaoHang",
        sp."TenSanPham",
        sp."SoLuong",
        kho_ma."Ma" as "MaDonVi"
      from public."sm_SanPham_DonHang" sp
      join public."sm_DonHang" d on sp."DonHangId" = d."Id"
      left join public."sm_Kho" kho_ma on kho_ma."Ten" = d."BenNhan"
      where d."ThoiHanGiaoHang" >= p_tu_ngay
        and d."ThoiHanGiaoHang" < (p_den_ngay + 1)
        and d."TrangThai" <> 'DA_HUY'
        and d."TrangThai" <> 'DA_TU_CHOI'
    )
  select
    to_char(date(base."ThoiHanGiaoHang"), 'DD/MM/YYYY') as "Ngày",
    base."BenNhan" as "Tên kho",
    base."MaDonVi" as "Mã đơn vị",
    sum(case when base."TenSanPham" = 'Khí dầu mỏ hóa lỏng B11VN'
               then base."SoLuong" else 0 end) as "Bình nhập",
    sum(case when base."TenSanPham" = 'Vỏ bình khí dầu mỏ hóa lỏng B11VN'
               then base."SoLuong" else 0 end) as "Vỏ trả",
    string_agg(distinct base."Ma", ', ' order by base."Ma") as "Mã đơn hàng"
  from base
  where base."MaDonVi" like '412%'
    and base."TenSanPham" in (
        'Khí dầu mỏ hóa lỏng B11VN',
        'Vỏ bình khí dầu mỏ hóa lỏng B11VN'
      )
  group by date(base."ThoiHanGiaoHang"), base."BenNhan", base."MaDonVi"
  order by date(base."ThoiHanGiaoHang"), base."BenNhan";
end;
$$;

-- ---------------------------------------------------------------------
-- 2. Báo cáo "Dữ liệu chi tiết đơn hàng"
--    public.sm_baocao_chi_tiet_don_hang(p_tu_ngay, p_den_ngay)
-- ---------------------------------------------------------------------
drop function if exists public.sm_baocao_chi_tiet_don_hang(date, date);

create or replace function public.sm_baocao_chi_tiet_don_hang(
    p_tu_ngay date,
    p_den_ngay date
  )
returns table (
    "Ma" text,
    "BenGiao" text,
    "BenNhan" text,
    "GhiChu" text,
    "ThoiHanGiaoHang" timestamp,
    "TrangThai" text,
    "TenSanPham" text,
    "SoLuong" numeric,
    "TrongLuong" numeric,
    "KgQuyDoi" numeric,
    "CuocVanChuyen" numeric,
    "PhiVanChuyen" numeric,
    "LaiXe" text,
    "PhuongTien" text,
    "KhoangCach" numeric,
    "DoiTuong" text
  )
language sql
security invoker
as $$
  select
    d."Ma",
    d."BenGiao",
    d."BenNhan",
    d."GhiChu",
    d."ThoiHanGiaoHang",
    d."TrangThai",
    sp."TenSanPham",
    sp."SoLuong",
    sp."TrongLuong",
    case when sp."TrongLuong" > 1 then sp."SoLuong" * sp."TrongLuong" else 0 end as "KgQuyDoi",
    cp."ChiPhi" as "CuocVanChuyen",
    case when sp."TrongLuong" > 1 then cp."ChiPhi" * (sp."SoLuong" * sp."TrongLuong") else 0 end as "PhiVanChuyen",
    split_part(d."GhiChu", ':', 1) as "LaiXe",
    substring(d."GhiChu" from position(': ' in d."GhiChu") + 2 for 8) as "PhuongTien",
    cp."KhoangCach",
    k."GhiChu" as "DoiTuong"
  from public."sm_SanPham_DonHang" sp
  join public."sm_DonHang" d on sp."DonHangId" = d."Id"
  left join public."sm_ChiPhiVanChuyen" cp
    on d."BenGiaoId" = cp."KhoDiId" and d."DiaChiBenNhanId" = cp."KhoNhanId"
  left join public."sm_Kho" k on d."DiaChiBenNhanId" = k."Id"
  where d."ThoiHanGiaoHang" >= p_tu_ngay
    and d."ThoiHanGiaoHang" < (p_den_ngay + 1)
    and d."TrangThai" <> 'DA_HUY';
$$;

-- ---------------------------------------------------------------------
-- 3. Báo cáo "Dữ liệu in lệnh vận chuyển"
--    public.sm_baocao_in_lenh_van_chuyen(p_tu_ngay, p_den_ngay)
-- ---------------------------------------------------------------------
drop function if exists public.sm_baocao_in_lenh_van_chuyen(date, date);

create or replace function public.sm_baocao_in_lenh_van_chuyen(
    p_tu_ngay date,
    p_den_ngay date
  )
returns table (
    "Ma" text,
    "BenGiao" text,
    "BenNhan" text,
    "GhiChu" text,
    "ThoiHanGiaoHang" timestamp,
    "TrangThai" text,
    "TenSanPham" text,
    "SoLuong" numeric,
    "TrongLuong" numeric,
    "KgQuyDoi" numeric,
    "CuocVanChuyen" numeric,
    "PhiVanChuyen" numeric,
    "LaiXe" text,
    "PhuongTien" text,
    "KhoangCach" numeric,
    "DoiTuong" text,
    "DiaChiBenGiao" text,
    "DiaChiBenNhan" text,
    "MaSanPham" text,
    "CreatedOnDate" timestamp
  )
language sql
security invoker
as $$
  select
    d."Ma",
    d."BenGiao",
    d."BenNhan",
    d."GhiChu",
    d."ThoiHanGiaoHang",
    d."TrangThai",
    sp."TenSanPham",
    sp."SoLuong",
    sp."TrongLuong",
    case when sp."TrongLuong" > 1 then sp."SoLuong" * sp."TrongLuong" else 0 end as "KgQuyDoi",
    cp."ChiPhi" as "CuocVanChuyen",
    case when sp."TrongLuong" > 1 then cp."ChiPhi" * (sp."SoLuong" * sp."TrongLuong") else 0 end as "PhiVanChuyen",
    split_part(d."GhiChu", ':', 1) as "LaiXe",
    substring(d."GhiChu" from position(': ' in d."GhiChu") + 2 for 8) as "PhuongTien",
    cp."KhoangCach",
    k."GhiChu" as "DoiTuong",
    d."DiaChiBenGiao",
    d."DiaChiBenNhan",
    sp."MaSanPham",
    d."CreatedOnDate"
  from public."sm_SanPham_DonHang" sp
  join public."sm_DonHang" d on sp."DonHangId" = d."Id"
  left join public."sm_ChiPhiVanChuyen" cp
    on d."BenGiaoId" = cp."KhoDiId" and d."DiaChiBenNhanId" = cp."KhoNhanId"
  left join public."sm_Kho" k on d."DiaChiBenNhanId" = k."Id"
  where d."ThoiHanGiaoHang" >= p_tu_ngay
    and d."ThoiHanGiaoHang" < (p_den_ngay + 1)
    and d."TrangThai" <> 'DA_HUY'
    and sp."TenSanPham" like 'Khí%';
$$;
