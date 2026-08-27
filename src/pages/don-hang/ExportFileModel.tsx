import React from 'react';
import { QueryParams } from '@models';
import { Form, Modal, Radio, Space } from 'antd';
import { DonHangFacade } from 'src/store/don-hang';

export default function ExportFileModel() {
  const donHangFacade = DonHangFacade();
  const [exportFileForm] = Form.useForm();

  const handleCancel = () => {
    donHangFacade.set({
        isExportFileModal: false
    });
  };

  const onFinish = ({ isAll }: { isAll: boolean }) => {
    donHangFacade.exportExcelFile({
      page: isAll ? 1 : donHangFacade.query?.page || 1,
      size: isAll ? -1 : donHangFacade.query?.size || 20,
      sort: donHangFacade.query?.sort ?? '',
      filter: donHangFacade.query?.filter ?? '{}',
    });
  };
  return (
    <Modal
      title={'Xuất file danh sách đơn hàng '}
      open={donHangFacade.isExportFileModal}
      okText={'Xuất file'}
      cancelText={'Thoát'}
      onCancel={handleCancel}
      onOk={exportFileForm.submit}
      confirmLoading={donHangFacade.isLoading}
    >
      <Form
        className="mt-3"
        form={exportFileForm}
        initialValues={{
          isAll: true,
        }}
        layout="vertical"
        onFinish={onFinish}
      >
        <Form.Item label={<h3 className="font-semibold">Giới hạn kết quả xuất</h3>} name="isAll">
          <Radio.Group>
            <Space direction="vertical">
              <Radio value={true}>Tất cả đơn hàng</Radio>
              <Radio value={false}>Các đơn hàng trên trang này</Radio>
            </Space>
          </Radio.Group>
        </Form.Item>
      </Form>
    </Modal>
  );
}
