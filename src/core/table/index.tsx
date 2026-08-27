import React, { forwardRef } from 'react';
import { Pagination, Table, TableColumnsType } from 'antd';
import { uuidv4 } from '@utils';

export type PropsTableGNT<T = any> = {
  columns: TableColumnsType<T>;
  facade: any;
  size?: 'large' | 'middle' | 'small';
  scroll?: { x?: string | number | true; y?: string | number; scrollToFirstRowOnChange?: boolean };
  className?: string;
  bordered?: boolean;
  pagination?: {
    size?: 'default' | 'small';
    pageSize?: number;
    pageSizeOptions?: string[] | number[];
  };
};

export const TableGNT = forwardRef(
  ({ columns, facade = {}, size, scroll, className, bordered, pagination }: PropsTableGNT, ref) => {
    const { result, isLoading, queryParams, time } = facade;
    const dataSource =
      result?.content?.map((item: any, index: number) => ({
        ...item,
        index: index + 1,
        key: uuidv4(),
      })) ?? [];

    return (
      <>
        <Table
          className={className}
          loading={isLoading}
          columns={columns}
          dataSource={dataSource}
          size={size}
          scroll={scroll}
          bordered={bordered}
          pagination={false}
        />
        <Pagination
          className={'flex justify-end py-3'}
          showSizeChanger
          showQuickJumper
          total={result?.totalElements}
          size={pagination?.size ?? 'default'}
          pageSize={pagination?.pageSize ?? 20}
          pageSizeOptions={pagination?.pageSizeOptions ?? [20, 40, 60, 80]}
          showTotal={(total, range) => `${range[0]}-${range[1]} of ${total} items`}
          responsive={true}
        />
      </>
    );
  },
);
