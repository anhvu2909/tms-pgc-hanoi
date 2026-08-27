import { EStatusState } from "@models";
import { CodeTypeManagementFacade, TypesCodeTypeManagementFacade, UserFacade } from "@store";
import { Button, DatePicker, Drawer, Form, Input, Select, Space, Spin } from "antd";
import { useEffect } from "react";
import { CloseOutlined, EyeTwoTone, EyeInvisibleOutlined } from '@ant-design/icons';
import { useSearchParams } from "react-router-dom";
import { RightMapRoleFacade } from "src/store/right-map-role";
import TextArea from "antd/es/input/TextArea";

export const CodeForm = ({ type }: { type: string }) => {
  const [form] = Form.useForm();
  const rightMapRoleFacade = RightMapRoleFacade();
  const [searchParams, setSearchParams] = useSearchParams();
  const codeTypeManagementFacade = CodeTypeManagementFacade();
  const typesCodeTypeManagementFacade = TypesCodeTypeManagementFacade();

  useEffect(() => {
    for (const key in codeTypeManagementFacade.data) {
      form.setFieldValue(key, (codeTypeManagementFacade.data as any)[key]);
    }
    return () => {
      form.resetFields();
    };
  }, [codeTypeManagementFacade.data]);

  const handleClose = () => {
    form.resetFields();
    codeTypeManagementFacade.set({ isVisible: false });
    setSearchParams(
      (prev) => {
        if (prev.has('id')) prev.delete('id');
        return prev;
      },
      { replace: true },
    );
  };

  const typeCodeOptions =
    typesCodeTypeManagementFacade.pagination?.content.map((item) => ({
      label: item.title,
      value: item.code,
    })) ?? [];

  useEffect(() => {
    switch (codeTypeManagementFacade.status) {
      case EStatusState.postFulfilled:
      case EStatusState.putFulfilled:
      case EStatusState.deleteFulfilled:
        handleClose();
        break;
    }
  }, [codeTypeManagementFacade.status]);

  const onFinish = (values: any) => {
    if (searchParams.has('id')) {
      codeTypeManagementFacade.put({ ...values, id: codeTypeManagementFacade.data?.id });
    } else codeTypeManagementFacade.post({...values, type: type });
  };

  return (
  <Drawer
    onClose={handleClose}
    maskClosable={false}
    destroyOnClose={true}
    closeIcon={false}
    extra={<Button icon={<CloseOutlined />} type={'text'} onClick={handleClose} />}
    title={(searchParams.has('id') ? 'Chỉnh sửa mã' : 'Thêm mới mã')}
    open={codeTypeManagementFacade.isVisible}
    footer={
      <Space className={'flex justify-end'}>
        <Button type={'default'} block onClick={handleClose}>
          Huỷ bỏ
        </Button>
        <Button hidden={!rightMapRoleFacade.rightData?.isUpdateAllowed} type={'primary'} className={'!py-0'} onClick={form.submit}>
          Lưu lại
        </Button>
      </Space>
    }
  >
    <Spin spinning={codeTypeManagementFacade.isFormLoading}>
        <Form onFinish={onFinish} form={form} layout={"vertical"}>
        <Form.Item label={'Danh mục'} name={'type'} rules={[{ required: true }]}>
            <Select optionFilterProp={'label'} options={typeCodeOptions} allowClear showSearch placeholder={'Chọn danh mục'} />
          </Form.Item>
          <Form.Item label={'Mã'} name={'code'} rules={[{ required: true }]}>
            <Input placeholder={'Nhập mã'} />
          </Form.Item>
          <Form.Item label={'Tiêu đề'} name={'title'} rules={[{ required: true }]}>
            <Input placeholder={'Nhập tiêu đề'} />
          </Form.Item>
          <Form.Item label={'Thứ tự'} name={'order'}>
            <Input type={'number'} placeholder={'Nhập thứ tự'}/>
          </Form.Item>
          <Form.Item label={'Mô tả'} name={'description'}>
            <TextArea rows={3} placeholder={'Nhập mô tả'} />
          </Form.Item>
        </Form>
      </Spin>
  </Drawer>
  )
};
