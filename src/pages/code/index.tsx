import { SubHeader } from '@layouts/admin';
import { Button, Card, FormInstance, Menu, MenuProps, Modal, Pagination, Space, Spin, Table } from 'antd';
import { EditOutlined, ReloadOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { CodeTypeManagementFacade, TypesCodeTypeManagementFacade, User } from '@store';
import { useEffect, useRef } from 'react';
import { ColumnsType } from 'antd/es/table';
import { uuidv4 } from '@utils';
import dayjs from 'dayjs';
import { EStatusState, QueryParams } from '@models';
import { SearchWidget } from 'src/utils/search-widget';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { RightMapRoleFacade } from 'src/store/right-map-role';
import { CodeForm } from './code.form';

interface DataType extends User {
  key: string;
}
let fillQuery: QueryParams;

const UserScreen = () => {
  const rightMapRoleFacade = RightMapRoleFacade();
  const menuSelectedRef = useRef<string>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const formRef = useRef<FormInstance | undefined>(undefined);
  const filter = searchParams.get('filter');
  const page = searchParams.get('page');
  const size = searchParams.get('size');
  const sort = searchParams.get('sort');
  const codeTypeManagementFacade = CodeTypeManagementFacade();
  const typesCodeTypeManagementFacade = TypesCodeTypeManagementFacade();

  useEffect(() => {
    rightMapRoleFacade.getRightMapByCode('CODETYPE');
    typesCodeTypeManagementFacade.get({});
  }, []);

  useEffect(() => {
    switch (typesCodeTypeManagementFacade.status) {
      case EStatusState.getFulfilled:
      case EStatusState.postFulfilled:
      case EStatusState.putFulfilled:
      case EStatusState.deleteFulfilled:
        onChangeDataTable({
          query: {
            filter: JSON.stringify({
              type: menuSelectedRef.current ?? typesCodeTypeManagementFacade.pagination?.content[0]?.code ?? '',
            }),
          },
        });
        break;
    }
  }, [typesCodeTypeManagementFacade.status]);

  useEffect(() => {
    switch (codeTypeManagementFacade.status) {
      case EStatusState.putFulfilled:
      case EStatusState.postFulfilled:
      case EStatusState.deleteFulfilled:
        onChangeDataTable({
          query: {
            filter: JSON.stringify({
              type: menuSelectedRef.current ?? typesCodeTypeManagementFacade.pagination?.content[0]?.code ?? '',
            }),
          },
        });
        break;
    }
  }, [codeTypeManagementFacade.status]);

  const codeTypeDatasource: DataType[] =
    codeTypeManagementFacade.pagination?.content.map((item, index) => ({
      ...item,
      index:
        (codeTypeManagementFacade.pagination?.size ?? 0) * ((codeTypeManagementFacade.pagination?.page ?? 1) - 1) +
        index +
        1,
      id: item.id ?? '-',
      key: uuidv4(),
      createdOnDate: dayjs(item.createdOnDate).format('DD/MM/YYYY'),
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
      title: 'Mã',
      dataIndex: 'code',
      key: 'code',
      width: 180,
    },
    {
      title: 'Tên mã',
      dataIndex: 'title',
      key: 'title',
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'createdOnDate',
      key: 'createdOnDate',
      width: 150,
    },
    {
      title: 'Thao tác',
      align: 'center',
      key: 'Action',
      fixed: 'right',
      width: 160,
      render: (_, record: any) => (
        <Space>
          <Button
            hidden={!rightMapRoleFacade.rightData?.isUpdateAllowed}
            onClick={() => handleEdit(record)}
            type={'primary'}
            icon={<EditOutlined />}
          >
            Sửa
          </Button>
          <Button
            hidden={!rightMapRoleFacade.rightData?.isDeleteAllowed}
            icon={<DeleteOutlined />}
            danger
            onClick={() => handleRemove(record.id ?? '')}
          >
            Xóa
          </Button>
        </Space>
      ),
    },
  ];

  const typeCodeMenuItems: MenuProps['items'] =
    typesCodeTypeManagementFacade.pagination?.content.map((items, index) => ({
      label: (
        <div className={'flex-1 truncate'}>
          {index + 1}. {items.title ?? ''}
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

    fillQuery = { ...codeTypeManagementFacade.query, ...props.query };
    for (const key in fillQuery) {
      if (!fillQuery[key as keyof QueryParams]) delete fillQuery[key as keyof QueryParams];
    }
    codeTypeManagementFacade.get(fillQuery);
    navigate(
      { search: new URLSearchParams(fillQuery as unknown as Record<string, string>).toString() },
      { replace: true },
    );
    codeTypeManagementFacade.set({ query: props.query, ...props.setKeyState });
  };

  const handleClickMenuItems = (key: string) => {
    if (menuSelectedRef.current !== key) {
      menuSelectedRef.current = key;
      codeTypeManagementFacade.get({ filter: JSON.stringify({ type: key }) });
    }
  };

  const handleEdit = (data: User) => {
    if (data.id) {
      setSearchParams(
        (prev) => {
          if (!prev.has('id')) prev.append('id', data.id ?? '');
          else prev.set('id', data.id ?? '');
          return prev;
        },
        { replace: true },
      );
      codeTypeManagementFacade.set({ isVisible: true, data: data });
    }
  };

  const handleRemove = (id: string) => {
    Modal.confirm({
      title: 'Xoá codetype?',
      content: 'Mọi dữ liệu về codetype này sẽ bị xoá vĩnh viễn. Bạn có chắc chắn muốn xoá codetype này?',
      onOk: () => {
        codeTypeManagementFacade.delete(id);
      },
      onCancel: () => {},
      cancelText: 'Huỷ bỏ',
      okText: 'Xác nhận',
    });
  };

  const onChangeSearch = (value: string) => {
    onChangeDataTable({
      query: {
        page: 1,
        size: 20,
        filter: JSON.stringify({
          FullTextSearch: value,
          roleCode: menuSelectedRef.current ?? typesCodeTypeManagementFacade.pagination?.content[0]?.code ?? '',
        }),
      },
    });
  };

  const tool = (
    <Space>
      <SearchWidget form={(form) => (formRef.current = form)} callback={onChangeSearch} />
      <Button
        icon={<ReloadOutlined />}
        loading={codeTypeManagementFacade.isLoading}
        onClick={() => {
          codeTypeManagementFacade.get({
            filter: JSON.stringify({ type: typesCodeTypeManagementFacade.pagination?.content[0]?.code ?? '' }),
          });
        }}
      >
        Tải lại
      </Button>
      <Button
        hidden={!rightMapRoleFacade.rightData?.isCreateAllowed}
        type={'primary'}
        icon={<PlusOutlined />}
        onClick={() => codeTypeManagementFacade.set({ isVisible: true, data: undefined })}
      >
        Thêm mới code-type
      </Button>
    </Space>
  );

  return (
    <SubHeader tool={tool} isVisible={false}>
      <CodeForm type={menuSelectedRef.current ?? typesCodeTypeManagementFacade.pagination?.content[0]?.code ?? ''} />
      <div className={'grid grid-cols-12 gap-3 px-2.5 pt-2.5'}>
        <div className={'col-span-3 intro-x'}>
          <Card
            size={'small'}
            title={<span className={'text-base ml-3'}>Type code</span>}
            className={'sm:min-h-[calc(100vh-8.5rem)] shadow overflow-y-auto pb-3'}
            styles={{ body: { padding: 0 } }}
          >
            <Menu
              className={'h-[calc(100vh-300px)] overflow-auto miniScroll'}
              inlineIndent={20}
              forceSubMenuRender={true}
              mode={'inline'}
              items={typeCodeMenuItems}
              onClick={({ key }) => handleClickMenuItems(key)}
              selectedKeys={[
                menuSelectedRef.current ?? typesCodeTypeManagementFacade.pagination?.content[0]?.code ?? '',
              ]}
            ></Menu>
          </Card>
        </div>
        <div className={'col-span-9 intro-x'}>
          <div className={'shadow rounded-xl w-full overflow-auto bg-white'}>
            <div className={'sm:min-h-[calc(100vh-8.5rem)] overflow-y-auto pb-3'}>
              <Spin spinning={codeTypeManagementFacade.isLoading}>
                <div>
                  <Table
                    size={'small'}
                    dataSource={codeTypeDatasource}
                    columns={column}
                    pagination={false}
                    scroll={{ x: 'max-content', y: 'calc(100vh - 250px)' }}
                  />
                </div>
                <Pagination
                  className={'flex justify-end m-3'}
                  showSizeChanger
                  showTitle={false}
                  current={codeTypeManagementFacade?.pagination?.page}
                  pageSize={codeTypeManagementFacade?.pagination?.size}
                  total={codeTypeManagementFacade?.pagination?.totalElements}
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
