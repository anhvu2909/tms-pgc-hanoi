import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Form as FormAnt, Spin, Tree } from 'antd';
import { useLocation } from 'react-router';
import classNames from 'classnames';
import { mapTreeObject } from '@utils';
import { ParameterFacade } from '@store';
import { Form } from '@core/form';
import { getQueryStringParams } from '@core/data-table';
import { EFormRuleType, EFormType } from '@models';
import { Arrow } from '@svgs';
import { Button } from '@core/button';

const Page = () => {
  const parameterFacade = ParameterFacade();
  const location = useLocation();
  const request = getQueryStringParams(location.search);
  useEffect(() => {
    if (!parameterFacade.tree) parameterFacade.getAll();
  }, []);

  // useEffect(() => {
  //   renderTitleBreadcrumbs(t('titles.Parameter'), [
  //     { title: t('SuperAdmin'), link: '' },
  //     { title: t('titles.Parameter'), link: '' },
  //   ]);
  // }, [parameterFacade.status]);

  const { t } = useTranslation();
  const parametersFocus = useRef<string>('');
  const [dataForm, setDataForm] = useState<any>(null);
  const [form] = FormAnt.useForm();
  const onSaveNode = () => {
    const payload = {
      ...form.getFieldsValue(),
    };
    if (parameterFacade.data) {
      parameterFacade.put({ ...payload, groupCode: payload.groupCode?.value, id: parameterFacade.data?.id });
    } else {
      parameterFacade.post({ ...payload, groupCode: payload.groupCode?.value });
    }
  };

  const selectTree = (id: string) => {
    let node: any;
    parameterFacade?.tree?.forEach((item: any) => {
      if (!node) {
        if (item?.key === id) node = item;
        else {
          item?.children?.forEach((subItem: any) => {
            if (subItem?.key === id) node = subItem;
          });
        }
      }
    });
    setDataForm({ ...node });
  };

  return (
    <div className={'grid grid-cols-12 gap-3 px-2.5 pt-2.5'}>
      <div className="col-span-12 md:col-span-5 lg:col-span-4 -intro-x">
        <div className="shadow rounded-xl w-full bg-white overflow-hidden">
          <div className="h-14 flex justify-between items-center border-b border-gray-100 px-4 py-2">
            <h3 className={'font-bold text-lg'}>Tham số</h3>
            {dataForm ? <Button text={'Tạo mới'} onClick={() => selectTree('')} className={'text-gray-900'} /> : ''}
          </div>
          <Spin spinning={parameterFacade.isLoading}>
            <div className="h-[calc(100vh-12rem)] overflow-y-auto relative scroll hidden sm:block">
              <Tree
                blockNode
                showLine
                autoExpandParent
                defaultExpandAll
                switcherIcon={<Arrow className={'w-4 h-4'} />}
                treeData={mapTreeObject(parameterFacade.tree, { groupKey: 'groupCode' })}
                titleRender={(data: any) => (
                  <div
                    className={classNames(
                      { 'bg-gray-100': parametersFocus.current === data.title },
                      'item text-gray-700 font-medium hover:bg-gray-100 flex justify-between items-center border-b border-gray-100 w-full text-left  group',
                    )}
                  >
                    <div
                      onClick={() => selectTree(data.name)}
                      className="truncate cursor-pointer flex-1 hover:text-teal-900 item-text px-3 py-1"
                    >
                      {data.title}
                    </div>
                  </div>
                )}
              />
            </div>
          </Spin>
        </div>
      </div>
      <div className="col-span-12 md:col-span-7 lg:col-span-8 intro-x">
        <div className="shadow rounded-xl w-full h-full bg-white">
          <div className="h-14 flex justify-between items-center border-b border-gray-100 px-4 py-2">
            <h3 className={'font-bold text-lg'}>{t('pages.Parameter/Edit', { type: request.code })}</h3>
          </div>
          <div className="px-4 py-2 h-[calc(100vh-199px)]">
            {dataForm ? (
              <>
                <Spin spinning={parameterFacade.isLoading}>
                  <Form
                    values={dataForm}
                    formAnt={form}
                    className="intro-x"
                    columns={[
                      {
                        name: 'name',
                        title: 'Tên tham số',
                        formItem: {
                          col: 6,
                          rules: [
                            {
                              type: EFormRuleType.required,
                            },
                          ],
                        },
                      },
                      {
                        name: 'value',
                        title: 'Giá trị tham số hệ thống',
                        formItem: {
                          col: 6,
                          rules: [
                            {
                              type: EFormRuleType.required,
                            },
                          ],
                        },
                      },
                      {
                        name: 'groupCode',
                        title: 'Nhóm',
                        formItem: {
                          col: 6,
                          type: EFormType.treeSelect,
                          list: mapTreeObject(parameterFacade.tree, { groupKey: 'groupCode' }).map((item: any) => {
                            return { ...item, children: [] };
                          }),
                        },
                      },
                      {
                        name: 'isSystem',
                        title: 'Hệ thống',
                        formItem: {
                          col: 6,
                          type: EFormType.switch,
                        },
                      },
                      {
                        name: 'description',
                        title: 'Mô tả thông số hệ thống',
                        formItem: {
                          type: EFormType.textarea,
                        },
                      },
                    ]}
                    handSubmit={onSaveNode}
                    disableSubmit={parameterFacade.isLoading}
                  />
                </Spin>
              </>
            ) : (
              <div className="w-full h-5/6 flex flex-col justify-center items-center">
                <p className="text-lg text-gray-500">Cấu hình tham số</p>
                <Button text={'Tạo mới'} onClick={() => selectTree('')} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
export default Page;
