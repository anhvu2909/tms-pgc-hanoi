import { Button, Drawer, Form, Input, Space, Spin, Switch } from 'antd';
import React, { useEffect } from 'react';
import { CloseOutlined } from '@ant-design/icons';
import { useSearchParams } from 'react-router-dom';
import { PhuongTienFacade } from '../../store/quan-ly-phuong-tien';

export const QuanLyPhuongTienDetails = () => {
  const [form] = Form.useForm()
  const [_searchParams, setSearchParams] = useSearchParams();
  const phuongTienFacade = PhuongTienFacade()

  useEffect(() => {
    if (phuongTienFacade.isViewDetails && phuongTienFacade.data?.id) {
      phuongTienFacade.getById({ id: phuongTienFacade.data.id, keyState: '' });
    }
  }, [phuongTienFacade.isViewDetails]);

  const handleClose = () => {
    form.resetFields();
    phuongTienFacade.set({ isViewDetails: false, data: undefined });
    setSearchParams(
      (prev) => {
        if (prev.has('id')) prev.delete('id');
        return prev;
      },
      { replace: true },
    );
  }
  useEffect(() => {
    for (const key in phuongTienFacade.data) {
      form.setFieldValue(key, (phuongTienFacade.data as any)[key]);
    }
    return () => {
      form.resetFields();
    };
  }, [phuongTienFacade.data]);

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
      title={'Xem chi tiết phương tiện'}
      open={phuongTienFacade.isViewDetails}
      footer={
        <Space className={'flex justify-end'}>
          <Button type={'default'} block onClick={handleClose}>
            Đóng lại
          </Button>
        </Space>
      }
    >
      <Spin spinning={phuongTienFacade.isFormLoading}>
        <Form form={form} layout="vertical">
          <Form.Item label={'Biển số xe'} name={'bienSoXe'} rules={[{ required: true }]}>
            <Input disabled />
          </Form.Item>
          <Form.Item label={'Số khung'} name={'soKhung'}>
            <Input disabled/>
          </Form.Item>
          <Form.Item label={'Số máy'} name={'soMay'}>
            <Input disabled/>
          </Form.Item>
          <Form.Item label={'Hãng sản xuất'} name={'hangSanXuat'}>
            <Input disabled/>
          </Form.Item>
          <Form.Item label={'Model'} name={'model'}>
            <Input disabled/>
          </Form.Item>
          <Form.Item label={'Năm sản xuất'} name={'namSanXuat'}>
            <Input disabled/>
          </Form.Item>
          <Form.Item label={'Tải trọng'} name={'taiTrong'}>
            <Input disabled/>
          </Form.Item>
          <Form.Item label={'Trạng thái'} name={'active'}>
            <Switch disabled checkedChildren={'Đang hoạt động'} unCheckedChildren={'Ngừng hoạt động'}/>
          </Form.Item>
        </Form>
      </Spin>
    </Drawer>
  )
}
