import { RoleFacade } from "@store";
import { Button, Drawer, Form, Input, Space, Spin } from "antd";
import { useEffect } from "react";
import { CloseOutlined } from '@ant-design/icons';
import TextArea from "antd/es/input/TextArea";
import { EStatusState } from "@models";

export const RoleForm = () => {
  const [form] = Form.useForm();
  const roleFacade = RoleFacade();

  const handleClose = () => {
    form.resetFields();
    roleFacade.set({ isVisible: false });
  };

  useEffect(() => {
    for (const key in roleFacade.data) {
      form.setFieldValue(key, (roleFacade.data as any)[key]);
    }
    return () => {
      form.resetFields();
    };
  }, [roleFacade.data ]);

  useEffect(() => {
    switch (roleFacade.status) {
      case EStatusState.postFulfilled:
      case EStatusState.putFulfilled:
      case EStatusState.deleteFulfilled:
        handleClose();
        break;
    }
  }, [roleFacade.status]);

  const onFinish = (values: any) => {
    if (roleFacade.data?.id) {
      roleFacade.put({ ...values, id: roleFacade.data.id });
    } else roleFacade.post(values);
  };

  return (
    <Drawer
      onClose={handleClose}
      maskClosable={false}
      destroyOnClose={true}
      closeIcon={false}
      extra={<Button icon={<CloseOutlined />} type={'text'} onClick={handleClose} />}
      title={roleFacade.data && roleFacade.isEdit ? 'Chỉnh sửa nhóm người dùng' : 'Thêm mới nhóm người dùng'}
      open={roleFacade.isVisible}
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
      <Spin spinning={roleFacade.isFormLoading}>
        <Form onFinish={onFinish} form={form} layout={"vertical"}>
          <Form.Item label={'Mã nhóm người dùng'} name={'code'} rules={[{ required: true }]}>
            <Input disabled={roleFacade.data !== undefined} placeholder={'Nhập mã nhóm người dùng'} />
          </Form.Item>
          <Form.Item label={'Tên nhóm người dùng'} name={'name'} rules={[{ required: true }]}>
            <Input placeholder={'Nhập tên nhóm người dùng'} />
          </Form.Item>
          <Form.Item label={'Mô tả'} name={'description'}>
            <TextArea rows={3} placeholder={'Nhập mô tả'} />
          </Form.Item>
        </Form>
      </Spin>
    </Drawer>
  );
}
