import { SubHeader } from '@layouts/admin';
import { EStatusState, QueryParams } from '@models';
import {
  EStatusProductConfiguration,
  ProductConfigurationFacade,
  ProductConfigurationModel,
  RightMapRoleFacade,
} from '@store';
import { Button, FormInstance, Pagination, Space, Spin, Table } from 'antd';
import { ColumnsType } from 'antd/es/table';
import React, { useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router';
import { useSearchParams } from 'react-router-dom';
import { customModal } from 'src';
import { SearchWidget } from 'src/utils/search-widget';
import { EditOutlined, DeleteOutlined, ReloadOutlined, PlusOutlined } from '@ant-design/icons';
import { TableRowSelection } from 'antd/es/table/interface';
import { ProductConfigurationForm } from './product-configuration.form';

interface DataType extends ProductConfigurationModel {
  key: string;
}

const pageSizeOption = [20, 40, 60, 80];

const Page: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const page = searchParams.get('page');
  const size = searchParams.get('size');
  const filter = searchParams.get('filter');
  const sort = searchParams.get('sort');
  const formRef = useRef<FormInstance | undefined>(undefined);
  const productConfigurationFacade = ProductConfigurationFacade();
  const rightMapRoleFacade = RightMapRoleFacade();
  const datasource: DataType[] = useMemo(
    () =>
      productConfigurationFacade.pagination?.content.map((item) => ({
        ...item,
        key: item.id,
      })) ?? [],
    [productConfigurationFacade.pagination],
  );
  const column: ColumnsType<DataType> = useMemo(
    () => [
      {
        title: 'Mã cấu hình',
        dataIndex: 'code',
        key: 'code',
        // width: 200,
      },
      {
        title: 'Bình',
        dataIndex: 'productName',
        key: 'productId',
        // width: 200,
      },
      {
        title: 'Vỏ bình',
        dataIndex: 'gasTankName',
        key: 'gasTankId',
        // width: 200,
      },
      {
        title: 'Gas dư',
        dataIndex: 'residualGasName',
        key: 'residualGasId',
        // width: 200,
      },
      {
        title: 'Ghi chú',
        dataIndex: 'note',
        key: 'note',
        // width: 200,
      },
      {
        title: 'Thao tác',
        dataIndex: 'action',
        key: 'Action',
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
              onClick={() => handleDelete(record.id)}
            >
              Xóa
            </Button>
          </Space>
        ),
      },
    ],
    [rightMapRoleFacade.rightData],
  );
  const rowSelection: TableRowSelection<DataType> = {
    onChange: (selectedRowKeys) => {
      productConfigurationFacade.set({ selectedRowKeys: selectedRowKeys as string[] });
    },
    getCheckboxProps: (record: any) => ({
      title: record.name,
    }),
    columnWidth: 30,
  };
  const tool = useMemo(
    () => (
      <Space>
        <SearchWidget
          placeholder="Tìm theo mã, tên sản phẩm"
          form={(form) => (formRef.current = form)}
          callback={onChangeSearch}
        />
        <Button
          icon={<ReloadOutlined />}
          loading={productConfigurationFacade.isLoading}
          onClick={() => productConfigurationFacade.get({ filter: filter ?? '{}' })}
        >
          Tải lại
        </Button>
        <Button
          hidden={!rightMapRoleFacade.rightData?.isDeleteAllowed}
          danger
          icon={<DeleteOutlined />}
          onClick={handleRemoveSelected}
          disabled={!productConfigurationFacade.selectedRowKeys?.length}
        >
          Xóa ({productConfigurationFacade.selectedRowKeys?.length ?? 0})
        </Button>
        <Button
          hidden={!rightMapRoleFacade.rightData?.isCreateAllowed}
          type={'primary'}
          icon={<PlusOutlined />}
          onClick={() => productConfigurationFacade.set({ isVisible: true, data: undefined, isEdit: false })}
        >
          Thêm mới cấu hình
        </Button>
      </Space>
    ),
    [productConfigurationFacade.selectedRowKeys, productConfigurationFacade.isLoading, rightMapRoleFacade.rightData],
  );

  useEffect(() => {
    rightMapRoleFacade.getRightMapByCode('SANPHAM');
    productConfigurationFacade.get({ size: pageSizeOption[0] });

    return () => {
      productConfigurationFacade.set({
        selectedRowKeys: [],
      });
    };
  }, []);

  useEffect(() => {
    switch (productConfigurationFacade.status) {
      case EStatusState.postFulfilled:
      case EStatusState.putFulfilled:
      case EStatusState.deleteFulfilled:
      case EStatusProductConfiguration.deleteManyFulfilled:
        productConfigurationFacade.set({ selectedRowKeys: [] });
        productConfigurationFacade.get({ filter: filter ?? '{}' });
        productConfigurationFacade.set({ isVisible: false });
        break;
    }
  }, [productConfigurationFacade.status]);

  function handleEdit(data: ProductConfigurationModel) {
    productConfigurationFacade.set({
      isVisible: true,
      data: data,
      isEdit: true,
    });
  }

  function onChangeSearch(value: string) {
    const filterObj = JSON.parse(filter!);
    const query: QueryParams = {
      page: 1,
      size: 20,
      filter: JSON.stringify({ ...filterObj, fullTextSearch: value }),
    };
    onChangeDataTable({ query });
  }

  function handleDelete(id: string) {
    customModal.confirm({
      title: 'Xoá cấu hình sản phẩm?',
      content: 'Mọi dữ liệu về cấu hình này sẽ bị xoá vĩnh viễn. Bạn có chắc chắn muốn xoá cấu hình này ?',
      onOk: () => {
        productConfigurationFacade.delete(id);
      },
      onCancel: () => {},
      cancelText: 'Huỷ bỏ',
      okText: 'Xác nhận',
    });
  }
  function handleRemoveSelected() {
    customModal.confirm({
      title: 'Xóa tất cả cấu hình sản phẩm vừa chọn',
      content: 'Mọi dữ liệu về những cấu hình này sẽ bị xóa vĩnh viễn. Bạn có chắc muốn xóa những cấu hình này?',
      onOk: () => {
        productConfigurationFacade.deleteMany(productConfigurationFacade.selectedRowKeys ?? []);
      },
      onCancel: () => {},
      cancelText: 'Hủy bỏ',
      okText: 'Xác nhận',
    });
  }

  function onChangeDataTable(props: { query?: QueryParams; setKeyState?: object }) {
    if (!props.query) {
      props.query = {
        page: Number(page),
        size: Number(size),
        filter: filter ?? '',
        sort: sort ?? '',
      };
    }
    const fillQuery: QueryParams = { ...productConfigurationFacade.query, ...props.query };
    for (const key in fillQuery) {
      if (!fillQuery[key as keyof QueryParams]) delete fillQuery[key as keyof QueryParams];
    }
    productConfigurationFacade.get(fillQuery);
    navigate(
      { search: new URLSearchParams(fillQuery as unknown as Record<string, string>).toString() },
      { replace: true },
    );
    productConfigurationFacade.set({ query: props.query, ...props.setKeyState });
  }

  return (
    <>
      <SubHeader tool={tool} isVisible={false} />
      <Spin spinning={productConfigurationFacade.isLoading}>
        <div className={'p-3'}>
          <Table
            dataSource={datasource}
            columns={column}
            pagination={false}
            rowSelection={rowSelection}
            rowKey={'id'}
            scroll={{ y: 'calc(100vh - 290px)', x: '300px' }}
          />
          <Pagination
            className={'flex justify-end py-1'}
            showSizeChanger
            showTitle={false}
            current={productConfigurationFacade?.pagination?.page}
            pageSize={productConfigurationFacade?.pagination?.size}
            total={productConfigurationFacade?.pagination?.totalElements}
            pageSizeOptions={[20, 40, 60, 80]}
            showTotal={(total, range) => `${range[0]}-${range[1]} of ${total} items`}
            onChange={(page, pageSize) => onChangeDataTable({ query: { page: page, size: pageSize } })}
          />
        </div>
      </Spin>
      <ProductConfigurationForm />
    </>
  );
};

export default Page;
