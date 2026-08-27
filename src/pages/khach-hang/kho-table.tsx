import { KhachHangFacade } from '@store';
import { Button, Flex, Form, Input, InputNumber, Modal, Pagination, Select, Space, Table } from 'antd';
import { memo, useEffect, useMemo, useRef } from 'react';
import { AddressFacade } from 'src/store/address';
import React from 'react'
import { useParams } from 'react-router';

const { Column } = Table;

const KhoTable = (props: any) => {
  const { data, add, remove, form, isEdit } = props;
  const addressFacade = AddressFacade();
  const {id} = useParams()
  const khachHangFacade = KhachHangFacade();
  const tinhRef = useRef<number>();
  const listTinhRef = useRef<number[]>([]);
  const listHuyenRef = useRef<number[]>([]);
  const huyenRef = useRef<number>();
  const listKho = form.getFieldValue('listKho')

  useEffect(() => {
    addressFacade.getTinh({ filter: '{}' });
    addressFacade.set({ listHuyen: undefined });
  }, []);

  useEffect(() => {
    if (listTinhRef.current.length  > 0){
      addressFacade.getHuyen({ filter: JSON.stringify({ parentIds: listTinhRef.current }) });
    }
  }, [listTinhRef.current]);

  useEffect(() => {
    if (listHuyenRef.current.length > 0){
      addressFacade.getXa({ filter: JSON.stringify({ parentIds: listHuyenRef.current }) });
    }
  }, [listHuyenRef.current]);

  useEffect(() => {
    if (addressFacade.listTinh) {
      addressFacade.set({ listHuyen: undefined });
    }
  }, [addressFacade.listTinh]);

  useEffect(() => {
    if (addressFacade.listHuyen) {
      addressFacade.set({ listXa: undefined });
    }
  }, [addressFacade.listHuyen]);

  return (
    <>
      <Table
        size="small"
        dataSource={data}
        scroll={isEdit ? { y: 'calc(75vh - 265px)' } : { y: 'calc(65vh - 265px)' }}
        pagination={false}
      >
        <Column
          width={40}
          dataIndex={'stt'}
          title={'STT'}
          align="center"
          render={(value, row: any, index) => {
            return <p>{index + 1}</p>;
          }}
        />
        <Column
          width={100}
          dataIndex={'ma'}
          title={'Mã'}
          render={(value, row: any, index) => {
            return (
              <Form.Item name={[index, 'ma']} rules={[{ required: true, message: 'Hãy nhập thông tin cho trường Mã' }]}>
                <Input placeholder="Nhập mã" />
              </Form.Item>
            );
          }}
        />
        <Column
          width={150}
          dataIndex={'ten'}
          title={'Tên'}
          render={(value, row, index) => {
            return (
              <Form.Item
                name={[index, 'ten']}
                rules={[{ required: true, message: 'Hãy nhập thông tin cho trường Tên' }]}
              >
                <Input placeholder="Nhập tên" />
              </Form.Item>
            );
          }}
        />
        <Column
          width={250}
          dataIndex={'diaChi'}
          title={'Địa chỉ'}
          render={(value, row, index) => {
            return (
              <Form.Item
                name={[index, 'diaChi']}
                //rules={[{ required: true, message: 'Hãy nhập thông tin cho trường Địa chỉ' }]}
              >
                <Input placeholder="Nhập địa chỉ" />
              </Form.Item>
            );
          }}
        />
        <Column
          width={150}
          dataIndex={'provinceCode'}
          title={'Tỉnh'}
          render={(value, row, index) => {
            if( listKho && listKho?.length > 0) {
              listTinhRef.current.push(listKho[index].provinceCode)
            }
            return (
              <>
                <Form.Item name={[index, 'provinceCode']}
                  //rules={[{ required: true, message: 'Hãy chọn Tỉnh' }]}
                >
                  <Select
                    showSearch
                    allowClear
                    optionFilterProp={'label'}
                    options={addressFacade.listTinh}
                    placeholder="Chọn tỉnh"
                    onChange={(value, option: any) => {
                      if (tinhRef.current !== value && value) {
                        huyenRef.current = undefined;
                        tinhRef.current = value;
                        addressFacade.getHuyen({ filter: JSON.stringify({ parentId: value }) });
                        form.setFieldValue(['listKho', index, 'provinceName'], option.label.toString());
                      }
                    }}
                  />
                </Form.Item>
                <Form.Item hidden name={[index, 'provinceName']}>
                  <Input />
                </Form.Item>
              </>
            );
          }}
        />
        <Column
          width={150}
          dataIndex={'districtCode'}
          title={'Huyện'}
          render={(value, row, index) => {
            if( listKho && listKho?.length > 0) {
              listTinhRef.current.push(listKho[index].districtCode)
            }
            return (
              <>
                <Form.Item name={[index, 'districtCode']}
                  // rules={[{ required: true, message: 'Hãy chọn Huyện' }]}
                >
                  <Select
                    showSearch
                    allowClear
                    optionFilterProp={'label'}
                    options={addressFacade.listHuyen}
                    placeholder="Chọn huyện"
                    onChange={(value, option: any) => {
                      if( listKho && listKho?.length > 0) {
                        listHuyenRef.current.push(listKho[index].communeCode)
                      }
                      if (huyenRef.current !== value && value) {
                        huyenRef.current = value;
                        addressFacade.getXa({ filter: JSON.stringify({ parentId: value }) });
                        form.setFieldValue(['listKho', index, 'districtName'], option.label.toString());
                      }
                    }}
                  />
                </Form.Item>
                <Form.Item hidden name={[index, 'districtName']}>
                  <Input />
                </Form.Item>
              </>
            );
          }}
        />
        <Column
          width={170}
          dataIndex={'communeCode'}
          title={'Phường/xã'}
          render={(value, row, index) => {
            if( listKho && listKho?.length > 0) {
              listHuyenRef.current.push(listKho[index].districtCode)
            }
            return (

              <>
                <Form.Item name={[index, 'communeCode']}
                  // rules={[{ required: true, message: 'Hãy chọn phường/xã' }]}
                >
                  <Select
                    showSearch
                    allowClear
                    optionFilterProp={'label'}
                    options={addressFacade.listXa}
                    placeholder="Chọn phường/xã"
                    onChange={(value, option: any) => {
                      form.setFieldValue(['listKho', index, 'communeName'], option.label.toString());
                    }}
                  />
                </Form.Item>
                <Form.Item hidden name={[index, 'communeName']}>
                  <Input />
                </Form.Item>
              </>
            );
          }}
        />
        <Column
          width={150}
          dataIndex={'latitude'}
          title={'Vĩ độ'}
          render={(value, row, index) => {
            return (
              <Form.Item name={[index, 'latitude']}>
                <Input placeholder="Nhập vĩ độ" />
              </Form.Item>
            );
          }}
        />
        <Column
          width={150}
          dataIndex={'longitude'}
          title={'Kinh độ'}
          render={(value, row, index) => {
            return (
              <Form.Item name={[index, 'longitude']}>
                <Input placeholder="Nhập kinh độ" />
              </Form.Item>
            );
          }}
        />
        <Column
          width={200}
          dataIndex={'ghiChu'}
          title={'Ghi chú'}
          render={(value, row, index) => {
            return (
              <Form.Item name={[index, 'ghiChu']}>
                <Input placeholder="Nhập ghi chú" />
              </Form.Item>
            );
          }}
        />
        <Column
          width={70}
          align="center"
          title={'Thao tác'}
          render={(value, row: any, index) => {
            return (
              <Button type="link" danger onClick={() => remove(row.name)}>
                Xoá
              </Button>
            );
          }}
        />
      </Table>
      <Flex className="fixed !pt-2 left-12 bottom-28 flex" align="center" justify="space-between">
        <Space>
          <Button onClick={add}>Thêm dòng</Button>
        </Space>
      </Flex>
    </>
  );
};

export default memo(KhoTable);
