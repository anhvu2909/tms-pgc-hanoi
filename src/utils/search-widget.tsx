import { Form, FormInstance, Input } from 'antd';
import { useTranslation } from 'react-i18next';
import { SearchOutlined } from '@ant-design/icons';
import React, { FC } from 'react';
import { debounce } from 'lodash';

type _T_Props = {
  form: (form: FormInstance) => void;
  callback: (value: string) => void;
  size?: 'small' | 'middle' | 'large';
  placeholder?: string;
};
export const SearchWidget: FC<_T_Props> = (props) => {
  const { t } = useTranslation();
  const [form] = Form.useForm();

  let debounceSearch: any; // Biến để lưu trữ timeout

  const handleSearch = (value: string) => {
    clearTimeout(debounceSearch); // Hủy bỏ timeout trước đó (nếu có)
    debounceSearch = setTimeout(function () {
      props.callback(value);
      props.form(form);
    }, 300);
  };

  return (
    <Form form={form}>
      <Form.Item name={'search'} className={'mb-0'}>
        <Input
          size={props.size ?? 'middle'}
          allowClear
          placeholder={props.placeholder || t('Nhập để tìm kiếm...')}
          prefix={<SearchOutlined />}
          onChange={(e) => handleSearch(e.target.value)}
        />
      </Form.Item>
    </Form>
  );
};
