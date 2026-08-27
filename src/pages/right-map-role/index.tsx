import React from 'react';
import { SubHeader } from '@layouts/admin';
import {
  Avatar,
  Button,
  Card,
  Dropdown,
  Empty,
  Form,
  Input,
  Menu,
  MenuProps,
  Modal,
  Pagination,
  Spin,
  Table,
  Tooltip,
} from 'antd';
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  CaretDownOutlined,
} from '@ant-design/icons';
import { Role, RoleFacade, User, UserFacade } from '@store';
import { useEffect, useRef } from 'react';
import RightMapEditableTable from './table';
import { EStatusRightMapRole, RightMapRole, RightMapRoleFacade } from 'src/store/right-map-role';
import { EStatusState } from '@models';
import { RoleForm } from './role.form';

const RightScreen: React.FC = () => {
  const [form] = Form.useForm();
  const roleFacade = RoleFacade();
  const userFacade = UserFacade();
  const rightMapFacade = RightMapRoleFacade();
  const [modalApi, contextModelApi] = Modal.useModal();
  const menuSelectedRef = useRef<string>();

  useEffect(() => {
    roleFacade.get({ size: -1 });
    userFacade.get({});
    rightMapFacade.getRightMapByListCode('ROLE,RIGHTMAPROLE');
  }, []);

  useEffect(() => {
    switch (roleFacade.status) {
      case EStatusState.getFulfilled:
        rightMapFacade.getConfig(menuSelectedRef.current ?? roleFacade.pagination?.content[0]?.id ?? '');
        break;
      case EStatusState.postFulfilled:
      case EStatusState.putFulfilled:
      case EStatusState.deleteFulfilled:
        roleFacade.get({ size: -1 });
        break;
    }
  }, [roleFacade.status]);

  useEffect(() => {
    switch (rightMapFacade.status) {
      case EStatusRightMapRole.getConfigFulfilled:
        form.setFieldValue('data', rightMapFacade.configList ?? []);
        break;
    }
  }, [rightMapFacade.configList]);

  const handleClickMenuItems = (key: string) => {
    if (menuSelectedRef.current !== key) {
      menuSelectedRef.current = key;
      rightMapFacade.getConfig(key);
    }
  };

  const handleEdit = (data: Role) => {
    roleFacade.set({ data: data, isVisible: true, isEdit: true });
  };

  const handleRemove = (id: string) => {
    Modal.confirm({
      title: 'Xoá nhóm người dùng?',
      content: 'Mọi dữ liệu về nhóm người dùng này sẽ bị xoá vĩnh viễn. Bạn có chắc chắn muốn xoá nhóm người dùng này?',
      onOk: () => {
        roleFacade.delete(id);
      },
      onCancel: () => {},
      cancelText: 'Huỷ bỏ',
      okText: 'Xác nhận',
    });
  };

  const roleSelectItems: MenuProps['items'] =
    roleFacade.pagination?.content.map((items, index) => ({
      label: (
        <div className={'flex justify-between w-full'}>
          <div className={'flex-1 truncate'}>
            {index + 1}. {items.name ?? ''}
          </div>
          <div>
            <Tooltip title={'Chỉnh sửa'}>
              <Button
                hidden={!rightMapFacade.rightDatas?.find(x => x.groupCode === 'ROLE')?.isUpdateAllowed}
                type={'link'}
                className={'text-blue-500'}
                icon={<EditOutlined />}
                onClick={() => handleEdit(items)}
              />
            </Tooltip>
            <Tooltip title={'Xóa'}>
              <Button
              hidden={!rightMapFacade.rightDatas?.find(x => x.groupCode === 'ROLE')?.isDeleteAllowed}
                type={'link'}
                className={'!text-red-500 p hover:!text-red-500/60'}
                icon={<DeleteOutlined />}
                onClick={() => handleRemove(items.id ?? '')}
              />
            </Tooltip>
          </div>
        </div>
      ),
      key: items.id ?? '',
    })) ?? [];

    const roleAddButton = (
      <Tooltip title={'Thêm mới nhóm người dùng'}>
        <Button
          hidden={!rightMapFacade.rightDatas?.find(x => x.groupCode === 'ROLE')?.isCreateAllowed}
          className={'mr-3'}
          type={'primary'}
          icon={<PlusOutlined />}
          size="small"
          shape={'circle'}
          onClick={() => roleFacade.set({ isVisible: true, data: undefined })}
        ></Button>
      </Tooltip>
    );

  const onFinish = (value: any) => {
    const data: RightMapRole[] = value.data;

    rightMapFacade.putConfig(menuSelectedRef.current ?? roleFacade.pagination?.content[0]?.id ?? '', data);
  };

  return (
    <SubHeader isVisible={false}>
      <RoleForm />
      <div className={'grid grid-cols-12 gap-3 px-2.5 pt-2.5'}>
        <div className={'col-span-3 intro-x'}>
          <Card
            size={'small'}
            title={<span className={'text-base ml-3'}>Nhóm người dùng</span>}
            className={'sm:min-h-[calc(100vh-8.5rem)] shadow overflow-y-auto pb-3'}
            extra={roleAddButton}
            styles={{ body: { padding: 0 } }}
          >
            <Spin spinning={roleFacade.isLoading}>
            <Menu
              className={'h-[calc(100vh-300px)] overflow-auto miniScroll'}
              inlineIndent={20}
              forceSubMenuRender={true}
              mode={'inline'}
              items={roleSelectItems}
              onClick={({ key }) => handleClickMenuItems(key)}
              selectedKeys={[menuSelectedRef.current ?? roleFacade.pagination?.content[0]?.id ?? '']}
            />
            </Spin>

          </Card>
        </div>
        <div className="col-span-9 intro-x flex flex-col">
          <div className="shadow rounded-xl w-full overflow-auto bg-white flex-grow flex flex-col">
            <div className="sm:min-h-[calc(80vh-8.5rem)] overflow-y-auto pb-3 flex-grow">
              <Spin spinning={rightMapFacade.isLoading}>
                <Form form={form} onFinish={onFinish}>
                  <Form.List name="data">
                    {(data, { add, remove }) => {
                      return (
                        <>
                          <RightMapEditableTable
                            data={data}
                            add={add}
                            remove={remove}
                            form={form}
                          />
                        </>
                      );
                    }}
                  </Form.List>
                </Form>
              </Spin>
            </div>
            <div className="flex justify-end m-3">
              <Button onClick={form.submit} type="primary">
                Lưu lại
              </Button>
            </div>
          </div>
        </div>
      </div>
    </SubHeader>
  );
};

export default RightScreen;
