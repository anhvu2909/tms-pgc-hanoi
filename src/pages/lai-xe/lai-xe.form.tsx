import { Button, DatePicker, Drawer, Form, Input, Select, Space, Spin, Switch } from 'antd';
import React, { useEffect } from 'react';
import { CloseOutlined } from '@ant-design/icons';
import { LaiXeFacade, T_LaiXeForm } from '../../store/quan-ly-lai-xe';
import { useSearchParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { PhuongTienFacade, PhuongTienModel } from '../../store/quan-ly-phuong-tien';
import { EStatusState } from '@models';

export const LaiXeForm = () => {
  const [form] = Form.useForm()
  const [searchParams, setSearchParams] = useSearchParams();
  const filter = searchParams.get('filter')
  const laiXeFacade = LaiXeFacade()
  const phuongTienFacade = PhuongTienFacade()

  useEffect(() => {
    if (laiXeFacade.isVisible && laiXeFacade.data?.id) {
      laiXeFacade.getById({ id: laiXeFacade.data.id, keyState: '' });
    }
  }, [laiXeFacade.isVisible]);

  useEffect(() => {
    switch (laiXeFacade.status) {
      case EStatusState.postFulfilled:
      case EStatusState.putFulfilled:
      case EStatusState.deleteFulfilled:
        handleClose();
        if (filter) {
          laiXeFacade.get({ filter: filter });
        } else laiXeFacade.get({});
        break;
    }
  }, [laiXeFacade.status]);

  const handleClose = () => {
    form.resetFields();
    laiXeFacade.set({ isVisible: false, data: undefined });
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

  const onFinish = (values: T_LaiXeForm) => {
    const data: T_LaiXeForm = {
      ...values,
      ngaySinh: values.ngaySinh ? dayjs(values.ngaySinh).format('YYYY-MM-DDTHH:mm:ss[Z]') : undefined,
    }


    if(laiXeFacade.data?.id) {
      laiXeFacade.put({...data, id: laiXeFacade.data.id });
    } else laiXeFacade.post(data);
  }


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
      title={laiXeFacade.isEdit ? 'Chỉnh sửa tài xế' : 'Thêm mới tài xế'}
      open={laiXeFacade.isVisible}
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
      <Spin spinning={laiXeFacade.isFormLoading}>
      <Form onFinish={onFinish} form={form} layout="vertical">
        <Form.Item label={'Mã tài xế'} name={'maTaiXe'} rules={[{ required: true }]}>
          <Input placeholder={'Nhập mã tài xế'} />
        </Form.Item>
        <Form.Item label={'Tên tài xế'} name={'tenTaiXe'} rules={[{ required: true }]}>
          <Input placeholder={'Nhập tên tài xế'} />
        </Form.Item>
        <Form.Item name={'idPhuongTien'} label={'Chọn phương tiện'} rules={[{ required: true }]} >
          <Select
            showSearch
            placeholder={'Chọn phương tiện'}
            options={phuongTienFacade.pagination?.content.map((item: PhuongTienModel) => ({
              label: item.bienSoXe,
              value: item.id,
            }))}
            allowClear
            optionFilterProp={'label'}
          />
        </Form.Item>
        <Form.Item label={'Số căn cước công dân'} name={'cccd'} rules={[{ required: true }]}>
          <Input placeholder={'Nhập số căn cước công dân'}/>
        </Form.Item>
        <Form.Item label={'Ngày tháng năm sinh'} name={'ngaySinh'}>
          <DatePicker
            allowClear
            className={'w-full'}
            placeholder={'Chọn ngày tháng năm sinh'}
            format={'DD-MM-YYYY'}
          />
        </Form.Item>
        <Form.Item label={'Giấy phép lái xe'} name={'gplx'}>
          <Input placeholder={'Nhập số giấy phép lái xe'}/>
        </Form.Item>
        <Form.Item label={'Trạng thái'} name={'active'} >
          <Switch/>
        </Form.Item>
      </Form>
      </Spin>
    </Drawer>
  )
}
