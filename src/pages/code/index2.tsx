import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Select, Spin, Tree } from 'antd';
import classNames from 'classnames';
import { DataTable } from '@core/data-table';
import { mapTreeObject, renderTitleBreadcrumbs } from '@utils';
import { CodeTypeManagementFacade, TypesCodeTypeManagementFacade } from '@store';
import { EStatusState, TableRefObject } from '@models';
import { Arrow, Plus } from '@svgs';
import _column from '@column/code';
import { Button } from '@core/button';
import { DrawerForm } from '@core/drawer';

const Page = () => {
  const { t } = useTranslation();
  const dataTableRef = useRef<TableRefObject>(null);
  const titleTypeCode = useRef<string>('');
  const codeTypeManagementFacade = CodeTypeManagementFacade();

  const request = JSON.parse(codeTypeManagementFacade.queryParams || '{}');
  if (!request.filter || typeof request?.filter === 'string') request.filter = JSON.parse(request?.filter || '{}');

  const typesCodeTypeManagementFacade = TypesCodeTypeManagementFacade();
  useEffect(() => {
    if (!typesCodeTypeManagementFacade.pagination) typesCodeTypeManagementFacade.get({});
    return () => {
      codeTypeManagementFacade.set({ isLoading: true, status: EStatusState.idle });
    };
  }, []);

  // useEffect(() => {
  //   const filter = JSON.parse(getQueryStringParams(location.search).filter);
  //   switch (typesCodeTypeManagementFacade.status) {
  //     case EStatusState.getFulfilled:
  //       if (typesCodeTypeManagementFacade?.result?.content) {
  //         titleTypeCode.current =
  //           typesCodeTypeManagementFacade?.result?.content.find((item: TypesCodeTypeManagement) => item.code === filter.type)?.title ?? '';
  //       }
  //       break;
  //   }
  // }, [typesCodeTypeManagementFacade.status]);

  useEffect(() => {
    renderTitleBreadcrumbs(t('pages.Code'), [
      { title: t('titles.Setting'), link: '' },
      { title: t('titles.Code'), link: '' },
    ]);
    switch (codeTypeManagementFacade.status) {
      case EStatusState.putFulfilled:
      case EStatusState.postFulfilled:
      case EStatusState.deleteFulfilled:
        dataTableRef?.current?.onChange(request);
        break;
    }
  }, [codeTypeManagementFacade.status]);

  return (
    <div className={'grid grid-cols-12 gap-3 px-2.5 pt-2.5'}>
      <DrawerForm
        size={'large'}
        facade={codeTypeManagementFacade}
        title={t(codeTypeManagementFacade.data ? 'pages.Code/Edit' : 'pages.Code/Add', {
          type: codeTypeManagementFacade?.data?.title ?? '',
        })}
        onSubmit={(values) => {
          if (codeTypeManagementFacade.data)
            codeTypeManagementFacade.put({ ...values, id: codeTypeManagementFacade.data.id });
          else codeTypeManagementFacade.post({ ...values });
        }}
        columns={_column.form()}
      ></DrawerForm>
      <div className="col-span-12 md:col-span-4 lg:col-span-3 -intro-x">
        <div className="shadow rounded-xl w-full bg-white overflow-hidden">
          <div className="h-14 flex justify-between items-center border-b border-gray-100 px-4 py-2">
            <h3 className={'font-bold text-lg'}>Type Code</h3>
          </div>
          <Spin spinning={typesCodeTypeManagementFacade.isLoading}>
            <div className="h-[calc(100vh-12rem)] overflow-y-auto relative scroll hidden sm:block">
              <Tree
                blockNode
                showLine
                autoExpandParent
                defaultExpandAll
                switcherIcon={<Arrow className={'w-4 h-4'} />}
                treeData={mapTreeObject(typesCodeTypeManagementFacade.pagination?.content)}
                titleRender={(data: any) => (
                  <div
                    className={classNames(
                      { 'bg-gray-100': request.filter.type === data.value },
                      'item text-gray-700 font-medium hover:bg-gray-100 flex justify-between items-center border-b border-gray-100 w-full text-left  group',
                    )}
                  >
                    <div
                      onClick={() => {
                        titleTypeCode.current = data.title;
                        request.filter.type = data.value;
                        dataTableRef?.current?.onChange(request);
                      }}
                      className="truncate cursor-pointer flex-1 hover:text-teal-900 item-text px-3 py-1"
                    >
                      {data.title}
                    </div>
                  </div>
                )}
              />
            </div>
            <div className="p-2 sm:p-0 block sm:hidden">
              <Select
                value={request.filter.type}
                className={'w-full'}
                options={typesCodeTypeManagementFacade.pagination?.content?.map((data: any) => ({
                  label: data.name,
                  value: data.code,
                }))}
                onChange={(e) => {
                  request.filter.type = e;
                  dataTableRef?.current?.onChange(request);
                }}
              />
            </div>
          </Spin>
        </div>
      </div>
      <div className="col-span-12 md:col-span-8 lg:col-span-9 intro-x">
        <div className="shadow rounded-xl w-full overflow-auto bg-white">
          <div className="sm:min-h-[calc(100vh-8.5rem)] overflow-y-auto p-3">
            <DataTable
              showSearch={false}
              facade={codeTypeManagementFacade}
              ref={dataTableRef}
              columns={_column.table()}
              leftHeader={<div className={'font-bold text-base'}>{titleTypeCode.current}</div>}
              rightHeader={
                <div className={'flex gap-2'}>
                  <Button
                    icon={<Plus className="icon-cud !h-5 !w-5" />}
                    text={t('routes.admin.Layout.Add')}
                    onClick={() => codeTypeManagementFacade.set({ data: undefined, isVisible: true })}
                  />
                </div>
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
};
export default Page;
