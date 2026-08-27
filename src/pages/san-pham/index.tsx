import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { DrawerForm } from '@core/drawer';
import { SubHeader } from '@layouts/admin';
import { EFormRuleType, EFormType, EStatusState, QueryParams } from '@models';
import { productTypes, uuidv4 } from '@utils';
import { Badge, Button, FormInstance, Modal, Pagination, Select, SelectProps, Space, Spin, Table, Tag } from 'antd';
import { ColumnsType } from 'antd/es/table';
import React, { useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router';
import { useSearchParams } from 'react-router-dom';
import { RightMapRoleFacade } from 'src/store/right-map-role';
import { EStatusSanPham, SanPhamFacade, SanPhamModel } from 'src/store/san-pham';
import { SearchWidget } from 'src/utils/search-widget';

interface DataType extends SanPhamModel {
  key: string;
}

const productTypeOptions = Object.values(productTypes).map(x => ({
  label: x.name,
  value: x.code
}))

const Page: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const page = searchParams.get('page');
  const size = searchParams.get('size');
  const filter = searchParams.get('filter');
  const sort = searchParams.get('sort');
  const formRef = useRef<FormInstance | undefined>(undefined);
  const sanPhamFacade = SanPhamFacade();
  const rightMapRoleFacade = RightMapRoleFacade();

  useEffect(() => {
    rightMapRoleFacade.getRightMapByCode('SANPHAM');
    sanPhamFacade.get({});
  }, []);
  useEffect(() => {
    switch (sanPhamFacade.status) {
      case EStatusState.postFulfilled:
      case EStatusState.putFulfilled:
      case EStatusState.deleteFulfilled:
      case EStatusSanPham.deleteManyFulfilled:
        sanPhamFacade.set({ selectedRowKeys: [] });
        sanPhamFacade.get({ filter: filter ?? '{}' });
        sanPhamFacade.set({ isVisible: false });
        break;
    }
  }, [sanPhamFacade.status]);

  const datasource: DataType[] =
    sanPhamFacade.pagination?.content.map((items, index) => ({
      stt: (Number(sanPhamFacade.pagination?.page ?? 0) - 1) * Number(sanPhamFacade.pagination?.size ?? 0) + index + 1,
      index: index + 1,
      id: items.id ?? '',
      key: uuidv4(),
      maSanPham: items.maSanPham ? items.maSanPham : '-',
      tenSanPham: items.tenSanPham ? items.tenSanPham : '-',
      donViTinh: items.donViTinh ? items.donViTinh : '-',
      donGia: items.donGia,
      trongLuong: items.trongLuong,
      isOrder: items.isOrder
    })) ?? [];
  const handleEdit = (data: SanPhamModel) => {
    sanPhamFacade.set({
      isVisible: true,
      data: data,
      isEdit: true,
    });
  };
  const onChangeSearch = (value: string) => {
    const filterObj = JSON.parse(filter!);
    const query: QueryParams = {
      page: 1,
      size: 20,
      filter: JSON.stringify({ ...filterObj, fullTextSearch: value }),
    };
    onChangeDataTable({ query });
  };
  const handleDelete = (id: string) => {
    Modal.confirm({
      title: 'Xoá sản phẩm?',
      content: 'Mọi dữ liệu về sản phẩm này sẽ bị xoá vĩnh viễn. Bạn có chắc chắn muốn xoá sản phẩm này ?',
      onOk: () => {
        sanPhamFacade.delete(id);
      },
      onCancel: () => {},
      cancelText: 'Huỷ bỏ',
      okText: 'Xác nhận',
    });
  };
  const handleRemoveSelected = () => {
    Modal.confirm({
      title: 'Xóa tất cả sản phẩm vừa chọn',
      content: 'Mọi dữ liệu về những sản phẩm này sẽ bị xóa vĩnh viễn. Bạn có chắc muốn xóa những sản phẩm này?',
      onOk: () => {
        sanPhamFacade.deleteMany(sanPhamFacade.selectedRowKeys ?? []);
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
    const fillQuery: QueryParams = { ...sanPhamFacade.query, ...props.query };
    for (const key in fillQuery) {
      if (!fillQuery[key as keyof QueryParams]) delete fillQuery[key as keyof QueryParams];
    }
    sanPhamFacade.get(fillQuery);
    navigate(
      { search: new URLSearchParams(fillQuery as unknown as Record<string, string>).toString() },
      { replace: true },
    );
    sanPhamFacade.set({ query: props.query, ...props.setKeyState });
  };
  const rowSelection = {
    onChange: (selectedRowKeys: string[]) => {
      sanPhamFacade.set({ selectedRowKeys });
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
      title: 'Mã sản phẩm',
      dataIndex: 'maSanPham',
      key: 'maSanPham',
      width: 200,
    },
    {
      title: 'Tên sản phẩm',
      dataIndex: 'tenSanPham',
      key: 'tenSanPham',
      width: 200,
    },
    {
      title: 'Đơn vị tính',
      dataIndex: 'donViTinh',
      key: 'donViTinh',
      width: 150,
    },
    {
      title: 'Trọng Lượng (kg)',
      dataIndex: 'trongLuong',
      key: 'trongLuong',
      width: 160,
      align: 'right',
    },
    {
      title: 'Cho phép đặt hàng',
      dataIndex: 'isOrder',
      key: 'trongLuong',
      width: 220,
      align: 'center',
      render: (value: boolean) =>  <><Badge status={value ? "success" : "error"} className={'px-1'} /> {value ? "Cho phép " : "Chưa cho phép "}</>
    },
    {
      title: 'Thao tác',
      dataIndex: 'action',
      key: 'Action',
      align: 'center',
      width: 200,
      render: (_, record: any) => (
        <Space>
          <Button hidden={!rightMapRoleFacade.rightData?.isUpdateAllowed} onClick={() => handleEdit(record)} type={'primary'} icon={<EditOutlined />}>
            Sửa
          </Button>
          <Button hidden={!rightMapRoleFacade.rightData?.isDeleteAllowed} icon={<DeleteOutlined />} danger onClick={() => handleDelete(record.id)}>
            Xóa
          </Button>
        </Space>
      ),
    },
  ];


  const tagUserRender: SelectProps['tagRender'] = (props) => {
    const { label, closable, onClose } = props;
    const onPreventMouseDown = (event: React.MouseEvent<HTMLSpanElement>) => {
      event.preventDefault();
      event.stopPropagation();
    };

    return (
      <Tag
        className='w-20 truncate'
        onMouseDown={onPreventMouseDown}
        closable={closable}
        onClose={onClose}
        style={{ marginInlineEnd: 4 }}
      >
        {label}
      </Tag>
    );
  };

  const onTypeFilterChange = (value: typeof productTypes[keyof typeof productTypes]['code']) => {
    const filterObj = JSON.parse(filter!);
    const query: QueryParams = {
      page: 1,
      size: 20,
      filter: JSON.stringify({ ...filterObj, type: value }),
    };
    onChangeDataTable({ query });
  }

  const tool = (
    <Space>
      <Select
        showSearch
        allowClear
        className='max-w-full min-w-40'
        // mode='tags'
        // tagRender={tagUserRender}
        placeholder='Lọc theo loại'
        optionFilterProp='label'
        options={productTypeOptions}
        onChange={onTypeFilterChange}
      />
      <SearchWidget form={(form) => (formRef.current = form)} callback={onChangeSearch} />
      <Button
        icon={<ReloadOutlined />}
        loading={sanPhamFacade.isLoading}
        onClick={() => sanPhamFacade.get({ filter: filter ?? '{}' })}
      >
        Tải lại
      </Button>
      <Button
      hidden={!rightMapRoleFacade.rightData?.isDeleteAllowed}
        danger
        icon={<DeleteOutlined />}
        onClick={handleRemoveSelected}
        disabled={!sanPhamFacade.selectedRowKeys?.length}
      >
        Xóa ({sanPhamFacade.selectedRowKeys?.length ?? 0})
      </Button>
      <Button
      hidden={!rightMapRoleFacade.rightData?.isCreateAllowed}
        type={'primary'}
        icon={<PlusOutlined />}
        onClick={() => sanPhamFacade.set({ isVisible: true, data: undefined, isEdit: false })}
      >
        Thêm mới sản phẩm
      </Button>
    </Space>
  );
  const table = useMemo(
    () => (
      <Table
        size="small"
        scroll={{ y: 'calc(100vh - 265px)' }}
        dataSource={datasource}
        columns={column}
        pagination={false}
      />
    ),
    [sanPhamFacade.isLoading],
  );
  return (
    <>
      <SubHeader tool={tool} isVisible={false} />
      <Spin spinning={sanPhamFacade.isLoading}>
        <div className={'p-3'}>
          <Table
            dataSource={datasource}
            columns={column}
            pagination={false}
            rowSelection={rowSelection as any}
            rowKey={'id'}
            scroll={{ y: 'calc(100vh - 290px)', x: '300px' }}
          />
          <Pagination
            className={'flex justify-end py-1'}
            showSizeChanger
            showTitle={false}
            current={sanPhamFacade?.pagination?.page}
            pageSize={sanPhamFacade?.pagination?.size}
            total={sanPhamFacade?.pagination?.totalElements}
            pageSizeOptions={[20, 40, 60, 80]}
            showTotal={(total, range) => `${range[0]}-${range[1]} of ${total} items`}
            onChange={(page, pageSize) => onChangeDataTable({ query: { page: page, size: pageSize } })}
          />
        </div>
      </Spin>
      <DrawerForm
        facade={sanPhamFacade}
        title={`${sanPhamFacade.isEdit ? 'Chỉnh sửa' : 'Thêm mới'} sản phẩm`}
        columns={[
          {
            title: 'Mã sản phẩm',
            name: 'maSanPham',
            formItem: {
              rules: [{ type: EFormRuleType.required }],
            },
          },
          {
            title: 'Tên sản phẩm',
            name: 'tenSanPham',
            formItem: {
              rules: [{ type: EFormRuleType.required }],
            },
          },
          {
            title: 'Loại sản phẩm',
            name: 'type',
            formItem: {
              type: EFormType.select,
              list: Object.values(productTypes).map((item) => ({
                label: item.name,
                value: item.code,
              })),
              rules: [{ type: EFormRuleType.required }],
            },
          },
          {
            title: 'Đơn vị tính',
            name: 'donViTinh',
            formItem: {
              type: EFormType.text,
            },
          },
          {
            title: 'Trọng Lượng (kg)',
            name: 'trongLuong',
            formItem: {
              type: EFormType.number,
            },
          },
          {
            title: 'Cho phép bán',
            name: 'isOrder',
            formItem: {
              type: EFormType.switch,
            },
          },
        ]}
        onSubmit={(values: SanPhamModel) => {
          if (sanPhamFacade?.data?.id) sanPhamFacade.put({ ...values, id: sanPhamFacade.data.id });
          else sanPhamFacade.post(values);
        }}
      />
    </>
  );
};

export default Page;
