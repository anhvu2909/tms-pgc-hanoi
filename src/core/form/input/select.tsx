import { FormInstance, Select } from 'antd';
import { useEffect, useState } from 'react';

import { TableGet, TableItemFilterList } from '@models';
import { arrayUnique, cleanObjectKeyNull } from '@utils';

const Component = ({
  form,
  value,
  showSearch = true,
  maxTagCount,
  onChange,
  onBlur,
  placeholder,
  disabled,
  get,
  list,
  mode,
  firstLoad,
  className = '',
}: Type) => {
  const [_temp, set_temp] = useState({ current: [], list: list || [] });
  useEffect(() => {
    // BUGFIX: state nội bộ chỉ lấy "list" 1 lần lúc mount (useState initializer).
    // Nếu Select mount trước khi facade cha tải xong dữ liệu (ví dụ khoFacade.get({size:-1})
    // chưa resolve), dropdown bị đông cứng ở trạng thái rỗng mãi mãi, và giá trị đã chọn
    // sẵn (khi sửa) hiển thị id thô thay vì tên. Đồng bộ lại mỗi khi prop "list" đổi.
    if (list) set_temp((pre) => ({ ...pre, list }));
  }, [list]);
  const facade = get?.facade() || {};
  let __list = !get
    ? _temp.list
    : (get?.key ? facade[get?.key] : facade.result?.content)
        ?.map((e: any) => (get.format ? get.format(e) : e))
        .filter((item: any) => !!item.value);
  const loadData = async (fullTextSearch: string) => {
    if (get) {
      const { time, queryParams } = facade;
      const params = cleanObjectKeyNull(
        get.params ? get.params(fullTextSearch, form?.getFieldValue) : { filter: JSON.stringify({ fullTextSearch }) },
      );
      if (
        (get?.key ? facade[get?.key] : facade.result?.content) ||
        new Date().getTime() > time ||
        JSON.stringify(params) != queryParams
      )
        facade[get.method || 'get'](params);
    } else if (list) {
      set_temp((pre) => ({
        ...pre,
        list: list.filter(
          (item: any) =>
            !item?.label?.toUpperCase || item?.label?.toUpperCase().indexOf(fullTextSearch.toUpperCase()) > -1,
        ),
      }));
    }
  };
  useEffect(() => {
    if (firstLoad) {
      facade[get?.method || 'get'](firstLoad(value));
    }
  }, []);

  useEffect(() => {
    if (get?.data) {
      let data = get.data();
      if (get?.format && data) {
        data = mode === 'multiple' ? data.map(get.format) : [get.format(data)];
        if (JSON.stringify(data) !== JSON.stringify(_temp.current)) set_temp((pre) => ({ ...pre, current: data }));
      }
    }
  }, [get?.data]);
  if (_temp.current.length)
    __list = __list?.length ? arrayUnique([..._temp.current, ...__list], 'value') : _temp.current;

  return (
    <Select
      maxTagCount={maxTagCount}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      listHeight={200}
      filterOption={false}
      showSearch={true}
      loading={facade?.isLoading || false}
      allowClear
      onSearch={showSearch ? (value) => loadData(value) : undefined}
      value={value}
      maxTagPlaceholder={(array) => '+' + array.length}
      mode={mode}
      optionFilterProp="label"
      onBlur={onBlur}
      // onSelect={(value) => formItem?.onSelect && formItem?.onSelect(value, form)}
      onDropdownVisibleChange={(open) => open && !!facade?.isLoading && loadData('')}
      className={className}
    >
      {__list?.map((item: any, index: number) => (
        <Select.Option key={`${item.value}${index}`} value={item.value} disabled={item.disabled}>
          <span dangerouslySetInnerHTML={{ __html: item.label }} title={item.label} />
        </Select.Option>
      ))}
    </Select>
  );
};
type Type = {
  form?: FormInstance;
  value?: any;
  showSearch?: boolean;
  maxTagCount?: number | 'responsive';
  onChange: (e: any) => any;
  onBlur?: (e: any) => any;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  get?: TableGet;
  list?: TableItemFilterList[];
  mode?: 'multiple' | 'tags';
  firstLoad?: (data: any) => any;
};
export default Component;
