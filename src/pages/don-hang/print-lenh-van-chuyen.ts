import dayjs from 'dayjs';
import { customMessage } from 'src';
import { DonHang } from 'src/store/don-hang';

// Dung chung cho ca trang chi tiet don hang dang route rieng (detail.tsx) lan drawer
// mo tu danh sach don hang (detail.form.tsx) - khong duoc nhan dang dieu kien theo
// trang thai (user yeu cau: "o trang thai nao cung phai co nut nay").
export const printLenhVanChuyen = (data?: DonHang) => {
  if (!data) return;

  const sanPhamKhi = (data.sanPham ?? []).filter((x) => (x.tenSanPham ?? '').startsWith('Khí'));
  const sortedSanPham = [...sanPhamKhi].sort((a, b) => (b.maSanPham ?? '').localeCompare(a.maSanPham ?? ''));
  const tongKhoiLuong = sortedSanPham.reduce((sum, x) => sum + (x.quyDoi ?? 0), 0);
  const cuocVanChuyen = data.cuocVanChuyen ?? 0;
  const tongTienThanhToan = tongKhoiLuong * cuocVanChuyen;

  const thongTin = [data.laiXe?.tenTaiXe, data.phuongTien?.bienSoXe, data.phuongTien?.congTy]
    .filter(Boolean)
    .join(' - ');

  const ngayDatHang = data.ngayDatHang ? dayjs(data.ngayDatHang) : dayjs();
  const thoiHanGiaoHang = data.thoiHanGiaoHang ? dayjs(data.thoiHanGiaoHang).format('DD/MM/YYYY') : '';

  const escapeHtml = (value: unknown) =>
    String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

  const hangHoaRows = sortedSanPham
    .map(
      (sp, index) => `
      <tr>
        <td class="center">${index + 1}</td>
        <td class="center">${escapeHtml(sp.maSanPham)}</td>
        <td>${escapeHtml(sp.tenSanPham)}</td>
        <td class="center">${sp.soLuong ?? ''}</td>
        <td class="center">${sp.trongLuong ?? ''}</td>
        <td class="center">${(sp.quyDoi ?? 0).toLocaleString('vi-VN')}</td>
      </tr>`,
    )
    .join('');

  const html = `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8" />
<title>Lenh dieu dong van chuyen - ${escapeHtml(data.ma)}</title>
<style>
  @page { size: A5 landscape; margin: 8mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; margin: 0; padding: 0; }
  .header-row { display: flex; justify-content: space-between; }
  .header-col { width: 48%; text-align: center; }
  .bold { font-weight: bold; }
  .date-line { text-align: right; font-style: italic; margin-top: 6px; }
  .title { text-align: center; font-weight: bold; font-size: 16pt; margin: 8px 0; }
  .info-table { width: 100%; border-collapse: collapse; }
  .info-table td { padding: 2px 4px; vertical-align: top; font-size: 12pt; }
  .label { font-weight: bold; white-space: nowrap; }
  .goods-title { font-weight: bold; margin-top: 6px; }
  .goods-table { width: 100%; border-collapse: collapse; margin-top: 4px; }
  .goods-table th, .goods-table td { border: 1px solid #000; padding: 3px 6px; font-size: 11pt; }
  .goods-table th { text-align: center; font-weight: bold; }
  .center { text-align: center; }
  .totals { margin-top: 4px; text-align: right; }
  .totals div { margin-top: 2px; }
  .signature { text-align: right; font-weight: bold; margin-top: 24px; padding-right: 24px; }
</style>
</head>
<body>
  <div class="header-row">
    <div class="header-col">
      CÔNG TY TNHH GAS PETROLIMEX HÀ NỘI<br/>
      <span class="bold">PHÒNG KINH DOANH</span>
    </div>
    <div class="header-col">
      <span class="bold">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</span><br/>
      <span class="bold">Độc lập - Tự do - Hạnh phúc</span>
    </div>
  </div>
  <div class="date-line">Hà Nội, ngày ${ngayDatHang.format('DD')} tháng ${ngayDatHang.format('MM')} năm ${ngayDatHang.format('YYYY')}</div>
  <div class="title">LỆNH ĐIỀU ĐỘNG VẬN CHUYỂN</div>
  <table class="info-table">
    <tr>
      <td class="label" style="width:16%;">Mã đơn hàng:</td>
      <td style="width:34%;">${escapeHtml(data.ma)}</td>
      <td class="label" style="width:18%;">Ngày tạo đơn:</td>
      <td>${ngayDatHang.format('DD/MM/YYYY')}</td>
    </tr>
    <tr>
      <td class="label">Nhận từ:</td>
      <td colspan="3">${escapeHtml(data.benGiao)} - ${escapeHtml(data.diaChiBenGiao)}</td>
    </tr>
    <tr>
      <td class="label">Chuyển đến:</td>
      <td colspan="3">${escapeHtml(data.benNhan)} - ${escapeHtml(data.diaChiBenNhan)}</td>
    </tr>
    <tr>
      <td class="label">Khoảng cách:</td>
      <td>${data.khoangCach != null ? `${data.khoangCach} km` : ''}</td>
      <td class="label">Thời gian giao hàng:</td>
      <td>${thoiHanGiaoHang}</td>
    </tr>
    <tr>
      <td class="label">Tài xế - Phương tiện:</td>
      <td colspan="3">${escapeHtml(thongTin)}</td>
    </tr>
    <tr>
      <td class="label">Ghi chú:</td>
      <td colspan="3">${escapeHtml(data.ghiChu)}</td>
    </tr>
  </table>
  <div class="goods-title">DANH SÁCH HÀNG HÓA:</div>
  <table class="goods-table">
    <thead>
      <tr>
        <th>STT</th>
        <th>Mã hàng hóa</th>
        <th>Tên hàng hóa</th>
        <th>Số lượng bình</th>
        <th>Kg/bình</th>
        <th>Quy đổi (kg)</th>
      </tr>
    </thead>
    <tbody>${hangHoaRows}</tbody>
  </table>
  <div class="totals">
    <div>Tổng khối lượng: <span class="bold">${tongKhoiLuong.toLocaleString('vi-VN')}</span> kg</div>
    <div>Cước vận chuyển: <span class="bold">${cuocVanChuyen.toLocaleString('vi-VN')}</span> đ/kg</div>
    <div>Tổng tiền thanh toán: <span class="bold">${tongTienThanhToan.toLocaleString('vi-VN')}</span> đ</div>
  </div>
  <div class="signature">PHỤ TRÁCH VẬN TẢI</div>
</body>
</html>`;

  const printWindow = window.open('', '_blank', 'width=900,height=650');
  if (!printWindow) {
    customMessage.error({ content: 'Trình duyệt đã chặn cửa sổ in, vui lòng cho phép pop-up' });
    return;
  }
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.onload = () => {
    printWindow.focus();
    printWindow.print();
  };
};
