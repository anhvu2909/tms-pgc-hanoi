import { EStatusState } from '@models';
import { lang, routerLinks, trangThaiDonHang } from '@utils';
import { Button, Empty, Space, Spin, Table, Tag, Timeline, Tooltip } from 'antd';
import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { DonHangFacade } from 'src/store/don-hang';
import dayjs from 'dayjs';
import { LichSuChinhSuaFacade } from 'src/store/lich-su-chinh-sua';

const DonHangDetail = () => {
  const { id } = useParams();
  const donHangFacade = DonHangFacade();
  const param = JSON.parse(donHangFacade.queryParams || `{}`);
  const navigate = useNavigate();
  const lichSuChinhSuaFacade = LichSuChinhSuaFacade();

  useEffect(() => {
    lichSuChinhSuaFacade.get({ size: -1, filter: JSON.stringify({ entityId: id, entityType: 'DonHang' }) });
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
              <Button
                hidden={donHangFacade.data?.trangThai === 'DA_DUYET'}
                type={'primary'}
                onClick={() => {
                  navigate(`/${lang}${routerLinks('DonHang')}/${donHangFacade.data?.id}/edit`);
                }}
              >
                Chỉnh sửa
              </Button>
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
