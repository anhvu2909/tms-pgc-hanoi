import { DownloadOutlined, FileExcelOutlined } from '@ant-design/icons';
import { API, routerLinks } from '@utils';
import { Button, Card, DatePicker } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { useState } from 'react';
import { customMessage } from 'src';
import * as XLSX from 'xlsx';

const { RangePicker } = DatePicker;

type ReportKey = 'vanTaiB11CnBacNinh' | 'chiTietDonHang' | 'inLenhVanChuyen';

interface ReportConfig {
  key: ReportKey;
  title: string;
  description: string;
  apiPath: string;
  sheetName: string;
  fileNamePrefix: string;
  // Đổi tên cột RPC -> tiêu đề tiếng Việt hiển thị trên file Excel.
  // Bỏ trống = giữ nguyên tên cột RPC trả về (báo cáo 1 đã trả sẵn tiêu đề
  // tiếng Việt ngay từ SQL — xem sql/09_bao_cao.sql).
  columnLabels?: Record<string, string>;
}

// Bộ nhãn cột dùng chung cho 2 báo cáo "chi tiết đơn hàng" / "in lệnh vận
// chuyển" vì cùng nhóm cột gốc (chỉ báo cáo in lệnh có thêm 4 cột địa chỉ).
const CHI_TIET_DON_HANG_LABELS: Record<string, string> = {
  Ma: 'Mã đơn hàng',
  BenGiao: 'Bên giao',
  BenNhan: 'Bên nhận',
  GhiChu: 'Ghi chú',
  ThoiHanGiaoHang: 'Thời hạn giao hàng',
  TrangThai: 'Trạng thái',
  TenSanPham: 'Tên sản phẩm',
  SoLuong: 'Số lượng',
  TrongLuong: 'Trọng lượng (kg/đơn vị)',
  KgQuyDoi: 'KL quy đổi (kg)',
  CuocVanChuyen: 'Cước vận chuyển (đ/kg)',
  PhiVanChuyen: 'Phí vận chuyển (đ)',
  LaiXe: 'Lái xe',
  PhuongTien: 'Phương tiện',
  KhoangCach: 'Khoảng cách (km)',
  DoiTuong: 'Đối tượng',
};

const REPORTS: ReportConfig[] = [
  {
    key: 'vanTaiB11CnBacNinh',
    title: 'Dữ liệu vận tải b11 CN Bắc Ninh',
    description: 'Bình nhập / vỏ trả theo ngày, theo kho — điểm bán CN Bắc Ninh',
    apiPath: `${routerLinks('BaoCao', 'api')}/van-tai-b11-cn-bac-ninh`,
    sheetName: 'VanTaiB11BacNinh',
    fileNamePrefix: 'Du_lieu_van_tai_b11_CN_Bac_Ninh',
  },
  {
    key: 'chiTietDonHang',
    title: 'Dữ liệu chi tiết đơn hàng',
    description: 'Chi tiết từng dòng sản phẩm theo đơn hàng, kèm cước vận chuyển',
    apiPath: `${routerLinks('BaoCao', 'api')}/chi-tiet-don-hang`,
    sheetName: 'ChiTietDonHang',
    fileNamePrefix: 'Du_lieu_chi_tiet_don_hang',
    columnLabels: CHI_TIET_DON_HANG_LABELS,
  },
  {
    key: 'inLenhVanChuyen',
    title: 'Dữ liệu in lệnh vận chuyển',
    description: 'Lệnh vận chuyển các đơn hàng sản phẩm khí, kèm địa chỉ giao/nhận',
    apiPath: `${routerLinks('BaoCao', 'api')}/in-lenh-van-chuyen`,
    sheetName: 'InLenhVanChuyen',
    fileNamePrefix: 'Du_lieu_in_lenh_van_chuyen',
    columnLabels: {
      ...CHI_TIET_DON_HANG_LABELS,
      DiaChiBenGiao: 'Địa chỉ bên giao',
      DiaChiBenNhan: 'Địa chỉ bên nhận',
      MaSanPham: 'Mã sản phẩm',
      CreatedOnDate: 'Ngày tạo đơn',
    },
  },
];

type RangeValue = [Dayjs, Dayjs];

const defaultRange: RangeValue = [dayjs().startOf('month'), dayjs()];

const Page: React.FC = () => {
  const [ranges, setRanges] = useState<Record<ReportKey, RangeValue | null>>({
    vanTaiB11CnBacNinh: defaultRange,
    chiTietDonHang: defaultRange,
    inLenhVanChuyen: defaultRange,
  });
  const [exporting, setExporting] = useState<Record<ReportKey, boolean>>({
    vanTaiB11CnBacNinh: false,
    chiTietDonHang: false,
    inLenhVanChuyen: false,
  });

  const handleExport = async (report: ReportConfig) => {
    const range = ranges[report.key];
    if (!range || !range[0] || !range[1]) {
      customMessage.error({ content: 'Vui lòng chọn đủ Từ ngày - Đến ngày' });
      return;
    }

    setExporting((prev) => ({ ...prev, [report.key]: true }));
    try {
      const res = await API.get<any[]>(report.apiPath, {
        tuNgay: range[0].format('YYYY-MM-DD'),
        denNgay: range[1].format('YYYY-MM-DD'),
      });

      const rows = res.data ?? [];
      if (rows.length === 0) {
        customMessage.error({ content: 'Không có dữ liệu trong khoảng ngày đã chọn' });
        return;
      }

      const mapped = report.columnLabels
        ? rows.map((row) => {
            const out: Record<string, any> = {};
            for (const [rawKey, label] of Object.entries(report.columnLabels!)) {
              out[label] = row[rawKey];
            }
            return out;
          })
        : rows;

      const sheet = XLSX.utils.json_to_sheet(mapped);
      const book = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(book, sheet, report.sheetName);
      XLSX.writeFile(book, `${report.fileNamePrefix}_${Date.now()}.xlsx`);

      customMessage.success({ content: 'Xuất file thành công' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Có lỗi xảy ra khi xuất file';
      customMessage.error({ content: message });
    } finally {
      setExporting((prev) => ({ ...prev, [report.key]: false }));
    }
  };

  return (
    <>
      <div className={'flex flex-col sticky top-0 z-10'}>
        <div className={'flex justify-between bg-white'}>
          <div className={'mx-3 h-12 flex items-center text-gray-600 text-sm font-semibold'}>Báo cáo</div>
        </div>
      </div>

      <div className="flex flex-col gap-4 m-5">
        {REPORTS.map((report) => (
          <Card key={report.key} className="rounded-sm">
            <div className="flex items-center gap-2 mb-3">
              <FileExcelOutlined className="text-green-600 text-lg" />
              <div>
                <div className="font-semibold text-gray-800">{report.title}</div>
                <div className="text-xs text-gray-400">{report.description}</div>
              </div>
            </div>
            <div className="flex items-end gap-3 flex-wrap">
              <RangePicker
                placeholder={['Từ ngày', 'Đến ngày']}
                value={ranges[report.key]}
                onChange={(value) => setRanges((prev) => ({ ...prev, [report.key]: value as RangeValue | null }))}
                format="DD/MM/YYYY"
              />
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                loading={exporting[report.key]}
                onClick={() => handleExport(report)}
              >
                Xuất Excel
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
};

export default Page;
