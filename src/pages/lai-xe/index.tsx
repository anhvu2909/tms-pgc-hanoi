import React, { useEffect, useRef } from 'react';
import { SubHeader } from '@layouts/admin';
import { Badge, Button, FormInstance, Modal, Pagination, Space, Spin, Table } from 'antd';
import { PlusOutlined, ReloadOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { EStatusLaiXe, LaiXeFacade, LaiXeModel } from '../../store/quan-ly-lai-xe';
import { uuidv4 } from '@utils';
import { useSearchParams } from 'react-router-dom';
import { ColumnsType } from 'antd/es/table';
import { useNavigate } from 'react-router';
import { SearchWidget } from '../../utils/search-widget';
import { QueryParams } from '@models';
import { LaiXeForm } from '@pages/lai-xe/lai-xe.form';
import { PhuongTienFacade } from '../../store/quan-ly-phuong-tien';
import { LaiXeViewDetails } from '@pages/lai-xe/lai-xe-view.details';
import dayjs from 'dayjs';
import { RightMapRoleFacade } from 'src/store/right-map-role';

interface DataType extends LaiXeModel{
  stt: number
  key?: string
}
let fillQuery: QueryParams;

const LaiXeScreen =  () => {
  const laiXeFacade = LaiXeFacade();
  const phuongTienFacade= PhuongTienFacade();
  const rightMapRoleFacade = RightMapRoleFacade();
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate();
  const formRef = useRef<FormInstance | undefined>(undefined);
  const filter = searchParams.get('filter');
  const page = searchParams.get('page');
  const size = searchParams.get('size');
  const sort = searchParams.get('sort');
  const [modalApi, contextHolder]  = Modal.useModal()

  useEffect(() => {
    laiXeFacade.get({});
    rightMapRoleFacade.getRightMapByCode('TAIXE');
  }, []);

  useEffect(() => {
    if (laiXeFacade.status === EStatusLaiXe.deleteManyFulfilled) {
      laiXeFacade.set({ selectedRowKeys: [] });
      if (filter) {
        laiXeFacade.get({ filter: filter });
      } else laiXeFacade.get({});
    }
  }, [laiXeFacade.status]);

  const onChangeSearch = (value: string) => {
    onChangeDataTable({
      query: {
        page: 1,
        size: 20,
        filter: JSON.stringify({ FullTextSearch: value }),
      },
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

    fillQuery = { ...laiXeFacade.query, ...props.query };
    for (const key in fillQuery) {
      if (!fillQuery[key as keyof QueryParams]) delete fillQuery[key as keyof QueryParams];
    }
    laiXeFacade.get(fillQuery);
    navigate(
      { search: new URLSearchParams(fillQuery as unknown as Record<string, string>).toString() },
      { replace: true },
    );
    laiXeFacade.set({ query: props.query, ...props.setKeyState });
  };

  const handleRemove = (id: string) => {
    modalApi.confirm({
      title: 'Xoá tài xế này ?',
      content: 'Mọi dữ liệu về tài xế này sẽ bị xoá vĩnh viễn. Bạn có chắc muốn xoá tài xế này ?',
      onOk: () => {
        laiXeFacade.delete(id);
        laiXeFacade.set({ isLoading: true });
        setTimeout(() => {
          onChangeDataTable({});
        }, 500);
      },
      onCancel: () => {},
      cancelText: 'Huỷ bỏ',
      okText: 'Xác nhận',
    });
  };

  const handleRemoveSelected = () => {
    modalApi.confirm({
      title: 'Xóa tất cả tài xế vừa chọn',
      content: 'Mọi dữ liệu về những tài xế này sẽ bị xóa vĩnh viễn. Bạn có chắc muốn xóa những tài xế này?',
      onOk: () => {
        laiXeFacade.deleteMany(laiXeFacade.selectedRowKeys ?? []);
      },
      onCancel: () => {
      },
      cancelText: 'Hủy bỏ',
      okText: 'Xác nhận',
    });
  };

  const tool = (
    <Space>
      <SearchWidget form={(form) => (formRef.current = form)} callback={onChangeSearch} />
      <Button
        icon={<ReloadOutlined/>}
        loading={laiXeFacade.isLoading}
        onClick={() => {
          if (filter) {
            laiXeFacade.get({ filter: filter });
          }
          laiXeFacade.get({});
        }}
      >
        Tải lại
      </Button>
      <Button
        hidden={!rightMapRoleFacade.rightData?.isDeleteAllowed}
        danger
        icon={<DeleteOutlined />}
        onClick={handleRemoveSelected}
        disabled={!laiXeFacade.selectedRowKeys?.length}
      >
        Xóa ({laiXeFacade.selectedRowKeys?.length ?? 0})
      </Button>
      <Button hidden={!rightMapRoleFacade.rightData?.isCreateAllowed} type={'primary'} icon={<PlusOutlined/>} onClick={() => {
        phuongTienFacade.get({filter: JSON.stringify({"isKhongTaiXe": true})})
        laiXeFacade.set({ isVisible: true, data: undefined, isEdit: false })
      }}>
        Thêm mới tài xế
      </Button>
    </Space>
  )
  const handleEdit = (data: LaiXeModel) =>{
    if (data.id) {
      setSearchParams(
        (prev) => {
          if (!prev.has('id')) prev.append('id', data.id );
          else prev.set('id', data.id);
          return prev;
        },
        { replace: true },
      );
      phuongTienFacade.get({filter: JSON.stringify({"isKhongTaiXe": true, "idTaiXe": data.idPhuongTien})})
      laiXeFacade.set({ isEdit: true, isVisible: true, data: data, isFormLoading: true });
    }
  }

  const rowSelection = {
    onChange: (selectedRowKeys: string[]) => {
      laiXeFacade.set({ selectedRowKeys });
    },
    getCheckboxProps: (record: any) => ({
      title: record.name,
    }),
    columnWidth: 30,
  };


  const dataSource: DataType[] = laiXeFacade.pagination?.content.map((items, index) => ({
    key: uuidv4(),
    id: items.id,
    idPhuongTien: items.idPhuongTien,
    stt: (Number(searchParams.get('page') ?? 0) - 1) * Number(searchParams.get('size') ?? 0) + index + 1,
    ngaySinh: items.ngaySinh ? dayjs(items.ngaySinh).format('DD/MM/YYYY') : '-',
    tenTaiXe: items.tenTaiXe ?? '-',
    maTaiXe: items.maTaiXe ?? '-',
    cccd: items.cccd ?? '-',
    gplx: items.gplx ?? '-',
    phuongTien: items.phuongTien ?? '-',
    active: items.active

  })) ?? []

  const columns: ColumnsType<DataType> = [
    {
      width: 160,
      title: 'Mã tài xế',
      dataIndex:'maTaiXe',
      key: 'maTaiXe',
      onCell: (record) => ({
        className: record?.id && record?.id === laiXeFacade.data?.id ? '!bg-[#e6f4ff]' : '',
      }),
    },
    {
      width: 160,
      title: 'Tên tài xế',
      dataIndex:'tenTaiXe',
      key: 'tenTaiXe',
      onCell: (record) => ({
        className: record?.id && record?.id === laiXeFacade.data?.id ? '!bg-[#e6f4ff]' : '',
      }),
    },
    {
      width: 160,
      title: 'Ngày sinh',
      dataIndex: 'ngaySinh',
      key: 'ngaySinh',
      onCell: (record) => ({
        className: record?.id && record?.id === laiXeFacade.data?.id ? '!bg-[#e6f4ff]' : '',
      }),
    },
    {
      width: 160,
      title: 'Số CCCD',
      dataIndex: 'cccd',
      key: 'cccd',
      onCell: (record) => ({
        className: record?.id && record?.id === laiXeFacade.data?.id ? '!bg-[#e6f4ff]' : '',
      }),
    },
    {
      width: 160,
      title: 'Giấy phép lái xe',
      dataIndex: 'gplx',
      key: 'gplx',
      onCell: (record) => ({
        className: record?.id && record?.id === laiXeFacade.data?.id ? '!bg-[#e6f4ff]' : '',
      }),
    },
    {
      width: 160,
      title: 'Phương tiện',
      dataIndex: 'phuongTien',
      key: 'phuongTien',
      onCell: (record) => ({
        className: record?.id && record?.id === laiXeFacade.data?.id ? '!bg-[#e6f4ff]' : '',
      }),
    },
    {
      width: 160,
      title: 'Trạng thái',
      dataIndex: 'active',
      key: 'status',
      render: (status) => <Badge color={status ? 'green' : 'gray'} text={status ? 'Đang hoạt động' : 'Ngừng hoạt động'} />
    },
    {
      width: 200,
      fixed: 'right',
      title: 'Thao tác',
      key: 'action',
      align:'center',
      onCell: (record) => ({
        className: record?.id && record?.id === laiXeFacade.data?.id ? '!bg-[#e6f4ff]' : '',
      }),
      render: (_, record) => (
        <Space>
          <Button hidden={!rightMapRoleFacade.rightData?.isUpdateAllowed} type={'primary'} icon={<EditOutlined/>} onClick={() => handleEdit(record)}>Sửa</Button>
          <Button hidden={!rightMapRoleFacade.rightData?.isDeleteAllowed} danger icon={<DeleteOutlined/>} onClick={() => handleRemove(record.id ?? '')}>Xoá</Button>
        </Space>
      )
    }
  ]

  return (
    <div>
      {contextHolder}
      <SubHeader tool={tool} isVisible={false} />
      <LaiXeForm/>
      <LaiXeViewDetails/>
      <Spin spinning={laiXeFacade.isLoading}>
        <div className={'p-3'}>
          <Table
            dataSource={dataSource}
            columns={columns}
            pagination={false}
            rowSelection={rowSelection as any}
            rowKey={'id'}
            scroll={{ y: 'calc(100vh - 290px)', x: '300px' }}
          />
          <Pagination
            className={'flex justify-end py-1'}
            showSizeChanger
            showTitle={false}
            current={laiXeFacade?.pagination?.page}
            pageSize={laiXeFacade?.pagination?.size}
            total={laiXeFacade?.pagination?.totalElements}
            pageSizeOptions={[20, 40, 60, 80]}
            showTotal={(total, range) => `${range[0]}-${range[1]} of ${total} items`}
            onChange={(page, pageSize) => onChangeDataTable({ query: { page: page, size: pageSize } })}
          />
        </div>
      </Spin>
    </div>
  )
}
export default LaiXeScreen
