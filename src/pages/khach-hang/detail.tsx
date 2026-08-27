import { PlusOutlined } from '@ant-design/icons';
import { EStatusState, QueryParams } from '@models';
import { CodeTypeManagementFacade, KhachHangFacade, KhoModel, LichSuChamSocModel } from '@store';
import { lang, routerLinks, scrollLeftWhenChanging, uuidv4 } from '@utils';
import {
  Button,
  Col,
  Divider,
  Flex,
  Modal,
  Pagination,
  Row,
  Space,
  Spin,
  Table,
  TableColumnsType,
  Tag,
} from 'antd';
import dayjs from 'dayjs';
import { useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import { useSearchParams } from 'react-router-dom';
import { LichSuChamSocFacade } from '@store';
import { LichSuChamSocForm } from './lich-su-cham-soc.form';
import React from 'react'

interface DataType extends LichSuChamSocModel {
  key: string;
}

export const DetailModal = () => {
  const khachHangFacade = KhachHangFacade();
  const codeTypeFacade = CodeTypeManagementFacade();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = searchParams.get('page');
  const size = searchParams.get('size');
  const filter = searchParams.get('filter');
  const sort = searchParams.get('sort');
  const id = searchParams.get('id') || '';
  const type = searchParams.get('type') || '';

  const dataSourceKho: any =
    (khachHangFacade.data?.listKho ?? []).map((item, index) => ({
      ...item,
      index: (Number(page ?? 0) - 1) * Number(size ?? 0) + index + 1,
      key: uuidv4(),
    }));
  useEffect(() => {
    if ((id || khachHangFacade.data?.id) && type == 'detail') {
      khachHangFacade.getById({ id: id ?? '', keyState: '' });
    }
  }, [id, type]);

  const handlerBack = () => {
    khachHangFacade.set({ isVisible: false, isDetail: false, data: undefined });
    navigate(`/${lang}${routerLinks('KhachHang')}`);
  };

  const columnsKho: TableColumnsType<KhoModel> = [
    {
      title: 'STT',
      dataIndex: 'index',
      key: 'index',
      width: 80,
      align: 'center',
    },
    {
      title: 'Mã',
      dataIndex: 'ma',
      key: 'ma',
      width: 100,
    },
    {
      title: 'Tên',
      dataIndex: 'ten',
      key: 'ten',
    },
    {
      title: 'Địa chỉ',
      dataIndex: 'diaChi',
      key: 'diaChi',
    },
    {
      title: 'Ghi Chú',
      dataIndex: 'ghiChu',
      key: 'ghiChu',
    },
  ];

  return (
    <Modal
      centered
      width="100vw"
      className={'modal-fullScreen'}
      title={<h1>Chi tiết khách hàng</h1>}
      open={khachHangFacade.isDetail}
      cancelButtonProps={{ disabled: true }}
      closable
      destroyOnClose={true}
      onCancel={handlerBack}
      maskClosable={false}
      closeIcon={false}
      afterOpenChange={(visible) => {
        if (!visible) {
          setSearchParams(
            (prev) => {
              prev.delete('id');
              prev.delete('type');
              return prev;
            },
            { replace: true },
          );
        }
      }}
      footer={
        <>
          <Space className="fixed px-5 pb-2 left-0 right-0 bottom-0 flex justify-end z-20 bg-white border">
            <Divider />
            <Button type={'default'} block onClick={handlerBack}>
              Đóng lại
            </Button>
          </Space>
        </>
      }
    >
      <Divider />
      <Space className="pb-24">
        <LichSuChamSocForm />
        <Flex gap="middle" align="center" vertical>
          <Space>
            <Spin spinning={khachHangFacade.isFormLoading}>
              <div className="w-[1000wh]">
                <Row gutter={24} className="pb-2 border-b-2 border-gray-50">
                  <Col span={12}>
                    <Row gutter={24}>
                      <Col span={5}>
                        <div className="font-bold">Tên khách hàng :</div>
                      </Col>
                      <Col span={19} className="flex justify-between">
                        <div>{khachHangFacade.data?.ten}</div>
                        {/* <Button type={'primary'} onClick={handlerCopy}>
                          Copy thông tin
                        </Button> */}
                      </Col>
                    </Row>
                  </Col>
                  <Col span={12}>
                    <Row gutter={24}>
                      <Col span={5}>
                        <div className="font-bold">Mã khách hàng :</div>
                      </Col>
                      <Col span={19}>
                        <div>{khachHangFacade.data?.ma}</div>
                      </Col>
                    </Row>
                  </Col>
                </Row>
                <Row gutter={24} className="py-2 border-b-2 border-gray-50">
                  <Col span={12}>
                    <Row gutter={24}>
                      <Col span={5}>
                        <div className="font-bold">Ngày sinh :</div>
                      </Col>
                      <Col span={19}>
                        <div>{dayjs(khachHangFacade.data?.birthdate).format('DD-MM-YYYY')}</div>
                      </Col>
                    </Row>
                  </Col>
                  <Col span={12}>
                    <Row gutter={24}>
                      <Col span={5}>
                        <div className="font-bold">Số điện thoại :</div>
                      </Col>
                      <Col span={19}>
                        <div>{khachHangFacade.data?.soDienThoai}</div>
                      </Col>
                    </Row>
                  </Col>
                </Row>
                <Row gutter={24} className="py-2 ">
                  <Col span={12}>
                    <Row gutter={24}>
                      <Col span={5}>
                        <div className="font-bold">Loại khách hàng :</div>
                      </Col>
                      <Col span={19}>
                        <div>
                          {
                            codeTypeFacade.pagination?.content.find(
                              (x) => x.code == khachHangFacade.data?.loaiKhachHang,
                            )?.title
                          }
                        </div>
                      </Col>
                    </Row>
                  </Col>
                  <Col span={12}>
                    <Row gutter={24}>
                      <Col span={5}>
                        <div className="font-bold">Ghi Chú :</div>
                      </Col>
                      <Col span={19}>
                        <div>{khachHangFacade.data?.ghiChu}</div>
                      </Col>
                    </Row>
                  </Col>
                </Row>
                <Divider />
                <div className="mb-10">
                  <div className="flex justify-between">
                    <p className={'font-medium text-base'}>Danh sách địa chỉ : </p>
                  </div>
                  <div>
                    <div className={'grid justify-center items-center py-3'}>
                      <Spin spinning={khachHangFacade.isFormLoading}>
                        <div>
                          <Table
                            size="small"
                            className={'w-auto z-10'}
                            dataSource={dataSourceKho}
                            columns={columnsKho}
                            pagination={false}
                            scroll={{ y: 'calc(100vh - 265px)' }}
                          />
                        </div>
                      </Spin>
                    </div>
                  </div>
                </div>
                </div>
            </Spin>
          </Space>
        </Flex>
      </Space>
    </Modal>
  );
};
