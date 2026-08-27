import { Button } from '@core/button';
import { Form } from '@core/form';
import { PopConfirm } from '@core/pop-confirm';
import { EFormRuleType, EFormType, EStatusState } from '@models';
import { EStatusNavigation, Navigation, NavigationFacade, Role, RoleFacade } from '@store';
import { Arrow } from '@svgs';
import { lang, routerLinks } from '@utils';
import { Form as FormAnt, Input, Spin, Transfer, Tree, TreeNodeProps } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { icons } from './icon';

const Roles = ({ mockData, originRoles, onChangeKeyRole }: any) => {
  const [targetKeys, setTargetKeys] = useState(() => {
    const initialTargetKeys: string[] = [];
    originRoles.forEach((element: Role) => {
      if (mockData?.roleList?.includes(element?.id)) initialTargetKeys.push(String(element?.id));
    });
    onChangeKeyRole(initialTargetKeys);
    return initialTargetKeys;
  });

  const onChange: any['onChange'] = (nextTargetKeys: any) => {
    setTargetKeys(nextTargetKeys);
    onChangeKeyRole(nextTargetKeys);
  };

  return (
    <Transfer
      dataSource={originRoles}
      titles={['Nhóm', 'Nhóm đã chọn']}
      targetKeys={targetKeys}
      onChange={onChange}
      render={(item: any) => item.title}
      listStyle={{
        width: '100%',
      }}
    />
  );
};

const Page = () => {
  const navigationFacade = NavigationFacade();
  const roleFacade = RoleFacade();
  const parentModel = useRef<Navigation>();
  const clearTime = useRef<NodeJS.Timeout>();
  const [listMenu, setListMenu] = useState<TreeNodeProps[]>();
  const [filteredMenu, setFilteredMenu] = useState<any[]>();
  const [dataForm, setDataForm] = useState<any>(null);
  const selectedNode = useRef(false);
  const searchKeyword = useRef('');

  useEffect(() => {
    if (!navigationFacade?.tree) navigationFacade.getTree({ isAdmin: 1, isGetRoles: true });
    if (!roleFacade?.pagination) roleFacade.get({ page: 1, size: 30 });
  }, []);

  useEffect(() => {
    let linkActive = '';
    let tree;
    switch (navigationFacade.status) {
      case EStatusNavigation.navigationTreeFulfilled:
        tree = navigationFacade.tree;
        if (tree) {
          tree.forEach((item: any) => {
            if (
              !linkActive &&
              !!item.child &&
              location.hash.substring(1).indexOf(`/${lang}${routerLinks(item.name)}`) > -1
            ) {
              linkActive = `/${lang}${routerLinks(item.name)}`;
            }
          });
          setListMenu(tree);
        }
        break;
    }
    return () => clearTimeout(clearTime.current);
  }, [navigationFacade.status, location.hash]);

  useEffect(() => {
    switch (navigationFacade.status) {
      case EStatusState.postFulfilled:
      case EStatusState.putFulfilled:
      case EStatusState.deleteFulfilled:
        navigationFacade.getTree({ isAdmin: 1, isGetRoles: true });
        break;
    }
  }, [navigationFacade.status]);

  const loopMapSelect = (array?: any[], label = 'name', value = 'id'): any[] => {
    return array?.length
      ? array.map((item) => ({
          label: item[label],
          value: item[value],
          isLeaf: !item.children?.length,
          children: item.children ? loopMapSelect(item?.children, label, value) : undefined,
        }))
      : [];
  };

  const selectTree = (id: string) => {
    let node: any;
    selectedNode.current = id !== '';
    navigationFacade?.tree?.forEach((item: any) => {
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

  const { t } = useTranslation();
  const [form] = FormAnt.useForm();
  const keyRoleChild = useRef<string[]>([]);

  const onSaveNode = () => {
    const payload = {
      ...dataForm,
      ...form.getFieldsValue(),
      roleList: keyRoleChild.current,
      type: 1,
    };
    if (payload.parentId != null) {
      listMenu?.forEach((item: any) => {
        if (item.id === payload.parentId.value) {
          parentModel.current = item;
        }
      });
    }
    if (selectedNode.current) {
      navigationFacade.put({ ...payload, parentModel: parentModel.current });
    } else {
      navigationFacade.post({ ...payload, parentModel: parentModel.current });
    }
  };

  const onRemoveNode = (id: string) => {
    navigationFacade.delete(id);
    if (id === dataForm?.id) {
      setDataForm(null);
    }
  };

  useEffect(() => {
    if (listMenu) {
      const filtered = filterMenuBySearchKeyword(listMenu, searchKeyword.current);
      setFilteredMenu(filtered);
    }
  }, [searchKeyword, listMenu]);

  const filterMenuBySearchKeyword = (menu: any, keyword: string) => {
    return menu.filter((item: any) => {
      const nameIncludesKeyword = item.name.toLowerCase().includes(keyword.toLowerCase());
      const childrenIncludesKeyword = item.children && filterMenuBySearchKeyword(item.children, keyword).length > 0;
      return nameIncludesKeyword || childrenIncludesKeyword;
    });
  };

  const handleSearch = (value: string) => {
    const filtered = filterMenuBySearchKeyword(listMenu, value);
    setFilteredMenu(filtered);
  };

  return (
    <div className={'grid grid-cols-12 gap-3 px-2.5 pt-2.5'}>
      <div className="col-span-12 lg:col-span-4 xl:col-span-3 -intro-x">
        <div className="shadow rounded-xl w-full bg-white overflow-hidden">
          <div className="h-10 flex justify-between items-center border-b border-gray-100 px-2 py-6">
            <div className="relative mr-2">
              <Input
                className="h-9 pr-7 pl-2"
                placeholder="Nhập để tìm kiếm"
                onChange={(e) => handleSearch(e.target.value)}
              />
              <i className="text-base las la-search absolute top-1.5 right-2 z-[1]" />
            </div>
            <Button text={'Tạo mới'} onClick={() => selectTree('')} className={'text-gray-900'} />
          </div>
          <Spin spinning={navigationFacade.isLoading}>
            <div className="h-[calc(100vh-12rem)] overflow-y-auto relative scroll hidden sm:block">
              {filteredMenu && (
                <Tree
                  blockNode
                  showLine
                  autoExpandParent
                  defaultExpandAll
                  switcherIcon={<Arrow className={'w-4 h-4'} />}
                  treeData={filteredMenu}
                  titleRender={(node: any) => {
                    return (
                      <div className="group w-full flex items-center justify-between cursor-pointer">
                        <div className="flex-auto" onClick={() => selectTree(node.id)}>
                          {!!node?.icon && <i className={`mr-1 text-lg ${node?.icon}`} />}
                          <span className="mr-1">{node.title}</span>
                          {!node?.status && (
                            <small className="bg-red-500 text-white px-1 py-0.5 mr-1">
                              {t('routes.admin.navigations.disabled')}
                            </small>
                          )}
                        </div>
                        <div className="invisible group-hover:visible">
                          <PopConfirm
                            title="Bạn có chắc muốn xóa bản ghi này?"
                            placement="topLeft"
                            onConfirm={() => onRemoveNode(node.id)}
                          >
                            <i className="las text-lg text-red-500 la-trash" />
                          </PopConfirm>
                        </div>
                      </div>
                    );
                  }}
                />
              )}
            </div>
          </Spin>
        </div>
      </div>
      <div className="col-span-12 lg:col-span-8 xl:col-span-9 intro-x">
        <div className="shadow rounded-xl w-full h-full bg-white">
          <div>
            <div className="h-12 flex justify-between items-center border-b border-gray-100 px-4">
              <div className="flex font-medium items-baseline">
                <span className="text-black order-1 text-xl">{t('routes.admin.navigations.infomation')}</span>
              </div>
              {dataForm ? (
                <div className="flex flex-nowrap space-x-2 my-4">
                  <Button text={'Lưu lại'} className={'sm:min-w-24 justify-center sm:w-auto'} onClick={onSaveNode} />
                </div>
              ) : (
                ''
              )}
            </div>
            <div className="overflow-y-auto px-4 py-2 h-[calc(100vh-199px)]">
              {dataForm ? (
                <>
                  <Form
                    formAnt={form}
                    key={dataForm?.id + 'form'}
                    values={dataForm}
                    columns={[
                      {
                        name: 'name',
                        title: 'routes.admin.navigations.navaigationname',
                        formItem: {
                          rules: [
                            {
                              type: EFormRuleType.required,
                            },
                          ],
                        },
                      },
                      {
                        name: 'code',
                        title: 'routes.admin.navigations.navigationcode',
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
                        name: 'urlRewrite',
                        title: 'routes.admin.navigations.link',
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
                        name: 'order',
                        title: 'routes.admin.navigations.order',
                        formItem: {
                          col: 6,
                          type: EFormType.number,
                          rules: [
                            {
                              type: EFormRuleType.required,
                            },
                          ],
                        },
                      },
                      {
                        name: 'iconClass',
                        title: 'routes.admin.navigations.icon',
                        formItem: {
                          col: 6,
                          type: EFormType.select,
                          list: icons.map((i: any) => ({
                            value: i,
                            label: `<i class="la-lg ${i}"></i> ${i}`,
                          })),
                        },
                      },
                      {
                        name: 'parentId',
                        title: 'routes.admin.navigations.parentnavigation',
                        formItem: {
                          col: 6,
                          type: EFormType.treeSelect,
                          list: loopMapSelect(JSON.parse(JSON.stringify(navigationFacade?.tree ?? []))) || [],
                        },
                      },
                      {
                        name: 'queryParams',
                        title: 'Tham số truy vấn',
                        formItem: {
                          col: 6,
                        },
                      },
                      {
                        name: 'status',
                        title: 'routes.admin.user.active',
                        formItem: {
                          col: 6,
                          type: EFormType.switch,
                        },
                      },
                    ]}
                  />
                  <Roles
                    key={dataForm?.id}
                    mockData={dataForm}
                    originRoles={roleFacade?.pagination?.content?.map((item: any) => ({
                      ...item,
                      title: item?.name,
                      key: item?.id,
                    }))}
                    onChangeKeyRole={(data: any) => {
                      keyRoleChild.current = data;
                    }}
                  />
                </>
              ) : (
                <div className="w-full h-5/6 flex flex-col justify-center items-center">
                  <p className="text-lg text-gray-500">Menu cấu hình</p>
                  <Button text={'Tạo mới'} onClick={() => selectTree('')} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default Page;
