import React, { ReactNode, useEffect } from 'react';
import { Navigation, NavigationFacade } from '@store';
import { useLocation } from 'react-router';
import { lang } from '@utils';
import { Breadcrumb, Space, TreeNodeProps } from 'antd';

type _T_Props = {
  breadCrumb?: string;
  tool?: ReactNode;
  onReload?: Function;
  visible?: boolean;
};
let parentMenu: TreeNodeProps[];
let subMenus: Navigation;
export const AppBreadCrumb = (props: _T_Props) => {
  const navigationFacade = NavigationFacade();
  const location = useLocation();

  useEffect(() => {
    if (navigationFacade && navigationFacade.menu) {
      subMenus = navigationFacade.menu
        .flatMap((itemFlatMap) => {
          if (itemFlatMap.subChild.length > 0) return [itemFlatMap, ...itemFlatMap.subChild];
          return itemFlatMap;
        })
        .find((itemFilter) => `/${lang}${itemFilter.urlRewrite}` === location.pathname);
      parentMenu = navigationFacade.menu.filter((item) => item.id === subMenus?.parentId);
    }
  }, [location.pathname]);
  subMenus = navigationFacade.menu
    ?.flatMap((itemFlatMap) => {
      if (itemFlatMap.subChild.length > 0) return [itemFlatMap, ...itemFlatMap.subChild];
      return itemFlatMap;
    })
    .find((itemFilter) => `/${lang}${itemFilter.urlRewrite}` === location.pathname);
  parentMenu = navigationFacade.menu?.filter((item) => item.id === subMenus?.parentId) ?? [];

  return (
    props.visible ?
    <Space className={'w-96 h-12 bg-white px-4 justify-between'}>

      {subMenus && subMenus?.parentId ? (
        <Breadcrumb
          className={'w-80'}
          items={[
            {
              title: `${parentMenu[0]?.name}`,
            },
            {
              title: `${subMenus.name}`,
            },
          ]}
        />
      ) : (
        navigationFacade.menu &&
        navigationFacade.menu?.length > 0 && <div className={'text-base w-80'}>{subMenus?.name}</div>
      )}
      {
        <Breadcrumb
          className={' w-80 flex !justify-start'}
          items={[
            {
              title: `${props.breadCrumb}`,
            },
          ]}
        />
      }
    </Space>
      : <div className={'h-12 bg-white justify-between'}></div>
  );
};
