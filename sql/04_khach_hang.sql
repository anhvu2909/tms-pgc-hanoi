-- =====================================================================
-- 04_khach_hang.sql — Màn hình Khách hàng: Danh sách / Thêm mới / Sửa /
-- Xem chi tiết / Xóa. Theo đúng nghiệp vụ đọc từ pages/khach-hang/*.tsx,
-- store/khach-hang/index.tsx.
--
-- LƯU Ý: Sau khi 03_don_hang.sql đã gộp toàn bộ 03..09 (theo skill
-- tu-dien-nghiep-vu-tms), các file 04_bo_sung_don_hang.sql,
-- 05_bo_gan_xe_hang_loat.sql, 06..09 trong thư mục sql/ đã LỖI THỜI —
-- có thể xóa khỏi repo, không cần chạy lại. File "04" ở đây là số mới,
-- không liên quan tới file "04_bo_sung_don_hang.sql" cũ.
--
-- ĐỌC (danh sách) vẫn dùng .from("sm_KhachHang") qua genericList trong
-- api.ts như cũ. Chỉ GHI (tạo/sửa/xóa) và XEM CHI TIẾT (cần kèm danh sách
-- kho con) mới cần RPC riêng ở đây.
--
-- GIẢ ĐỊNH CHƯA XÁC NHẬN (cần Bạn xác nhận khi test):
--   1) Form Khách hàng KHÔNG có trường "Địa chỉ" và "Ngày sinh" của khách
--      hàng (dù DB có cột "DiaChi", "Birthdate") — code cũ gán
--      birthdate = dayjs(undefined) (= giờ hiện tại) mỗi lần lưu nhưng
--      không có ô nhập nào cho nó, nhiều khả năng là lỗi tồn đọng chứ
--      không phải nghiệp vụ thật. Ở đây CHỦ ĐỘNG BỎ QUA 2 cột này, giữ
--      nguyên giá trị hiện có trong DB (không ghi đè), giống cách đã cắt
--      "IsInitialized" ở màn Kho. Nếu Bạn muốn khôi phục 2 trường này,
--      cần thêm lại ô nhập trên form trước.
--   2) "Lịch sử chăm sóc" (sm_LichSuChamSoc, lich-su-cham-soc.form.tsx)
--      KHÔNG có nút/luồng nào trong UI hiện tại thực sự mở được form này
--      (không có nút "Thêm", không có bảng liệt kê lịch sử) — coi là
--      tính năng orphan, KHÔNG viết RPC cho nó đợt này. Báo lại nếu vẫn
--      cần dùng, sẽ làm riêng.
--   3) "Mã khách hàng" KHÔNG bắt buộc duy nhất — cùng lý do như "Mã kho"
--      ở màn Kho (DDL không có unique index, dữ liệu cũ có thể đã trùng).
--   4) Xóa khách hàng: chặn nếu còn (a) Đơn hàng nhận trực tiếp
--      ("BenNhanId" = khách hàng và "BenNhanType" = 'KhachHang'), hoặc
--      (b) bất kỳ Kho con nào của khách hàng đang bị Xe/Biểu cước/Giao
--      dịch kho/Đơn hàng khác tham chiếu (dùng chung điều kiện với
--      sm_kho_delete). Nếu không bị chặn, Kho con "sạch" sẽ bị xóa kèm
--      theo khách hàng (không dựa vào ON DELETE CASCADE có sẵn của DB —
--      tự kiểm tra rồi tự xóa, đúng nguyên tắc "không cascade âm thầm").
--      Riêng "sm_LichSuChamSoc" (nếu có) để DB tự cascade xóa — chỉ là
--      ghi chú chăm sóc, không có bảng nào khác tham chiếu tới nó.
--   5) Khi sửa khách hàng, dòng kho nào bị xóa khỏi bảng con "Danh sách
--      địa chỉ" mà kho đó còn phụ thuộc (Xe/Biểu cước/Giao dịch/Đơn
--      hàng) → CHẶN LƯU TOÀN BỘ (rollback cả khách hàng lẫn các dòng kho
--      khác), báo rõ tên kho bị chặn, không âm thầm giữ lại dòng đó.
--   6) Sắp xếp danh sách khách hàng mặc định theo "Ten" tăng dần (bản cũ
--      không có backend .NET cho màn hình này nên không biết thứ tự gốc).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. RLS baseline cho sm_KhachHang (sm_Kho/cata_* đã bật ở 02_kho.sql)
-- ---------------------------------------------------------------------
alter table public."sm_KhachHang" enable row level security;

drop policy if exists authenticated_full_access on public."sm_KhachHang";
create policy authenticated_full_access on public."sm_KhachHang"
  for all to authenticated using (true) with check (true);

-- ---------------------------------------------------------------------
-- 1. Hàm dùng chung — 1 kho có đang bị tham chiếu bởi Xe/Biểu cước/Giao
--    dịch kho/Đơn hàng hay không (tách ra từ logic trong sm_kho_delete
--    để dùng lại được ở đây, không sửa 02_kho.sql).
-- ---------------------------------------------------------------------
create or replace function public.sm_fn_kho_co_phu_thuoc(p_kho_id uuid)
returns boolean
language sql
stable
security invoker
as $$
  select
    exists (select 1 from public."sm_PhuongTien" where "WarehouseId" = p_kho_id)
    or exists (select 1 from public."sm_ChiPhiVanChuyen" where "KhoDiId" = p_kho_id or "KhoNhanId" = p_kho_id)
    or exists (select 1 from public."sm_WarehouseTransaction" where "WarehouseId" = p_kho_id)
    or exists (
      select 1 from public."sm_DonHang"
      where "BenGiaoId" = p_kho_id or "BenNhanId" = p_kho_id or "DiaChiBenNhanId" = p_kho_id
    );
$$;

-- ---------------------------------------------------------------------
-- 2. Khách hàng này có đang bị chặn xóa hay không (đơn hàng trực tiếp,
--    hoặc còn kho con đang bị phụ thuộc).
-- ---------------------------------------------------------------------
create or replace function public.sm_fn_khachhang_co_phu_thuoc(p_id uuid)
returns boolean
language sql
stable
security invoker
as $$
  select
    exists (
      select 1 from public."sm_DonHang"
      where "BenNhanId" = p_id and "BenNhanType" = 'KhachHang'
    )
    or exists (
      select 1 from public."sm_Kho" k
      where k."KhachHangId" = p_id and public.sm_fn_kho_co_phu_thuoc(k."Id")
    );
$$;

-- ---------------------------------------------------------------------
-- 3. Chi tiết khách hàng kèm danh sách kho con — public.sm_fn_khachhang_detail(p_id)
-- ---------------------------------------------------------------------
create or replace function public.sm_fn_khachhang_detail(p_id uuid)
returns jsonb
language sql
stable
security invoker
as $$
  select to_jsonb(kh) || jsonb_build_object(
    'ListKho',
    coalesce((
      select jsonb_agg(to_jsonb(k) order by k."Ten")
      from public."sm_Kho" k
      where k."KhachHangId" = p_id
    ), '[]'::jsonb)
  )
  from public."sm_KhachHang" kh
  where kh."Id" = p_id;
$$;

-- ---------------------------------------------------------------------
-- 4. Tạo khách hàng mới — public.sm_khachhang_create(p_khach_hang, p_list_kho)
--    p_khach_hang: {Ma*, Ten*, LoaiKhachHang*, NguoiPhuTrach, SoDienThoai, GhiChu}
--    p_list_kho: [{Ma*, Ten*, DiaChi, GhiChu, Latitude, Longitude,
--                  ProvinceCode/Name, DistrictCode/Name, CommuneCode/Name}, ...]
--    Mọi dòng trong p_list_kho đều là kho MỚI (khách hàng vừa tạo nên
--    chưa có kho nào trong DB) — insert thẳng, không cần so sánh Id.
-- ---------------------------------------------------------------------
create or replace function public.sm_khachhang_create(p_khach_hang jsonb, p_list_kho jsonb)
returns jsonb
language plpgsql
security invoker
as $$
declare
  v_id uuid := gen_random_uuid();
  v_ma text := nullif(trim(both from (p_khach_hang->>'Ma')), '');
  v_ten text := nullif(trim(both from (p_khach_hang->>'Ten')), '');
  v_loai text := nullif(p_khach_hang->>'LoaiKhachHang', '');
  v_user_name text := public.sm_fn_current_user_name();
  v_item jsonb;
  v_kho_ma text;
  v_kho_ten text;
begin
  if v_ma is null then raise exception 'Vui lòng nhập mã khách hàng'; end if;
  if v_ten is null then raise exception 'Vui lòng nhập tên khách hàng'; end if;
  if v_loai is null then raise exception 'Vui lòng chọn loại khách hàng'; end if;

  insert into public."sm_KhachHang" (
    "Id","Ma","Ten","LoaiKhachHang","NguoiPhuTrach","SoDienThoai","GhiChu",
    "CreatedByUserId","CreatedByUserName","CreatedOnDate"
  ) values (
    v_id, v_ma, v_ten, v_loai,
    p_khach_hang->>'NguoiPhuTrach', p_khach_hang->>'SoDienThoai', p_khach_hang->>'GhiChu',
    auth.uid(), v_user_name, now()
  );

  for v_item in select * from jsonb_array_elements(coalesce(p_list_kho, '[]'::jsonb)) loop
    v_kho_ma := nullif(trim(both from (v_item->>'Ma')), '');
    v_kho_ten := nullif(trim(both from (v_item->>'Ten')), '');
    if v_kho_ma is null or v_kho_ten is null then
      raise exception 'Vui lòng nhập đầy đủ Mã và Tên cho từng dòng địa chỉ kho';
    end if;

    insert into public."sm_Kho" (
      "Id","Ma","Ten","DiaChi","GhiChu","LoaiKho","KhachHangId","IsCuaHang",
      "ProvinceCode","ProvinceName","DistrictCode","DistrictName","CommuneCode","CommuneName",
      "Latitude","Longitude","CreatedByUserId","CreatedByUserName","CreatedOnDate"
    ) values (
      gen_random_uuid(), v_kho_ma, v_kho_ten, v_item->>'DiaChi', v_item->>'GhiChu',
      'KHO_KHACH_HANG', v_id, false,
      nullif(v_item->>'ProvinceCode','')::int4, nullif(v_item->>'ProvinceName',''),
      nullif(v_item->>'DistrictCode','')::int4, nullif(v_item->>'DistrictName',''),
      nullif(v_item->>'CommuneCode','')::int4, nullif(v_item->>'CommuneName',''),
      nullif(v_item->>'Latitude','')::float8, nullif(v_item->>'Longitude','')::float8,
      auth.uid(), v_user_name, now()
    );
  end loop;

  return public.sm_fn_khachhang_detail(v_id);
end;
$$;

-- ---------------------------------------------------------------------
-- 5. Sửa khách hàng — public.sm_khachhang_update(p_id, p_khach_hang, p_list_kho)
--    Đồng bộ danh sách kho con: dòng có "Id" khớp DB -> update; dòng
--    không có "Id" -> insert mới; dòng có trong DB nhưng KHÔNG còn trong
--    p_list_kho -> xóa, TRỪ KHI kho đó còn phụ thuộc (khi đó chặn lưu
--    toàn bộ, báo rõ tên kho).
-- ---------------------------------------------------------------------
create or replace function public.sm_khachhang_update(p_id uuid, p_khach_hang jsonb, p_list_kho jsonb)
returns jsonb
language plpgsql
security invoker
as $$
declare
  v_ma text := nullif(trim(both from (p_khach_hang->>'Ma')), '');
  v_ten text := nullif(trim(both from (p_khach_hang->>'Ten')), '');
  v_loai text := nullif(p_khach_hang->>'LoaiKhachHang', '');
  v_user_name text := public.sm_fn_current_user_name();
  v_incoming_ids uuid[];
  v_stale record;
  v_blocked text[] := array[]::text[];
  v_item jsonb;
  v_kho_id uuid;
  v_kho_ma text;
  v_kho_ten text;
begin
  if not exists (select 1 from public."sm_KhachHang" where "Id" = p_id) then
    raise exception 'Không tìm thấy khách hàng';
  end if;
  if v_ma is null then raise exception 'Vui lòng nhập mã khách hàng'; end if;
  if v_ten is null then raise exception 'Vui lòng nhập tên khách hàng'; end if;
  if v_loai is null then raise exception 'Vui lòng chọn loại khách hàng'; end if;

  update public."sm_KhachHang" set
    "Ma" = v_ma,
    "Ten" = v_ten,
    "LoaiKhachHang" = v_loai,
    "NguoiPhuTrach" = p_khach_hang->>'NguoiPhuTrach',
    "SoDienThoai" = p_khach_hang->>'SoDienThoai',
    "GhiChu" = p_khach_hang->>'GhiChu',
    "LastModifiedByUserId" = auth.uid(),
    "LastModifiedByUserName" = v_user_name,
    "LastModifiedOnDate" = now()
  where "Id" = p_id;

  -- Tập Id kho được gửi lên (bỏ qua dòng mới chưa có Id)
  select coalesce(array_agg((item->>'Id')::uuid), array[]::uuid[])
    into v_incoming_ids
  from jsonb_array_elements(coalesce(p_list_kho, '[]'::jsonb)) as item
  where nullif(item->>'Id', '') is not null;

  -- Dòng kho cũ đã bị bỏ khỏi danh sách -> xóa nếu không còn phụ thuộc
  for v_stale in
    select "Id", "Ma", "Ten" from public."sm_Kho"
    where "KhachHangId" = p_id
      and not ("Id" = any(v_incoming_ids))
  loop
    if public.sm_fn_kho_co_phu_thuoc(v_stale."Id") then
      v_blocked := v_blocked || format('%s (%s)', v_stale."Ten", coalesce(v_stale."Ma", v_stale."Id"::text));
    else
      delete from public."sm_Kho" where "Id" = v_stale."Id";
    end if;
  end loop;

  if array_length(v_blocked, 1) > 0 then
    raise exception 'Không thể lưu vì các địa chỉ kho sau vẫn còn dữ liệu liên quan (xe/biểu cước/giao dịch/đơn hàng), hãy xử lý trước: %',
      array_to_string(v_blocked, ', ');
  end if;

  -- Cập nhật dòng đã có Id, thêm mới dòng chưa có Id
  for v_item in select * from jsonb_array_elements(coalesce(p_list_kho, '[]'::jsonb)) loop
    v_kho_ma := nullif(trim(both from (v_item->>'Ma')), '');
    v_kho_ten := nullif(trim(both from (v_item->>'Ten')), '');
    if v_kho_ma is null or v_kho_ten is null then
      raise exception 'Vui lòng nhập đầy đủ Mã và Tên cho từng dòng địa chỉ kho';
    end if;

    v_kho_id := nullif(v_item->>'Id', '')::uuid;

    if v_kho_id is not null and exists (select 1 from public."sm_Kho" where "Id" = v_kho_id) then
      update public."sm_Kho" set
        "Ma" = v_kho_ma,
        "Ten" = v_kho_ten,
        "DiaChi" = v_item->>'DiaChi',
        "GhiChu" = v_item->>'GhiChu',
        "LoaiKho" = 'KHO_KHACH_HANG',
        "KhachHangId" = p_id,
        "IsCuaHang" = false,
        "ProvinceCode" = nullif(v_item->>'ProvinceCode','')::int4,
        "ProvinceName" = nullif(v_item->>'ProvinceName',''),
        "DistrictCode" = nullif(v_item->>'DistrictCode','')::int4,
        "DistrictName" = nullif(v_item->>'DistrictName',''),
        "CommuneCode" = nullif(v_item->>'CommuneCode','')::int4,
        "CommuneName" = nullif(v_item->>'CommuneName',''),
        "Latitude" = nullif(v_item->>'Latitude','')::float8,
        "Longitude" = nullif(v_item->>'Longitude','')::float8,
        "LastModifiedByUserId" = auth.uid(),
        "LastModifiedByUserName" = v_user_name,
        "LastModifiedOnDate" = now()
      where "Id" = v_kho_id;
    else
      insert into public."sm_Kho" (
        "Id","Ma","Ten","DiaChi","GhiChu","LoaiKho","KhachHangId","IsCuaHang",
        "ProvinceCode","ProvinceName","DistrictCode","DistrictName","CommuneCode","CommuneName",
        "Latitude","Longitude","CreatedByUserId","CreatedByUserName","CreatedOnDate"
      ) values (
        gen_random_uuid(), v_kho_ma, v_kho_ten, v_item->>'DiaChi', v_item->>'GhiChu',
        'KHO_KHACH_HANG', p_id, false,
        nullif(v_item->>'ProvinceCode','')::int4, nullif(v_item->>'ProvinceName',''),
        nullif(v_item->>'DistrictCode','')::int4, nullif(v_item->>'DistrictName',''),
        nullif(v_item->>'CommuneCode','')::int4, nullif(v_item->>'CommuneName',''),
        nullif(v_item->>'Latitude','')::float8, nullif(v_item->>'Longitude','')::float8,
        auth.uid(), v_user_name, now()
      );
    end if;
  end loop;

  return public.sm_fn_khachhang_detail(p_id);
end;
$$;

-- ---------------------------------------------------------------------
-- 6. Xóa khách hàng — public.sm_khachhang_delete(p_id)
-- ---------------------------------------------------------------------
create or replace function public.sm_khachhang_delete(p_id uuid)
returns jsonb
language plpgsql
security invoker
as $$
declare
  v_so_don_hang int;
  v_so_kho_ket int;
begin
  if not exists (select 1 from public."sm_KhachHang" where "Id" = p_id) then
    raise exception 'Không tìm thấy khách hàng';
  end if;

  select count(*) into v_so_don_hang
  from public."sm_DonHang"
  where "BenNhanId" = p_id and "BenNhanType" = 'KhachHang';

  select count(*) into v_so_kho_ket
  from public."sm_Kho" k
  where k."KhachHangId" = p_id and public.sm_fn_kho_co_phu_thuoc(k."Id");

  if v_so_don_hang > 0 or v_so_kho_ket > 0 then
    raise exception 'Không thể xóa khách hàng vì còn: %',
      array_to_string(array_remove(array[
        case when v_so_don_hang > 0 then format('%s đơn hàng', v_so_don_hang) end,
        case when v_so_kho_ket > 0 then format('%s địa chỉ kho đang có xe/biểu cước/giao dịch/đơn hàng liên quan', v_so_kho_ket) end
      ], null), ', ');
  end if;

  delete from public."sm_Kho" where "KhachHangId" = p_id;
  delete from public."sm_KhachHang" where "Id" = p_id;

  return jsonb_build_object('Message', 'Đã xóa khách hàng');
end;
$$;

-- ---------------------------------------------------------------------
-- 7. Xóa nhiều khách hàng cùng lúc — public.sm_khachhang_delete_many(p_ids)
--    Khách hàng nào còn phụ thuộc thì bỏ qua (không làm rớt cả loạt).
-- ---------------------------------------------------------------------
create or replace function public.sm_khachhang_delete_many(p_ids uuid[])
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
    if not exists (select 1 from public."sm_KhachHang" where "Id" = v_id) then
      v_bo_qua := v_bo_qua + 1;
      continue;
    end if;

    if public.sm_fn_khachhang_co_phu_thuoc(v_id) then
      v_bo_qua := v_bo_qua + 1;
      continue;
    end if;

    delete from public."sm_Kho" where "KhachHangId" = v_id;
    delete from public."sm_KhachHang" where "Id" = v_id;
    v_xoa := v_xoa + 1;
  end loop;

  if v_xoa = 0 then
    raise exception 'Không xóa được khách hàng nào (còn dữ liệu liên quan hoặc không tìm thấy)';
  end if;

  return jsonb_build_object('Message', format('Đã xóa %s khách hàng%s', v_xoa,
    case when v_bo_qua > 0 then format(', bỏ qua %s khách hàng còn dữ liệu liên quan', v_bo_qua) else '' end));
end;
$$;
