import { EStatusState } from '@models';
import { lang, routerLinks, trangThaiDonHang } from '@utils';
import { Button, Empty, Space, Spin, Table, Tag, Timeline, Tooltip } from 'antd';
import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { DonHangFacade } from 'src/store/don-hang';
import dayjs from 'dayjs';
import { LichSuChinhSuaFacade } from 'src/store/lich-su-chinh-sua';
import { RightMapRoleFacade } from 'src/store/right-map-role';
import { customMessage } from 'src';

const DonHangDetail = () => {
  const { id } = useParams();
  const donHangFacade = DonHangFacade();
  const param = JSON.parse(donHangFacade.queryParams || `{}`);
  const navigate = useNavigate();
  const lichSuChinhSuaFacade = LichSuChinhSuaFacade();
  const rightMapRoleFacade = RightMapRoleFacade();

  useEffect(() => {
    lichSuChinhSuaFacade.get({ size: -1, filter: JSON.stringify({ entityId: id, entityType: 'DonHang' }) });
    rightMapRoleFacade.getRightMapByCode('DONHANG');
  }, []);

  const sanPhamDataSource =
    donHangFacade.data?.sanPham?.map((item, index) => ({
      ...item,
      index: index + 1,
      donGia: item.donGia?.toLocaleString(),
    })) ?? [];

  const itemsTimeLine = lichSuChinhSuaFacade.pagination?.content.map((item) => ({
    color: 'blue',
    children: (
      <>
        <p>
          {item.actionMadeByUserName}{' '}
          {item.action === 'GuiDuyet' ? 'gửi duyệt' : item.action === 'PheDuyet' ? 'đã duyệt' : 'đã từ chối'} đơn hàng
        </p>
        <p hidden={item.description === null}>Lý do từ chối: {item.description}</p>
        <p>{dayjs(item.actionMadeOnDate).format('YYYY-MM-DD HH:mm')}</p>
      </>
    ),
  }));

  const columns: any = [
    {
      title: 'STT',
      dataIndex: 'index',
      key: 'index',
      width: 40,
      align: 'center',
    },
    {
      title: 'Mã sản phẩm',
      dataIndex: 'maSanPham',
      key: 'maSanPham',
      width: 140,
    },
    {
      title: 'Tên sản phẩm',
      dataIndex: 'tenSanPham',
      key: 'tenSanPham',
    },
    {
      title: 'Số lượng',
      dataIndex: 'soLuong',
      key: 'soLuong',
      width: 100,
      align: 'right',
    },
    {
      title: 'Số kg',
      dataIndex: 'trongLuong',
      key: 'trongLuong',
      width: 100,
      align: 'right',
    },
    {
      title: 'Quy đổi',
      dataIndex: 'quyDoi',
      key: 'quyDoi',
      width: 100,
      align: 'right',
    },
  ];

  useEffect(() => {
    if (id) {
      donHangFacade.getById({ id });
    }
  }, []);

  const handlePrintLenhVanChuyen = () => {
    const data = donHangFacade.data;
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

  const handleBack = () => {
    donHangFacade.set({ status: EStatusState.idle });
    navigate(`/${lang}${routerLinks('DonHang')}?${new URLSearchParams(param).toString()}`);
  };

  const handlePutStatus = (status: string) => {
    navigate(`/${lang}${routerLinks('DonHang')}?${new URLSearchParams(param).toString()}`);
    donHangFacade.putStatus({ id: donHangFacade.data?.id, trangThai: status });
  };

  return (
    <Spin spinning={donHangFacade.isFormLoading}>
      <div className={'flex mt-5 justify-center'}>
        <div>
          <div className="shadow rounded-md w-[800px] bg-white overflow-hidden p-5 mx-auto mb-5">
            <div className="flex justify-between">
              <h1 className="font-bold text-lg pb-2">Thông tin đơn hàng</h1>
              <Space>
                <Button onClick={handlePrintLenhVanChuyen}>In lệnh vận chuyển</Button>
                <Button
                  hidden={
                    !donHangFacade.data?.allowedActions?.includes('UPDATE') ||
                    !rightMapRoleFacade.rightDatas?.find((x) => x.groupCode == 'DONHANG')?.isUpdateAllowed
                  }
                  type={'primary'}
                  onClick={() => {
                    navigate(`/${lang}${routerLinks('DonHang')}/${donHangFacade.data?.id}/edit`);
                  }}
                >
                  Chỉnh sửa
                </Button>
              </Space>
            </div>
            <hr className="h-1 border-1 pt-5" />
            <div className="flex mt-4 gap-32">
              <div className="flex gap-x-4">
                <div className="grid gap-y-1 text-right">
                  <p>Mã đơn hàng:</p>
                  <p>Trạng thái:</p>
                  <p>Độ ưu tiên:</p>
                </div>
                <div className="grid gap-y-1 font-semibold text-left">
                  <p>{donHangFacade.data?.ma}</p>
                  <p>
                    {(() => {
                      const trangThai = trangThaiDonHang[donHangFacade.data?.trangThai as keyof typeof trangThaiDonHang];
                      return trangThai ? <Tag color={trangThai.color}>{trangThai.name}</Tag> : null;
                    })()}
                  </p>
                  <p>
                    {donHangFacade.data?.mucDoUuTien === '3'
                      ? ' Cao'
                      : donHangFacade.data?.mucDoUuTien === '2'
                        ? ' Bình thường'
                        : ' Thấp'}{' '}
                  </p>
                </div>
              </div>
              <div className="flex gap-x-4">
                <div className="grid gap-y-1 text-right">
                  <p>Ngày tạo:</p>
                  <p>Người tạo:</p>
                </div>
                <div className="grid gap-y-1 font-semibold text-left">
                  <p>{dayjs(donHangFacade.data?.createdOnDate).format('DD/MM/YYYY - HH:mm')}</p>
                  <p>{donHangFacade.data?.createdByUserName}</p>
                </div>
              </div>
            </div>
            <div className="flex gap-x-4 mt-3 ml-2">
              <div className="grid gap-y-1 text-right">
                <p>Nhận từ:</p>
                <p>Chuyển đến:</p>
              </div>
              <div className="grid gap-y-1 font-semibold text-left">
                <p onClick={() => { navigate(`/${lang}${routerLinks('Kho')}?id=${donHangFacade.data?.benGiaoId}`);} } className="hover:text-blue-400 hover:cursor-pointer text-blue-500">{donHangFacade.data?.benGiao}</p>
                <p className="line-clamp-2">{donHangFacade.data?.diaChiBenGiao}</p>
                <p onClick={() => { navigate(`/${lang}${routerLinks('KhachHang')}?id=${donHangFacade.data?.benNhanId}&type=edit`);} } className="hover:text-blue-400 hover:cursor-pointer text-blue-500">{donHangFacade.data?.benNhan}</p>
                <p className="line-clamp-2">{donHangFacade.data?.diaChiBenNhan}</p>
              </div>
            </div>
            <div className="flex ml-9 mt-1 gap-x-4">
              <p>Ghi chú:</p>
              <p className="font-semibold">{donHangFacade.data?.ghiChu}</p>
            </div>
          </div>
          <div className="shadow rounded-md w-[800px] bg-white overflow-hidden p-5 mx-auto mb-5">
            <h1 className="font-bold text-lg pb-2">Danh sách sản phẩm</h1>
            <hr className="h-1 border-1" />
            <Table className={'my-3'} dataSource={sanPhamDataSource} columns={columns} pagination={false}></Table>

            <div className={'flex justify-end gap-6 mt-4'}>
              <div className={'grid font-semibold'}>
                <p>Tổng khối lượng:</p>
                <p>Giá (cước vận chuyển):</p>
                <p>Tổng tiền thanh toán:</p>
              </div>
              <div className={'grid text-right'}>
                <p>{donHangFacade.data?.tongTrongLuong?.toLocaleString()} kg</p>
                <p>{donHangFacade.data?.cuocVanChuyen?.toLocaleString()} đ/kg</p>
                <p>{donHangFacade.data?.thanhTien?.toLocaleString()} đ</p>
              </div>
            </div>
          </div>
          <div className={'sticky px-5 bottom-0'}>
            <div className="shadow rounded-lg w-[800px] bg-white overflow-hidden p-4 mx-auto mb-5">
              <div className={'flex justify-between'}>
                <div>
                  <Button
                    hidden={donHangFacade.data?.allowedActions && donHangFacade.data?.allowedActions?.length < 1}
                    onClick={handleBack}
                  >
                    Hủy bỏ
                  </Button>
                </div>
                <div className={'flex gap-2'}>
                  <Button
                    hidden={!donHangFacade.data?.allowedActions || donHangFacade.data?.allowedActions?.length > 0}
                    onClick={handleBack}
                  >
                    Hủy bỏ
                  </Button>
                  <Button
                    hidden={!donHangFacade.data?.allowedActions?.includes('REJECT')}
                    danger
                    onClick={() => handlePutStatus('DA_TU_CHOI')}
                  >
                    Từ chối
                  </Button>
                  <Button
                    hidden={!donHangFacade.data?.allowedActions?.includes('APPROVE')}
                    type={'primary'}
                    onClick={() => handlePutStatus('DA_DUYET')}
                  >
                    Phê duyệt
                  </Button>
                  <Button
                    hidden={!donHangFacade.data?.allowedActions?.includes('SEND_APPROVAL')}
                    type={'primary'}
                    onClick={() => handlePutStatus('CHO_DUYET')}
                  >
                    Gửi duyệt
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className={'bg-white shadow rounded-md w-[330px] p-5 mb-5'}>
          <h1 className="font-bold text-lg pb-2">Lịch sử xử lý</h1>
          <hr />
          <div className="pt-4">
            {itemsTimeLine && itemsTimeLine?.length > 0 ? (
              <Timeline items={itemsTimeLine} />
            ) : (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </div>
        </div>
      </div>
    </Spin>
  );
};

export default DonHangDetail;
