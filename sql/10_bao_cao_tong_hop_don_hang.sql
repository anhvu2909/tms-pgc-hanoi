-- =====================================================================
-- 10_bao_cao_tong_hop_don_hang.sql — Báo cáo "Dữ liệu tổng hợp đơn hàng"
--
-- Thêm 1 dòng vào bảng danh mục sm_BaoCaoDanhMuc. Màn hình Báo cáo tự đọc
-- danh mục này (sm_baocao_danhmuc_list) nên KHÔNG cần sửa code React.
-- sm_baocao_run chạy "SqlQuery" với 8 tham số, theo đúng thứ tự:
--   $1 từ ngày | $2 đến ngày | $3 người tạo | $4 kho đến | $5 tài xế
--   $6 phương tiện | $7 đơn vị vận chuyển | $8 đối tượng
--
-- Quy tắc nghiệp vụ (đã chốt):
--   * 1 chuyến = 1 mã đơn hàng (sm_DonHang."Ma") -> mỗi mã ra đúng 1 dòng.
--   * Chỉ lấy sản phẩm có TenSanPham bắt đầu bằng 'Khí'.
--   * SoLuong = tổng SoLuong các dòng sản phẩm Khí của chuyến.
--   * KgQuyDoi = tổng (SoLuong x TrongLuong) của các dòng Khí có TrongLuong > 1.
--   * CuocVanChuyen = cước cố định của cả chuyến (sm_ChiPhiVanChuyen.ChiPhi,
--     theo cặp BenGiaoId -> DiaChiBenNhanId), KHÔNG cộng dồn theo sản phẩm.
--   * PhiVanChuyen = CuocVanChuyen x KgQuyDoi (tổng sản lượng của chuyến).
--   * khoang_cach_km_2_chieu = KhoangCach x 2.
--   * ThoiHanGiaoHang dạng dd/mm/yyyy; Ngay dạng "dd tháng mm".
--   * Bỏ đơn DA_HUY. Lọc theo ThoiHanGiaoHang (giống các báo cáo khác).
--   * Cước lấy bằng LATERAL ... LIMIT 1 để nếu biểu cước bị trùng cặp kho
--     thì không làm nhân đôi số lượng.
--
-- Chạy được nhiều lần (idempotent): có rồi thì cập nhật, chưa có thì thêm.
-- =====================================================================

do $do$
declare
  v_sql text := $q$
    select
      d."Ma",
      d."BenGiao",
      d."BenNhan",
      d."GhiChu",
      cp."ChiPhi" as "CuocVanChuyen",
      to_char(d."ThoiHanGiaoHang", 'DD/MM/YYYY') as "ThoiHanGiaoHang",
      d."TrangThai",
      sum(sp."SoLuong") as "SoLuong",
      sum(case when sp."TrongLuong" > 1 then sp."SoLuong" * sp."TrongLuong" else 0 end) as "KgQuyDoi",
      cp."ChiPhi" * sum(case when sp."TrongLuong" > 1 then sp."SoLuong" * sp."TrongLuong" else 0 end) as "PhiVanChuyen",
      lx."TenTaiXe" as "LaiXe",
      pt."BienSoXe" as "PhuongTien",
      cp."KhoangCach" * 2 as "khoang_cach_km_2_chieu",
      k."GhiChu" as "DoiTuong",
      to_char(d."ThoiHanGiaoHang", 'DD "tháng" MM') as "Ngay"
    from public."sm_SanPham_DonHang" sp
    join public."sm_DonHang" d on sp."DonHangId" = d."Id"
    left join lateral (
      select c."ChiPhi", c."KhoangCach"
      from public."sm_ChiPhiVanChuyen" c
      where c."KhoDiId" = d."BenGiaoId" and c."KhoNhanId" = d."DiaChiBenNhanId"
      order by c."LastModifiedOnDate" desc nulls last, c."CreatedOnDate" desc
      limit 1
    ) cp on true
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
    group by d."Id", d."Ma", d."BenGiao", d."BenNhan", d."GhiChu", d."ThoiHanGiaoHang", d."TrangThai",
             cp."ChiPhi", cp."KhoangCach", lx."TenTaiXe", pt."BienSoXe", k."GhiChu"
    order by d."ThoiHanGiaoHang", d."Ma"
  $q$;
begin
  if exists (select 1 from public."sm_BaoCaoDanhMuc" where "Ma" = 'tong-hop-don-hang') then
    update public."sm_BaoCaoDanhMuc"
       set "TenBaoCao" = 'Dữ liệu tổng hợp đơn hàng',
           "MoTa" = 'Sản lượng sản phẩm Khí tổng hợp theo chuyến (mỗi mã đơn hàng 1 dòng), kèm cước và phí vận chuyển',
           "SqlQuery" = v_sql,
           "SheetName" = 'TongHopDonHang',
           "Active" = true,
           "LastModifiedOnDate" = now()
     where "Ma" = 'tong-hop-don-hang';
  else
    insert into public."sm_BaoCaoDanhMuc"
      ("Id", "Ma", "TenBaoCao", "MoTa", "SqlQuery", "SheetName", "Active", "Order", "CreatedOnDate", "LastModifiedOnDate")
    values
      (gen_random_uuid(), 'tong-hop-don-hang', 'Dữ liệu tổng hợp đơn hàng',
       'Sản lượng sản phẩm Khí tổng hợp theo chuyến (mỗi mã đơn hàng 1 dòng), kèm cước và phí vận chuyển',
       v_sql, 'TongHopDonHang', true, 4, now(), now());
  end if;
end
$do$;
