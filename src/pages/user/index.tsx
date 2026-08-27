import { SubHeader } from '@layouts/admin';
import { Avatar, Button, Card, Dropdown, Empty, Form, FormInstance, Input, Menu, MenuProps, Modal, Pagination, Space, Spin, Switch, Table, Tooltip } from 'antd';
import {
  CaretDownOutlined,
  ReloadOutlined,
  DeleteOutlined,
  PlusOutlined,
  EyeTwoTone,
  EyeInvisibleOutlined
} from '@ant-design/icons';
import { EStatusUser, RoleFacade, User, UserFacade } from '@store';
import { useEffect, useRef } from 'react';
import { ColumnsType } from 'antd/es/table';
import { reorderArray, uuidv4 } from '@utils';
import dayjs from 'dayjs';
import { EStatusState, QueryParams } from '@models';
import { SearchWidget } from 'src/utils/search-widget';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { UserForm } from './user.form';
import { RightMapRoleFacade } from 'src/store/right-map-role';

interface DataType extends User {
  key: string;
}
let fillQuery: QueryParams;

const UserScreen = () => {
  const [form] = Form.useForm();
  const roleFacade = RoleFacade();
  const userFacade = UserFacade();
  const rightMapRoleFacade = RightMapRoleFacade();
  const menuSelectedRef = useRef<string>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [modalApi, contextModelApi] = Modal.useModal();
  const formRef = useRef<FormInstance | undefined>(undefined);
  const filter = searchParams.get('filter');
  const page = searchParams.get('page');
  const size = searchParams.get('size');
  const sort = searchParams.get('sort');

  useEffect(() => {
    roleFacade.get({ size: -1 });
    rightMapRoleFacade.getRightMapByCode('USER')
  }, []);

  useEffect(() => {
    switch (roleFacade.status) {
      case EStatusState.getFulfilled:
      case EStatusState.postFulfilled:
      case EStatusState.putFulfilled:
      case EStatusState.deleteFulfilled:
        onChangeDataTable({ query: { filter: JSON.stringify({ roleCode: menuSelectedRef.current ?? roleFacade.pagination?.content[0]?.code ?? '' })}});
        break;
    }
  }, [roleFacade.status]);

  useEffect(() => {
    switch (userFacade.status) {
      case EStatusUser.lockFulfilled:
      case EStatusUser.unlockFulfilled:
      case EStatusState.putFulfilled:
      case EStatusState.postFulfilled:
      case EStatusState.deleteFulfilled:
        onChangeDataTable({ query: { filter: JSON.stringify({ roleCode: menuSelectedRef.current ?? roleFacade.pagination?.content[0]?.code ?? '' })}});
        break;
    }
  }, [userFacade.status])

  const userDatasource: DataType[] =
    userFacade.pagination?.content.map((item, index) => ({
      ...item,
      index: (userFacade.pagination?.size ?? 0) * ((userFacade.pagination?.page ?? 1) - 1) + index + 1,
      id: item.id ?? '-',
      key: uuidv4(),
      createdOnDate: dayjs(item.createdOnDate).format('DD/MM/YYYY - HH:mm'),
    })) ?? [];

  const column: ColumnsType<DataType> = [
    {
      title: 'STT',
      dataIndex: 'index',
      key: 'index',
      align: 'center',
      width: 60,
    },
    {
      title: 'Họ và tên',
      dataIndex: 'name',
      key: 'name',
      width: 230,
      render: (_, record: any) => (
        <div className={'flex items-center gap-x-2'}>
          <Avatar src={record.avatarUrl} />
          <p>{record.name}</p>
        </div>
      ),
    },
    {
      title: 'Email',
      dataIndex: 'userName',
      key: 'userName',
      width: 200,
    },
    {
      title: 'Số điện thoại',
      dataIndex: 'phoneNumber',
      key: 'phoneNumber',
      width: 130,
    },
    {
      title: 'Đơn vị',
      dataIndex: 'unit',
      key: 'unit',
      width: 180,
    },
    {
      title: 'Chức danh',
      dataIndex: 'title',
      key: 'title',
      width: 180,
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'createdOnDate',
      key: 'createdOnDate',
      width: 150
    },
    {
      title: 'Kích hoạt',
      dataIndex: 'isActive',
      key: 'isActive',
      align: 'center',
      fixed: 'right',
      width: 100,
      render: (_value, record) =>
      <Switch disabled={!rightMapRoleFacade.rightData?.isUpdateAllowed} onChange={(checked) => onClickSwitch(checked, record.id ?? '')} checked={_value} loading={userFacade.isSwitchLoading}/>
    },
    {
      title: 'Thao tác',
      align: 'center',
      key: 'Action',
      fixed: 'right',
      width: 160,
      render: (_value, record) => (
        <div>
          <span onClick={() => handleEdit(record)} className={'text-blue-500 cursor-pointer'}>
            Xem chi tiết
          </span>
          {record.allowedActions && record.allowedActions?.length !== 0 && (
          <Dropdown
            trigger={['click']}
            menu={{
              items: record.allowedActions?.map((item) => ({
                label:
                  item === 'UPDATE'
                    ? 'Cập nhật'
                    : item === 'DELETE'
                      ? 'Xóa'
                      : 'Đổi mật khẩu',
                key: item,
              })),
              onClick: ({ key }) => {
                switch (key) {
                  case 'UPDATE':
                    handleEdit(record);
                    break;
                  case 'CHANGE_PASSWORD':
                    userFacade.set({ isModalVisible: true, data: record });
                    break;
                  case 'DELETE':
                    handleRemove(record.id ?? '');
                    break;
                }
              },
            }}
          >
            <CaretDownOutlined className={'text-blue-500 cursor-pointer px-2'} />
          </Dropdown>
        )}
        </div>
      ),
    },
  ];

  const roleSelectItems: MenuProps['items'] =
    roleFacade.pagination?.content.map((items, index) => ({
      label: (
          <div className={'flex-1 truncate'}>
            {index + 1}. {items.name ?? ''}
          </div>
      ),
      key: items.code ?? '',
    })) ?? [];

    const onChangeDataTable = (props: { query?: QueryParams; setKeyState?: object }) => {
      if (!props.query) {
        props.query = {
          page: Number(page),
          size: Number(size),
          filter: filter ?? '',
          sort: sort ?? '',
        };
      }

      fillQuery = { ...userFacade.query, ...props.query };
      for (const key in fillQuery) {
        if (!fillQuery[key as keyof QueryParams]) delete fillQuery[key as keyof QueryParams];
      }
      userFacade.get(fillQuery);
      navigate(
        { search: new URLSearchParams(fillQuery as unknown as Record<string, string>).toString() },
        { replace: true },
      );
      userFacade.set({ query: props.query, ...props.setKeyState });
    };


  const handleClickMenuItems = (key: string) => {
    if (menuSelectedRef.current !== key) {
      menuSelectedRef.current = key;
      userFacade.get({ filter: JSON.stringify({ roleCode: key }) })
    }
  };

  const handleEdit = (data: User) => {
    if(data.id){
      setSearchParams(
        (prev) => {
          if (!prev.has('id')) prev.append('id', data.id ?? '');
          else prev.set('id', data.id ?? '');
          return prev;
        },
        { replace: true },
      );
      userFacade.set({ isVisible: true, data: data });
    }
  }

  const handleRemove = (id: string) => {
    Modal.confirm({
      title: 'Xoá người dùng?',
      content: 'Mọi dữ liệu về người dùng này sẽ bị xoá vĩnh viễn. Bạn có chắc chắn muốn xoá người dùng này?',
      onOk: () => {
        userFacade.delete(id);
      },
      onCancel: () => {},
      cancelText: 'Huỷ bỏ',
      okText: 'Xác nhận',
    });
  };

  const onClickSwitch = (checked: boolean, id: string) => {
    if (checked)
      userFacade.unlock(id)
    else userFacade.lock(id)
  }

  const onChangeSearch = (value: string) => {
    onChangeDataTable({
      query: {
        page: 1,
        size: 20,
        filter: JSON.stringify({ FullTextSearch: value, roleCode: menuSelectedRef.current ?? roleFacade.pagination?.content[0]?.code ?? '' }),
      },
    });
  };

  const validatePassword = (_:any, value: string) => {
    if (value && value !== form.getFieldValue('password')) {
      return Promise.reject(new Error('Mật khẩu không khớp'));
    }
    return Promise.resolve();
  }

  const handleCloseModal = () => {
    form.resetFields();
    userFacade.set({ isModalVisible: false, data: undefined });
  }

  const onFinish = (data: any) => {
    if (userFacade.data?.id) {
      userFacade.changePassword(userFacade.data?.id, data.password);
      handleCloseModal();
    }
  }

  const tool = (
    <Space>
      <SearchWidget form={(form) => (formRef.current = form)} callback={onChangeSearch} />
      <Button
        icon={<ReloadOutlined/>}
        loading={userFacade.isLoading}
        onClick={() => {
          userFacade.get({ filter: JSON.stringify({ roleCode: roleFacade.pagination?.content[0]?.code ?? '' }) });
        }}>Tải lại</Button>
      <Button hidden={!rightMapRoleFacade.rightData?.isCreateAllowed} type={'primary'} icon={<PlusOutlined/>} onClick={() => userFacade.set({ isVisible: true, data: undefined })}>
        Thêm mới người dùng
      </Button>
    </Space>
  )

  return (
    <SubHeader tool={tool} isVisible={false}>
      <UserForm />
      <Modal
        title={'Đổi mật khẩu'}
        centered
        open={userFacade.isModalVisible}
        onCancel={handleCloseModal}
        onOk={form.submit}
      >
        <Form className={'mt-4'} form={form} layout={'vertical'} onFinish={onFinish}>
        <Form.Item hidden={searchParams.has('id')} label={'Mật khẩu'} name={'password'} rules={[{ required: searchParams.has('id') ? false : true }]}>
            <Input.Password placeholder={'Nhập mật khẩu'} iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}/>
          </Form.Item>
          <Form.Item hidden={searchParams.has('id')} label={'Nhập lại mật khẩu'} name={'retypedPassword'} rules={[{ required: searchParams.has('id') ? false : true },{ validator: validatePassword }]}>
            <Input.Password placeholder={'Nhập lại mật khẩu'} iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)} />
          </Form.Item>
        </Form>
      </Modal>
      <div className={'grid grid-cols-12 gap-3 px-2.5 pt-2.5'}>
        <div className={'col-span-3 intro-x'}>
          <Card
            size={'small'}
            title={<span className={'text-base ml-3'}>Nhóm người dùng</span>}
            className={'sm:min-h-[calc(100vh-8.5rem)] shadow overflow-y-auto pb-3'}
            styles={{ body: { padding: 0 } }}
          >
            <Menu
              className={'h-[calc(100vh-300px)] overflow-auto miniScroll'}
              inlineIndent={20}
              forceSubMenuRender={true}
              mode={'inline'}
              items={roleSelectItems}
              onClick={({ key }) => handleClickMenuItems(key)}
              selectedKeys={[menuSelectedRef.current ?? roleFacade.pagination?.content[0]?.code ?? '']}
            ></Menu>
          </Card>
        </div>
        <div className={'col-span-9 intro-x'}>
          <div className={'shadow rounded-xl w-full overflow-auto bg-white'}>
            <div className={'sm:min-h-[calc(100vh-8.5rem)] overflow-y-auto pb-3'}>
              <Spin spinning={userFacade.isLoading}>
                <div>
                  <Table
                    size={'small'}
                    dataSource={userDatasource}
                    columns={column}
                    pagination={false}
                    scroll={{ x: 'max-content', y: 'calc(100vh - 250px)' }}
                  />
                </div>
                <Pagination
                  className={'flex justify-end m-3'}
                  showSizeChanger
                  showTitle={false}
                  current={userFacade?.pagination?.page}
                  pageSize={userFacade?.pagination?.size}
                  total={userFacade?.pagination?.totalElements}
                  pageSizeOptions={[20, 40, 60, 80]}
                  showTotal={(total, range) => `${range[0]}-${range[1]} of ${total} items`}
                  onChange={(page, pageSize) => onChangeDataTable({ query: { page: page, size: pageSize } })}
                />
              </Spin>
            </div>
          </div>
        </div>
      </div>
    </SubHeader>
  );
};

export default UserScreen;
