import { Card, DatePicker, DatePickerProps, Form, Input, Select, Table, TableColumnsType } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { CodeTypeManagementFacade, KhoFacade, SanPhamFacade, SanPhamModel, WarehouseTransactionFacade } from '@store';
import { useCallback, useEffect, useMemo, useState } from 'react';
import _ from 'lodash';
import Search from 'antd/es/input/Search';
import dayjs, { Dayjs } from 'dayjs';
import { useSearchParams } from 'react-router-dom';
import { ColumnType } from 'antd/es/table';
import { productTypes } from '@utils';
import { PaginationProps } from 'antd/lib';

interface QuantityAndWeight {
  quantity: number;
  totalWeight: number;
}

interface WarehouseTransactionDataType {
  key: number;
  id: string;
  productName: string;
  unit: string;
  startBalance: QuantityAndWeight;
  importBalance: QuantityAndWeight;
  exportBalance: QuantityAndWeight;
  endBalance: QuantityAndWeight;
}

type FormType = {
  warehouseTypeSelect?: string;
  deliveryDateRange?: [string, string];
  warehouseSelect?: string;
};

const Page: React.FC = () => {
  const codeTypeFacade = CodeTypeManagementFacade();
  const warehouseTransactionFacade = WarehouseTransactionFacade();
  const warehouseFacade = KhoFacade();
  const [form] = Form.useForm<FormType>();
  const selectedWarehouseType = Form.useWatch('warehouseTypeSelect', form);
  const deliveryDateRange = Form.useWatch('deliveryDateRange', form);
  const warehouseSelect = Form.useWatch('warehouseSelect', form);
  const productName = Form.useWatch('productName', form);
  const productOnly = Form.useWatch('productOnly', form);
  const columns = useMemo(() => {
    const tmp: TableColumnsType<WarehouseTransactionDataType> = [
      {
        title: 'STT',
        dataIndex: 'Key',
        key: 'key',
        width: 70,
        render(value, record, index) {
          return record.key;
        },
      },
      {
        title: 'Sản phẩm',
        dataIndex: 'productName',
        key: 'productName',
        fixed: 'left',
      },
      {
        title: 'ĐVT',
        dataIndex: 'unit',
        key: 'unit',
        width: 100,
      },
      {
        title: 'Tồn đầu kỳ',
        dataIndex: 'startBalance',
        children: [
          {
            title: 'SL',
            dataIndex: 'startBalance.quantity',
            key: 'startBalance.quantity',
            align: 'right',
            width: 70,
            render(value, record, index) {
              return record.startBalance.quantity;
            },
          },
          {
            title: 'KL (kg)',
            dataIndex: 'startBalance.totalWeight',
            key: 'startBalance.totalWeight',
            align: 'right',
            width: 70,
            render(value, record, index) {
              return record.startBalance.totalWeight;
            },
          },
        ],
      },
      {
        title: 'Nhập trong kỳ',
        children: [
          {
            title: 'SL',
            dataIndex: 'importBalance.quantity',
            key: 'importBalance.quantity',
            align: 'right',
            width: 70,
            render(value, record, index) {
              return record.importBalance.quantity;
            },
          },
          {
            title: 'KL (kg)',
            dataIndex: 'importBalance.totalWeight',
            key: 'importBalance.totalWeight',
            align: 'right',
            width: 70,
            render(value, record, index) {
              return record.importBalance.totalWeight;
            },
          },
        ],
      },
      {
        title: 'Xuất trong kỳ',
        children: [
          {
            title: 'SL',
            dataIndex: 'exportBalance.quantity',
            key: 'exportBalance.quantity',
            align: 'right',
            width: 70,
            render(value, record, index) {
              return record.exportBalance.quantity;
            },
          },
          {
            title: 'KL (kg)',
            dataIndex: 'exportBalance.totalWeight',
            key: 'exportBalance.totalWeight',
            align: 'right',
            width: 70,
            render(value, record, index) {
              return record.exportBalance.totalWeight;
            },
          },
        ],
      },
      {
        title: 'Tồn cuối kỳ',
        dataIndex: 'endBalance',
        children: [
          {
            title: 'SL',
            dataIndex: 'endBalance.quantity',
            key: 'endBalance.quantity',
            align: 'right',
            width: 70,
            render(value, record, index) {
              return record.endBalance.quantity;
            },
          },
          {
            title: 'KL (kg)',
            dataIndex: 'endBalance.totalWeight',
            key: 'endBalance.totalWeight',
            align: 'right',
            width: 70,
            render(value, record, index) {
              return record.endBalance.totalWeight;
            },
          },
        ],
      },
    ];

    if (selectedWarehouseType === 'KHO_NHA_MAY') {
      return tmp.filter(
        (x: ColumnType<WarehouseTransactionDataType>) =>
          !['startBalance', 'endBalance'].includes(x.dataIndex as string),
      );
    }

    return tmp;
  }, [selectedWarehouseType]);

  useEffect(() => {
    codeTypeFacade.get({ size: -1, filter: JSON.stringify({ type: 'LOAI_KHO' }) });
    warehouseTransactionFacade.set({
      isDisable: true,
      warehouseType: undefined,
      showModalAddMany: false,
      dataSource: [],
      dataWarehouseTransactionList: undefined,
    });
  }, []);

  useEffect(() => {
    warehouseFacade.get({
      filter: JSON.stringify({
        loaiKho: selectedWarehouseType,
        fullTextSearch: '',
      }),
    });
  }, [selectedWarehouseType]);
  const warehouseDebounce = useCallback(
    _.debounce(
      (value) =>
        warehouseFacade.get({
          filter: JSON.stringify({
            loaiKho: selectedWarehouseType,
            fullTextSearch: value,
            isInitialized: false,
          }),
        }),
      500,
    ),
    [selectedWarehouseType],
  );

  useEffect(() => {
    handlePaginationWarehouseTransaction(1, 6);
  }, [deliveryDateRange, warehouseSelect, productName, productOnly]);

  const handleWarehouseChange = (value: string) => {
    warehouseTransactionFacade.set({
      warehouseSelect: value,
    });
  };
  const handleWarehouseTypeChange = () => {
    warehouseTransactionFacade.set({
      warehouseSelect: undefined,
      dataWarehouseTransactionList: undefined,
    });
    form.setFieldValue('warehouseSelect', undefined);
  };
  const handleProductNameChange = useCallback(
    _.debounce(
      async (value) =>
        warehouseTransactionFacade.set({
          productName: value,
        }),
      500,
    ),
    [],
  );

  const handleProductOnClear = () => {
    warehouseTransactionFacade.set({
      productOnly: undefined,
    });
  };

  const handlePaginationWarehouseTransaction = (page: number, pageSize: number) => {
    const filter: Record<string, any> = {};

    if (deliveryDateRange) {
      filter.dateRange = deliveryDateRange;
    }

    if (productName) {
      filter.fullTextSearch = productName;
    }

    if (productOnly) {
      filter.productType = productOnly;
    }

    if (warehouseSelect) {
      filter.warehouseId = warehouseSelect;
      warehouseTransactionFacade.getWarehouseTransaction({
        page: page,
        size: pageSize,
        filter: JSON.stringify(filter),
      });
    }
  };

  return (
    <>
      <div className={'flex flex-col sticky top-0 z-10'}>
        <div className={'flex justify-between bg-white'}>
          <div className={'mx-3 h-12 flex items-center text-gray-600 text-sm font-semibold'}>
            Báo cáo xuất nhập tồn
          </div>
        </div>
      </div>
      <Form form={form}>
        <Card className="transaction-card rounded-sm m-5 pr-32 ">
          <div className="grid grid-cols-[auto_1fr_auto_1fr]">
            <span className="leading-8 pr-6">Ngày ghi nhận: </span>
            <Form.Item name="deliveryDateRange">
              <DatePicker.RangePicker
                className="w-96"
                placeholder={['Từ ngày', 'Đến ngày']}
                onChange={(date, dateString) => {
                  warehouseTransactionFacade.set({
                    deliveryDateRange: dateString,
                  });
                }}
              />
            </Form.Item>

            <span className="leading-8 pr-6">Loại kho:</span>
            <Form.Item name="warehouseTypeSelect" layout="horizontal">
              <Select
                showSearch
                className="w-full "
                size={'middle'}
                placeholder="Chọn loại kho"
                optionFilterProp="label"
                onChange={handleWarehouseTypeChange}
                options={codeTypeFacade.pagination?.content.map((item) => ({
                  label: item.title,
                  value: item.code,
                }))}
              />
            </Form.Item>
            <span className="leading-8 pr-6">Kho:</span>
            <Form.Item name="warehouseSelect" className="col-span-3" layout="horizontal">
              <Select
                showSearch
                placeholder="Chọn kho"
                size={'middle'}
                onChange={handleWarehouseChange}
                onSearch={warehouseDebounce}
                filterOption={false}
                options={(warehouseFacade.pagination?.content ?? []).map((item: any) => ({
                  value: item.id,
                  label: (
                    <div className="flex flex-row content-end gap-2 justify-between">
                      <div className="font-normal">{item.ten}</div>
                    </div>
                  ),
                }))}
                loading={warehouseFacade.isLoading}
                disabled={!selectedWarehouseType}
              />
            </Form.Item>
          </div>
        </Card>

        <Card className=" rounded-sm m-5">
          <div className="grid grid-cols-3 gap-4">
            <Form.Item className="col-span-2" name="productName">
              <Search
                placeholder="Tìm kiếm theo mã, tên sản phẩm"
                onChange={(e) => handleProductNameChange(e.target.value)}
                size={'middle'}
              />
            </Form.Item>
            <Form.Item name="productOnly">
              <Select
                showSearch
                allowClear
                placeholder="Chọn loại sản phẩm"
                size={'middle'}
                onClear={handleProductOnClear}
                options={[
                  { value: productTypes.Binh.code, label: productTypes.Binh.name },
                  { value: productTypes.VoBinh.code, label: productTypes.VoBinh.name },
                  { value: productTypes.GasDu.code, label: productTypes.GasDu.name },
                ]}
                value={null}
              />
            </Form.Item>
          </div>

          <Table<WarehouseTransactionDataType>
            columns={columns}
            dataSource={warehouseTransactionFacade.dataWarehouseTransactionList?.content}
            rowKey={(record) => record.id}
            size="middle"
            loading={warehouseTransactionFacade.isLoading}
            pagination={{
              total: warehouseTransactionFacade.dataWarehouseTransactionList?.totalElements,
              pageSize: warehouseTransactionFacade.dataWarehouseTransactionList?.size,
              onChange: handlePaginationWarehouseTransaction,
            }}
          />
        </Card>
      </Form>
    </>
  );
};
export default Page;
