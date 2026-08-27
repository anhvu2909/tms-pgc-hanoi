import { Button, Drawer, Form, Select, Space, Spin } from 'antd';
import React, { useEffect } from 'react';
import { CloseOutlined } from '@ant-design/icons';
import { ProductConfigurationFacade, SanPhamFacade, SanPhamModel } from '@store';
import TextArea from 'antd/es/input/TextArea';
import { productTypes } from '@utils';

export const ProductConfigurationForm: React.FC = () => {
  const [form] = Form.useForm();
  const sanphamFacade = SanPhamFacade();
  const productConfigurationFacade = ProductConfigurationFacade();

  useEffect(() => {
    if (!productConfigurationFacade.isVisible) return;
    sanphamFacade.get({
      page: 1,
      size: -1,
      filter: JSON.stringify({
        forConfigId: productConfigurationFacade.data?.id,
        excludeHaveConfig: true,
      }),
    });
  }, [productConfigurationFacade.isVisible]);

  // useEffect(() => {
  //   switch (laiXeFacade.status) {
  //     case EStatusState.postFulfilled:
  //     case EStatusState.putFulfilled:
  //     case EStatusState.deleteFulfilled:
  //       handleClose();
  //       if (filter) {
  //         laiXeFacade.get({ filter: filter });
  //       } else laiXeFacade.get({});
  //       break;
  //   }
  // }, [laiXeFacade.status]);

  const handleClose = () => {
    form.resetFields();
    productConfigurationFacade.set({ isVisible: false, data: undefined });
  };

  useEffect(() => {
    for (const key in productConfigurationFacade.data) {
      form.setFieldValue(key, (productConfigurationFacade.data as any)[key]);
    }

    return () => {
      form.resetFields();
    };
  }, [productConfigurationFacade.data]);

  const onFinish = (values: any) => {
    if (productConfigurationFacade.data?.id) {
      productConfigurationFacade.put({ ...values, id: productConfigurationFacade.data.id });
    } else productConfigurationFacade.post(values);
  };

  return (
    <Drawer
      onClose={handleClose}
      maskClosable={false}
      destroyOnClose={true}
      closeIcon={false}
      forceRender={true}
      getContainer={false}
      placement="right"
      extra={<Button icon={<CloseOutlined />} type={'text'} onClick={handleClose} />}
      title={productConfigurationFacade.isEdit ? 'Chỉnh sửa cấu hình' : 'Thêm mới cấu hình'}
      open={productConfigurationFacade.isVisible}
      footer={
        <Space className={'flex justify-end'}>
          <Button type={'default'} block onClick={handleClose}>
            Huỷ bỏ
          </Button>
          <Button type={'primary'} className={'!py-0'} onClick={form.submit}>
            Lưu lại
          </Button>
        </Space>
      }
    >
      <Spin spinning={productConfigurationFacade.isFormLoading}>
        <Form onFinish={onFinish} form={form} layout="vertical">
          <Form.Item name="productId" label="Bình" rules={[{ required: true, message: 'Vui lòng chọn bình' }]}>
            <Select
              showSearch
              placeholder="Chọn bình"
              options={sanphamFacade.pagination?.content
                .filter((x) => x.type === productTypes.Binh.code)
                .map((item: SanPhamModel) => ({
                  label: item.tenSanPham,
                  value: item.id,
                }))}
              allowClear
              optionFilterProp={'label'}
            />
          </Form.Item>
          <Form.Item name="gasTankId" label="Vỏ bình" rules={[{ required: true, message: 'Vui lòng chọn vỏ bình' }]}>
            <Select
              showSearch
              placeholder="Chọn vỏ bình"
              options={sanphamFacade.pagination?.content
                .filter((x) => x.type === productTypes.VoBinh.code)
                .map((item: SanPhamModel) => ({
                  label: item.tenSanPham,
                  value: item.id,
                }))}
              allowClear
              optionFilterProp={'label'}
            />
          </Form.Item>
          <Form.Item name="residualGasId" label="Gas dư">
            <Select
              showSearch
              placeholder="Chọn gas dư"
              options={sanphamFacade.pagination?.content
                .filter((x) => x.type === productTypes.GasDu.code)
                .map((item: SanPhamModel) => ({
                  label: item.tenSanPham,
                  value: item.id,
                }))}
              allowClear
              optionFilterProp={'label'}
            />
          </Form.Item>
          <Form.Item label="Ghi chú" name="note">
            <TextArea rows={3} placeholder="Nhập ghi chú" />
          </Form.Item>
        </Form>
      </Spin>
    </Drawer>
  );
};
