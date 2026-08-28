import {
  dateFormat,
  lang,
  renderTitleBreadcrumbs,
  routerLinks,
  scrollLeftWhenChanging,
  trangThaiDonHang,
  uuidv4,
} from '@utils';
import {
  Badge,
  Button,
  ConfigProvider,
  DatePicker,
  Dropdown,
  Form,
  FormInstance,
  Modal,
  Pagination,
  Select,
  SelectProps,
  Space,
  Spin,
  TableColumnType,
  Tabs,
  TabsProps,
  Tag,
  Tooltip,
} from 'antd';
import { ColumnsType } from 'antd/es/table';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useSearchParams } from 'react-router-dom';
import { DonHang, DonHangFacade, EStatusDonHang, T_DonHangFilterFields } from 'src/store/don-hang';
import dayjs from 'dayjs';
import {
  DeleteOutlined,
  PlusOutlined,
  ReloadOutlined,
  CaretDownOutlined,
  SearchOutlined,
  CalendarOutlined,
  DownloadOutlined,
  ExclamationCircleOutlined,
  StopOutlined,
} from '@ant-design/icons';
import { Table, TableProps } from 'antd/lib';
import { SubHeader } from '@layouts/admin';
import { EStatusState, QueryParams } from '@models';
import React from 'react';
import { SearchWidget } from 'src/utils/search-widget';
import { FilterDropdownProps } from 'antd/es/table/interface';
import locale from 'antd/lib/locale/vi_VN';
import { DonHangDetailDrawer } from './detail.form';
import { RightMapRole, RightMapRoleFacade } from 'src/store/right-map-role';
import TextArea from 'antd/es/input/TextArea';
import { KhoFacade, UserFacade } from '@store';
import ExportFileModel from './ExportFileModel';
import { unwrapResult } from '@reduxjs/toolkit';

interface DataType extends DonHang {
  key: string;
  index: number;
  ngayDatHangFormated: string;
  thoiHanGiaoHangFormated: string;
}

type DataIndex = keyof DataType;
type OnChange = NonNullable<TableProps<DataType>['onChange']>;
let query: any;
let fillQuery: Record<string, any>;
type TagRender = SelectProps['tagRender'];
const deliverableStatus = ['DA_DUYET', 'CHO_DUYET', 'DA_LAY_HANG', 'CHO_XAC_NHAN', 'XE_TU_CHOI', 'CHO_LAY_HANG'];

const CancelModal: React.FC = () => {
  const donHangFacade = DonHangFacade();
  const [form] = Form.useForm();

  const onFinish = (value: any) => {
    donHangFacade.cancel(donHangFacade.cancelRowKeys ?? [], value.reason);
  };

  return (
    <Modal
      title="Huỷ đơn hàng"
      centered
      open={donHangFacade.isCancelModalOpen}
      onCancel={() => donHangFacade.set({ isCancelModalOpen: false })}
      onOk={form.submit}
    >
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Form.Item name="reason" label="Lý do huỷ đơn:" rules={[{ required: true }]}>
          <TextArea placeholder="Nhập lý do huỷ đơn" rows={3} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

const DonHangScreen = () => {
  const donHangFacade = DonHangFacade();
  const navigate = useNavigate();
  const formRef = useRef<FormInstance | undefined>(undefined);
  const [searchParams, setSearchParams] = useSearchParams();
  const [modalApi, contextModelApi] = Modal.useModal();
  const page = searchParams.get('page');
  const size = searchParams.get('size');
  const filter = searchParams.get('filter');
  const sort = searchParams.get('sort');
  const searchText = useRef('');
  const [form] = Form.useForm();
  const rightMapFacade = RightMapRoleFacade();
  const userFacade = UserFacade();
  const viewingOrderId = useMemo(() => searchParams.get('orderId')?.trim(), [searchParams]);
  let currentFilter: T_DonHangFilterFields;
  let color: string;
  let PriorityLevelColor: string;
  const selectedStatuses = useRef<string[]>([]);
  const tabItems: TabsProps['items'] = useMemo(
    () =>
      [
        {
          key: 'ALL',
          label: 'Tất cả',
        },
        // Chỉ hiện 5 trạng thái chính thức (NHAP..DA_HUY) — các trạng thái cũ
        // (legacy: true, chỉ còn ở dữ liệu lịch sử) không tạo tab riêng nữa,
        // theo yêu cầu "nghiệp vụ chỉ có các trạng thái từ Nháp đến Đã hủy".
        ...Object.values(trangThaiDonHang)
          .filter((x) => !x.legacy)
          .map((x) => ({
            key: x.code,
            label: x.name,
          })),
      ].map((x) => ({
        ...x,
        label: (
          <div className="flex gap-2 items-center">
            <span className="text-nowrap font-medium">{x.label}</span>
            <span className="bg-blue-500 text-white text-xs px-2 pt-0.5 leading-5 rounded-full">
              {x.key === 'ALL'
                ? Object.values(donHangFacade.paginationByStatus ?? {}).reduce((a, b) => a + (b ?? 0), 0)
                : (donHangFacade.paginationByStatus?.[x.key] ?? 0)}
            </span>
          </div>
        ),
      })),
    [donHangFacade.paginationByStatus],
  );
  const tabKey = tabItems.find((x) => x.key === searchParams.get('status'))?.key ?? tabItems[0].key;

  useEffect(() => {
    if (!viewingOrderId) {
      return;
    }

    // Luôn gọi getById để lấy đủ dữ liệu chi tiết (danh sách sản phẩm, allowedActions,
    // thông tin tài xế/xe đầy đủ...) — dữ liệu rút gọn từ bảng danh sách KHÔNG có các
    // trường này, nên tuyệt đối không dùng đường tắt lấy từ donHangFacade.pagination.
    donHangFacade
      .getById({ id: viewingOrderId })
      .then((x) => unwrapResult(x))
      .catch(() => {
        setSearchParams((x) => {
          x.delete('orderId');
          return x;
        });
      });
  }, [viewingOrderId]);

  const donHangDataSource: DataType[] = useMemo(
    () =>
      donHangFacade.pagination?.content.map((item, index) => ({
        ...item,
        key: uuidv4(),
        index: (donHangFacade.pagination?.size ?? 0) * ((donHangFacade.pagination?.page ?? 1) - 1) + index + 1,
        ngayDatHangFormated: item.ngayDatHang ? dayjs(item.ngayDatHang).format(dateFormat) : '-',
        thoiHanGiaoHangFormated: item.thoiHanGiaoHang ? dayjs(item.thoiHanGiaoHang).format(dateFormat) : '-',
      })) ?? [],
    [donHangFacade.pagination],
  );

  useEffect(() => {
    onChangeDataTable({});

    const fetchData = async () => {
      try {
        const request = await rightMapFacade.getRightMapByListCode('DONHANG,USER');
        const data = unwrapResult(request).data as RightMapRole[];
        if (data.find((x) => x.groupCode == 'USER')?.isViewAllowed) {
          userFacade.get({ size: -1 });
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchData();

    return () => {
      donHangFacade.set({
        selectedRowKeys: [],
        cancelRowKeys: [],
        deleteRowKeys: [],
      });
    };
  }, []);

  useEffect(() => {
    switch (donHangFacade.status) {
      case EStatusState.deleteFulfilled:
      case EStatusDonHang.putStatusFulfilled:
      case EStatusDonHang.approveFulfilled:
      case EStatusDonHang.rejectFulfilled:
      case EStatusDonHang.deleteManyFulfilled:
      case EStatusDonHang.cancelFulfilled:
      case EStatusDonHang.completeFulfilled:
      case EStatusDonHang.revertActivityFulfilled:
        onChangeDataTable({});
        break;
    }
  }, [donHangFacade.status]);

  const handleRemove = (id: string) => {
    Modal.confirm({
      title: 'Xoá đơn hàng?',
      content: 'Mọi dữ liệu về đơn hàng này sẽ bị xoá vĩnh viễn. Bạn có chắc chắn muốn xoá đơn hàng này?',
      onOk: () => {
        donHangFacade.delete(id);
      },
      onCancel: () => {},
      cancelText: 'Huỷ bỏ',
      okText: 'Xác nhận',
    });
  };

  const handleRemoveMany = () => {
    modalApi.confirm({
      title: 'Xóa nhiều đơn hàng',
      content: 'Mọi dữ liệu về những đơn hàng này sẽ bị xóa vĩnh viễn. Bạn có chắc muốn xóa những đơn hàng này?',
      onOk: () => {
        donHangFacade.deleteMany({ model: JSON.stringify({ ids: donHangFacade.deleteRowKeys ?? [] }) });
      },
      onCancel: () => {},
      cancelText: 'Hủy bỏ',
      okText: 'Xác nhận',
    });
  };

  const handleEdit = (data: any) => {
    navigate(`/${lang}${routerLinks('DonHang')}/${data.id}/edit`);
  };
  const handleDetail = (orderId: string | undefined) => {
    if (!orderId) {
      return;
    }

    setSearchParams((x) => {
      x.set('orderId', orderId);
      return x;
    });
  };
  const rowSelection = {
    onChange: (_selectedRowKeys: string[], selectedRows: DataType[]) => {
      const listSelectedRowKey = selectedRows.filter((items) => items.trangThai !== 'DA_DUYET');
      const selectedRowKeys = listSelectedRowKey.map((items) => items.id ?? '');

      const deleteRowKeys = selectedRows
        .filter((items) => items.allowedActions?.includes('DELETE'))
        .map((x) => x.id ?? '');

      const cancelRowKeys = selectedRows
        .filter((items) => items.allowedActions?.includes('CANCEL'))
        .map((x) => x.id ?? '');

      donHangFacade.set({
        selectedRowKeys,
        cancelRowKeys,
        deleteRowKeys,
      });
    },
    getCheckboxProps: (record: any) => ({
      title: record.name,
    }),
    columnWidth: 50,
  };

  const handleChange: OnChange = (_pagination, _filters, sorter) => {
    if ((sorter as any)?.column) {
      onChangeDataTable({
        query: {
          page: 1,
          size: Number(size),
          filter: filter!,
          sort:
            (sorter as any)?.order === 'ascend' ? `+${(sorter as any)?.column.key}` : `-${(sorter as any)?.column.key}`,
        },
      });
    } else
      onChangeDataTable({
        query: {
          page: 1,
          size: Number(size),
          filter: filter!,
        },
      });
  };

  const getDefaultDateRange = (): [dayjs.Dayjs | null | undefined, dayjs.Dayjs | null | undefined] => {
    const filterObj = JSON.parse(filter || '{}');
    if (filterObj) {
      const { createDateRange, ...value } = filterObj;

      if (createDateRange) {
        const defaultStartDate = createDateRange[0] ?? null; // Start of the current month
        const defaultEndDate = createDateRange[0] ?? null; // End of the current month
        return [defaultStartDate, defaultEndDate];
      }
    }
    return [undefined, undefined];
  };

  const handleReset = (clearFilters: () => void, dataIndex: string, confirm: FilterDropdownProps['confirm']) => {
    clearFilters();
    setSearchParams(
      (prev) => {
        if (prev.has('createdDateRange')) {
          prev.delete('createdDateRange');
        }
        return prev;
      },
      { replace: true },
    );
    getDefaultDateRange();
    query = { ...query, filter: JSON.stringify({ createdDateRange: undefined }) };
    confirm();
    searchText.current = '';
    form.setFieldValue('createdDateRange', [undefined, undefined]);
    onChangeDataTable({ query: query });
  };
  const handleSearch = (_selectedKeys: string[], _confirm: FilterDropdownProps['confirm'], _dataIndex: DataIndex) => {
    onChangeDataTable({ query: query });
  };

  const getColumnFilterProps = (dataIndex: DataIndex, filterKey: string): TableColumnType<DataType> => ({
    filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
      <div style={{ padding: 8, display: 'grid', gap: 3 }} onKeyDown={(e) => e.stopPropagation()}>
        <Form form={form}>
          <ConfigProvider locale={locale}>
            <Form.Item name={filterKey}>
              <DatePicker.RangePicker
                format={'YYYY-MM-DD'}
                allowClear
                defaultValue={getDefaultDateRange()}
                onChange={(value, dateString) => {
                  query = donHangFacade.query;
                  const filterObj = JSON.parse(filter || '{}');
                  if (dateString && value !== null) {
                    filterObj[filterKey] = dateString;
                    query = { ...query, filter: JSON.stringify(filterObj), page: 1, size: size ?? 20 };
                  } else {
                    filterObj[filterKey] = undefined;
                    query = { ...query, filter: JSON.stringify(filterObj) };
                  }
                }}
              />
            </Form.Item>
            <Space>
              <Button
                onClick={() => clearFilters && handleReset(clearFilters, dataIndex, confirm)}
                style={{ width: 90 }}
              >
                Cài lại
              </Button>
              <Button
                type="primary"
                icon={<SearchOutlined />}
                onClick={() => handleSearch(selectedKeys as string[], confirm, dataIndex)}
              >
                Tìm kiếm
              </Button>
            </Space>
          </ConfigProvider>
        </Form>
      </div>
    ),
  });
  const onChangeDataTable = (
    props: { query?: QueryParams; setKeyState?: object; tab?: string },
    ignoreCount: boolean = false,
  ) => {
    props.query = {
      page: Number(page),
      size: Number(size),
      filter: filter ?? '',
      sort: sort ?? '',
      ...(props.query ?? {}),
    };

    props.tab = props.tab ?? tabKey;

    if (props.tab != 'ALL') {
      props.query.filter = JSON.stringify({
        ...JSON.parse(props.query.filter || '{}'),
        TrangThai: [props.tab],
      });
    }

    fillQuery = { ...donHangFacade.query, ...props.query };

    for (const key in fillQuery) {
      if (!fillQuery[key as keyof QueryParams]) delete fillQuery[key as keyof QueryParams];
    }

    if (!ignoreCount) {
      donHangFacade.countOrderByStatus({
        filter: JSON.stringify({
          ...JSON.parse(props.query.filter || '{}'),
          TrangThai: [],
        }),
      });
    }
    donHangFacade.get(fillQuery);

    if (props.tab != 'ALL') {
      fillQuery.status = props.tab;
    } else {
      delete fillQuery.status;
    }

    navigate(
      { search: new URLSearchParams(fillQuery as unknown as Record<string, string>).toString() },
      { replace: true },
    );
    donHangFacade.set({ query: props.query, ...props.setKeyState });
  };

  const column: ColumnsType<DataType> = [
    {
      title: 'Mã đơn hàng',
      dataIndex: 'ma',
      key: 'ma',
      width: 180,
      sorter: true,
      onCell: (record, _rowIndex) => ({
        className: record?.id && record?.id === donHangFacade.data?.id ? '!bg-[#e6f4ff]' : '',
      }),
      render: (_, record: any) => (
        <div className="flex gap-2">
          <a className="p-0 text-blue-500" onClick={() => handleDetail(record.id)}>
            {<p className="line-clamp-2">{record.ma}</p>}
          </a>
          {deliverableStatus.includes(record.trangThai) && dayjs().isAfter(record.thoiHanGiaoHang) && (
            <Tooltip title="Đơn đã quá hạn giao hàng">
              <ExclamationCircleOutlined className="text-red-500" />
            </Tooltip>
          )}
        </div>
      ),
    },
    {
      title: 'Ngày đặt hàng',
      dataIndex: 'ngayDatHangFormated',
      key: 'ngayDatHangFormated',
      sorter: true,
      width: 135,
      onCell: (record, _rowIndex) => ({
        className: record?.id && record?.id === donHangFacade.data?.id ? '!bg-[#e6f4ff]' : '',
      }),
      filterIcon: <CalendarOutlined />,
      ...getColumnFilterProps('createdOnDate', 'createdDateRange'),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'trangThai',
      key: 'trangThai',
      width: 140,
      sorter: true,
      align: 'left',
      onCell: (record, _rowIndex) => ({
        className: record?.id && record?.id === donHangFacade.data?.id ? '!bg-[#e6f4ff]' : '',
      }),
      render: (value) => {
        const x = trangThaiDonHang[value as keyof typeof trangThaiDonHang];

        if (!x) {
          return <></>;
        }

        return (
          <>
            <Badge color={x.color} className={'px-1'} />
            {x.name}
          </>
        );
      },
    },
    {
      title: 'Người tạo',
      key: 'createdByUserId',
      width: 190,
      sorter: true,
      onCell: (record, _rowIndex) => ({
        className: record?.id && record?.id === donHangFacade.data?.id ? '!bg-[#e6f4ff]' : '',
      }),
      render: (_, record) => record.createdByUserFullName ?? record.createdByUserName,
    },
    {
      title: 'T.gian YC giao',
      dataIndex: 'thoiHanGiaoHangFormated',
      key: 'thoiHanGiaoHangFormated',
      width: 150,
      sorter: true,
      onCell: (record, _rowIndex) => ({
        className: record?.id && record?.id === donHangFacade.data?.id ? '!bg-[#e6f4ff]' : '',
      }),
      filterIcon: <CalendarOutlined />,
      ...getColumnFilterProps('thoiHanGiaoHang', 'thoiHanDateRange'),
    },
    {
      title: 'Mức ưu tiên',
      dataIndex: 'mucDoUuTien',
      key: 'mucDoUuTien',
      width: 140,
      sorter: true,
      align: 'center',
      onCell: (record, _rowIndex) => ({
        className: record?.id && record?.id === donHangFacade.data?.id ? '!bg-[#e6f4ff]' : '',
      }),
      render: (type) => {
        switch (type) {
          case '3':
            return <span className="text-sm text-white font-medium rounded-full px-3 pb-0.5 bg-red-500">Cao</span>;
          case '2':
            return <span className="text-sm font-medium rounded-full px-3 pb-0.5 bg-neutral-200">Trung bình</span>;
          case '1':
            return <span className="text-sm text-white font-medium rounded-full px-3 pb-0.5 bg-green-500">Thấp</span>;
        }
      },
    },
    {
      title: 'Bên giao',
      dataIndex: 'benGiao',
      key: 'benGiao',
      sorter: true,
      onCell: (record, _rowIndex) => ({
        className: record?.id && record?.id === donHangFacade.data?.id ? '!bg-[#e6f4ff]' : '',
      }),
    },
    {
      title: 'Bên nhận',
      dataIndex: 'benNhan',
      key: 'benNhan',
      sorter: true,
      onCell: (record, _rowIndex) => ({
        className: record?.id && record?.id === donHangFacade.data?.id ? '!bg-[#e6f4ff]' : '',
      }),
    },
    {
      title: 'Thao tác',
      align: 'center',
      key: 'Action',
      fixed: 'right',
      width: 140,
      onCell: (record, _rowIndex) => ({
        className: record?.id && record?.id === donHangFacade.data?.id ? '!bg-[#e6f4ff]' : '',
      }),
      render: (_value, record) => {
        const allowedActions = record.allowedActions?.filter((x) => !['ASSIGN_DELIVERY', 'CANCEL'].includes(x));
        return (
          <div>
            <span onClick={() => handleDetail(record.id)} className={'text-blue-500 cursor-pointer'}>
              Xem chi tiết
            </span>
            {allowedActions && allowedActions?.length !== 0 && (
              <Dropdown
                trigger={['click']}
                menu={{
                  items: allowedActions
                    ?.map((item) => {
                      switch (item) {
                        case 'UPDATE':
                          return [
                            {
                              label: 'Cập nhật',
                              key: item,
                            },
                          ];
                        case 'DELETE':
                          return [
                            {
                              label: 'Xóa',
                              key: item,
                            },
                          ];
                        case 'SEND_APPROVAL':
                          return [
                            {
                              label: 'Gửi duyệt',
                              key: item,
                            },
                          ];
                        case 'APPROVE':
                          return [
                            {
                              label: 'Duyệt',
                              key: item,
                            },
                            {
                              label: 'Từ chối',
                              key: 'REJECT',
                            },
                          ];
                      }
                    })
                    .reduce((p, c) => p?.concat(c!), []),
                  onClick: ({ key }) => {
                    switch (key) {
                      case 'UPDATE':
                        handleEdit(record);
                        break;
                      case 'DELETE':
                        handleRemove(record.id ?? '');
                        break;
                      case 'SEND_APPROVAL':
                        donHangFacade.putStatus({ id: record.id, trangThai: 'CHO_DUYET' });
                        break;
                      case 'APPROVE':
                        donHangFacade.approve(record.id ?? '');
                        break;
                      case 'REJECT':
                        donHangFacade.set({
                          data: record,
                          isModalVisible: true,
                        });
                        break;
                    }
                  },
                }}
              >
                <CaretDownOutlined className={'text-blue-500 cursor-pointer px-2'} />
              </Dropdown>
            )}
          </div>
        );
      },
    },
  ];

  const handleChangeSelect = (value: any, id: string) => {
    if (searchParams.get('filter')) {
      currentFilter = JSON.parse(searchParams.get('filter') || '');
      switch (id) {
        case 'CreatedByUserId':
          currentFilter.CreatedByUserId = value;
          break;
        case 'Status':
          currentFilter.TrangThai = value;
          selectedStatuses.current = value;
          break;
        case 'MucDoUuTien':
          currentFilter.MucDoUuTien = value;
          break;
      }
      const query: QueryParams = {
        page: 1,
        size: 20,
        filter: JSON.stringify(currentFilter),
      };
      onChangeDataTable({ query });
    } else {
      switch (id) {
        case 'CreatedByUserId':
          onChangeDataTable({
            query: {
              filter: JSON.stringify({ CreatedByUserId: value }),
            },
          });
          break;
        case 'Status':
          onChangeDataTable({
            query: {
              filter: JSON.stringify({ TrangThai: value }),
            },
          });
          break;
        case 'MucDoUuTien':
          onChangeDataTable({
            query: {
              filter: JSON.stringify({ MucDoUuTien: value }),
            },
          });
          break;
      }
    }
  };

  const tagRender: TagRender = (props) => {
    const { label, value, closable, onClose } = props;
    const onPreventMouseDown = (event: React.MouseEvent<HTMLSpanElement>) => {
      event.preventDefault();
      event.stopPropagation();
    };

    switch (value) {
      case 'DA_TU_CHOI':
        color = 'red';
        break;
      case 'DA_DUYET':
        color = 'green';
        break;
      case 'NHAP':
        color = 'gray';
        break;
      case 'CHO_DUYET':
        color = 'orange';
    }

    return (
      <Tag
        color={color}
        onMouseDown={onPreventMouseDown}
        closable={closable}
        onClose={onClose}
        style={{ marginInlineEnd: 4 }}
      >
        {label}
      </Tag>
    );
  };

  const tagUserRender: TagRender = (props) => {
    const { label, value, closable, onClose } = props;
    const onPreventMouseDown = (event: React.MouseEvent<HTMLSpanElement>) => {
      event.preventDefault();
      event.stopPropagation();
    };

    return (
      <Tag
        className={'w-20 truncate'}
        onMouseDown={onPreventMouseDown}
        closable={closable}
        onClose={onClose}
        style={{ marginInlineEnd: 4 }}
      >
        {label}
      </Tag>
    );
  };
  const tagPriorityLevelRender: TagRender = (props) => {
    const { label, value, closable, onClose } = props;
    const onPreventMouseDown = (event: React.MouseEvent<HTMLSpanElement>) => {
      event.preventDefault();
      event.stopPropagation();
    };

    switch (value) {
      case 1:
        PriorityLevelColor = 'default';
        break;
      case 2:
        PriorityLevelColor = 'processing';
        break;
      case 3:
        PriorityLevelColor = 'error';
        break;
    }

    return (
      <Tag
        color={PriorityLevelColor}
        onMouseDown={onPreventMouseDown}
        closable={closable}
        onClose={onClose}
        style={{ marginInlineEnd: 4 }}
      >
        {label}
      </Tag>
    );
  };

  const debounceTimeout = useRef<any>();
  const tool = (
    <Space>
      {rightMapFacade.rightDatas?.find((x) => x.groupCode == 'USER')?.isViewAllowed ? (
        <Select
          showSearch
          allowClear
          className={`max-w-full min-w-40`}
          mode={'tags'}
          tagRender={tagUserRender}
          placeholder={'Lọc theo người tạo'}
          optionFilterProp={'label'}
          options={userFacade.pagination?.content.map((item, index) => ({
            label: item.name,
            value: item.id,
          }))}
          onChange={(value: string) => handleChangeSelect(value, 'CreatedByUserId')}
        />
      ) : (
        ''
      )}

      <Select
        disabled={tabKey !== 'ALL'}
        showSearch
        allowClear
        mode={'tags'}
        tagRender={tagRender}
        className={'max-w-full min-w-40'}
        placeholder={'Lọc theo trạng thái'}
        optionFilterProp={'label'}
        options={Object.values(trangThaiDonHang).map((x) => ({
          label: x.name,
          value: x.code,
        }))}
        onChange={(value: string) => handleChangeSelect(value, 'Status')}
      />
      <SearchWidget
        form={(_form) => formRef}
        callback={(e) => {
          if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
          debounceTimeout.current = setTimeout(() => {
            let query = donHangFacade.query;
            let filterObj = JSON.parse(filter || '{}');
            if (e) {
              filterObj = { ...filterObj, fullTextSearch: e };
              query = { ...query, filter: JSON.stringify(filterObj), page: 1, size: size };
            } else {
              filterObj.fullTextSearch = undefined;
              query = { ...query, filter: JSON.stringify(filterObj) };
            }
            onChangeDataTable({ query: query });
          }, 300);
        }}
      />
      <Button
        hidden={!rightMapFacade.rightDatas?.find((x) => x.groupCode == 'DONHANG')?.isDeleteAllowed}
        danger
        icon={<DeleteOutlined />}
        onClick={handleRemoveMany}
        disabled={!donHangFacade.deleteRowKeys?.length}
      >
        Xóa{' '}
        {donHangFacade.deleteRowKeys?.length === 0 || donHangFacade.deleteRowKeys === undefined
          ? ''
          : '(' + donHangFacade.deleteRowKeys?.length + ')'}
      </Button>
      <Tooltip title={'Huỷ đơn hàng'}>
        <Button
          hidden={!rightMapFacade.rightDatas?.find((x) => x.groupCode == 'DONHANG')?.isCancelAllowed}
          danger
          icon={<StopOutlined />}
          onClick={() => donHangFacade.set({ isCancelModalOpen: true })}
          disabled={!donHangFacade.cancelRowKeys?.length}
        >
          Huỷ{' '}
          {donHangFacade.cancelRowKeys?.length === 0 || donHangFacade.cancelRowKeys === undefined
            ? ''
            : '(' + donHangFacade.cancelRowKeys?.length + ')'}
        </Button>
      </Tooltip>
      <Button
        icon={<DownloadOutlined />}
        onClick={() => donHangFacade.set({ isExportFileModal: true })}
        disabled={donHangFacade.isLoading}
      >
        Xuất file
      </Button>
      <Button
        hidden={!rightMapFacade.rightDatas?.find((x) => x.groupCode == 'DONHANG')?.isCreateAllowed}
        type={'primary'}
        icon={<PlusOutlined />}
        onClick={() => {
          donHangFacade.set({ data: undefined });
          navigate(`/${lang}${routerLinks('DonHang')}/add`);
        }}
      >
        Thêm mới
      </Button>
    </Space>
  );

  const onFinish = (value: any) => {
    donHangFacade.set({ isVisible: false, isModalVisible: false });
    donHangFacade.reject({ ...value, id: donHangFacade.data?.id, trangThai: 'DA_TU_CHOI' });
  };

  const onChange = (key: string) => {
    onChangeDataTable(
      {
        tab: key,
        query: {
          page: 1,
          filter: JSON.stringify({
            ...JSON.parse(filter || '{}'),
            TrangThai: selectedStatuses.current.length ? selectedStatuses.current : undefined,
          }),
        },
      },
      true,
    );
  };

  return (
    <div>
      {contextModelApi}
      <DonHangDetailDrawer />

      <Modal
        title={'Từ chối đơn hàng'}
        centered
        open={donHangFacade.isModalVisible}
        onCancel={() => donHangFacade.set({ isModalVisible: false, data: undefined })}
        onOk={form.submit}
      >
        <Form form={form} layout={'vertical'} onFinish={onFinish}>
          <Form.Item name="lyDoTuChoi" label="Lý do từ chối:" rules={[{ required: true }]}>
            <TextArea placeholder={'Nhập lý do từ chối'} rows={3} />
          </Form.Item>
        </Form>
      </Modal>
      <SubHeader tool={tool} isVisible={false}>
        <div className={'grid grid-cols-12 gap-3 px-2.5 pt-2.5'}>
          <div className={'col-span-12 intro-x'}>
            <div className={'shadow rounded-xl w-full overflow-auto bg-white'}>
              <Tabs activeKey={tabKey} items={tabItems} onChange={onChange} className="mx-4 mb-4" />
              <div className={'sm:min-h-[calc(100vh-11.6rem)] overflow-y-auto pb-3'}>
                <Spin spinning={donHangFacade.isLoading}>
                  <div>
                    <Table
                      rowSelection={rowSelection as any}
                      size={'small'}
                      dataSource={donHangDataSource}
                      rowKey={'id'}
                      columns={column}
                      pagination={false}
                      scroll={{ x: 'max-content', y: 'calc(100vh - 280px)' }}
                      onChange={handleChange}
                    />
                  </div>
                  <Pagination
                    className={'flex justify-end mt-3 mr-3'}
                    showSizeChanger
                    defaultCurrent={donHangFacade?.query?.page}
                    current={donHangFacade?.query?.page}
                    total={donHangFacade?.pagination?.totalElements}
                    pageSize={donHangFacade?.pagination?.size}
                    // pageSizeOptions={[20, 40, 60, 80]}
                    showTotal={(total, range) => `${range[0]}-${range[1]} of ${total} items`}
                    onChange={(page, pageSize) => {
                      let query = donHangFacade.query;
                      query = { ...query, page: page, size: pageSize };
                      onChangeDataTable({ query: query }, true);
                      scrollLeftWhenChanging('.ant-table-body');
                    }}
                  />
                </Spin>
              </div>
            </div>
          </div>
        </div>
      </SubHeader>
      <ExportFileModel />
      <CancelModal />
    </div>
  );
};

export default DonHangScreen;
