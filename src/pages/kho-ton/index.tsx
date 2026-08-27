import {
  Button,
  Card,
  Col,
  Divider,
  Form,
  FormProps,
  Image,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Select,
  Table,
} from 'antd';
import React, { useCallback, useEffect, useState } from 'react';
import { CloseOutlined, SearchOutlined } from '@ant-design/icons';
import { CodeTypeManagementFacade, KhoFacade, SanPhamFacade, SanPhamModel } from '@store';
import { DebounceSelectProps } from '@core/debounce-select';
import { WarehouseTransactionFacade } from 'src/store/xuat-nhap-ton';
import _ from 'lodash';
import { ColumnsType } from 'antd/es/table';
import { TableRowSelection } from 'antd/es/table/interface';
import Search from 'antd/es/input/Search';
import { API, routerLinks } from '@utils';

interface Product extends SanPhamModel {
  quantity: number;
}

interface ProductAddMore extends SanPhamModel {
  key: string | undefined;
}

type FormType = {
  warehouseTypeSelect?: string;
  warehouseSelect?: string;
};

const Page: React.FC = () => {
  const sanPhamFacade = SanPhamFacade();
  const codeTypeFacade = CodeTypeManagementFacade();
  const warehouseTransactionFacade = WarehouseTransactionFacade();
  const warehouseFacade = KhoFacade();
  const [form] = Form.useForm<FormType>();
  const [productManyForm] = Form.useForm();
  // const [dataManySource, setDataManySource] = useState<Product[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const selectedWarehouseType = Form.useWatch('warehouseTypeSelect', form);

  const handleDeleteProduct = (id: string) => {
    if (warehouseTransactionFacade.dataSource == undefined) {
      return;
    }
    const newDataSource = structuredClone(warehouseTransactionFacade.dataSource);
    warehouseTransactionFacade.set({
      dataSource: newDataSource.filter((x) => x.id !== id),
    });
  };

  function handleProductQuantityChange(id: string, newQuantity: number) {
    if (warehouseTransactionFacade.dataSource == undefined) {
      return;
    }
    const newDataSource = structuredClone(warehouseTransactionFacade.dataSource);
    const product = newDataSource.find((x) => x.id === id);
    if (product != undefined) {
      product.quantity = newQuantity;
    }
    warehouseTransactionFacade.set({
      dataSource: newDataSource,
    });
  }

  const columns: ColumnsType<Product> = [
    {
      title: 'STT',
      width: '8%',
      render(_, __, index) {
        return index + 1;
      },
    },
    {
      title: 'Sản phẩm',
      dataIndex: 'tenSanPham',
      width: '30%',
    },
    {
      title: 'Đơn vị tính',
      dataIndex: 'donViTinh',
      width: '10%',
    },
    {
      title: 'Số lượng',
      dataIndex: 'quantity',
      width: '10%',
      render(value, record) {
        return (
          <InputNumber
            className="w-full"
            min={1}
            value={value}
            onChange={(v) => handleProductQuantityChange(record.id ?? '-', v)}
          />
        );
      },
    },
    {
      title: 'Số kg',
      dataIndex: 'trongLuong',
      width: '10%',
      align: 'right',
    },
    {
      title: 'Quy đổi',
      width: '10%',
      align: 'right',
      render(value, record) {
        return (value = record.quantity * (record.trongLuong ?? 0));
      },
    },
    {
      title: 'Thao tác',
      dataIndex: 'operation',
      align: 'center',
      width: '10%',
      render: (_, record) => (
        <Popconfirm
          className="text-lg text-red-500"
          title="Chắc chắn xoá?"
          onConfirm={() => handleDeleteProduct(record.id ?? '')}
        >
          <CloseOutlined>Delete</CloseOutlined>
        </Popconfirm>
      ),
    },
  ];

  const columnsAddMore: ColumnsType<ProductAddMore> = [
    {
      title: 'STT',
      render(_, __, index) {
        return index + 1;
      },
    },
    {
      title: 'Mã sản phẩm',
      dataIndex: 'maSanPham',
    },
    {
      title: 'Sản phẩm',
      dataIndex: 'tenSanPham',
    },

    {
      title: 'Đơn vị tính',
      dataIndex: 'donViTinh',
    },
    {
      title: 'Số kg',
      dataIndex: 'trongLuong',
      align: 'right',
    },
  ];

  useEffect(() => {
    codeTypeFacade.get({ size: -1, filter: JSON.stringify({ type: 'LOAI_KHO' }) });
    sanPhamFacade.get({});
    warehouseTransactionFacade.set({
      isDisable: true,
      warehouseType: undefined,
      showModalAddMany: false,
      dataSource: [],
    });
  }, []);

  const handleChangeProduct = (selectedId: string) => {
    if (warehouseTransactionFacade.dataSource == undefined) {
      return;
    }

    const newDataSource = structuredClone(warehouseTransactionFacade.dataSource);
    const existedProduct = newDataSource.find((x) => x.id === selectedId);
    const selectedProduct = sanPhamFacade.pagination?.content.find((x) => x.id === selectedId);

    if (existedProduct) {
      existedProduct.quantity += 1;
    } else if (selectedProduct) {
      const newProductAdd = {
        ...selectedProduct,
        quantity: 1,
      } as Product;
      newDataSource.push(newProductAdd);
    }
    warehouseTransactionFacade.set({
      dataSource: newDataSource,
    });
  };

  const handleButtonCancel = () => {
    form.resetFields();
    warehouseTransactionFacade.set({
      dataSource: [],
    });
  };

  const productAddMoreDebounce = useCallback(
    _.debounce(async (value) => {
      const response = await API.get(
        `${routerLinks('SanPham', 'api')}?filter=${JSON.stringify({ fullTextSearch: value })}`,
      );
      if (!response.isSuccess) {
        return;
      }
      warehouseTransactionFacade.set({
        dataManySource: (response.data as any).content,
      });
    }, 500),
    [],
  );
  const productDebounce = useCallback(
    _.debounce(
      async (value) =>
        await sanPhamFacade.get({
          filter: JSON.stringify({
            fullTextSearch: value,
          }),
        }),
      500,
    ),
    [],
  );

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
    warehouseFacade.get({
      filter: JSON.stringify({
        loaiKho: selectedWarehouseType,
        fullTextSearch: '',
        isInitialized: false,
      }),
    });
  }, [selectedWarehouseType]);

  const onFinish: FormProps<FormType>['onFinish'] = async (values) => {
    if (warehouseTransactionFacade.dataSource == undefined) {
      return;
    }
    const payloadData = { warehouseId: values.warehouseSelect, productsData: warehouseTransactionFacade.dataSource };
    const response = await warehouseTransactionFacade.post(payloadData);
    if ((response.payload as any).code === 200) {
      form.resetFields();
      warehouseTransactionFacade.set({
        dataSource: [],
      });
    }
  };
  const handleAddMore = () => {
    if (warehouseTransactionFacade.dataSource == undefined) {
      return;
    }
    const newDataSource = structuredClone(warehouseTransactionFacade.dataSource);

    selectedRowKeys.forEach((element) => {
      const existProductData = newDataSource.find((x) => x.id === element);
      if (existProductData == undefined) {
        const productSelection = sanPhamFacade.pagination?.content.find(
          (product) => product.id != undefined && (element as string).includes(product.id),
        );

        newDataSource.push({
          ...productSelection,
          quantity: 1,
        });
      } else {
        existProductData.quantity += 1;
      }
    });
    warehouseTransactionFacade.set({
      dataSource: newDataSource,
    });
    handleProductManyClose();
  };

  const handleAddMoreButton = () => {
    productAddMoreDebounce('');
    warehouseTransactionFacade.set({ showModalAddMany: true });
  };

  const handleChangeWarehouse = () => {
    form.setFieldValue('warehouseSelect', null);
  };

  const handleProductManyClose = () => {
    warehouseTransactionFacade.set({ showModalAddMany: false, dataManySource: [] });
    setSelectedRowKeys([]);
    productManyForm.resetFields();
  };

  const onSelectChange = (newSelectedRowKeys: React.Key[]) => {
    setSelectedRowKeys(newSelectedRowKeys);
  };

  const rowSelection: TableRowSelection<ProductAddMore> = {
    selectedRowKeys,
    onChange: onSelectChange,
  };
  return (
    <>
      <div className={'flex flex-col sticky top-0 z-10'}>
        <div className={'flex justify-between bg-white'}>
          <div className={'mx-3 h-12 flex items-center text-gray-600 text-sm font-semibold'}>
            Khởi tạo tồn kho ban đầu
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6">
        <Form form={form} onFinish={onFinish}>
          <div className="mx-6 mt-6">
            <Card className="rounded-sm mb-6 pb-3" title="Thông tin kho" bordered={false}>
              <div className="grid grid-cols-3 gap-4">
                <div className="">
                  <Form.Item
                    name="warehouseTypeSelect"
                    label="Loại kho"
                    required
                    layout="vertical"
                    rules={[
                      {
                        required: true,
                        message: 'Vui lòng chọn loại kho',
                      },
                    ]}
                  >
                    <Select
                      showSearch
                      className="w-full"
                      size={'middle'}
                      placeholder="Chọn loại kho"
                      optionFilterProp="label"
                      onChange={handleChangeWarehouse}
                      options={codeTypeFacade.pagination?.content
                        .filter((x) => x.code !== 'KHO_NHA_MAY')
                        .map((item) => ({
                          label: item.title,
                          value: item.code,
                        }))}
                    />
                  </Form.Item>
                </div>

                <div className="col-span-2">
                  <Form.Item
                    name="warehouseSelect"
                    label="Kho"
                    required
                    layout="vertical"
                    rules={[
                      {
                        required: true,
                        message: 'Vui lòng chọn kho',
                      },
                    ]}
                  >
                    <Select
                      showSearch
                      placeholder="Chọn kho"
                      size={'middle'}
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
              </div>
              <div className="col-span-3">
                <span className="font-semibold">!Lưu ý: </span>Kho đã khởi tạo tồn sẽ không xuất hiện trong danh sách
                thả xuống
              </div>
            </Card>
          </div>

          <div className="mx-6 ">
            <Card
              className="rounded-sm mb-6"
              title={
                <div className="flex flex-row content-center justify-between">
                  <span>Danh sách sản phẩm</span>
                </div>
              }
              bordered={false}
            >
              <div className="flex mb-4">
                <Select
                  showSearch
                  placeholder="Tìm theo tên, mã sản phẩm"
                  onChange={handleChangeProduct}
                  filterOption={false}
                  prefix={<SearchOutlined />}
                  onSearch={productDebounce}
                  options={(sanPhamFacade.pagination?.content ?? []).map((item: SanPhamModel) => ({
                    value: item.id,
                    label: (
                      <div className="flex flex-row justify-between">
                        <div className="flex flex-col content-end gap-2">
                          <div className="font-semibold">{item.tenSanPham}</div>
                          <div className="text-blue-500 font-semibold">{item.maSanPham}</div>
                        </div>
                        <div className="flex flex-row gap-1">
                          <span>Khối lượng:</span>
                          <div className="font-semibold"> {item.trongLuong} kg</div>
                        </div>
                      </div>
                    ),
                  }))}
                  value={null}
                  loading={sanPhamFacade.isLoading}
                  className="flex-1 mr-3"
                  size={'middle'}
                />
                <Button size={'middle'} onClick={handleAddMoreButton}>
                  Chọn nhanh
                </Button>
              </div>
              <Table
                dataSource={warehouseTransactionFacade.dataSource}
                columns={columns}
                pagination={false}
                rowKey="id"
                scroll={{ y: 300 }}
              />
            </Card>
          </div>
          <div className="mx-6">
            <Card className=" flex justify-end rounded-sm " bordered={false}>
              <Button size={'middle'} className="w-20 mr-5" onClick={handleButtonCancel}>
                Huỷ bỏ
              </Button>
              <Button
                size={'middle'}
                disabled={
                  warehouseTransactionFacade.dataSource == undefined ||
                  warehouseTransactionFacade.dataSource.length === 0
                }
                className="w-20"
                type="primary"
                htmlType="submit"
              >
                Lưu lại
              </Button>
            </Card>
          </div>
        </Form>
      </div>
      <Modal
        title={'Chọn nhiều sản phẩm để khởi tạo tồn kho'}
        width={700}
        open={warehouseTransactionFacade.showModalAddMany}
        okText={'Chọn xong'}
        cancelText={'Thoát'}
        onOk={productManyForm.submit}
        onCancel={handleProductManyClose}
      >
        <Form form={productManyForm} initialValues={{ quantity: 0 }} onFinish={handleAddMore}>
          <Row gutter={[24, 15]}>
            <Col className="mt-2.5" span={24}>
              <Form.Item name={'searchManyProduct'}>
                <Search
                  placeholder="Tìm theo tên, mã sản phẩm..."
                  allowClear
                  onChange={(event) => productAddMoreDebounce(event.target.value)}
                  className="w-full"
                  size={'middle'}
                />
              </Form.Item>
            </Col>
            <div className="w-full h-[430px] overflow-y-auto miniScroll">
              <Table<ProductAddMore>
                rowSelection={rowSelection}
                columns={columnsAddMore}
                pagination={false}
                dataSource={
                  (warehouseTransactionFacade.dataManySource ?? []).map((item) => {
                    return {
                      ...item,
                      key: item.id,
                    };
                  }) || []
                }
              />
            </div>
          </Row>
        </Form>
      </Modal>
    </>
  );
};
export default Page;
