import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { SubHeader } from '@layouts/admin';
import { EStatusState, QueryParams } from '@models';
import { CodeTypeManagementFacade, EStatusKhachHang, KhachHangFacade, KhachHangModel, T_KhachHangFilterFields } from '@store';
import { uuidv4 } from '@utils';
import {
  Button,
  Dropdown,
  FormInstance,
  Input,
  InputRef,
  Modal,
  Pagination,
  Select,
  Space,
  Spin,
  Table,
  TableColumnsType,
  TableColumnType,
  Tag,
  Tooltip,
} from 'antd';
import Paragraph from 'antd/lib/typography/Paragraph';
import { useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useSearchParams } from 'react-router-dom';
import { SearchWidget } from 'src/utils/search-widget';
import { DetailModal } from './detail';
import { KhachHangForm } from './khach-hang.form';
import { RightMapRoleFacade } from 'src/store/right-map-role';

interface DataType extends KhachHangModel {
  key: string;
}
type DataIndex = keyof DataType;

const KhachHangScreen = () => {
  const khachHangFacade = KhachHangFacade();
  const codeTypeFacade = CodeTypeManagementFacade();
  const rightMapRoleFacade = RightMapRoleFacade();
  const navigate = useNavigate();
  const formRef = useRef<FormInstance | undefined>(undefined);
  const isFirstRender = useRef<boolean>(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const page = searchParams.get('page');
  const size = searchParams.get('size');
  let filter = searchParams.get('filter');
  const sort = searchParams.get('sort');
  const searchInput = useRef<InputRef>(null);
  let currentFilter: T_KhachHangFilterFields;
  const id = searchParams.get('id') || '';
  const type = searchParams.get('type') || '';

  const dataSource: DataType[] =
    khachHangFacade.pagination?.content.map((item, index) => ({
      ...item,
      index: (Number(page ?? 0) - 1) * Number(size ?? 0) + index + 1,
      key: uuidv4(),
      nguoiPhuTrach: item.nguoiPhuTrach ?? '-',
    })) ?? [];

  const handleEdit = (data: KhachHangModel) => {
    khachHangFacade.set({ isVisible: true, data: data, isEdit: true });
    setSearchParams(
      (prev) => {
        if (!prev.has('id')) prev.append('id', data.id ?? '');
        else prev.set('id', data.id ?? '');
        if (!prev.has('type')) prev.append('type', 'edit');
        else prev.set('type', 'edit');

        return prev;
      },
      { replace: true },
    );
  };

  const handleDetail = (data: KhachHangModel) => {
    khachHangFacade.set({ isVisible: false, isDetail: true, data: data });
    setSearchParams(
      (prev) => {
        if (!prev.has('id')) prev.append('id', data.id ?? '');
        else prev.set('id', data.id ?? '');
        if (!prev.has('type')) prev.append('type', 'detail');
        else prev.set('type', 'detail');

        return prev;
      },
      { replace: true },
    );
  };

  const columns: TableColumnsType<DataType> = [
    {
      title: 'STT',
      dataIndex: 'index',
      key: 'index',
      width: 50,
      align: 'center',
    },
    {
      title: 'Mã',
      dataIndex: 'ma',
      key: 'ma',
      width: 150,
      render: (_, record: any) => (
        <a className="p-0 text-blue-500" onClick={() => handleDetail(record)}>
          {<p className="line-clamp-2">{record.ma}</p>}
        </a>
      ),
    },
    {
      title: 'Tên khách hàng',
      dataIndex: 'ten',
      key: 'ten',
    },
    {
      title: 'Người phụ trách',
      dataIndex: 'nguoiPhuTrach',
      key: 'nguoiPhuTrach',
      width: 200,
    },
    {
      title: 'Số điện thoại',
      dataIndex: 'soDienThoai',
      key: 'soDienThoai',
      width: 150,
      render: (item) => (
        <Paragraph className="!m-0" copyable>
          {item}
        </Paragraph>
      ),
    },
    {
      title: 'Loại khách hàng',
      dataIndex: 'loaiKhachHang',
      key: 'loaiKhachHang',
      width: 150,
      render: (item) => <p>{codeTypeFacade.pagination?.content.find((x) => x.code == item)?.title}</p>,
    },
    {
      title: 'Thao tác',
      dataIndex: 'action',
      key: 'action',
      width: 200,
      fixed: 'right',
      align: 'center',
      render: (_, record: any) => (
        <Space>
          <Button hidden={!rightMapRoleFacade.rightData?.isUpdateAllowed} onClick={() => handleEdit(record)} type={'primary'} icon={<EditOutlined />}>
            Sửa
          </Button>
          <Button hidden={!rightMapRoleFacade.rightData?.isDeleteAllowed} icon={<DeleteOutlined />} danger onClick={() => handleRemove(record.id ?? '')}>
            Xóa
          </Button>
        </Space>
      ),
    },
  ];
  useEffect(() => {
    rightMapRoleFacade.getRightMapByCode('KHACHHANG');
    onChangeDataTable({ setKeyState: {} });
  }, []);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (searchParams.size > 0 && !isFirstRender.current) return;
  }, [searchParams]);

  useEffect(() => {
    switch (khachHangFacade.status) {
      case EStatusState.deleteFulfilled:
      case EStatusKhachHang.deleteManyFulfilled:
        khachHangFacade.set({ selectedRowKeys: [] });
        onChangeDataTable({});
        break;
    }
  }, [khachHangFacade.status]);

  useEffect(() => {
    codeTypeFacade.get({ size: -1, filter: JSON.stringify({ type: 'LOAI_KHACH_HANG' }) });
  }, []);

  useEffect(() => {
    if (type) {
      switch (type) {
        case 'edit':
          khachHangFacade.set({ isVisible: true, isEdit: true });
          setSearchParams(
            (prev) => {
              if (!prev.has('id')) prev.append('id', id ?? '');
              else prev.set('id', id ?? '');
              if (!prev.has('type')) prev.append('type', 'edit');
              else prev.set('type', 'edit');
              console.log(prev);

              return prev;
            },
            { replace: true },
          );
          break;
        case 'detail':
          {
            khachHangFacade.set({ isVisible: false, isDetail: true });
            setSearchParams(
              (prev) => {
                if (!prev.has('id')) prev.append('id', id ?? '');
                else prev.set('id', id ?? '');
                if (!prev.has('type')) prev.append('type', 'detail');
                else prev.set('type', 'detail');
                console.log(prev);

                return prev;
              },
              { replace: true },
            );
          }
          break;
      }
    }
  }, [id, type]);

  const onChangeSearch = (value: string) => {
    let filterObj = JSON.parse(filter!);
    const query: QueryParams = {
      page: 1,
      size: 20,
      filter: JSON.stringify({ ...filterObj, fullTextSearch: value }),
    };
    onChangeDataTable({ query });
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
    const fillQuery: QueryParams = { ...khachHangFacade.query, ...props.query };
    for (const key in fillQuery) {
      if (!fillQuery[key as keyof QueryParams]) delete fillQuery[key as keyof QueryParams];
    }
    khachHangFacade.get(fillQuery);
    navigate(
      { search: new URLSearchParams(fillQuery as unknown as Record<string, string>).toString() },
      { replace: true },
    );
    khachHangFacade.set({ query: props.query, ...props.setKeyState });
  };

  const handleRemove = (id: string) => {
    Modal.confirm({
      title: 'Xoá khách hàng?',
      content: 'Mọi dữ liệu về khách hàng này sẽ bị xoá vĩnh viễn. Bạn có chắc chắn muốn xoá khách hàng này?',
      onOk: () => {
        khachHangFacade.delete(id);
      },
      onCancel: () => {},
      cancelText: 'Huỷ bỏ',
      okText: 'Xác nhận',
    });
  };

  const handleRemoveSelected = () => {
    Modal.confirm({
      title: 'Xóa tất cả khách hàng vừa chọn',
      content: 'Mọi dữ liệu về những khách hàng này sẽ bị xóa vĩnh viễn. Bạn có chắc muốn xóa những khách hàng này?',
      onOk: () => {
        khachHangFacade.deleteMany(khachHangFacade.selectedRowKeys ?? []);
      },
      onCancel: () => {},
      cancelText: 'Hủy bỏ',
      okText: 'Xác nhận',
    });
  };
  const onChangeFilter = (value: any, key: string) => {
    if (searchParams.get('filter')) {
      currentFilter = JSON.parse(searchParams.get('filter') || '');
      if (key == 'loaiKhachHang') currentFilter.loaiKhachHang = value;
      else {
        currentFilter.loaiKhachHang = value;
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
        filter: JSON.stringify(key == 'loaiKhachHang' ? { loaiKhachHang: value } : { loaiKhachHang: value }),
      };
      onChangeDataTable({ query });
    }
  };
  const rowSelection = {
    onChange: (selectedRowKeys: string[]) => {
      khachHangFacade.set({ selectedRowKeys });
    },
    getCheckboxProps: (record: any) => ({
      title: record.name,
    }),
    columnWidth: 30,
  };

  const tool = (
    <Space>
      <SearchWidget form={(form) => (formRef.current = form)} callback={onChangeSearch} />
      <Select
        placeholder={'Chọn loại Khách hàng'}
        optionLabelProp={'label'}
        showSearch
        options={codeTypeFacade.pagination?.content.map((item) => {
          return { label: item.title, value: item.code };
        })}
        allowClear
        onChange={(value) => {
          onChangeFilter(value, 'loaiKhachHang');
        }}
        style={{ width: 200 }}
        defaultValue={searchParams.get('filter') ? JSON.parse(searchParams.get('filter') || '')?.loaiKhachHang : null}
      />
      <Button icon={<ReloadOutlined />} loading={khachHangFacade.isLoading} onClick={() => onChangeDataTable({})}>
        Tải lại
      </Button>
      <Button
        hidden={!rightMapRoleFacade.rightData?.isDeleteAllowed}
        danger
        icon={<DeleteOutlined />}
        onClick={handleRemoveSelected}
        disabled={!khachHangFacade.selectedRowKeys?.length}
      >
        Xóa ({khachHangFacade.selectedRowKeys?.length ?? 0})
      </Button>
      <Button
      hidden={!rightMapRoleFacade.rightData?.isCreateAllowed}
        type={'primary'}
        icon={<PlusOutlined />}
        onClick={() => khachHangFacade.set({ isVisible: true, data: undefined })}
      >
        Thêm mới khách hàng
      </Button>
    </Space>
  );

  return (
    <>
      <SubHeader tool={tool} isVisible={false}/>
      <KhachHangForm />
      <DetailModal />
      <Spin spinning={khachHangFacade.isLoading}>
        <div className={'p-3'}>
          <Table
            size={'small'}
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
            current={khachHangFacade?.pagination?.page}
            pageSize={khachHangFacade?.pagination?.size}
            total={khachHangFacade?.pagination?.totalElements}
            pageSizeOptions={[20, 40, 60, 80]}
            showTotal={(total, range) => `${range[0]}-${range[1]} of ${total} items`}
            onChange={(page, pageSize) => onChangeDataTable({ query: { page: page, size: pageSize } })}
          />
        </div>
      </Spin>
    </>
  );
};
export default KhachHangScreen;
