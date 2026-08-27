import React, { useCallback } from "react";
import { EStatusState } from "@models";
import { RoleFacade, UserFacade } from "@store";
import { Button, Drawer, Form, Input, Select, Space, Spin } from "antd";
import { useEffect } from "react";
import { CloseOutlined, EyeTwoTone, EyeInvisibleOutlined } from '@ant-design/icons';
import { useSearchParams } from "react-router-dom";
import { RightMapRoleFacade } from "src/store/right-map-role";
import { LaiXeFacade } from "src/store/quan-ly-lai-xe";
import { debounce } from "lodash";

export const UserForm: React.FC = () => {
  const [form] = Form.useForm();
  const userFacade = UserFacade();
  const roleFacade = RoleFacade();
  const laiXeFacade = LaiXeFacade();
  const rightMapRoleFacade = RightMapRoleFacade();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedRoleListCode: string[] = Form.useWatch('roleListCode', form)

  const roleOptions =
    roleFacade.pagination?.content.map((items) => ({
      label: items.name,
      value: items.code
    })) ?? [];

  useEffect(() => {
    if (!userFacade.isVisible) return;

    laiXeFacade.get({
      page: 1,
      size: -1,
      filter: JSON.stringify({
        excludeHaveUser: true,
        forUserId: userFacade.data?.id
      })
    });
  }, [userFacade.isVisible]);

  useEffect(() => {
    if (!userFacade.data) {
      return;
    }

    const { driverId, driverName, ...others } = userFacade.data;

    for (const key in others) {
      form.setFieldValue(key, (others as any)[key]);
      if (key === 'email') form.setFieldValue(key, others?.userName);
    }

    if (driverId) {
      form.setFieldValue('taiXe', driverId);
    }

    return () => {
      form.resetFields();
    };
  }, [userFacade.data]);

  const handleClose = () => {
    form.resetFields();
    userFacade.set({ isVisible: false });
    setSearchParams(
      (prev) => {
        if (prev.has('id')) prev.delete('id');
        return prev;
      },
      { replace: true },
    );
  };

  useEffect(() => {
    switch (userFacade.status) {
      case EStatusState.postFulfilled:
      case EStatusState.putFulfilled:
      case EStatusState.deleteFulfilled:
        handleClose();
        break;
    }
  }, [userFacade.status]);

  const onFinish = (values: any) => {
    if (searchParams.has('id')) {
      userFacade.put({ ...values, id: userFacade.data?.id });
    } else userFacade.post(values);
  };

  const validatePassword = (_:any, value: string) => {
    if (value && value !== form.getFieldValue('password')) {
      return Promise.reject(new Error('Mật khẩu không khớp'));
    }
    return Promise.resolve();
  }

  const driversSearchDebounce = useCallback(
    debounce((search: string = '') => {
      laiXeFacade.get({
        page: 1,
        size: 8,
        filter: JSON.stringify({ FullTextSearch: search }),
      });
    }, 300),
    [],
  );

  return (
  <Drawer
    onClose={handleClose}
    maskClosable={false}
    destroyOnClose={true}
    closeIcon={false}
    extra={<Button icon={<CloseOutlined />} type={'text'} onClick={handleClose} />}
    title={(searchParams.has('id') ? 'Chỉnh sửa người dùng' : 'Thêm mới người dùng')}
    open={userFacade.isVisible}
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
    <Spin spinning={userFacade.isFormLoading}>
        <Form onFinish={onFinish} form={form} layout={"vertical"}>
          <Form.Item label={'Họ và tên'} name={'name'} rules={[{ required: true }]}>
            <Input placeholder={'Nhập họ và tên'} />
          </Form.Item>
          <Form.Item label={'Email'} name={'email'} rules={[{ required: true }]}>
            <Input disabled={searchParams.has('id')} placeholder={'Nhập email'}/>
          </Form.Item>
          <Form.Item hidden={searchParams.has('id')} label={'Mật khẩu'} name={'password'} rules={[{ required: searchParams.has('id') ? false : true }]}>
            <Input.Password placeholder={'Nhập mật khẩu'} iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}/>
          </Form.Item>
          <Form.Item hidden={searchParams.has('id')} label={'Nhập lại mật khẩu'} name={'retypedPassword'} rules={[{ required: searchParams.has('id') ? false : true },{ validator: validatePassword }]}>
            <Input.Password placeholder={'Nhập lại mật khẩu'} iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)} />
          </Form.Item>
          <Form.Item label={'Số điện thoại'} name={'phoneNumber'} rules={[{ required: true }]}>
            <Input placeholder={'Nhập số điện thoại'} />
          </Form.Item>
          <Form.Item label={'Đơn vị'} name={'unit'}>
            <Input placeholder={'Nhập đơn vị'} />
          </Form.Item>
          <Form.Item label={'Chức danh'} name={'title'}>
            <Input placeholder={'Nhập chức danh'} />
          </Form.Item>
          <Form.Item label={'Nhóm người dùng'} name={'roleListCode'}>
            <Select mode={'multiple'} optionFilterProp={'label'} options={roleOptions} showSearch placeholder={'Chọn nhóm người dùng'} />
          </Form.Item>
          <Form.Item label="Tài xế" name="taiXe" hidden={!selectedRoleListCode?.includes('TAIXE')}>
          <Select
              showSearch
              placeholder="Chọn tài xế"
              allowClear
              options={laiXeFacade.pagination?.content.map((x) => ({
                key: x.id,
                label: x.tenTaiXe,
                value: x.id,
              }))}
              optionFilterProp="label"
            />
          </Form.Item>
        </Form>
      </Spin>
  </Drawer>
  )
};
