import React, { useMemo } from 'react';
import {
  Button,
  Drawer,
  Empty,
  Form,
  Modal,
  Space,
  Spin,
  Table,
  Tag,
  Timeline,
  App,
  TimelineItemProps,
  Tooltip,
} from 'antd';
import { useEffect } from 'react';
import { LichSuChinhSua, LichSuChinhSuaFacade } from 'src/store/lich-su-chinh-sua';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router';
import { actionDonHang, dateFormat, lang, routerLinks, trangThaiDonHang } from '@utils';
import TextArea from 'antd/es/input/TextArea';
import Paragraph from 'antd/es/typography/Paragraph';
import { DonHangFacade, EStatusDonHang, KhachHangFacade } from '@store';
import { RightMapRoleFacade } from 'src/store/right-map-role';
import { useSearchParams } from 'react-router-dom';
import { UndoOutlined } from '@ant-design/icons';

// Không thể hoàn tác hành động "TaoMoi" (không còn trạng thái nào trước đó để về) —
// mọi trạng thái khác, kể cả DA_HUY và HOAN_THANH, đều hoàn tác được (chốt ở skill
// tu-dien-nghiep-vu-tms mục 4). Việc chặn hoàn tác hành động TaoMoi được xử lý bằng
// chỉ số firstActivityIndex bên dưới, không cần danh sách loại trừ theo trạng thái nữa.
const unrevertableActions: string[] = [];

const ActivityMessage: React.FC<{ lichSu: LichSuChinhSua }> = ({ lichSu }) => {
  const messagePortions: (string | [string])[] = [
    [lichSu.actionMadeByUserFullName ?? lichSu.actionMadeByUserName ?? ''],
  ];

  switch (lichSu.action) {
    case actionDonHang.TaoMoi:
      messagePortions.push('đã tạo đơn hàng');
      break;
    case actionDonHang.GuiDuyet:
      messagePortions.push('đã gửi duyệt đơn hàng');
      break;
    case actionDonHang.PheDuyet:
      messagePortions.push('đã duyệt đơn hàng');
      break;
    case actionDonHang.TuChoi:
      messagePortions.push('đã từ chối đơn hàng');
      break;
    case actionDonHang.Huy:
      messagePortions.push('đã huỷ đơn hàng');
      break;
    case actionDonHang.HoanThanh:
      messagePortions.push('đã hoàn thành đơn hàng');
      break;
    case actionDonHang.HoanTac:
      messagePortions.push('đã hoàn tác đơn hàng');
      break;
    case actionDonHang.PhanXeXe:
      messagePortions.push('đã gán tài xế/xe cho đơn hàng');
      break;
    default:
      // Action cũ thuộc luồng tài xế/giao nhận đã cắt bỏ — vẫn hiển thị được để
      // không mất dữ liệu lịch sử, chỉ không có nhãn tiếng Việt riêng nữa.
      messagePortions.push(lichSu.action ?? '');
      break;
  }
  return (
    <p>
      {messagePortions.map((x, i) => (
        <React.Fragment key={i}>{Array.isArray(x) ? <span className="font-semibold">{x}</span> : x} </React.Fragment>
      ))}
    </p>
  );
};

const ActivityAddition: React.FC<{ lichSu: LichSuChinhSua }> = ({ lichSu }) => {
  function showRejectReason() {
    const lines = lichSu.description?.split(/\r\n|\n/g);
    Modal.info({
      title: 'Lý do từ chối',
      content: lines ? (
        <>
          {lines.map((x, i) => (
            <p key={i}>{x}</p>
          ))}
        </>
      ) : (
        <span className="italic opacity-85 font-medium">Lý do trống</span>
      ),
    });
  }

  if ([actionDonHang.TuChoi, actionDonHang.Huy].includes(lichSu.action ?? '')) {
    return (
      <Button className="h-fit p-0 border-none" type="link" color="primary" onClick={() => showRejectReason()}>
        Xem lý do {lichSu.action == actionDonHang.Huy ? 'huỷ' : 'từ chối'}
      </Button>
    );
  }

  return <></>;
};

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

const negativeActions = [actionDonHang.TuChoi, actionDonHang.Huy];

export const DonHangDetailDrawer = () => {
  const { modal } = App.useApp();
  const [form] = Form.useForm();
  const donHangFacade = DonHangFacade();
  const khachHangFacade = KhachHangFacade();
  const lichSuChinhSuaFacade = LichSuChinhSuaFacade();
  const rightMapRoleFacade = RightMapRoleFacade();
  const [_, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const trangThai = useMemo(
    () => trangThaiDonHang[donHangFacade.data?.trangThai as keyof typeof trangThaiDonHang],
    [donHangFacade.data],
  );
  const ghiChu = useMemo(() => donHangFacade.data?.ghiChu?.split(/\r\n|\n/g) ?? ['-'], [donHangFacade.data]);

  useEffect(() => {
    if (!donHangFacade.data) return;

    lichSuChinhSuaFacade.get({
      size: -1,
      filter: JSON.stringify({ entityId: donHangFacade.data?.id, entityType: 'DonHang' }),
    });
  }, [donHangFacade.data?.id, donHangFacade.isVisible]);

  useEffect(() => {
    switch (donHangFacade.status) {
      case EStatusDonHang.revertActivityFulfilled:
        lichSuChinhSuaFacade.get({
          size: -1,
          filter: JSON.stringify({ entityId: donHangFacade.data?.id, entityType: 'DonHang' }),
        });
    }
  }, [donHangFacade.status]);

  const sanPhamDataSource =
    donHangFacade.data?.sanPham?.map((item, index) => ({
      ...item,
      index: index + 1,
      donGia: item.donGia?.toLocaleString(),
    })) ?? [];

  function handleRevertActivity(activity: LichSuChinhSua) {
    // Trạng thái sau khi hoàn tác được tính chính xác ở RPC sm_donhang_revert
    // (dựa trên dòng lịch sử liền trước, xem sql/03_don_hang.sql mục 7) — không suy
    // đoán trước ở FE để tránh hiển thị sai với dữ liệu lịch sử cũ nhiều nhánh.
    modal.confirm({
      title: 'Xác nhận hoàn tác',
      content: (
        <>
          <div className="flex items-center gap-2">
            <span className="font-semibold">Trạng thái hiện tại:</span>
            <Tag color={trangThai.color}>{trangThai.name}</Tag>
          </div>
          <p className="mt-2">
            Đơn hàng sẽ được đưa về đúng trạng thái ngay trước hành động này. Bạn có chắc chắn muốn hoàn tác không?
            <br />
            <span className="text-red-500 font-semibold">Cảnh báo:</span> Hành động này có thể dẫn đến mất dữ liệu và
            không thể thực hiện lại.
          </p>
        </>
      ),
      onOk: () => {
        if (!donHangFacade.data?.id) return;
        donHangFacade.revertActivity(donHangFacade.data.id, activity.id!);
      },
    });
  }

  const itemsTimeLine = useMemo(() => {
    const firstActivityIndex = lichSuChinhSuaFacade.pagination?.content?.findIndex((x) => !x.isDeleted);

    return lichSuChinhSuaFacade.pagination?.content.map((item, i) => {
      const revertable =
        rightMapRoleFacade.rightDatas?.find((x) => x.groupCode == 'DONHANG')?.isUndoAllowed &&
        i != firstActivityIndex &&
        !item.isDeleted &&
        !unrevertableActions.includes(donHangFacade.data?.trangThai ?? '');

      return {
        color: negativeActions.includes(item.action ?? '') ? 'red' : 'blue',
        children: (
          <div
            style={{ opacity: item.isDeleted ? 0.4 : 1 }}
            className="relative flex gap-2 justify-between items-center group"
          >
            {!item.isDeleted && (
              <div className="absolute -inset-x-2 -inset-y-1 group-hover:bg-slate-500/5 rounded-lg transition-all"></div>
            )}
            <div className="relative flex-1">
              <ActivityMessage lichSu={item} />
              <p>{dayjs(item.actionMadeOnDate).format(dateFormat)}</p>
              <ActivityAddition lichSu={item} />
            </div>
            {revertable && (
              <Tooltip mouseEnterDelay={0.5} title="Hoàn tác về trạng thái này">
                <Button
                  icon={<UndoOutlined />}
                  size="small"
                  className="text-black/80"
                  onClick={handleRevertActivity.bind(null, item)}
                >
                  Hoàn tác
                </Button>
              </Tooltip>
            )}
          </div>
        ),
      } satisfies TimelineItemProps;
    });
  }, [lichSuChinhSuaFacade.pagination, rightMapRoleFacade.rightDatas]);

  const handleCloseDrawer = () => {
    donHangFacade.set({ isVisible: false });
    setSearchParams((x) => {
      x.delete('orderId');
      return x;
    });
  };

  const handlePutStatus = (status: string) => {
    donHangFacade.set({ isVisible: false });
    donHangFacade.putStatus({ id: donHangFacade.data?.id, trangThai: status });
  };

  const handleComplete = () => {
    modal.confirm({
      title: 'Xác nhận hoàn thành đơn hàng',
      content: 'Bạn có chắc chắn muốn hoàn thành đơn hàng này không?',
      centered: true,
      onOk: () => {
        if (!donHangFacade.data?.id) return;
        donHangFacade.complete(donHangFacade.data.id);
      },
    });
  };

  const onFinish = (value: any) => {
    donHangFacade.set({ isVisible: false, isModalVisible: false });
    donHangFacade.reject({ ...value, id: donHangFacade.data?.id });
  };

  const approveAllowedActions = donHangFacade.data?.allowedActions?.filter((x) => x !== 'DELETE' && x !== 'UPDATE');

  return (
    <Drawer
      open={donHangFacade.isVisible && !!donHangFacade.data}
      onClose={handleCloseDrawer}
      closeIcon={false}
      maskClosable={false}
      width={800}
      footer={
        <Space className={'flex justify-between'}>
          <div>
            <Button onClick={handleCloseDrawer}>Hủy bỏ</Button>
          </div>
          <div className={'flex gap-2'}>
            {approveAllowedActions?.includes('APPROVE') && (
              <>
                <Button danger onClick={() => donHangFacade.set({ isModalVisible: true })}>
                  Từ chối
                </Button>
                <Button type={'primary'} onClick={() => handlePutStatus('DA_DUYET')}>
                  Phê duyệt
                </Button>
              </>
            )}
            {approveAllowedActions?.includes('SEND_APPROVAL') && (
              <Button type={'primary'} onClick={() => handlePutStatus('CHO_DUYET')}>
                Gửi duyệt
              </Button>
            )}
            {approveAllowedActions?.includes('COMPLETE') && (
              <Button type="primary" onClick={handleComplete}>
                Hoàn thành
              </Button>
            )}
          </div>
        </Space>
      }
    >
      <Spin spinning={!!donHangFacade.isFormLoading}>
      <Modal
        title={'Từ chối đơn hàng'}
        centered
        open={donHangFacade.isModalVisible}
        onCancel={() => donHangFacade.set({ isModalVisible: false })}
        onOk={form.submit}
      >
        <Form form={form} layout={'vertical'} onFinish={onFinish}>
          <Form.Item name="lyDoTuChoi" label="Lý do từ chối:" rules={[{ required: true }]}>
            <TextArea placeholder={'Nhập lý do từ chối'} rows={3} />
          </Form.Item>
        </Form>
      </Modal>
      <div className="flex justify-between mb-2">
        <h1 className="font-bold text-lg pt-1">Thông tin đơn hàng</h1>
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
      </div>
      <hr className="h-1 border-1 pt-2" />
      <div className="grid grid-cols-2 mt-2 gap-10">
        <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 odd:*:text-right odd:*:whitespace-nowrap even:*:font-semibold text-left">
          <p>Mã đơn hàng:</p>
          <Paragraph className="!m-0 whitespace-nowrap" copyable>
            {donHangFacade.data?.ma}
          </Paragraph>
          <p>Trạng thái:</p>
          <p>{trangThai && <Tag color={trangThai.color}>{trangThai.name}</Tag>}</p>
          <p>Độ ưu tiên:</p>
          <p>
            {donHangFacade.data?.mucDoUuTien === '3'
              ? ' Cao'
              : donHangFacade.data?.mucDoUuTien === '2'
                ? ' Bình thường'
                : ' Thấp'}{' '}
          </p>
          <p>Tài xế:</p>
          <p>{donHangFacade.data?.laiXe?.tenTaiXe ?? '-'}</p>
          <p>Đơn vị vận tải:</p>
          <p>{donHangFacade.data?.phuongTien?.congTy ?? '-'}</p>
        </div>
        <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 odd:*:text-right even:*:font-semibold text-left">
          <p>Ngày tạo:</p>
          <p>{dayjs(donHangFacade.data?.createdOnDate).format(dateFormat)}</p>
          <p>Người tạo:</p>
          <p>{donHangFacade.data?.createdByUserFullName ?? donHangFacade.data?.createdByUserName}</p>
          <p>Thời gian yêu cầu giao hàng:</p>
          <p>
            {donHangFacade.data?.thoiHanGiaoHang
              ? dayjs(donHangFacade.data?.thoiHanGiaoHang).format(dateFormat)
              : '-'}
          </p>
          <p>Phương tiện:</p>
          <p>{donHangFacade.data?.phuongTien?.bienSoXe ?? '-'}</p>
          <p>Ghi chú:</p>
          <p>
            {ghiChu.map((x, i) => (
              <span key={i}>
                {x}
                {i < ghiChu.length - 1 && <br></br>}
              </span>
            ))}
          </p>
        </div>
      </div>
      <div className="flex justify-between items-end mb-2 mt-4 h-8">
        <h1 className="font-semibold text-lg">Thông tin vận chuyển</h1>
      </div>
      <hr className="h-1 border-1 pt-2" />
      <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 pt-2 odd:*:text-right even:*:font-semibold text-left">
        <p>Nhận từ:</p>
        <div>
          <p
            onClick={() => {
              navigate(`/${lang}${routerLinks('Kho')}?id=${donHangFacade.data?.benGiaoId}`);
            }}
            className="hover:text-blue-400 hover:cursor-pointer text-blue-500"
          >
            {donHangFacade.data?.benGiao}
          </p>
          <p className="line-clamp-2">{donHangFacade.data?.diaChiBenGiao}</p>
        </div>
        <p className="w-24">Chuyển đến:</p>
        <div>
          <p
            onClick={() => {
              khachHangFacade.set({ data: undefined });
              navigate(`/${lang}${routerLinks('KhachHang')}?id=${donHangFacade.data?.benNhanId}&type=detail`);
            }}
            className="hover:text-blue-400 hover:cursor-pointer text-blue-500"
          >
            {donHangFacade.data?.benNhan}
          </p>
          <p
            onClick={() => {
              navigate(`/${lang}${routerLinks('Kho')}?id=${donHangFacade.data?.diaChiBenNhanId}`);
            }}
            className="hover:text-gray-600 hover:cursor-pointer line-clamp-2"
          >
            {donHangFacade.data?.diaChiBenNhan}
          </p>
        </div>
      </div>

      <div className="flex justify-between items-end h-8 mb-2 mt-4">
        <h1 className="font-semibold text-lg">Danh sách sản phẩm</h1>
      </div>
      <hr className="h-1 border-1" />
      <Table rowKey="index" className={'my-3'} dataSource={sanPhamDataSource} columns={columns} pagination={false} />

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
      <h1 className="font-bold text-lg pb-2 mt-4">Lịch sử xử lý</h1>
      <hr />
      <div className="pt-4">
        {itemsTimeLine && itemsTimeLine?.length > 0 ? (
          <Timeline items={itemsTimeLine} />
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
        )}
      </div>
      </Spin>
    </Drawer>
  );
};
