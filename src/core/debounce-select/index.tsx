import { Empty, Select, SelectProps, Spin } from 'antd';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import debounce from 'lodash/debounce';

export interface DebounceSelectProps<ValueType = any>
  extends Omit<SelectProps<ValueType | ValueType[]>, 'options' | 'children'> {
  fetchOptions?: (search: string) => Promise<ValueType[]>;
  debounceTimeout?: number;
}

function DebounceSelect<ValueType extends { key?: string; label: React.ReactNode; value: string | number } = any>({
  fetchOptions,
  debounceTimeout = 300,
  ...props
}: DebounceSelectProps<ValueType>) {
  const [fetching, setFetching] = useState(false);
  const [realDebouceTimeout, setRealDebouceTimeout] = useState(0);
  const [options, setOptions] = useState<ValueType[]>([]);
  const fetchRef = useRef(0);
  const debounceFetcher = useMemo(() => {
    const loadOptions = (value: string) => {
      fetchRef.current += 1;
      const fetchId = fetchRef.current;
      setOptions([]);
      setFetching(true);

      fetchOptions?.(value).then((newOptions) => {
        if (fetchId !== fetchRef.current) {
          return;
        }

        setOptions(newOptions);
        setFetching(false);
      });
    };

    return debounce(loadOptions, realDebouceTimeout);
  }, [fetchOptions, realDebouceTimeout]);

  useEffect(() => {
    if (!fetchOptions) {
      return;
    }

    debounceFetcher('');
    setRealDebouceTimeout(debounceTimeout);
  }, [fetchOptions]);

  return (
    <Select
      showSearch
      filterOption={false}
      onSearch={debounceFetcher}
      notFoundContent={
        fetching ? (
          <Spin size="small" className="w-full" />
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không có kết quả!" />
        )
      }
      {...props}
      options={options}
    />
  );
}

export default DebounceSelect;
