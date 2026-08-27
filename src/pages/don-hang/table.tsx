import { Button, Form, Input, Select, Table } from 'antd';
import { useEffect } from 'react';
import { SanPhamFacade } from '@store';
import { DonHangFacade } from 'src/store/don-hang';
import { useLocation } from 'react-router';

const { Column } = Table;

// GIẢ ĐỊNH (cần Bạn xác nhận): 1 đơn hàng không được chọn trùng 1 sản phẩm ở 2 dòng
// khác nhau — không thấy tu-dien-nghiep-vu-tms chốt rõ điều này, tạm chặn ở FE cho an
// toàn dữ liệu; RPC sm_donhang_create/update KHÔNG chặn trùng (chỉ chặn số lượng <= 0),
// nên nếu sau này đổi ý cho phép trùng, chỉ cần bỏ đoạn validate ở FE này là đủ.
const SanPhamDonHangEditableTable = (props: any) => {
  const { data, add, remove, form, isEdit, sum } = props;
  const sanPhamFacade = SanPhamFacade();
  const donHangFacade = DonHangFacade();
  const location = useLocation();
  const isAddPage = /add$/.test(location.pathname);

  useEffect(() => {
    sanPhamFacade.get({ size: -1 });
  }, []);

  // Màn hình thêm mới chỉ hiện sản phẩm có IsOrder=true; màn sửa hiện toàn bộ sản phẩm
  // (chốt ở skill tu-dien-nghiep-vu-tms mục 3).
  const allSanPham = (sanPhamFacade.pagination?.content ?? []).filter((item) => isAddPage ? item.isOrder === true : true);

  const getSelectedIds = (excludeIndex: number): string[] => {
    const rows = form.getFieldValue('sanPham') ?? [];
    return rows
      .map((row: any, idx: number) => (idx === excludeIndex ? undefined : row?.sanPhamId))
      .filter((id: string | undefined) => !!id);
  };

  const sanPhamOptions = (index: number) => {
    const selectedElsewhere = getSelectedIds(index);
    return allSanPham.map((item) => ({
      label: item.maSanPham + ' - ' + item.tenSanPham,
      value: item.id,
      disabled: !!item.id && selectedElsewhere.includes(item.id),
    }));
  };

  const forceRecalc = () => donHangFacade.set({ quyDoi: Math.random() });

  return (
    <>
      <Table size={'small'} className={'w-full'} dataSource={data} pagination={false}>
        <Column
          width={70}
          dataIndex={'stt'}
          title={'STT'}
          align="center"
          render={(value, row: any, index) => {
            return <p>{index + 1}</p>;
          }}
        />
        <Column
          width={500}
          dataIndex={'sanPham'}
          title={'Sản phẩm'}
          render={(value, row: any, index) => {
            return (
              <Form.Item
                name={[index, 'sanPhamId']}
                rules={[
                  { required: true, message: 'Hãy chọn thông tin sản phẩm' },
                  {
                    validator: (_, value) => {
                      if (!value) return Promise.resolve();
                      return getSelectedIds(index).includes(value)
                        ? Promise.reject('Sản phẩm này đã được chọn ở dòng khác')
                        : Promise.resolve();
                    },
                  },
                ]}
              >
                <Select
                  options={sanPhamOptions(index)}
                  showSearch
                  optionFilterProp={'label'}
                  placeholder="Chọn sản phẩm"
                  onChange={(value) => {
                    form.setFieldValue(['sanPham', index, 'quyDoi'], 0);
                    form.setFieldValue(['sanPham', index, 'soLuong'], undefined);
                    const chon = allSanPham.find((x) => x.id === value);
                    form.setFieldValue(['sanPham', index, 'trongLuong'], chon?.trongLuong ?? 0);
                    forceRecalc();
                  }}
                />
              </Form.Item>
            );
          }}
        />
        <Column
          width={140}
          align={'center'}
          dataIndex={'soLuong'}
          title={'Số lượng'}
          render={(value, row, index) => {
            return (
              <Form.Item
                name={[index, 'soLuong']}
                rules={[
                  { required: true, message: 'Nhập số lượng' },
                  {
                    validator: (_, v) =>
                      Number(v) > 0 ? Promise.resolve() : Promise.reject('Số lượng phải lớn hơn 0'),
                  },
                ]}
              >
                <Input
                  type={'number'}
                  min={1}
                  className={'text-right mx-auto'}
                  placeholder="Nhập số lượng"
                  onChange={(e) => {
                    const trongLuong = Number(form.getFieldValue(['sanPham', index, 'trongLuong'])) || 0;
                    const soLuong = Number(e.target.value) || 0;
                    form.setFieldValue(['sanPham', index, 'quyDoi'], soLuong * trongLuong);
                    forceRecalc();
                  }}
                />
              </Form.Item>
            );
          }}
        />
        <Column
          width={110}
          align={'center'}
          dataIndex={'trongLuong'}
          title={'Số kg'}
          render={(value, row, index) => {
            return (
              <Form.Item name={[index, 'trongLuong']}>
                <Input variant={'borderless'} readOnly className={'text-right'} />
              </Form.Item>
            );
          }}
        />
        <Column
          width={110}
          align={'center'}
          dataIndex={'quyDoi'}
          title={'Quy đổi'}
          render={(value, row, index) => {
            return (
              <Form.Item name={[index, 'quyDoi']}>
                <Input variant={'borderless'} readOnly className={'text-right'} />
              </Form.Item>
            );
          }}
        />
        <Column
          width={90}
          align="center"
          title={'Thao tác'}
          render={(value, row: any) => {
            return (
              <Button
                type="link"
                danger
                onClick={() => {
                  remove(row.name);
                  forceRecalc();
                }}
              >
                Xoá
              </Button>
            );
          }}
        />
      </Table>
      <div className={'mt-2'}>
        <Button onClick={add}>Thêm dòng</Button>
      </div>
    </>
  );
};

export default SanPhamDonHangEditableTable;
