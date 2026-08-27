import React from 'react';
import { Checkbox, Form, FormInstance, FormListFieldData, FormListOperation, Table } from 'antd';
import { RightMapRoleFacade } from 'src/store/right-map-role';
import { rightList } from '@utils';
import { ColumnType } from 'antd/es/table';

interface RightMapEditableTableProps {
  data: FormListFieldData[];
  add: FormListOperation['add'];
  remove: FormListOperation['remove'];
  form: FormInstance;
}

const RightMapEditableTable: React.FC<RightMapEditableTableProps> = ({ data, form }) => {
  const rightMapRoleFacade = RightMapRoleFacade();

  return (
    <>
      <Table
        size={'small'}
        className={'w-3/4 mt-3 mx-auto'}
        scroll={{ x: 'max-content', y: 'calc(100vh - 280px)' }}
        dataSource={data}
        pagination={false}
        bordered
        columns={[
          {
            title: 'Chức năng',
            dataIndex: 'groupName',
            key: 'groupName',
            width: 200,
            render: (_, __, index) => {
              return form.getFieldValue(['data', index, 'groupName']);
            },
          },
          ...rightList.map(
            (right) =>
              ({
                title: right.name,
                dataIndex: right.property,
                key: right.property,
                width: 100,
                align: 'center',
                render: (_: any, __: any, index) => {
                  return form.getFieldValue(['data', index, right.property]) != null ? (
                    <Form.Item name={[index, right.property]} valuePropName="checked">
                      <Checkbox
                        disabled={
                          !rightMapRoleFacade.rightDatas?.find((x) => x.groupCode === 'RIGHTMAPROLE')?.isUpdateAllowed
                        }
                      />
                    </Form.Item>
                  ) : (
                    <div className="bg-gray-50 absolute inset-0"></div>
                  );
                },
              }) satisfies ColumnType,
          ),
        ]}
      />
    </>
  );
};

export default RightMapEditableTable;
