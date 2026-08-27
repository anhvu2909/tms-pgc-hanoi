import { Button, DatePicker, Drawer, Form, Input, Select, Space, Spin } from 'antd';
import React, { useEffect } from 'react';
import { CloseOutlined } from '@ant-design/icons';
import { LaiXeFacade } from '../../store/quan-ly-lai-xe';
import { useSearchParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { PhuongTienFacade } from '../../store/quan-ly-phuong-tien';

export const LaiXeViewDetails = () => {
  const [form] = Form.useForm()
  const [_searchParams, setSearchParams] = useSearchParams();
  const laiXeFacade = LaiXeFacade()
  const phuongTienFacade = PhuongTienFacade()

  useEffect(() => {
    if (laiXeFacade.isViewDetails && laiXeFacade.data?.id) {
      laiXeFacade.getById({ id: laiXeFacade.data.id, keyState: '' });
    }
  }, [laiXeFacade.isViewDetails]);

  const handleClose = () => {
    form.resetFields();
    laiXeFacade.set({ isViewDetails: false, data: undefined });
    setSearchParams(
      (prev) => {
        if (prev.has('id')) prev.delete('id');
        return prev;
      },
      { replace: true },
    );
  }
  useEffect(() => {
    for (const key in laiXeFacade.data) {
      form.setFieldValue(key, (laiXeFacade.data as any)[key]);
      if (key ==='ngaySinh'){
        form.setFieldValue('ngaySinh', laiXeFacade.data.ngaySinh ? dayjs(laiXeFacade.data.ngaySinh) : '')
      }
    }
    return () => {
      form.resetFields();
    };
  }, [laiXeFacade.data]);


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
      title={'Xem chi tiết tài xế'}
      open={laiXeFacade.isViewDetails}
      footer={
        <Space className={'flex justify-end'}>
          <Button type={'default'} block onClick={handleClose}>
            Đóng lại
          </Button>
        </Space>
      }
    >
      <Spin spinning={laiXeFacade.isFormLoading}>
        <Form form={form} layout="vertical">
          <Form.Item label={'Tên tài xế'} name={'tenTaiXe'} rules={[{ required: true }]}>
            <Input placeholder={'Nhập tên tài xế'} disabled />
          </Form.Item>
          <Form.Item label={'Ngày tháng năm sinh'} name={'ngaySinh'}>
            <DatePicker
              allowClear
              className={'w-full'}
              disabled
              placeholder={'Chọn ngày tháng năm sinh'}
              format={'DD-MM-YYYY'}
            />
          </Form.Item>
          <Form.Item name={'idPhuongTien'} label={'Chọn phương tiện'}>
            <Select
              showSearch
              disabled
              allowClear
              optionFilterProp={'label'}
              options={phuongTienFacade.pagination?.content.map((item) => ({
                label: item.model,
                value: item.id,
              }))}
            />
          </Form.Item>
          <Form.Item label={'Số căn cước công dân'} name={'cccd'}>
            <Input placeholder={'Nhập số căn cước công dân'} disabled/>
          </Form.Item>
          <Form.Item label={'Giấy phép lái xe'} name={'gplx'}>
            <Input placeholder={'Nhập số giấy phép lái xe'} disabled/>
          </Form.Item>
        </Form>
      </Spin>
    </Drawer>
  )
}
