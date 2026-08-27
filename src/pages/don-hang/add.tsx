import { EStatusState } from '@models';
import {
  ChiPhiVanChuyenFacade,
  GlobalFacade,
  KhachHangFacade,
  KhoFacade,
  LaiXeFacade,
  LaiXeModel,
  PhuongTienFacade,
  PhuongTienModel,
} from '@store';
import { lang, routerLinks } from '@utils';
import { Button, Col, DatePicker, Form, Input, Radio, Row, Select, Spin } from 'antd';
import TextArea from 'antd/es/input/TextArea';
import dayjs from 'dayjs';
import { useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import { DonHang, DonHangFacade } from 'src/store/don-hang';
import SanPhamDonHangEditableTable from './table';
import React from 'react';

const DonHangAddForm = () => {
  const { id } = useParams();
  const donHangFacade = DonHangFacade();
  const khoFacade = KhoFacade();
  const khachHangFacade = KhachHangFacade();
  const chiPhiVanChuyenFacade = ChiPhiVanChuyenFacade();
  const laiXeFacade = LaiXeFacade();
  const phuongTienFacade = PhuongTienFacade();
  const dateFormat = 'DD/MM/YYYY - HH:mm';
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const isBack = useRef(true);
  const param = JSON.parse(donHangFacade.queryParams || `{}`);
  const globalFacade = GlobalFacade();
  const { user } = globalFacade;
  const location = useLocation();
  const subTotal = useRef<number>(0);
  const thanhTien = useRef<number>(0);
  const cuocVanChuyen = useRef<number>(0);


  useEffect(() => {
    khoFacade.getAllKho({
      size: -1,
      filter: JSON.stringify({ unLimeted: true}),
      sort: "+Order"
    });
    khoFacade.get({
      size: -1,
    });
    khachHangFacade.get({ size: -1 });
    laiXeFacade.get({ size: -1 });
    phuongTienFacade.get({ size: -1 });
    chiPhiVanChuyenFacade.set({ isChiPhiLoading: false });
    if (id) donHangFacade.getById({ id: id ?? '' });

    if (!id) {
      form.setFieldsValue({
        sanPham: [{}].concat([]),
        ngayDatHang: dayjs(Date.now()),
      });
    }
  }, []);

  useEffect(() => {
    switch (donHangFacade.status) {
      case EStatusState.putFulfilled:
      case EStatusState.postFulfilled:
        if (isBack.current) handleBack();
        break;
    }
  }, [donHangFacade.status]);

  useEffect(() => {
    if (donHangFacade.data?.benNhanId != donHangFacade.data?.diaChiBenNhanId)
      khoFacade.set({ idKhachHang: donHangFacade.data?.benNhanId });
    else khoFacade.set({ idCuaHang: donHangFacade.data?.benNhanId, idKhachHang: undefined });
    for (const key in donHangFacade.data) {
      if (key === 'ngayDatHang')
        form.setFieldValue(
          'ngayDatHang',
          donHangFacade.data.ngayDatHang ? dayjs(donHangFacade.data.ngayDatHang) : '',
        );
      else if (key === 'thoiHanGiaoHang')
        form.setFieldValue(
          'thoiHanGiaoHang',
          donHangFacade.data.thoiHanGiaoHang ? dayjs(donHangFacade.data.thoiHanGiaoHang) : '',
        );
      else form.setFieldValue(key, donHangFacade.data[key as keyof DonHang]);
    }

    return () => {
      form.resetFields();
      form.setFieldsValue({
        sanPham: [{}].concat([]),
        ngayDatHang: dayjs(Date.now()),
      });
    };
  }, [donHangFacade.data, id]);

  const benGiaoOptions =
    khoFacade.allKho?.content
      .filter((x: any) => x.loaiKho === 'KHO_NHA_MAY' || x.loaiKho === 'KHO_CUA_HANG')
      .map((item: any) => ({
        label: item.ten,
        value: item.id,
      })) ?? [];

  const khachHangOptions = (
    khachHangFacade.pagination?.content.map((item) => ({
      label: item.ten,
      value: item.id,
      loaiKho: 'KHO_KHACH_HANG',
    })) ?? []
  ).concat(
    khoFacade.pagination?.content
      .filter((x) => x.loaiKho === 'KHO_CUA_HANG')
      .map((item) => ({
        label: item.ten,
        value: item.id,
        loaiKho: 'KHO_CUA_HANG',
      })) ?? [],
  );

  useEffect(() => {
    if (donHangFacade.data && donHangFacade.data.tongTrongLuong) {
      subTotal.current = +donHangFacade.data.tongTrongLuong;
    }
    if (donHangFacade.data?.thanhTien) {
      thanhTien.current = +donHangFacade.data?.thanhTien;
    }
    if (donHangFacade.data?.cuocVanChuyen) {
      cuocVanChuyen.current = +donHangFacade.data?.cuocVanChuyen;
    }
  }, [donHangFacade.data]);

  const onChangeSelectBenGiao = (value: string) => {
    const khoGiao = khoFacade.pagination?.content.find((x) => x.id === value);
    if (khoGiao) {
      form.setFieldValue('diaChiBenGiao', khoGiao?.diaChiFull);
    }

    const khoNhanId = form.getFieldValue('diaChiBenNhanId');
    if (khoNhanId) {
      chiPhiVanChuyenFacade.get({ filter: JSON.stringify({ khoDiId: khoGiao?.id, khoNhanId: khoNhanId }) });
      chiPhiVanChuyenFacade.set({ isChiPhiLoading: true });
    }
  };

  const onChangeSelectDiaChiBenNhan = (value: string) => {
    const khoDiId = form.getFieldValue('benGiaoId');
    if (khoDiId) {
      chiPhiVanChuyenFacade.get({
        filter: JSON.stringify({ khoDiId: khoDiId, khoNhanId: form.getFieldValue('diaChiBenNhanId') }),
      });
      chiPhiVanChuyenFacade.set({ isChiPhiLoading: true });
    }
  };

  useEffect(() => {
    if (chiPhiVanChuyenFacade.status === EStatusState.getFulfilled) {
      const chiPhi =
        chiPhiVanChuyenFacade.pagination?.content.find(
          (x) => x.khoDiId === form.getFieldValue('benGiaoId') && x.khoNhanId === form.getFieldValue('diaChiBenNhanId'),
        )?.chiPhi ?? 0;
      form.setFieldValue('cuocVanChuyen', chiPhi);

      chiPhiVanChuyenFacade.set({ isChiPhiLoading: false, cuocVanChuyen: chiPhi });
    }
  }, [chiPhiVanChuyenFacade.status]);

  const laiXeOptions =
    laiXeFacade.pagination?.content.map((item: LaiXeModel) => ({
      label: item.tenTaiXe,
      value: item.id,
    })) ?? [];

  const phuongTienOptions =
    phuongTienFacade.pagination?.content.map((item: PhuongTienModel) => ({
      label: item.bienSoXe,
      value: item.id,
    })) ?? [];

  // Chọn tài xế -> tự điền xe mặc định theo sm_LaiXe.IdPhuongTien (chốt ở skill
  // tu-dien-nghiep-vu-tms mục 7), nhưng vẫn cho người dùng chọn lại xe khác.
  const onChangeSelectLaiXe = (value: string) => {
    const laiXe = laiXeFacade.pagination?.content.find((x: LaiXeModel) => x.id === value);
    if (laiXe?.idPhuongTien) {
      form.setFieldValue('phuongTienId', laiXe.idPhuongTien);
    }
  };

  const onChangeSelectBenNhan = (value: any) => {
    if (value.loaiKho == 'KHO_KHACH_HANG') {
      khoFacade.set({ idKhachHang: value.value });
      form.setFieldValue('diaChiBenNhanId', undefined);
    } else {
      khoFacade.set({ idKhachHang: undefined, idCuaHang: value.value });
      form.setFieldValue('diaChiBenNhanId', value.value);
      const khoDiId = form.getFieldValue('benGiaoId');
      if (khoDiId) {
        chiPhiVanChuyenFacade.get({
          filter: JSON.stringify({ khoDiId: khoDiId, khoNhanId: form.getFieldValue('diaChiBenNhanId') }),
        });
        chiPhiVanChuyenFacade.set({ isChiPhiLoading: true });
      }
    }
  };

  const handleBack = () => {
    donHangFacade.set({ status: EStatusState.idle, isVisible: false });
    navigate(`/${lang}${routerLinks('DonHang')}?${new URLSearchParams(param).toString()}`);
  };

  const onFinish = (value: DonHang) => {
    value.sanPham =
      value.sanPham?.map((item: any) => ({
        sanPhamId: item.sanPhamId,
        soLuong: item.soLuong,
      })) ?? [];

    const data = {
      ...value,
      thoiHanGiaoHang: dayjs(value.thoiHanGiaoHang).format('YYYY-MM-DDTHH:mm:ss[Z]'),
      ngayDatHang: dayjs(value.ngayDatHang).format('YYYY-MM-DDTHH:mm:ss[Z]'),
    };
    if (donHangFacade.data?.id) {
      donHangFacade.put({ ...data, id: donHangFacade.data?.id });
    } else donHangFacade.post({ ...data });
  };
  const formVal = form.getFieldsValue();
  const sumArray = (fieldsValue: any) => {
    if (fieldsValue.sanPham?.length > 0 && fieldsValue.sanPham !== '') {
      subTotal.current = fieldsValue.sanPham.reduce((acc: any, curr: any) => acc + (curr.quyDoi ?? 0), 0);
    }
  };
  sumArray(formVal);

  if (form.getFieldValue('cuocVanChuyen') != null) {
    cuocVanChuyen.current = form.getFieldValue('cuocVanChuyen');
  }

  if (cuocVanChuyen.current != null) {
    thanhTien.current = subTotal.current * cuocVanChuyen.current;
  }

  return (
    <Spin spinning={donHangFacade.isFormLoading || chiPhiVanChuyenFacade.isChiPhiLoading}>
      <Form
        form={form}
        className="intro-x"
        layout={'vertical'}
        onFinish={onFinish}
        fields={[
          {
            name: 'createdByUserName',
            value: donHangFacade.data && id ? donHangFacade.data?.createdByUserName : user?.userModel?.userName,
          },
        ]}
      >
        <div className={'px-5 pt-2'}>
          <div className="shadow rounded-md w-3/4 bg-white overflow-hidden p-5 mx-auto mb-5">
            <h1 className={'font-bold text-lg pb-2'}>Thông tin đơn hàng</h1>
            <hr className={'h-1 border-1 pt-5'} />
            <Row>
              <Col span={12} className={'pr-4'}>
                <Form.Item name="ngayDatHang" label="Ngày đặt hàng">
                  <DatePicker showTime className={'w-full'} format={dateFormat} />
                </Form.Item>
              </Col>
              <Col span={12} className={'px-2'}>
                <Form.Item name="createdByUserName" label="Người tạo đơn">
                  <Input disabled />
                </Form.Item>
              </Col>
            </Row>
            <Row>
              <Col span={12} className={'pr-4'}>
                <Form.Item name="benGiaoId" label="Bên giao" rules={[{ required: true }]}>
                  <Select
                    showSearch
                    optionFilterProp={'label'}
                    placeholder={'Chọn bên giao'}
                    options={benGiaoOptions}
                    onChange={onChangeSelectBenGiao}
                  />
                </Form.Item>
              </Col>
              <Col span={12} className={'px-2'}>
                <Form.Item name="diaChiBenGiao" label="Địa chỉ bên giao" rules={[{ required: true }]}>
                  <Input readOnly placeholder={'Chọn địa chỉ bên giao'} />
                </Form.Item>
              </Col>
            </Row>
            <Row>
              <Col span={12} className={'pr-4'}>
                <Form.Item name="benNhanId" label="Bên nhận" rules={[{ required: true }]}>
                  <Select
                    showSearch
                    optionFilterProp={'label'}
                    placeholder={'Chọn bên nhận'}
                    options={khachHangOptions}
                    onChange={(_, value) => onChangeSelectBenNhan(value)}
                  />
                </Form.Item>
              </Col>
              <Col span={12} className={'px-2'}>
                <Form.Item name="diaChiBenNhanId" label="Địa chỉ bên nhận" rules={[{ required: true }]}>
                  <Select
                    showSearch
                    optionFilterProp={'label'}
                    placeholder={'Chọn địa chỉ bên nhận'}
                    options={
                      khoFacade.idKhachHang
                        ? khoFacade.pagination?.content
                            .filter((x) => x.khachHangId === khoFacade.idKhachHang)
                            .map((item) => ({
                              label: item.diaChiFull,
                              value: item.id,
                            }))
                        : khoFacade.pagination?.content
                            .filter((x) => x.id === khoFacade.idCuaHang)
                            .map((item) => ({
                              label: item.diaChiFull,
                              value: item.id,
                            }))
                    }
                    onChange={onChangeSelectDiaChiBenNhan}
                  />
                </Form.Item>
              </Col>
            </Row>
            <Row>
              <Col span={12} className={'pr-4'}>
                <Form.Item name="thoiHanGiaoHang" label="Thời gian yêu cầu giao hàng" rules={[{ required: true }]}>
                  <DatePicker showTime className={'w-full'} format={dateFormat} />
                </Form.Item>
              </Col>
            </Row>
            <Row>
              <Col span={12} className={'pr-4'}>
                <div className={'flex'}>
                  <p className={'mt-2'}>Giá (cước vận chuyển): </p>
                  <Form.Item name="cuocVanChuyen">
                    <Input disabled type={'number'} className={'w-[70px] mt-1 mx-2'} />
                  </Form.Item>
                  <p className={'mt-2'}>(đ/kg)</p>
                </div>
              </Col>
            </Row>
            <Row>
              <Form.Item
                name="mucDoUuTien"
                label="Mức độ ưu tiên"
                initialValue={'2'}
                rules={[{ required: true, message: 'Hãy chọn thông tin cho trường Mức độ ưu tiên' }]}
              >
                <Radio.Group>
                  <Radio value={'3'}>Cao</Radio>
                  <Radio value={'2'}>Bình thường</Radio>
                  <Radio value={'1'}>Thấp</Radio>
                </Radio.Group>
              </Form.Item>
            </Row>
            <Row>
              <Col span={12} className={'pr-4'}>
                <Form.Item name="laiXeId" label="Tài xế">
                  <Select
                    showSearch
                    allowClear
                    optionFilterProp={'label'}
                    placeholder={'Chọn tài xế'}
                    options={laiXeOptions}
                    onChange={onChangeSelectLaiXe}
                  />
                </Form.Item>
              </Col>
              <Col span={12} className={'px-2'}>
                <Form.Item name="phuongTienId" label="Phương tiện">
                  <Select
                    showSearch
                    allowClear
                    optionFilterProp={'label'}
                    placeholder={'Chọn phương tiện'}
                    options={phuongTienOptions}
                  />
                </Form.Item>
              </Col>
            </Row>
            <Row>
              <Col span={12} className={'pr-4'}>
                <Form.Item shouldUpdate={(prev, cur) => prev.phuongTienId !== cur.phuongTienId} noStyle>
                  {() => {
                    const xe = phuongTienFacade.pagination?.content.find(
                      (x: PhuongTienModel) => x.id === form.getFieldValue('phuongTienId'),
                    );
                    return (
                      <Form.Item label="Đơn vị vận tải">
                        <Input disabled value={xe?.congTy ?? ''} placeholder={'Tự động theo phương tiện'} />
                      </Form.Item>
                    );
                  }}
                </Form.Item>
              </Col>
            </Row>
            <Row>
              <Form.Item name="ghiChu" label="Ghi chú đơn hàng" className={'w-full pr-2'}>
                <TextArea rows={4} placeholder="Nhập ghi chú đơn hàng"></TextArea>
              </Form.Item>
            </Row>
          </div>
        </div>
        <div className={'px-5'}>
          <div className="shadow rounded-md w-3/4 bg-white overflow-hidden p-5 mx-auto mb-5">
            <h1 className={'font-bold text-lg pb-2'}>Chọn sản phẩm</h1>
            <hr className={'h-1 border-1 pt-2'} />
            <Row>
              <Form.List name="sanPham">
                {(sanPham, { add, remove }) => {
                  return (
                    <>
                      <SanPhamDonHangEditableTable
                        data={sanPham}
                        add={add}
                        remove={remove}
                        form={form}
                        isEdit={donHangFacade.isEdit}
                        sum={subTotal.current}
                      />
                    </>
                  );
                }}
              </Form.List>
            </Row>
            <div className={'flex justify-end gap-24 mt-4'}>
              <div className={'grid gap-1 font-semibold'}>
                <p>Tổng khối lượng</p>
                <p>Giá (cước vận chuyển)</p>
                <p>Tổng tiền thanh toán</p>
              </div>
              <div className={'grid gap-1 font-semibold text-right'}>
                <p>{subTotal.current}</p>
                <p>{cuocVanChuyen.current}</p>
                <p>{thanhTien.current}</p>
              </div>
            </div>
          </div>
        </div>
        <div className={'sticky px-5 bottom-0'}>
          <div className="shadow rounded-lg w-3/4 bg-white overflow-hidden p-4 mx-auto mb-5">
            <div className={'flex justify-end'}>
              <div>
                <Button onClick={handleBack}>Hủy bỏ</Button>
              </div>
              <div className={'ml-4'}>
                <Button onClick={form.submit} className={'bg-blue-500 text-white'}>
                  Lưu lại
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Form>
    </Spin>
  );
};

export default DonHangAddForm;
