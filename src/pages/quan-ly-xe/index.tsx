import React, { useEffect, useRef } from 'react';
import { SubHeader } from '@layouts/admin';
import { Badge, Button,FormInstance, Modal, Pagination, Space, Spin, Table } from 'antd';
import { PlusOutlined, ReloadOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { uuidv4 } from '@utils';
import { useSearchParams } from 'react-router-dom';
import { ColumnsType } from 'antd/es/table';
import { useNavigate } from 'react-router';
import { SearchWidget } from '../../utils/search-widget';
import { QueryParams } from '@models';
import { EStatusPhuongTien, PhuongTienFacade, PhuongTienModel } from '../../store/quan-ly-phuong-tien';
import { PhuongTienForm } from '@pages/quan-ly-xe/phuong-tien.form';
import { QuanLyPhuongTienDetails } from '@pages/quan-ly-xe/quan-ly-phuong-tien.details';
import { EStatusLaiXe } from '../../store/quan-ly-lai-xe';
import { RightMapRoleFacade } from 'src/store/right-map-role';


interface DataType extends PhuongTienModel{
  stt: number
  key?: string
}
let fillQuery: QueryParams;

const QuanLyXeScreen =  () => {
  const phuongTienFacade = PhuongTienFacade();
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate();
  const formRef = useRef<FormInstance | undefined>(undefined);
  const filter = searchParams.get('filter');
  const page = searchParams.get('page');
  const size = searchParams.get('size');
  const sort = searchParams.get('sort');
  const [modalApi, contextHolder]  = Modal.useModal();
  const rightMapRoleFacade = RightMapRoleFacade();

  useEffect(() => {
    rightMapRoleFacade.getRightMapByCode('XE');
    phuongTienFacade.get({});
  }, []);

  const rowSelection = {
    onChange: (selectedRowKeys: string[]) => {
      phuongTienFacade.set({ selectedRowKeys });
    },
    getCheckboxProps: (record: any) => ({
      title: record.name,
    }),
    columnWidth: 30,
  };
  useEffect(() => {
    if (phuongTienFacade.status === EStatusPhuongTien.deleteManyFulfilled) {
      phuongTienFacade.set({ selectedRowKeys: [] });
      if (filter) {
        phuongTienFacade.get({ filter: filter });
      } else phuongTienFacade.get({});
    }
  }, [phuongTienFacade.status]);

  const handleRemoveSelected = () => {
    modalApi.confirm({
      title: 'Xóa tất cả phương tiện vừa chọn',
      content: 'Mọi dữ liệu về những phương tiện này sẽ bị xóa vĩnh viễn. Bạn có chắc muốn xóa những phương tiện này?',
      onOk: () => {
        phuongTienFacade.deleteMany(phuongTienFacade.selectedRowKeys ?? []);
        setTimeout(() => {
          phuongTienFacade.get({})
        }, 500)
      },
      onCancel: () => {
      },
      cancelText: 'Hủy bỏ',
      okText: 'Xác nhận',
    });
  };

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

    fillQuery = { ...phuongTienFacade.query, ...props.query };
    for (const key in fillQuery) {
      if (!fillQuery[key as keyof QueryParams]) delete fillQuery[key as keyof QueryParams];
    }
    phuongTienFacade.get(fillQuery);
    navigate(
      { search: new URLSearchParams(fillQuery as unknown as Record<string, string>).toString() },
      { replace: true },
    );
    phuongTienFacade.set({ query: props.query, ...props.setKeyState });
  };

  const handleRemove = (id: string) => {
    modalApi.confirm({
      title: 'Xoá phương tiện này ?',
      content: 'Mọi dữ liệu về phương tiện này sẽ bị xoá vĩnh viễn. Bạn có chắc muốn xoá phương tiện này ?',
      onOk: () => {
        phuongTienFacade.delete(id);
        phuongTienFacade.set({ isLoading: true });
        setTimeout(() => {
          onChangeDataTable({});
        }, 500);
      },
      onCancel: () => {},
      cancelText: 'Huỷ bỏ',
      okText: 'Xác nhận',
    });
  };

  const handleEdit = (data: PhuongTienModel ) => {
    if(data.id){
      setSearchParams(
        (prev) => {
          if (!prev.has('id')) prev.append('id', data.id ?? '');
          else prev.set('id', data.id ?? '');
          return prev;
        },
        { replace: true },
      );
      phuongTienFacade.set({ isEdit: true, isVisible: true, data: data, isFormLoading: true });
    }
  }

  const tool = (
    <Space>
      <SearchWidget form={(form) => (formRef.current = form)} callback={onChangeSearch} />
      <Button
        icon={<ReloadOutlined/>}
        loading={phuongTienFacade.isLoading}
        onClick={() => {
          if (filter) {
            phuongTienFacade.get({ filter: filter });
          }
          phuongTienFacade.get({});
        }}>Tải lại</Button>
      <Button
      hidden={!rightMapRoleFacade.rightData?.isDeleteAllowed}
        danger
        icon={<DeleteOutlined />}
        onClick={handleRemoveSelected}
        disabled={!phuongTienFacade.selectedRowKeys?.length}
      >
        Xóa ({phuongTienFacade.selectedRowKeys?.length ?? 0})
      </Button>
      <Button hidden={!rightMapRoleFacade.rightData?.isCreateAllowed} type={'primary'} icon={<PlusOutlined/>} onClick={() =>  phuongTienFacade.set({ isVisible: true, data: undefined, isEdit: false })}>
        Thêm mới phương tiện
      </Button>
    </Space>
  )
  const dataSource: DataType[] = phuongTienFacade.pagination?.content.map((items, index) => ({
    key: uuidv4(),
    id: items.id,
    stt: (Number(searchParams.get('page') ?? 0) - 1) * Number(searchParams.get('size') ?? 0) + index + 1,
    bienSoXe: items.bienSoXe ?? '-',
    soKhung: items.soKhung ?? '-',
    soMay: items.soMay ?? '-',
    hangSanXuat: items.hangSanXuat ?? '-',
    model: items.model ?? '-',
    namSanXuat: items.namSanXuat ?? '-',
    taiXe: items.taiXe ?? '-',
    taiTrong: items.taiTrong ?? '-',
    active: items.active

  })) ?? []

  const colums: ColumnsType<DataType> = [
    {
      width: 150 ,
      title: 'Biển số xe',
      dataIndex:'bienSoXe',
      key: 'bienSoXe',
    },
    {
      width: 180 ,
      title: 'Số khung',
      dataIndex: 'soKhung',
      key: 'soKhung',
    },
    {
      width: 170 ,
      title: 'Số máy',
      dataIndex: 'soMay',
      key: 'soMay',
    },
    {
      width: 150 ,
      title: 'Hãng sản xuất',
      dataIndex: 'hangSanXuat',
      key: 'hangSanXuat',
    },
    {
      width: 160 ,
      title: 'Model',
      dataIndex: 'model',
      key: 'model'
    },
    {
      width: 160 ,
      title: 'Năm sản xuất',
      dataIndex: 'namSanXuat',
      key: 'namSanXuat'
    },
    {
      width: 140 ,
      title: 'Tải trọng',
      dataIndex: 'taiTrong',
      key: 'taiTrong'
    },
    {
      width: 200 ,
      title: 'Tên tài xế',
      dataIndex: 'taiXe',
      key: 'taixe'
    },
    {
      width: 160,
      title: 'Trạng thái',
      dataIndex: 'active',
      key: 'status',
      render: (status) => <Badge color={status ? 'green' : 'gray'} text={status ? 'Đang hoạt động' : 'Ngừng hoạt động'} />
    },
    {
      width: 200 ,
      fixed: 'right',
      title: 'Thao tác',
      key: 'action',
      align:'center',
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
      <SubHeader tool={tool} isVisible={false}/>
      <PhuongTienForm/>
      <QuanLyPhuongTienDetails/>
      <div className={'p-3'}>
        <Spin spinning={phuongTienFacade.isLoading}>
          <Table
            dataSource={dataSource}
            columns={colums}
            pagination={false}
            rowSelection={rowSelection as any}
            rowKey={'id'}
            scroll={{ y: 'calc(100vh - 290px)', x: '300px', }}
          />
          <Pagination
            className={'flex justify-end py-1'}
            showSizeChanger
            showTitle={false}
            current={phuongTienFacade?.pagination?.page}
            pageSize={phuongTienFacade?.pagination?.size}
            total={phuongTienFacade?.pagination?.totalElements}
            pageSizeOptions={[20, 40, 60, 80]}
            showTotal={(total, range) => `${range[0]}-${range[1]} of ${total} items`}
            onChange={(page, pageSize) => onChangeDataTable({ query: { page: page, size: pageSize } })}
          />
        </Spin>

      </div>
    </div>
  )
}
export default QuanLyXeScreen
