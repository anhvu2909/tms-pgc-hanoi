import { CloseOutlined } from '@ant-design/icons';
import { Password } from '@core/form/input';
import { EStatusState } from '@models';
import { CodeTypeManagementFacade, KhachHangFacade, KhachHangModel } from '@store';
import { lang, routerLinks } from '@utils';
import { Button, Col, DatePicker, Divider, Form, Input, Modal, Row, Select, Space, Spin } from 'antd';
import TextArea from 'antd/es/input/TextArea';
import { Drawer } from 'antd/lib';
import dayjs from 'dayjs';
import { useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import { useSearchParams } from 'react-router-dom';
import KhoTable from './kho-table';

export const KhachHangForm = () => {
  const [form] = Form.useForm();
  const khachHangFacade = KhachHangFacade();
  const codeTypeFacade = CodeTypeManagementFacade();
  const navigate = useNavigate();
  const location = useLocation();
  const rValue = useRef<any>({});
  const [searchParams, setSearchParams] = useSearchParams();
  const id = searchParams.get('id') || '';
  const type = searchParams.get('type') || '';

  useEffect(() => {
    switch (khachHangFacade.status) {
      case EStatusState.putFulfilled:
      case EStatusState.postFulfilled:
        handleCloseDrawer();
        khachHangFacade.get(JSON.parse(khachHangFacade.queryParams ?? ''));
        navigate(`/${lang}${routerLinks('KhachHang')}${location.search}`);
        break;
    }
  }, [khachHangFacade.status]);

  useEffect(() => {
    if (khachHangFacade.isVisible && type == 'edit') {
      if (id || (khachHangFacade.isVisible && khachHangFacade.data?.id)) {
        khachHangFacade.getById({ id: khachHangFacade.data?.id ?? id ?? '', keyState: '' });
      }
    }
  }, [khachHangFacade.isVisible]);

  useEffect(() => {
    for (const key in khachHangFacade.data) {
      if (key === 'birthdate' && khachHangFacade.data[key]) {
        form.setFieldValue('birthdate', dayjs(khachHangFacade.data[key]));
      } else form.setFieldValue(key, khachHangFacade.data[key as keyof KhachHangModel]);
    }
    return () => {
      form.resetFields();
    };
  }, [khachHangFacade.data, id]);

  const onFinish = (values: any) => {
    console.log(values.listKho)
    values.listKho =
      values?.listKho?.map((item: any) => ({
        id: item.id,
        ten: item.ten,
        ma: item.ma,
        diaChi: item.diaChi,
        ghiChu: item.ghiChu,
        loaiKho: 'KHO_KHACH_HANG',
        longitude: item.longitude,
        latitude: item.latitude,
        provinceCode: item.provinceCode,
        provinceName: item.provinceName,
        districtCode: item.districtCode,
        districtName: item.districtName,
        communeCode: item.communeCode,
        communeName: item.communeName,
      })) ?? [];
    const data: KhachHangModel = {
      ...values,
      birthdate: dayjs(values.birthdate).format('YYYY-MM-DDTHH:mm:ss[Z]'),
    };
    if (khachHangFacade.data?.id) {
      khachHangFacade.put({ ...data, id: khachHangFacade.data?.id });
    } else khachHangFacade.post({ ...data });
  };

  const handleCloseDrawer = () => {
    khachHangFacade.set({
      data: undefined,
      isVisible: false,
      isEdit: false,
    });
    navigate(`/${lang}${routerLinks('KhachHang')}${location.search}`);
  };

  return (
    <Modal
      centered
      width="100vw"
      className={'modal-fullScreen'}
      title={(<div><h1 className={'font-medium text-lg'}>{(khachHangFacade.isEdit ? 'Chỉnh sửa ' : 'Thêm mới ') + 'khách hàng'}</h1><hr className="h-1 border-1 pt-4" /></div>)}
      open={khachHangFacade.isVisible}
      onCancel={handleCloseDrawer}
      cancelButtonProps={{ disabled: true }}
      closable
      destroyOnClose={true}
      maskClosable={false}
      closeIcon={false}
      afterOpenChange={(visible) => {
        if (!visible) {
          form.resetFields();
          setSearchParams(
            (prev) => {
              prev.delete('id');
              prev.delete('type');
              return prev;
            },
            { replace: true },
          );
        }
      }}
      footer={
        <>
          <Divider />
          <Space className="fixed px-5 pb-5 left-0 right-0 bottom-0 flex justify-end">
            <Button type={'default'} block onClick={handleCloseDrawer}>
              Hủy bỏ
            </Button>
            <Button type={'primary'} block onClick={form.submit}>
              Lưu lại
            </Button>
          </Space>
        </>
      }
    >
      <Spin spinning={khachHangFacade.isFormLoading}>
        <Form form={form} layout={'vertical'} onFinish={onFinish} className="" initialValues={{ listKho: [{}] }}>
          <Row gutter={24}>
            <Col span={8}>
              <Form.Item name={'ma'} label={'Mã khách hàng'} rules={[{ required: true }]}>
                <Input placeholder={'Nhập mã khách hàng'} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name={'ten'} label={'Tên khách hàng'} rules={[{ required: true }]}>
                <Input placeholder={'Nhập tên khách hàng'} />
              </Form.Item>
            </Col>

            <Col span={8}>
              <Form.Item
                name={'loaiKhachHang'}
                label={'Loại khách hàng'}
                rules={[{ required: true, message: 'Hãy chọn thông tin cho loại khách hàng' }]}
              >
                <Select
                  placeholder={'Chọn loại khách hàng'}
                  optionLabelProp={'label'}
                  showSearch
                  options={codeTypeFacade.pagination?.content.map((item) => {
                    return { label: item.title, value: item.code };
                  })}
                />
              </Form.Item>
            </Col>

            <Col span={8}>
              <Form.Item name={'nguoiPhuTrach'} label={'Người phụ trách'}>
                <Input placeholder={'Nhập người phụ trách'} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name={'soDienThoai'} label={'Số điện thoại'}
                //rules={[{ required: true }]}
              >
                <Input placeholder={'Nhập số điện thoại'} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name={'ghiChu'} label={'Ghi chú'}>
                <TextArea rows={1} placeholder={'Nhập ghi chú của khách hàng'} />
              </Form.Item>
            </Col>
          </Row>
          <h1 className={'font-medium text-lg'}>Danh sách địa chỉ</h1>
          <hr className="h-1 border-1 pt-4" />
          <Form.List name="listKho">
            {(nguyenVatLieu, { add, remove }) => {
              return (
                <>
                  <KhoTable
                    data={nguyenVatLieu}
                    add={add}
                    remove={remove}
                    form={form}
                    isEdit={khachHangFacade.isEdit}
                  />
                </>
              );
            }}
          </Form.List>
        </Form>
      </Spin>
    </Modal>
  );
};
