import { Button, Drawer, Form, Input, Space, Spin, Switch } from 'antd';
import React, { useEffect } from 'react';
import { CloseOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useSearchParams } from 'react-router-dom';
import { PhuongTienFacade } from '../../store/quan-ly-phuong-tien';
import { EStatusState } from '@models';

export const PhuongTienForm = () => {
  const [form] = Form.useForm()
  const [searchParams, setSearchParams] = useSearchParams();
  const phuongTienFacade = PhuongTienFacade()
  const filter = searchParams.get('filter');

  useEffect(() => {
    switch (phuongTienFacade.status) {
      case EStatusState.postFulfilled:
      case EStatusState.putFulfilled:
      case EStatusState.deleteFulfilled:
        handleClose();
        if (filter) {
          phuongTienFacade.get({ filter: filter });
        } else phuongTienFacade.get({});
        break;
    }
  }, [phuongTienFacade.status]);

  useEffect(() => {
    if (phuongTienFacade.isVisible && phuongTienFacade.data?.id) {
      phuongTienFacade.getById({ id: phuongTienFacade.data.id, keyState: '' });
    }
  }, [phuongTienFacade.isVisible]);

  const handleClose = () => {
    form.resetFields();
    phuongTienFacade.set({ isVisible: false, data: undefined });
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

  const onFinish = (values: any) => {
    if(phuongTienFacade.data?.id) {
      phuongTienFacade.put({...values, id: phuongTienFacade.data.id });
    } else phuongTienFacade.post(values);
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
      title={phuongTienFacade.isEdit ? 'Chỉnh sửa phương tiện' : 'Thêm mới phương tiện'}
      open={phuongTienFacade.isVisible}
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
      <Spin spinning={phuongTienFacade.isFormLoading}>
      <Form onFinish={onFinish} form={form} layout="vertical">
        <Form.Item label={'Biển số xe'} name={'bienSoXe'} rules={[{ required: true }]}>
          <Input placeholder={'Nhập biển số xe của phương tiện'} />
        </Form.Item>
        <Form.Item label={'Số khung'} name={'soKhung'}>
         <Input placeholder={'Nhập số khung của phương tiện'}/>
        </Form.Item>
        <Form.Item label={'Số máy'} name={'soMay'}>
          <Input placeholder={'Nhập số máy của phương tiện'}/>
        </Form.Item>
        <Form.Item label={'Hãng sản xuất'} name={'hangSanXuat'} rules={[{ required: true }]}>
          <Input placeholder={'Nhập hãng sản xuất'}/>
        </Form.Item>
        <Form.Item label={'Model'} name={'model'} rules={[{ required: true }]}>
          <Input placeholder={'Nhập model'}/>
        </Form.Item>
        <Form.Item label={'Năm sản xuất'} name={'namSanXuat'}>
          <Input placeholder={'Nhập năm sản xuất'}/>
        </Form.Item>
        <Form.Item label={'Tải trọng'} name={'taiTrong'} rules={[{ required: true }]}>
          <Input placeholder={'Nhập tải trọng'}/>
        </Form.Item>
        <Form.Item label={'Trạng thái'} name={'active'} className={'flex'}>
          <Switch checkedChildren={<CheckCircleOutlined />} unCheckedChildren={<CloseOutlined/>}/>
        </Form.Item>
      </Form>
      </Spin>
    </Drawer>
  )
}
