import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { DrawerForm } from '@core/drawer';
import { SubHeader } from '@layouts/admin';
import { EFormRuleType, EFormType, EStatusState, QueryParams } from '@models';
import { ChiPhiVanChuyenFacade, ChiPhiVanChuyenModel, EStatusChiPhiVanChuyen, KhoFacade } from '@store';
import { scrollLeftWhenChanging, uuidv4 } from '@utils';
import { Button, FormInstance, Modal, Pagination, Select, Space, Spin, Table } from 'antd';
import { ColumnsType } from 'antd/es/table';
import React, { useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router';
import { useSearchParams } from 'react-router-dom';
import { RightMapRoleFacade } from 'src/store/right-map-role';
import { SearchWidget } from 'src/utils/search-widget';

interface DataType extends ChiPhiVanChuyenModel {
  key: string;
}

const Page: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const page = searchParams.get('page');
  const size = searchParams.get('size');
  const filter = searchParams.get('filter');
  const sort = searchParams.get('sort');
  const formRef = useRef<FormInstance | undefined>(undefined);
  const chiPhiVanChuyenFacade = ChiPhiVanChuyenFacade();
  const khoFacade = KhoFacade();
  const rightMapRoleFacade = RightMapRoleFacade();

  useEffect(() => {
    chiPhiVanChuyenFacade.get({});
    khoFacade.get({ size: -1 });
    rightMapRoleFacade.getRightMapByCode('CUOCVANCHUYEN');
  }, []);

  useEffect(() => {
    switch (chiPhiVanChuyenFacade.status) {
      case EStatusState.postFulfilled:
      case EStatusState.putFulfilled:
      case EStatusState.deleteFulfilled:
      case EStatusChiPhiVanChuyen.deleteManyFulfilled:
        chiPhiVanChuyenFacade.set({ selectedRowKeys: [] });
        chiPhiVanChuyenFacade.get({ filter: filter ?? '{}' });
        chiPhiVanChuyenFacade.set({ isVisible: false });
        break;
    }
  }, [chiPhiVanChuyenFacade.status]);

  const datasource: DataType[] =
    chiPhiVanChuyenFacade.pagination?.content.map((items, index) => ({
      ...items,
      stt:
        (Number(chiPhiVanChuyenFacade.pagination?.page ?? 0) - 1) *
          Number(chiPhiVanChuyenFacade.pagination?.size ?? 0) +
        index +
        1,
      index: index + 1,
      id: items.id ?? '',
      key: uuidv4(),
      ghiChu: items.ghiChu ? items.ghiChu : '-',
    })) ?? [];
  const handleEdit = (data: ChiPhiVanChuyenModel) => {
    chiPhiVanChuyenFacade.set({
      isVisible: true,
      data: data,
      isEdit: true,
    });
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
      title: 'Xoá chi phí vận chuyển?',
      content:
        'Mọi dữ liệu về chi phí vận chuyển này sẽ bị xoá vĩnh viễn. Bạn có chắc chắn muốn xoá chi phí vận chuyển này ?',
      onOk: () => {
        chiPhiVanChuyenFacade.delete(id);
      },
      onCancel: () => {},
      cancelText: 'Huỷ bỏ',
      okText: 'Xác nhận',
    });
  };

  const handleRemoveSelected = () => {
    Modal.confirm({
      title: 'Xóa tất cả chi phí vận chuyển vừa chọn',
      content:
        'Mọi dữ liệu về những chi phí vận chuyển này sẽ bị xóa vĩnh viễn. Bạn có chắc muốn xóa những chi phí vận chuyển này?',
      onOk: () => {
        chiPhiVanChuyenFacade.deleteMany(chiPhiVanChuyenFacade.selectedRowKeys ?? []);
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
    const fillQuery: QueryParams = { ...chiPhiVanChuyenFacade.query, ...props.query };
    for (const key in fillQuery) {
      if (!fillQuery[key as keyof QueryParams]) delete fillQuery[key as keyof QueryParams];
    }
    chiPhiVanChuyenFacade.get(fillQuery);
    navigate(
      { search: new URLSearchParams(fillQuery as unknown as Record<string, string>).toString() },
      { replace: true },
    );
    chiPhiVanChuyenFacade.set({ query: props.query, ...props.setKeyState });
  };
  const rowSelection = {
    onChange: (selectedRowKeys: string[]) => {
      chiPhiVanChuyenFacade.set({ selectedRowKeys });
    },
    getCheckboxProps: (record: any) => ({
      title: record.name,
    }),
    columnWidth: 30,
  };

  const column: ColumnsType<DataType> = [
    {
      title: 'ID',
      dataIndex: 'ma',
      key: 'ma',
      width: 100,
    },
    {
      title: 'Tên',
      dataIndex: 'ten',
      key: 'ten',
      width: 180,
    },
    {
      title: 'Kho đi',
      dataIndex: 'khoDi',
      key: 'khoDi',
      width: 180,
    },
    {
      title: 'Kho nhận',
      dataIndex: 'khoNhan',
      key: 'khoNhan',
      width: 180,
    },
    {
      title: 'Giá cước (vnd/kg)',
      dataIndex: 'chiPhi',
      key: 'chiPhi',
      width: 150,
      align: 'right',
    },
    {
      title: 'Khoảng cách (km)',
      dataIndex: 'khoangCach',
      key: 'khoangCach',
      width: 150,
      align: 'right',
    },
    {
      title: 'Thao tác',
      dataIndex: 'action',
      key: 'Action',
      fixed: 'right',
      align: 'center',
      width: 180,
      render: (_, record: any) => (
        <Space>
          <Button hidden={!rightMapRoleFacade.rightData?.isUpdateAllowed} onClick={() => handleEdit(record)} type={'primary'} icon={<EditOutlined />}>
            Sửa
          </Button>
          <Button hidden={!rightMapRoleFacade.rightData?.isDeleteAllowed} icon={<DeleteOutlined />} danger onClick={() => handleDelete(record.id || '')}>
            Xóa
          </Button>
        </Space>
      ),
    },
  ];

  const tool = (
    <Space>
      <SearchWidget form={(form) => (formRef.current = form)} callback={onChangeSearch} />
      <Button
        icon={<ReloadOutlined />}
        loading={chiPhiVanChuyenFacade.isLoading}
        onClick={() => chiPhiVanChuyenFacade.get({ filter: filter ?? '{}' })}
      >
        Tải lại
      </Button>
      <Button
      hidden={!rightMapRoleFacade.rightData?.isDeleteAllowed}
        danger
        icon={<DeleteOutlined />}
        onClick={handleRemoveSelected}
        disabled={!chiPhiVanChuyenFacade.selectedRowKeys?.length}
      >
        Xóa ({chiPhiVanChuyenFacade.selectedRowKeys?.length ?? 0})
      </Button>
      <Button
      hidden={!rightMapRoleFacade.rightData?.isCreateAllowed}
        type={'primary'}
        icon={<PlusOutlined />}
        onClick={() => chiPhiVanChuyenFacade.set({ isVisible: true, data: undefined, isEdit: false })}
      >
        Thêm mới chi phí vận chuyển
      </Button>
    </Space>
  );
  return (
    <>
      <SubHeader tool={tool} isVisible={false}/>
      <Spin spinning={chiPhiVanChuyenFacade.isLoading}>
        <div className={'p-3'}>
          <Table
            dataSource={datasource}
            columns={column}
            pagination={false}
            rowSelection={rowSelection as any}
            rowKey={'id'}
            scroll={{ y: 'calc(100vh - 290px)', x: 'max-content' }}
          />
          <Pagination
            className={'flex justify-end py-3'}
            showSizeChanger
            showTitle={false}
            current={chiPhiVanChuyenFacade?.pagination?.page}
            pageSize={chiPhiVanChuyenFacade?.pagination?.size}
            total={chiPhiVanChuyenFacade?.pagination?.totalElements}
            pageSizeOptions={[20, 40, 60, 80]}
            showTotal={(total, range) => `${range[0]}-${range[1]} of ${total} items`}
            onChange={(page, pageSize) => onChangeDataTable({ query: { page: page, size: pageSize } })}
          />
        </div>
      </Spin>
      <DrawerForm
        facade={chiPhiVanChuyenFacade}
        title={`${chiPhiVanChuyenFacade.isEdit ? 'Chỉnh sửa' : 'Thêm mới'} chi phí vận chuyển`}
        columns={[
          {
            title: 'ID',
            name: 'ma',
            formItem: {
              rules: [{ type: EFormRuleType.required }],
            },
          },
          {
            title: 'Tên',
            name: 'ten',
            formItem: {
              rules: [{ type: EFormRuleType.required }],
            },
          },
          {
            title: 'Kho đi',
            name: 'khoDiId',
            formItem: {
              type: EFormType.select,
              list: khoFacade.pagination?.content.map((item) => {
                return { label: item.ten, value: item.id };
              }),
              rules: [
                { type: EFormRuleType.required },
                {
                  type: EFormRuleType.custom,
                  validator: ({ getFieldValue }) => ({
                    validator(rule, value: string) {
                      if (!value || getFieldValue('khoNhanId') != value) {
                        return Promise.resolve();
                      }
                      return Promise.reject('Kho đi và kho nhận đã trùng nhau');
                    },
                  }),
                },
              ],
            },
          },
          {
            title: 'Kho nhận',
            name: 'khoNhanId',
            formItem: {
              type: EFormType.select,
              list: khoFacade.pagination?.content.map((item) => {
                return { label: item.ten, value: item.id };
              }),
              rules: [
                { type: EFormRuleType.required },
                {
                  type: EFormRuleType.custom,
                  validator: ({ getFieldValue }) => ({
                    validator(rule, value: string) {
                      if (!value || getFieldValue('khoDiId') != value) {
                        return Promise.resolve();
                      }
                      return Promise.reject('Kho đi và kho nhận đã trùng nhau');
                    },
                  }),
                },
              ],
            },
          },
          {
            title: 'Giá cước',
            name: 'chiPhi',
            formItem: {
              type: EFormType.number,
              rules: [{ type: EFormRuleType.required }],
            },
          },
          {
            title: 'Khoảng cách',
            name: 'khoangCach',
            formItem: {
              type: EFormType.number,
            },
          },
          {
            title: 'Ghi chú',
            name: 'ghiChu',
            formItem: {
              type: EFormType.textarea,
            },
          },
        ]}
        onSubmit={(values: ChiPhiVanChuyenModel) => {
          if (chiPhiVanChuyenFacade?.data?.id)
            chiPhiVanChuyenFacade.put({ ...values, id: chiPhiVanChuyenFacade.data.id });
          else chiPhiVanChuyenFacade.post(values);
        }}
      />
    </>
  );
};

export default Page;
