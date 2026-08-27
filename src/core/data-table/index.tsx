import { Checkbox, CheckboxOptionType, DatePicker, Radio, Spin, Table } from 'antd';
import classNames from 'classnames';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import React, { Ref, forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router';
dayjs.extend(utc);

import { Mask } from '@core/form/input';
import { DndContext, useDraggable } from '@dnd-kit/core';
import { restrictToHorizontalAxis } from '@dnd-kit/modifiers';
import { DataTableModel, QueryParams, TableGet, TableRefObject } from '@models';
import { Calendar, CheckCircle, CheckSquare, Search, Times } from '@svgs';
import { cleanObjectKeyNull, getSizePageByHeight, uuidv4 } from '@utils';
import { SizeType } from 'antd/es/config-provider/SizeContext';
import { SorterResult } from 'antd/lib/table/interface';
import { Button } from '../button';
import { Pagination } from '../pagination';

const RadioGroup = Radio.Group;
const CheckboxGroup = Checkbox.Group;
const { RangePicker } = DatePicker;

export const getQueryStringParams = (query: string) => {
  return query
    ? (/^[?#]/.test(query) ? query.slice(1) : query)
        .split('&')
        .reduce((params: { [selector: string]: string }, param: string) => {
          const [key, value] = param.split('=');
          params[key] = value ? decodeURIComponent(value.replace(/\+/g, ' ')) : '';
          return params;
        }, {})
    : {}; // Trim - from end of text
};

export const DataTable = forwardRef(
  (
    {
      columns = [],
      summary,
      id,
      showList = true,
      rowSelection,
      footer,
      defaultRequest = {
        page: 1,
        size: 1,
      },
      showPagination = true,
      leftHeader,
      rightHeader,
      showSearch = true,
      save = true,
      searchPlaceholder,
      subHeader,
      xScroll = 1000,
      yScroll,
      emptyText = 'No Data',
      onRow,
      pageSizeOptions = [],
      pageSizeRender = (sizePage: number) => sizePage,
      pageSizeWidth = '50px',
      paginationDescription = (from: number, to: number, total: number) => from + '-' + to + ' of ' + total + ' items',
      idElement = 'temp-' + uuidv4(),
      className = 'data-table',
      facade = {},
      data,
      size = 'small',
      formatData = (data) => data,
      ...prop
    }: Type,
    ref: Ref<TableRefObject>,
  ) => {
    useImperativeHandle(ref, () => ({
      onChange,
      handleDelete: async (id: string) => facade.delete(id),
    }));
    const { t } = useTranslation();
    const location = useLocation();
    const navigate = useNavigate();
    const idTable = useRef(idElement);
    const timeoutSearch = useRef<ReturnType<typeof setTimeout>>();
    const cols = useRef<DataTableModel[]>();
    const refPageSizeOptions = useRef<number[]>();
    const { pagination, isLoading, queryParams, time } = facade;
    // eslint-disable-next-line prefer-const
    let [params, setParams] = useState(
      save && location.search && location.search.indexOf('=') > -1
        ? { ...defaultRequest, ...getQueryStringParams(location.search) }
        : defaultRequest,
    );
    const tableRef = useRef<HTMLDivElement>(null);
    const scroll = useRef<{ x?: number; y?: number | string }>({ x: xScroll, y: yScroll });
    useEffect(() => {
      if (pageSizeOptions?.length === 0) {
        if (params?.size === 1) params.size = getSizePageByHeight();
        if (params.size! < 10 && params.size !== -1) params.size = 10;
        refPageSizeOptions.current = [
          params.size || 10,
          (params.size || 10) * 2,
          (params.size || 10) * 3,
          (params.size || 10) * 4,
          (params.size || 10) * 5,
        ];
      } else refPageSizeOptions.current = pageSizeOptions;
      setParams(
        cleanObjectKeyNull({
          ...params,
          sort: JSON.stringify(params.sort),
          filter: JSON.stringify(params.filter),
        }),
      );
      if (facade) {
        localStorage.setItem(idTable.current, JSON.stringify(cleanObjectKeyNull(params)));
        if (!pagination?.data || new Date().getTime() > time || JSON.stringify(params) != queryParams)
          onChange(params, false);
      }
      if (!scroll.current.x) {
        scroll.current.x = 0;
        columns.forEach((item) => {
          if (item.tableItem) {
            scroll.current.x! += item.tableItem?.width || 150;
          }
        });
      }
      return () => localStorage.removeItem(idTable.current);
    }, []);

    useEffect(() => {
      if (data?.length || pagination?.data?.length)
        setTimeout(() => {
          const table = tableRef.current?.querySelector('table');
          const cols = tableRef.current?.querySelectorAll('col');
          const widthTable = tableRef.current!.clientWidth - 1;
          if (parseInt(table!.style.width.replace('px', '')) - widthTable < 100) table!.style.width = widthTable + 'px';
          let totalWidth = 0;
          let number = 0;
          cols?.forEach((i) => {
            if (i.style.width) totalWidth += parseInt(i.style.width.replace('px', ''));
            if (!i.style.width) number += 1;
          });
          cols?.forEach((i) => {
            if (!i.style.width) i.style.width = (widthTable - totalWidth) / number + 'px';
          });
        }, 10);
    }, [data, pagination?.data, facade.status]);

    const onChange = (request?: QueryParams, changeNavigate = true) => {
      if (request) {
        localStorage.setItem(idTable.current, JSON.stringify(request));
        params = { ...request };
        if (save) {
          if (request.sort && typeof request.sort === 'object') request.sort = JSON.stringify(request.sort);
          if (request.filter && typeof request.filter === 'object') request.filter = JSON.stringify(request.filter);
          changeNavigate &&
            navigate(
              location.hash.substring(1) + '?' + new URLSearchParams(request as Record<string, string>).toString(),
            );
        }
      } else if (localStorage.getItem(idTable.current))
        params = JSON.parse(localStorage.getItem(idTable.current) || '{}');

      setParams(params);
      if (showList && facade?.get) facade?.get(cleanObjectKeyNull({ ...request }));
    };

    if (params.filter && typeof params.filter === 'string') params.filter = JSON.parse(params.filter);
    // if (params.sort && typeof params.sort === 'string') params.sort = JSON.parse(params.sort);
    const groupButton = (confirm: any, clearFilters: any, key: any, value: any) => (
      <div className="grid grid-cols-2 gap-2 sm:mt-1 mt-2">
        <Button
          text={t('components.datatable.reset')}
          onClick={() => {
            clearFilters();
            confirm();
          }}
          className={'justify-center !bg-gray-300 !text-black h-4/5 sm:h-auto !px-2 sm:px-4'}
        />
        <Button
          icon={<Search className="fill-white h-3 w-3" />}
          text={t('components.datatable.search')}
          onClick={() => confirm(value)}
          className={'justify-center h-4/5 sm:h-auto !px-2 sm:px-4'}
        />
      </div>
    );
    const valueFilter = useRef<{ [selector: string]: boolean }>({});
    const [filterDropdownOpen, setFilterDropdownOpen] = useState<any>({});
    const columnSearch = (get: TableGet, fullTextSearch = '', value?: any, facade: any = {}) => {
      if (get?.facade) {
        const params = get.params ? get.params(fullTextSearch, value) : { fullTextSearch };
        if (new Date().getTime() > facade.time || JSON.stringify(cleanObjectKeyNull(params)) != facade.queryParams)
          facade.get(cleanObjectKeyNull(params));
      }
    };
    // noinspection JSUnusedGlobalSymbols
    const getColumnSearchRadio = (filters: CheckboxOptionType[], key: string, get: TableGet = {}) => ({
      onFilterDropdownOpenChange: async (visible: boolean) => (valueFilter.current[key] = visible),
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }: any) => {
        const facade = get?.facade ? get?.facade() : {};
        useEffect(() => {
          if (get && !facade?.pagination?.data && valueFilter.current[key]) columnSearch(get, '', undefined, facade);
        }, [valueFilter.current[key]]);
        return (
          <Spin spinning={facade.isLoading === true || false}>
            <div className="p-1">
              {get?.facade && (
                <Mask
                  placeholder={t('components.datatable.pleaseEnterValueToSearch') || ''}
                  onChange={(e) => {
                    clearTimeout(timeoutSearch.current);
                    timeoutSearch.current = setTimeout(() => columnSearch(get, e.target.value, selectedKeys), 500);
                  }}
                  onPressEnter={(e) => columnSearch(get, e.currentTarget.value, undefined, facade)}
                />
              )}
              <div>
                <RadioGroup
                  options={
                    filters ||
                    get?.facade?.pagination?.data?.content?.map(get.format).filter((item: any) => !!item.value) ||
                    []
                  }
                  value={selectedKeys}
                  onChange={(e) => setSelectedKeys(e.target.value + '')}
                />
                {(filters?.length === 0 || facade?.pagination?.data?.length === 0) && (
                  <span className={'px-2'}>{t('components.datatable.No Data')}</span>
                )}
              </div>
              {groupButton(confirm, clearFilters, key, selectedKeys)}
            </div>
          </Spin>
        );
      },
      filterIcon: () => <CheckCircle className="h-3.5 w-3.5 fill-gray-600" />,
    });
    // noinspection JSUnusedGlobalSymbols
    const getColumnSearchCheckbox = (filters: any, key: any, get: TableGet = {}) => ({
      onFilterDropdownOpenChange: async (visible: boolean) => (valueFilter.current[key] = visible),
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }: any) => {
        const facade = get?.facade ? get?.facade() : {};
        useEffect(() => {
          if (get && !facade?.pagination?.data && valueFilter.current[key]) columnSearch(get, '', undefined, facade);
        }, [valueFilter.current[key]]);
        return (
          <Spin spinning={facade.isLoading === true || false}>
            <div className="p-1">
              {!!get?.facade && (
                <Mask
                  placeholder={t('components.datatable.pleaseEnterValueToSearch') || ''}
                  onChange={(e) => {
                    clearTimeout(timeoutSearch.current);
                    timeoutSearch.current = setTimeout(
                      () => columnSearch(get, e.target.value, selectedKeys, facade),
                      500,
                    );
                  }}
                  onPressEnter={async (e) => columnSearch(get, e.currentTarget.value, undefined, facade)}
                />
              )}
              <div>
                <CheckboxGroup
                  options={
                    filters ||
                    facade?.pagination?.data?.content?.map(get.format).filter((item: any) => !!item.value) ||
                    []
                  }
                  defaultValue={selectedKeys}
                  onChange={(e) => setSelectedKeys(e)}
                />
                {(filters?.length === 0 || facade?.pagination?.data?.content?.length === 0) && (
                  <span className={'px-2'}>{t('components.datatable.No Data')}</span>
                )}
              </div>
              {groupButton(confirm, clearFilters, key, selectedKeys)}
            </div>
          </Spin>
        );
      },
      filterIcon: (filtered: boolean) => (
        <CheckSquare className={classNames('h-3.5 w-3.5', { 'fill-teal-900': filtered, 'fill-gray-600': !filtered })} />
      ),
    });
    // noinspection JSUnusedGlobalSymbols
    const getColumnSearchInput = (key: any) => ({
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }: any) => (
        <div className="p-1">
          <Mask
            id={idTable.current + '_input_filter_' + key}
            value={selectedKeys}
            placeholder={t('components.datatable.pleaseEnterValueToSearch') || ''}
            onChange={(e) => setSelectedKeys(e.target.value)}
            onPressEnter={(e) => confirm()}
          />
          {groupButton(confirm, clearFilters, key, selectedKeys)}
        </div>
      ),
      filterIcon: (filtered: boolean) => (
        <Search className={classNames('h-3.5 w-3.5', { 'fill-teal-900': filtered, 'fill-gray-600': !filtered })} />
      ),
      filterDropdownOpen: !!filterDropdownOpen[key],
      onFilterDropdownOpenChange: (visible: boolean) => {
        setFilterDropdownOpen({ [key]: visible });
        if (visible) {
          setTimeout(
            () => (document.getElementById(idTable.current + '_input_filter_' + key) as HTMLInputElement).select(),
            100,
          );
        }
      },
    });
    // noinspection JSUnusedGlobalSymbols
    const getColumnSearchDate = (key: any) => ({
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }: any) => (
        <div className={'p-1'}>
          <RangePicker
            renderExtraFooter={() => (
              <Button
                icon={<CheckCircle className="h-5 w-5 fill-white" />}
                text={t('components.datatable.ok')}
                onClick={() => (document.activeElement as HTMLElement).blur()}
                className={'w-full justify-center !py-0'}
              />
            )}
            format={['DD-MM-YYYY', 'DD-MM-YY']}
            value={!!selectedKeys && selectedKeys.length && [dayjs(selectedKeys[0]), dayjs(selectedKeys[1])]}
            // onChange={(e: any[]) => {
            //   setSelectedKeys([
            //     e[0].startOf('day').utc().format('YYYY-MM-DDTHH:mm:ss[Z]'),
            //     e[1].endOf('day').utc().format('YYYY-MM-DDTHH:mm:ss[Z]'),
            //   ]);
            // }}
          />
          {groupButton(confirm, clearFilters, key, selectedKeys)}
        </div>
      ),
      filterIcon: (filtered: boolean) => (
        <Calendar className={classNames('h-3.5 w-3.5', { 'fill-teal-900': filtered, 'fill-gray-600': !filtered })} />
      ),
    });
    cols.current = columns
      .filter((col) => !!col && !!col.tableItem)
      .map((col) => {
        let item = col.tableItem;

        if (item?.filter) {
          const filter = params?.filter as any;
          if (params.filter && filter[col!.name!]) item = { ...item, defaultFilteredValue: filter[col!.name!] };

          switch (item?.filter?.type) {
            case 'radio':
              item = {
                ...item,
                ...getColumnSearchRadio(
                  item.filter.list as CheckboxOptionType[],
                  item.filter.name || col!.name!,
                  item.filter.get,
                ),
              };
              break;
            case 'checkbox':
              item = {
                ...item,
                ...getColumnSearchCheckbox(item.filter.list, item.filter.name || col.name, item.filter.get),
              };
              break;
            case 'date':
              item = { ...item, ...getColumnSearchDate(item.filter.name || col.name) };
              break;
            default:
              item = { ...item, ...getColumnSearchInput(item?.filter?.name || col.name) };
          }
          delete item.filter;
        }
        const sort = params?.sort as any;
        if (item?.sorter && sort && sort[col!.name!])
          item.defaultSortOrder =
            sort[col!.name!] === 'ASC'
              ? `+${sort[col!.name!]}`
              : sort[col!.name!] === 'DESC'
                ? `-${sort[col!.name!]}`
                : '';
        if (item && !item?.onCell)
          item.onCell = (record) => ({
            className: record?.id && record?.id === (id || facade?.data?.id) ? '!bg-teal-100' : '',
          });
        // noinspection JSUnusedGlobalSymbols
        return {
          title: t(col.title || ''),
          dataIndex: col.name,
          ellipsis: true,
          ...item,
        };
      });

    const handleTableChange = (
      pagination?: { page?: number; perPage?: number },
      filters = {},
      sort?: SorterResult<any>,
      tempFullTextSearch?: string,
    ) => {
      let tempPageIndex = pagination?.page || params.page;
      const tempPageSize = pagination?.perPage || params.size;
      const tempSort: any =
        sort && sort?.field && sort?.order
          ? sort.order === 'ascend'
            ? `+${sort.field}`
            : sort.order === 'descend'
              ? `-${sort.field}`
              : ''
          : sort?.field
            ? null
            : sort;
      if (tempFullTextSearch !== params.fullTextSearch) tempPageIndex = 1;
      const tempParams = cleanObjectKeyNull({
        ...params,
        page: tempPageIndex,
        size: tempPageSize,
        sort: tempSort,
        filter: JSON.stringify(cleanObjectKeyNull(filters)),
        fullTextSearch: tempFullTextSearch,
      });
      onChange && onChange(tempParams);
    };
    if (!data) data = pagination?.content;
    const loopData = (array?: any[]): any[] => {
      return array
        ? formatData(array).map((item, index) => ({
            ...item,
            stt: (Number(params.page) - 1) * Number(params.size) + index + 1,
            key: item.id || uuidv4(),
            children: item.children && loopData(item.children),
          }))
        : [];
    };
    let indexLeft: number;
    let left: any;
    let wLeft: number;
    let table: HTMLTableElement;
    let wTable: number;
    return (
      <div ref={tableRef} className={classNames(className, 'intro-x')}>
        {(!!showSearch || !!leftHeader || !!rightHeader) && (
          <div className="lg:flex justify-between mb-2.5 gap-y-2.5 flex-wrap">
            {showSearch ? (
              <div className="relative">
                <Search
                  className="w-3.5 h-3.5 my-1 fill-gray-500 text-lg absolute top-2 left-2.5 z-10"
                  onClick={() => {
                    if (params.fullTextSearch) {
                      (document.getElementById(idTable.current + '_input_search') as HTMLInputElement).value = '';
                      handleTableChange(undefined, params.filter, params.sort as SorterResult<any>, '');
                    }
                  }}
                />
                <Mask
                  id={idTable.current + '_input_search'}
                  value={params.fullTextSearch}
                  placeholder={searchPlaceholder || (t('components.datatable.pleaseEnterValueToSearch') as string)}
                  onChange={() => {
                    clearTimeout(timeoutSearch.current);
                    timeoutSearch.current = setTimeout(
                      () =>
                        handleTableChange(
                          undefined,
                          params.filter,
                          params.sort as SorterResult<any>,
                          (document.getElementById(idTable.current + '_input_search') as HTMLInputElement).value.trim(),
                        ),
                      500,
                    );
                  }}
                  onPressEnter={(e) =>
                    handleTableChange(
                      undefined,
                      params.filter,
                      params.sort as SorterResult<any>,
                      (document.getElementById(idTable.current + '_input_search') as HTMLInputElement).value.trim(),
                    )
                  }
                />
                {!!params.fullTextSearch && (
                  <Times
                    className="w-3.5 h-3.5 my-1 fill-gray-500 text-lg las absolute top-2 right-3 z-10"
                    onClick={() => {
                      if (params.fullTextSearch) {
                        (document.getElementById(idTable.current + '_input_search') as HTMLInputElement).value = '';
                        handleTableChange(undefined, params.filter, params.sort as SorterResult<any>, '');
                      }
                    }}
                  />
                )}
              </div>
            ) : (
              <></>
            )}
            {!!leftHeader && <div className={'mt-2 sm:mt-0'}>{leftHeader}</div>}
            {!!rightHeader && <div className={'mt-2 sm:mt-0'}>{rightHeader}</div>}
          </div>
        )}
        {subHeader && subHeader(pagination?.totalElements)}
        {!!showList && (
          <DndContext
            modifiers={[restrictToHorizontalAxis]}
            onDragMove={({ activatorEvent, delta }) => {
              if (!left) {
                left = (activatorEvent.target as HTMLSpanElement)!.closest('th');
                const th = Array.prototype.slice.call(tableRef.current?.querySelectorAll('thead > tr > th'));
                indexLeft = th.indexOf(left) + 1;
                left = tableRef.current!.querySelector('col:nth-of-type(' + indexLeft + ')')!;
                wLeft = parseFloat(left.style.width);
                table = tableRef.current!.querySelector('table')!;
                wTable = parseFloat(table!.style.width);
              }
              left = tableRef.current!.querySelector('col:nth-of-type(' + indexLeft + ')')!;
              const p = delta.x * 0.6;
              left.style.width = wLeft + p + 'px';
              left.style.minWidth = wLeft + p + 'px';
              table!.style.width = wTable + p + 'px';
            }}
            onDragEnd={() => (left = undefined)}
          >
            <Table
              onRow={onRow}
              components={{
                header: {
                  cell: ({ children, ...restProps }: { children: React.ReactNode; title?: string }) => (
                    <th {...restProps}>
                      {children}
                      <Draggable id={restProps?.title} />
                    </th>
                  ),
                },
              }}
              locale={{
                emptyText: (
                  <div className="bg-gray-100 text-gray-400 py-4">{t(`components.datatable.${emptyText}`)}</div>
                ),
              }}
              loading={isLoading}
              columns={cols.current}
              summary={summary}
              pagination={false}
              dataSource={loopData(data)}
              onChange={(pagination: any, filters: any, sort: any) =>
                handleTableChange(undefined, filters, sort as SorterResult<any>, params.fullTextSearch)
              }
              scroll={yScroll === 'auto' ? undefined : scroll.current}
              size={size}
              rowSelection={rowSelection}
              {...prop}
            />
            {refPageSizeOptions.current && showPagination && (
              <Pagination
                total={pagination?.totalElements}
                page={+params!.page!}
                perPage={+params!.size!}
                pageSizeOptions={refPageSizeOptions.current}
                pageSizeRender={pageSizeRender}
                pageSizeWidth={pageSizeWidth}
                queryParams={(pagination: { page?: number; perPage?: number }) =>
                  handleTableChange(pagination, params.filter, params.sort as SorterResult<any>, params.fullTextSearch)
                }
                paginationDescription={paginationDescription}
                idElement={idTable.current}
                {...prop}
              />
            )}
          </DndContext>
        )}
        {!!footer && <div className="footer">{footer(pagination)}</div>}
      </div>
    );
  },
);
DataTable.displayName = 'HookTable';
type Type = {
  id?: string;
  columns: DataTableModel[];
  summary?: (data: any) => any;
  showList?: boolean;
  rowSelection?: object;
  footer?: (result: any) => any;
  defaultRequest?: QueryParams;
  showPagination?: boolean;
  leftHeader?: JSX.Element;
  rightHeader?: JSX.Element;
  showSearch?: boolean;
  save?: boolean;
  searchPlaceholder?: string;
  subHeader?: (count: number) => any;
  xScroll?: number;
  yScroll?: number | string;
  emptyText?: JSX.Element | string;
  onRow?: (data: any) => { onDoubleClick?: () => void; onClick?: () => void; onContextMenu?: () => void };
  pageSizeOptions?: number[];
  pageSizeRender?: (sizePage: number) => number | string;
  pageSizeWidth?: string;
  paginationDescription?: (from: number, to: number, total: number) => string;
  idElement?: string;
  className?: string;
  facade?: any;
  data?: any[];
  formatData?: (data: any) => any[];
  size?: SizeType;
};
const Draggable = (props: any) => {
  const { attributes, listeners, setNodeRef } = useDraggable({ id: props.id });
  return (
    <span
      className={'opacity-0 cursor-col-resize absolute right-0 top-0 z-50 h-full w-1'}
      ref={setNodeRef}
      {...listeners}
      {...attributes}
    />
  );
};
