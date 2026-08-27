import { CloseOutlined } from '@ant-design/icons';
import { EStatusState } from '@models';
import { KhachHangFacade, LichSuChamSocFacade, LichSuChamSocModel } from '@store';
import { lang, routerLinks } from '@utils';
import { Button, Form, Input, Rate, Space, Spin } from 'antd';
import TextArea from 'antd/es/input/TextArea';
import { Drawer } from 'antd/lib';
import { useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import { useSearchParams } from 'react-router-dom';

export const LichSuChamSocForm = () => {
  const [form] = Form.useForm();
  const lichSuChamSocFacade = LichSuChamSocFacade();
  const [searchParams, setSearchParams] = useSearchParams();
  const id = searchParams.get('id') || '';
  const idLSCS = searchParams.get('idLSCS') || '';
  const navigate = useNavigate();
  const location = useLocation();
  const khachHangFacade = KhachHangFacade();
  useEffect(() => {
    switch (lichSuChamSocFacade.status) {
      case EStatusState.putFulfilled:
      case EStatusState.postFulfilled:
        handleCloseDrawer();
        lichSuChamSocFacade.get({ filter: JSON.stringify({ khachHangId: id }) });
        khachHangFacade.get(JSON.parse(khachHangFacade.queryParams ?? ''));
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
        break;
    }
  }, [lichSuChamSocFacade.status]);

  useEffect(() => {
    if (lichSuChamSocFacade.isVisible) {
      if (idLSCS || lichSuChamSocFacade.data?.id) {
        lichSuChamSocFacade.getById({ id: lichSuChamSocFacade.data?.id ?? idLSCS ?? '', keyState: '' });
      }
    }
  }, [lichSuChamSocFacade.isVisible]);
  useEffect(() => {
    if (idLSCS) lichSuChamSocFacade.set({ isVisible: true });
  }, [idLSCS]);

  useEffect(() => {
    for (const key in lichSuChamSocFacade.data) {
      form.setFieldValue(key, lichSuChamSocFacade.data[key as keyof LichSuChamSocModel]);
    }
    return () => {
      form.resetFields();
    };
  }, [lichSuChamSocFacade.data, idLSCS]);

  const onFinish = (values: LichSuChamSocModel) => {
    const data: LichSuChamSocModel = {
      ...values,
      khachHangId: id || '',
    };
    if (lichSuChamSocFacade.data?.id) {
      lichSuChamSocFacade.put({ ...data, id: lichSuChamSocFacade.data?.id });
    } else lichSuChamSocFacade.post({ ...data });
  };

  const handleCloseDrawer = () => {
    lichSuChamSocFacade.set({
      isVisible: false,
    });
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
  };
  return (
    <Drawer
      title={(lichSuChamSocFacade.isEdit ? 'Chỉnh sửa ' : 'Thêm mới ') + 'lịch sử chăm sóc'}
      open={lichSuChamSocFacade.isVisible}
      onClose={handleCloseDrawer}
      maskClosable={false}
      closeIcon={false}
      afterOpenChange={(visible) => {
        if (!visible) {
          form.resetFields();
          lichSuChamSocFacade.set({
            data: undefined,
            isEdit: false,
          });
          setSearchParams(
            (prev) => {
              prev.delete('idLSCS');
              return prev;
            },
            { replace: true },
          );
        }
      }}
      extra={<Button icon={<CloseOutlined />} type={'text'} onClick={handleCloseDrawer} />}
      footer={
        <Space className={'flex justify-end'}>
          <Button type={'default'} block onClick={handleCloseDrawer}>
            Huỷ bỏ
          </Button>
          <Button type={'primary'} className={'!py-0'} onClick={form.submit}>
            Lưu lại
          </Button>
        </Space>
      }
    >
      <Spin spinning={lichSuChamSocFacade.isFormLoading}>
        <Form form={form} layout={'vertical'} onFinish={onFinish}>
          <Form.Item name={'ghiChu'} label={'Ghi Chú'} rules={[{ required: true }]}>
            <TextArea rows={4} placeholder={'Nhập ghi chú'} />
          </Form.Item>
        </Form>
      </Spin>
    </Drawer>
  );
};
