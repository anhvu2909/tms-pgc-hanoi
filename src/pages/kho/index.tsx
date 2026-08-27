import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { DrawerForm } from '@core/drawer';
import { SubHeader } from '@layouts/admin';
import { EFormRuleType, EFormType, EStatusState, QueryParams } from '@models';
import { CodeTypeManagementFacade, EStatusKho, KhoFacade, KhoModel, T_KhoFilterFields } from '@store';
import { scrollLeftWhenChanging, uuidv4 } from '@utils';
import { Badge, Button, FormInstance, Modal, Pagination, Select, Space, Spin, Table } from 'antd';
import { ColumnsType } from 'antd/es/table';
import React, { useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router';
import { useSearchParams } from 'react-router-dom';
import { SearchWidget } from 'src/utils/search-widget';
import { KhoForm } from './kho.form';
import { RightMapRoleFacade } from 'src/store/right-map-role';

interface DataType extends KhoModel {
  key: string;
}

const Page: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = searchParams.get('page');
  const size = searchParams.get('size');
  const filter = searchParams.get('filter');
  const sort = searchParams.get('sort');
  const formRef = useRef<FormInstance | undefined>(undefined);
  const khoFacade = KhoFacade();
  let currentFilter: T_KhoFilterFields;
  const codeTypeFacade = CodeTypeManagementFacade();
  const rightMapRoleFacade = RightMapRoleFacade();

  useEffect(() => {
    khoFacade.get({});
    if (searchParams.has('id')) {
      khoFacade.set({ isVisible: true, isEdit: true });
      setSearchParams(
        (prev) => {
          prev.set('id', searchParams.get('id') ?? '');
          return prev;
        },
        { replace: true },
      );
    }
    rightMapRoleFacade.getRightMapByCode('KHO');
  }, []);

  useEffect(() => {
    if (khoFacade.isVisible && searchParams.has('id')) {
      khoFacade.getById({ id: searchParams.get('id') ?? '', keyState: '' });
    }
  }, [khoFacade.isVisible]);

  useEffect(() => {
    switch (khoFacade.status) {
      case EStatusState.postFulfilled:
      case EStatusState.putFulfilled:
      case EStatusState.deleteFulfilled:
      case EStatusKho.deleteManyFulfilled:
        khoFacade.set({ selectedRowKeys: [] });
        khoFacade.get({ filter: filter ?? '{}' });
        khoFacade.set({ isVisible: false });
        break;
    }
  }, [khoFacade.status]);

  const datasource: DataType[] =
    khoFacade.pagination?.content.map((items, index) => ({
      ...items,
      stt: (Number(khoFacade.pagination?.page ?? 0) - 1) * Number(khoFacade.pagination?.size ?? 0) + index + 1,
      index: index + 1,
      id: items.id ?? '',
      key: uuidv4(),
      ghiChu: items.ghiChu ? items.ghiChu : '-',
      diaChi: items.diaChi ? items.diaChi : '-',
      binh: items.binh ?? '-',
      voBinh: items.voBinh ?? '-',
      gasDu: items.gasDu ?? '-',
    })) ?? [];
  const handleEdit = (data: KhoModel) => {
    khoFacade.set({
      isVisible: true,
      data: data,
      isEdit: true,
    });
    setSearchParams(
      (prev) => {
        if (!prev.has('id')) prev.append('id', data.id ?? '');
        else prev.set('id', data.id ?? '');
        return prev;
      },
      { replace: true },
    );
  };
  const onChangeSearch = (value: string) => {
    let filterObj = JSON.parse(filter!);
    const query: QueryParams = {
      page: 1,
      size: 20,
      filter: JSON.stringify({ ...filterObj, fullTextSearch: value }),
    };
    onChangeDataTable({ query });
  };
  const handleDelete = (id: string) => {
    Modal.confirm({
      title: 'Xoá kho?',
      content: 'Mọi dữ liệu về kho này sẽ bị xoá vĩnh viễn. Bạn có chắc chắn muốn xoá kho này ?',
      onOk: () => {
        khoFacade.delete(id);
      },
      onCancel: () => {},
      cancelText: 'Huỷ bỏ',
      okText: 'Xác nhận',
    });
  };
  const handleRemoveSelected = () => {
    Modal.confirm({
      title: 'Xóa tất cả kho vừa chọn',
      content: 'Mọi dữ liệu về những kho này sẽ bị xóa vĩnh viễn. Bạn có chắc muốn xóa những kho này?',
      onOk: () => {
        khoFacade.deleteMany(khoFacade.selectedRowKeys ?? []);
      },
      onCancel: () => {},
      cancelText: 'Hủy bỏ',
      okText: 'Xác nhận',
    });
  };
  const onChangeDataTable = (props: { query?: QueryParams; setKeyState?: object }) => {
    if (!props.query) {
      props.query = {
        page: Number(page),
        size: Number(size),
        filter: filter ?? '',
        sort: sort ?? '',
      };
    }
    const fillQuery: QueryParams = { ...khoFacade.query, ...props.query };
    for (const key in fillQuery) {
      if (!fillQuery[key as keyof QueryParams]) delete fillQuery[key as keyof QueryParams];
    }
    khoFacade.get(fillQuery);
    navigate(
      { search: new URLSearchParams(fillQuery as unknown as Record<string, string>).toString() },
      { replace: true },
    );
    khoFacade.set({ query: props.query, ...props.setKeyState });
  };

  const onChangeFilter = (value: any, key: string) => {
    if (searchParams.get('filter')) {
      currentFilter = JSON.parse(searchParams.get('filter') || '');
      if (key == 'loaiKho') currentFilter.loaiKho = value;
      else {
        currentFilter.loaiKho = value;
      }
      const query: QueryParams = {
        page: 1,
        size: 20,
        filter: JSON.stringify(currentFilter),
      };
      onChangeDataTable({ query });
    } else {
      const query: QueryParams = {
        page: 1,
        size: 20,
        filter: JSON.stringify(key == 'loaiKho' ? { loaiKho: value } : { loaiKho: value }),
      };
      onChangeDataTable({ query });
    }
  };
  const rowSelection = {
    onChange: (selectedRowKeys: string[]) => {
      khoFacade.set({ selectedRowKeys });
    },
    getCheckboxProps: (record: any) => ({
      title: record.name,
    }),
    columnWidth: 30,
  };

  const column: ColumnsType<DataType> = [
    {
      title: 'STT',
      dataIndex: 'stt',
      key: 'stt',
      align: 'center',
      width: 60,
    },
    {
      title: 'Mã kho',
      dataIndex: 'ma',
      key: 'ma',
      width: 150,
    },
    {
      title: 'Tên kho',
      dataIndex: 'ten',
      key: 'ten',
    },
    {
      title: 'Loại kho',
      dataIndex: 'loaiKho',
      key: 'loaiKho',
      width: 150,
      render: (item) => <p>{codeTypeFacade.pagination?.content.find((x) => x.code == item)?.title}</p>,
    },
    {
      title: 'Địa chỉ',
      dataIndex: 'diaChiFull',
      key: 'diaChiFull',
    },
    {
      title: 'Ghi chú',
      dataIndex: 'ghiChu',
      key: 'ghiChu',
      width: 250,
    },
    {
      title: 'Trạng thái khởi tạo',
      dataIndex: 'isInitialized',
      key: 'isInitialized',
      width: 250,
      render: (_, record: any) => (
        <>
          {record.isInitialized ? (
            <Badge status="success" text="Đã khởi tạo" />
          ) : (
            <Badge status="default" text="Chưa khởi tạo" />
          )}
        </>
      ),
    },
    {
      title: 'Thao tác',
      dataIndex: 'action',
      key: 'Action',
      fixed: 'right',
      align: 'center',
      width: 200,
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
            onClick={() => handleDelete(record.id || '')}
          >
            Xóa
          </Button>
        </Space>
      ),
    },
  ];

  const tool = (
    <Space>
      <SearchWidget form={(form) => (formRef.current = form)} callback={onChangeSearch} />
      <Select
        placeholder={'Chọn loại kho'}
        optionLabelProp={'label'}
        showSearch
        options={codeTypeFacade.pagination?.content.map((item) => {
          return { label: item.title, value: item.code };
        })}
        allowClear
        onChange={(value) => {
          onChangeFilter(value, 'loaiKho');
        }}
        style={{ width: 200 }}
        defaultValue={searchParams.get('filter') ? JSON.parse(searchParams.get('filter') || '')?.loaiKho : null}
      />
      <Button
        icon={<ReloadOutlined />}
        loading={khoFacade.isLoading}
        onClick={() => khoFacade.get({ filter: filter ?? '{}' })}
      >
        Tải lại
      </Button>
      <Button
        hidden={!rightMapRoleFacade.rightData?.isDeleteAllowed}
        danger
        icon={<DeleteOutlined />}
        onClick={handleRemoveSelected}
        disabled={!khoFacade.selectedRowKeys?.length}
      >
        Xóa ({khoFacade.selectedRowKeys?.length ?? 0})
      </Button>
      <Button
        hidden={!rightMapRoleFacade.rightData?.isCreateAllowed}
        type={'primary'}
        icon={<PlusOutlined />}
        onClick={() => khoFacade.set({ isVisible: true, data: undefined, isEdit: false })}
      >
        Thêm mới kho
      </Button>
    </Space>
  );
  return (
    <>
      <SubHeader tool={tool} isVisible={false} />
      <KhoForm />
      <Spin spinning={khoFacade.isLoading}>
        <div className={'p-3'}>
          <Table
            size={'small'}
            dataSource={datasource}
            columns={column}
            pagination={false}
            rowSelection={rowSelection as any}
            rowKey={'id'}
            scroll={{ x: 'max-content', y: 'calc(100vh - 250px)' }}
          />
          <Pagination
            className={'flex justify-end mt-2 py-1'}
            showSizeChanger
            showTitle={false}
            current={khoFacade?.pagination?.page}
            pageSize={khoFacade?.pagination?.size}
            total={khoFacade?.pagination?.totalElements}
            pageSizeOptions={[20, 40, 60, 80]}
            showTotal={(total, range) => `${range[0]}-${range[1]} of ${total} items`}
            onChange={(page, pageSize) => onChangeDataTable({ query: { page: page, size: pageSize } })}
          />
        </div>
      </Spin>
    </>
  );
};

export default Page;
