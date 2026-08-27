import { CodeTypeManagementFacade, KhoFacade } from '@store';
import { Button, Drawer, Form, Input, InputNumber, Select, Space, Spin } from 'antd';
import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CloseOutlined } from '@ant-design/icons';
import { EStatusState } from '@models';
import TextArea from 'antd/es/input/TextArea';
import { AddressFacade } from 'src/store/address';
import React from 'react';
import {FieldData} from "rc-field-form/lib/interface";
export const KhoForm = () => {
  const [form] = Form.useForm();
  const formRef = useRef(null)
  const [searchParams, setSearchParams] = useSearchParams();
  const khoFacade = KhoFacade();
  const addressFacade = AddressFacade();
  const codeTypeFacade = CodeTypeManagementFacade();
  const tinhRef = useRef<number>();
  const huyenRef = useRef<number>();

  useEffect(() => {
    if (khoFacade.isVisible && khoFacade.data?.id) {
      khoFacade.getById({ id: khoFacade.data.id, keyState: '' });
    }
    codeTypeFacade.get({ size: -1, filter: JSON.stringify({ type: 'LOAI_KHO' }) });
    addressFacade.getTinh({ filter: '{}' });
  }, [khoFacade.isVisible]);

  useEffect(() => {
    addressFacade.set({ listHuyen: undefined });
    addressFacade.set({listXa: undefined})
  }, [tinhRef.current]);

  useEffect(() => {
    if (khoFacade.data?.id) {
      addressFacade.getHuyen({ filter: JSON.stringify({ parentId: khoFacade.data?.provinceCode ?? -1 }) });
      addressFacade.getXa({ filter: JSON.stringify({ parentId: khoFacade.data?.districtCode ?? -1 }) });
    }
  }, [khoFacade.data, khoFacade.data?.id]);

  useEffect(() => {
    switch (khoFacade.status) {
      case EStatusState.postFulfilled:
      case EStatusState.putFulfilled:
      case EStatusState.deleteFulfilled:
        handleClose();
        break;
    }
  }, [khoFacade.status]);

  const handleClose = () => {
    form.resetFields();
    khoFacade.set({ isVisible: false });
    setSearchParams(
      (prev) => {
        if (prev.has('id')) prev.delete('id');
        return prev;
      },
      { replace: true },
    );
  };
  useEffect(() => {
    if (tinhRef.current !== form.getFieldValue('provinceCode')){
      form.setFieldValue('districtName', undefined);
      form.setFieldValue('communeName', undefined);
    }

  }, [form.getFieldValue('provinceCode')]);


  useEffect(() => {
    for (const key in khoFacade.data) {
      form.setFieldValue(key, (khoFacade.data as any)[key]);
    }
    return () => {
      form.resetFields();
    };
  }, [khoFacade.data ]);

  const onFinish = (values: any) => {
    if (khoFacade.data?.id) {
      khoFacade.put({ ...values, id: khoFacade.data.id });
    } else khoFacade.post(values);
  };

  return (
    <Drawer
      onClose={handleClose}
      maskClosable={false}
      destroyOnClose={true}
      closeIcon={false}
      forceRender={false}
      getContainer={false}
      placement="right"
      extra={<Button icon={<CloseOutlined />} type={'text'} onClick={handleClose} />}
      title={khoFacade.isEdit ? 'Chỉnh sửa kho' : 'Thêm mới kho'}
      open={khoFacade.isVisible}
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
      <Spin spinning={khoFacade.isFormLoading}>
        <Form onFinish={onFinish} form={form} layout="vertical">
          <Form.Item label={'Mã kho'} name={'ma'} rules={[{ required: true }]}>
            <Input placeholder={'Nhập mã kho'} />
          </Form.Item>
          <Form.Item label={'Tên kho'} name={'ten'} rules={[{ required: true }]}>
            <Input placeholder={'Nhập tên kho'} />
          </Form.Item>
          <Form.Item label={'Địa chỉ'} name={'diaChi'}
            //rules={[{ required: true }]}
          >
            <Input placeholder={'Nhập địa chỉ'} />
          </Form.Item>
          <Form.Item name={'provinceCode'} label={'Tỉnh'}
            //rules={[{ required: true }]}
          >
            <Select
              showSearch
              placeholder={'Chọn tỉnh'}
              options={addressFacade.listTinh}
              allowClear
              optionFilterProp={'label'}
              onChange={(value, option: any) => {
                if (tinhRef.current !== value && value) {
                  addressFacade.getHuyen({ filter: JSON.stringify({ parentId: value }) });
                  form.setFieldValue('provinceName', option.label);
                }
              }}
            />
          </Form.Item>
          <Form.Item hidden name={'provinceName'}>
            <Input />
          </Form.Item>
          <Form.Item name={'districtCode'} label={'Huyện'}
            //rules={[{ required: true }]}
          >
            <Select
              showSearch
              placeholder={'Chọn huyện'}
              options={addressFacade.listHuyen}
              allowClear
              optionFilterProp={'label'}
              onChange={(value, option: any) => {
                if (huyenRef.current !== value && value) {
                  huyenRef.current = value;
                  addressFacade.getXa({ filter: JSON.stringify({ parentId: value }) });
                  form.setFieldValue('districtName', option.label);
                }
              }}
            />
          </Form.Item>
          <Form.Item hidden name={'districtName'}>
            <Input />
          </Form.Item>
          <Form.Item name={'communeCode'} label={'Phường/xã'}
            //rules={[{ required: true }]}
          >
            <Select
              showSearch
              placeholder={'Chọn phường/xã'}
              options={addressFacade.listXa}
              allowClear
              onChange={(value, option: any) => {
                form.setFieldValue('communeName', option.label);
              }}
              optionFilterProp={'label'}
            />
          </Form.Item>
          <Form.Item hidden name={'communeName'}>
            <Input />
          </Form.Item>
          <Form.Item label={'Kinh độ'} name={'longitude'}>
            <Input placeholder={'Nhập kinh độ'} />
          </Form.Item>
          <Form.Item label={'Vĩ độ'} name={'latitude'}>
            <Input placeholder={'Nhập vĩ độ'} />
          </Form.Item>
          <Form.Item label={'Loại kho'} name={'loaiKho'} rules={[{ required: true }]}>
            <Select
              showSearch
              placeholder={'Chọn loại kho'}
              options={codeTypeFacade.pagination?.content.map((item) => ({
                label: item.title,
                value: item.code,
              }))}
              allowClear
              optionFilterProp={'label'}
            />
          </Form.Item>
          <Form.Item label={'Số thứ tự'} name={'order'}>
            <InputNumber placeholder={'Nhập số thứ tự'} controls={false} className={'w-full'} />
          </Form.Item>
          <Form.Item label={'Ghi chú'} name={'ghiChu'}>
            <TextArea rows={3} placeholder={'Nhập ghi chú'} />
          </Form.Item>
        </Form>
      </Spin>
    </Drawer>
  );
};
