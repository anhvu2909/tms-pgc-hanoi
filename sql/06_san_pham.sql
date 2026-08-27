-- =====================================================================
-- 06_san_pham.sql — Màn hình Sản phẩm: Thêm mới / Sửa / Xóa. Theo đúng
-- nghiệp vụ đọc từ pages/san-pham/index.tsx, store/san-pham/index.tsx.
--
-- ĐỌC (danh sách, lọc theo Loại, tìm kiếm theo tên) đã hoạt động qua
-- genericList trong api.ts (đã sửa thêm 2 bug ở đó, xem mục "sửa kèm"
-- bên dưới) — không cần RPC riêng để đọc.
--
-- GIẢ ĐỊNH CHƯA XÁC NHẬN (cần Bạn xác nhận khi test):
--   1) Form Sản phẩm KHÔNG có trường "Đơn giá" (DonGia) dù DB có cột này
--      — form chỉ có Mã, Tên, Loại, Đơn vị tính, Trọng lượng, Cho phép
--      bán. Giữ nguyên "DonGia" hiện có trong DB, KHÔNG ghi đè khi tạo
--      mới (để null) hay khi sửa (giữ nguyên giá trị cũ) — cùng cách xử
--      lý với "DiaChi"/"Birthdate" ở màn Khách hàng.
--   2) "Mã sản phẩm" (MaSanPham) KHÔNG bắt buộc duy nhất theo DDL, nhưng
--      CHẶN TRÙNG ở đây vì khác với Mã kho/Mã khách hàng — MaSanPham
--      dùng làm nhãn hiển thị "MaSanPham + TenSanPham" khi chọn sản
--      phẩm trong Đơn hàng (theo skill tu-dien-nghiep-vu-tms mục Lọc sản
--      phẩm), trùng mã sẽ gây nhầm lẫn khi chọn. Báo lại nếu dữ liệu cũ
--      đã có trùng Mã, cần đổi lại thành cảnh báo thay vì chặn cứng.
--   3) Xóa sản phẩm: chặn nếu sản phẩm đã được dùng trong ít nhất 1 dòng
--      Đơn hàng (sm_SanPham_DonHang — dù DDL không khai báo FK ràng
--      buộc cột này, vẫn kiểm tra theo nghiệp vụ để không phá dữ liệu
--      lịch sử đơn hàng), hoặc còn được cấu hình trong
--      sm_ProductConfiguration/sm_WarehouseTransaction/
--      sm_DeliveryNote_SanPham (thuộc các tính năng đã cắt khỏi phạm vi
--      nhưng dữ liệu lịch sử từ hệ thống cũ có thể vẫn còn).
--
-- LƯU Ý RIÊNG (không phải giả định, là phát hiện lỗi khi đọc code):
--   - pages/san-pham/index.tsx gọi API.get({filter:{fullTextSearch}})
--     nhưng genericList cũ luôn ilike cột "Ten" cho MỌI bảng — sm_SanPham
--     không có cột "Ten" (chỉ có "TenSanPham") nên tìm kiếm ở màn này
--     trước đây sẽ LỖI. Đã sửa trong src/utils/api.ts (mục genericList)
--     thành ánh xạ theo từng bảng.
--   - pages/product-configuration/* (bảng sm_ProductConfiguration) KHÔNG
--     có trong menu điều hướng hiện tại của app (không thấy trong
--     Sidebar ở các ảnh chụp màn hình đã gửi) — có vẻ là màn hình orphan
--     giống "Lịch sử chăm sóc" ở Khách hàng, gắn với tính năng vỏ
--     bình/gas dư cho luồng Giao dịch kho đã bị cắt khỏi phạm vi. CHƯA
--     xử lý màn này. Báo lại nếu Bạn vẫn cần dùng.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. RLS baseline cho sm_SanPham
-- ---------------------------------------------------------------------
alter table public."sm_SanPham" enable row level security;

drop policy if exists authenticated_full_access on public."sm_SanPham";
create policy authenticated_full_access on public."sm_SanPham"
  for all to authenticated using (true) with check (true);

-- ---------------------------------------------------------------------
-- 1. Sản phẩm này có đang bị chặn xóa hay không (dùng chung cho delete/
--    delete_many).
-- ---------------------------------------------------------------------
create or replace function public.sm_fn_sanpham_co_phu_thuoc(p_id uuid)
returns boolean
language sql
stable
security invoker
as $$
  select
    exists (select 1 from public."sm_SanPham_DonHang" where "SanPhamId" = p_id)
    or exists (select 1 from public."sm_ProductConfiguration"
               where "ProductId" = p_id or "GasTankId" = p_id or "ResidualGasId" = p_id)
    or exists (select 1 from public."sm_WarehouseTransaction" where "ProductId" = p_id)
    or exists (select 1 from public."sm_DeliveryNote_SanPham" where "ProductId" = p_id);
$$;

-- ---------------------------------------------------------------------
-- 2. Tạo sản phẩm mới — public.sm_sanpham_create(p_data)
--    p_data: {MaSanPham*, TenSanPham*, Type*, DonViTinh, TrongLuong, IsOrder}
-- ---------------------------------------------------------------------
create or replace function public.sm_sanpham_create(p_data jsonb)
returns jsonb
language plpgsql
security invoker
as $$
declare
  v_id uuid := gen_random_uuid();
  v_ma text := nullif(trim(both from (p_data->>'MaSanPham')), '');
  v_ten text := nullif(trim(both from (p_data->>'TenSanPham')), '');
  v_type text := nullif(p_data->>'Type', '');
  v_user_name text := public.sm_fn_current_user_name();
  v_result jsonb;
begin
  if v_ma is null then raise exception 'Vui lòng nhập mã sản phẩm'; end if;
  if v_ten is null then raise exception 'Vui lòng nhập tên sản phẩm'; end if;
  if v_type is null then raise exception 'Vui lòng chọn loại sản phẩm'; end if;

  if exists (select 1 from public."sm_SanPham" where "MaSanPham" = v_ma) then
    raise exception 'Mã sản phẩm "%" đã tồn tại', v_ma;
  end if;

  insert into public."sm_SanPham" (
    "Id","MaSanPham","TenSanPham","Type","DonViTinh","TrongLuong","IsOrder",
    "CreatedByUserId","CreatedByUserName","CreatedOnDate"
  ) values (
    v_id, v_ma, v_ten, v_type, p_data->>'DonViTinh',
    nullif(p_data->>'TrongLuong', '')::numeric,
    coalesce((p_data->>'IsOrder')::boolean, false),
    auth.uid(), v_user_name, now()
  );

  select to_jsonb(t) into v_result from public."sm_SanPham" t where "Id" = v_id;
  return v_result;
end;
$$;

-- ---------------------------------------------------------------------
-- 3. Sửa sản phẩm — public.sm_sanpham_update(p_id, p_data)
-- ---------------------------------------------------------------------
create or replace function public.sm_sanpham_update(p_id uuid, p_data jsonb)
returns jsonb
language plpgsql
security invoker
as $$
declare
  v_ma text := nullif(trim(both from (p_data->>'MaSanPham')), '');
  v_ten text := nullif(trim(both from (p_data->>'TenSanPham')), '');
  v_type text := nullif(p_data->>'Type', '');
  v_user_name text := public.sm_fn_current_user_name();
  v_result jsonb;
begin
  if not exists (select 1 from public."sm_SanPham" where "Id" = p_id) then
    raise exception 'Không tìm thấy sản phẩm';
  end if;
  if v_ma is null then raise exception 'Vui lòng nhập mã sản phẩm'; end if;
  if v_ten is null then raise exception 'Vui lòng nhập tên sản phẩm'; end if;
  if v_type is null then raise exception 'Vui lòng chọn loại sản phẩm'; end if;

  if exists (select 1 from public."sm_SanPham" where "MaSanPham" = v_ma and "Id" <> p_id) then
    raise exception 'Mã sản phẩm "%" đã tồn tại', v_ma;
  end if;

  update public."sm_SanPham" set
    "MaSanPham" = v_ma,
    "TenSanPham" = v_ten,
    "Type" = v_type,
    "DonViTinh" = p_data->>'DonViTinh',
    "TrongLuong" = nullif(p_data->>'TrongLuong', '')::numeric,
    "IsOrder" = coalesce((p_data->>'IsOrder')::boolean, false),
    "LastModifiedByUserId" = auth.uid(),
    "LastModifiedByUserName" = v_user_name,
    "LastModifiedOnDate" = now()
  where "Id" = p_id;

  select to_jsonb(t) into v_result from public."sm_SanPham" t where "Id" = p_id;
  return v_result;
end;
$$;

-- ---------------------------------------------------------------------
-- 4. Xóa sản phẩm — public.sm_sanpham_delete(p_id)
-- ---------------------------------------------------------------------
create or replace function public.sm_sanpham_delete(p_id uuid)
returns jsonb
language plpgsql
security invoker
as $$
begin
  if not exists (select 1 from public."sm_SanPham" where "Id" = p_id) then
    raise exception 'Không tìm thấy sản phẩm';
  end if;

  if public.sm_fn_sanpham_co_phu_thuoc(p_id) then
    raise exception 'Không thể xóa vì sản phẩm này đã được dùng trong đơn hàng hoặc cấu hình khác';
  end if;

  delete from public."sm_SanPham" where "Id" = p_id;
  return jsonb_build_object('Message', 'Đã xóa sản phẩm');
end;
$$;

-- ---------------------------------------------------------------------
-- 5. Xóa nhiều sản phẩm cùng lúc — public.sm_sanpham_delete_many(p_ids)
-- ---------------------------------------------------------------------
create or replace function public.sm_sanpham_delete_many(p_ids uuid[])
returns jsonb
language plpgsql
security invoker
as $$
declare
  v_id uuid;
  v_xoa int := 0;
  v_bo_qua int := 0;
begin
  foreach v_id in array coalesce(p_ids, array[]::uuid[]) loop
    if not exists (select 1 from public."sm_SanPham" where "Id" = v_id)
       or public.sm_fn_sanpham_co_phu_thuoc(v_id) then
      v_bo_qua := v_bo_qua + 1;
      continue;
    end if;
    delete from public."sm_SanPham" where "Id" = v_id;
    v_xoa := v_xoa + 1;
  end loop;

  if v_xoa = 0 then
    raise exception 'Không xóa được sản phẩm nào (còn dữ liệu liên quan hoặc không tìm thấy)';
  end if;

  return jsonb_build_object('Message', format('Đã xóa %s sản phẩm%s', v_xoa,
    case when v_bo_qua > 0 then format(', bỏ qua %s sản phẩm còn dữ liệu liên quan', v_bo_qua) else '' end));
end;
$$;
