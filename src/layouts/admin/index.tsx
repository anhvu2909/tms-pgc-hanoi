import { BellOutlined, MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons';
import { Avatar } from '@core/avatar';
import AntMenu from '@layouts/admin/ant-menu';
import { AppBreadCrumb } from '@layouts/admin/AppBreadCrumb';
import { GlobalFacade, NotificationFacade } from '@store';
import { Key, Out, User } from '@svgs';
import { lang, routerLinks } from '@utils';
import { Badge, Button, Divider, Dropdown, Layout } from 'antd';
import { Content, Header } from 'antd/es/layout/layout';
import Sider from 'antd/es/layout/Sider';
import classNames from 'classnames';
import { t } from 'i18next';
import React, { ReactNode, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { NavLink, Outlet } from 'react-router-dom';
import './index.less';
import NotificationDropdown from './NotificationDropdown';
import { unwrapResult } from '@reduxjs/toolkit';

export type T_MasterCtx = {
  tool: [ReactNode, (tool: ReactNode) => void];
  breadCrumb?: ReactNode;
  visible?: boolean;
};

const MasterLayout = () => {
  const [tool, setTool] = useState<ReactNode>(null);
  const globalFacade = GlobalFacade();
  const notificationFacade = NotificationFacade();
  const { user } = globalFacade;
  const [isCollapsed, setIsCollapsed] = useState(innerWidth < 1280);
  const [isDesktop, setIsDesktop] = useState(innerWidth > 1280);
  const navigate = useNavigate();
  const outletCtx: T_MasterCtx = {
    tool: [tool, setTool],
  };
  window.scrollTo({ top: 0, behavior: 'smooth' });

  useEffect(() => {
    if (innerWidth < 1280 && !isCollapsed) {
      setTimeout(() => {
        setIsCollapsed(true);
      });
    }

    const handleResize = () => {
      if (innerWidth < 1280 && !isCollapsed) {
        setIsCollapsed(true);
      }
      setIsDesktop(innerWidth > 1280);
    };

    notificationFacade.requestNotification();
    notificationFacade.countUnread();
    notificationFacade
      .get({ page: 1, size: 8 })
      .then((x) => unwrapResult(x))
      .then((x) => {
        notificationFacade.set({
          list: [...(notificationFacade.list ?? []), ...(x.data?.content ?? [])],
          isPrevAvailable: (x.data?.page ?? 1) < (x.data?.totalPages ?? 1),
        });
      });

    window.addEventListener('resize', handleResize, { passive: true });
    return () => {
      window.removeEventListener('resize', handleResize, true);
    };
  }, []);

  return (
    <Layout className={'w-screen h-screen fixed'}>
      <Sider
        theme={'light'}
        width={240}
        collapsible
        collapsed={isCollapsed}
        onCollapse={(value) => setIsCollapsed(value)}
      >
        <NavLink to={'/vn/dashboard'} className="flex items-center group mx-3 my-2.5 ">
          <img
            className={classNames('w-12 min-w-12 mr-3', {
              'opacity-100 text-lg w-12': (!isCollapsed && isDesktop) || (isCollapsed && !isDesktop),
            })}
            src="/assets/images/logo.png"
            alt="logo"
          />
          <div
            id={'name-application'}
            className={`${isCollapsed ? 'hidden transition-all duration-100 opacity-1' : 'transition-all duration-150 absolute left-16 overflow-ellipsis overflow-hidden ml-2.5 opacity-100 delay-75 text-lg font-bold'} `}
          >
            Sale Management
          </div>
        </NavLink>
        <Divider className={'mt-0.5 mb-0'} />
        {/*<Menu isCollapsed={isCollapsed} permission={user?.userModel?.roleListCode}/>*/}
        <AntMenu />
      </Sider>
      <Layout>
        <Header className={'bg-white h-14 p-0'}>
          <div className={'w-full h-full flex items-center text-center justify-between'}>
            <div className="flex item-center text-center mx-3 gap-1">
              <Button
                onClick={() => {
                  setIsCollapsed(!isCollapsed);
                  setIsDesktop(isDesktop);
                }}
                type={'text'}
                icon={isCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              />
              <div
                className={classNames('xl:block hidden', {
                  'is-active': (isCollapsed && isDesktop) || (!isCollapsed && !isDesktop),
                })}
              ></div>
              <div className={'flex !text-center'}>
                <h1 className={'title-page text-lg font-bold hidden sm:block'}></h1>
              </div>
            </div>
            <div className="flex items-center gap-8 absolute right-4">
              <NotificationDropdown>
                <Badge count={notificationFacade.unreadCount ?? 0} overflowCount={99}>
                  <Button className="p-0 size-8 border-none">
                    <BellOutlined className="text-xl" />
                  </Button>
                </Badge>
              </NotificationDropdown>
              <Dropdown
                menu={{
                  items: [
                    {
                      key: '0',
                      className: 'hover:!bg-white !border-b-slate-300 border-b !rounded-none',
                      label: (
                        <div className="flex">
                          <Avatar src={user?.userModel?.avatarUrl || ''} size={8} />
                          <div className="text-left leading-none mr-3 block pl-2">
                            <div className="font-semibold text-black text-sm leading-snug mb-0.5">
                              {user?.userModel?.name}
                            </div>
                            <div className="text-gray-500 text-[10px]">{user?.userModel?.email}</div>
                          </div>
                        </div>
                      ),
                    },
                    {
                      key: '1',
                      className: 'h-11',
                      label: (
                        <div
                          className="flex"
                          onClick={() => navigate(`/${lang}${routerLinks('MyProfile')}?tab=1`, { replace: true })}
                        >
                          <div className="flex items-center">
                            <User className="w-6 h-6 pr-2 text-black" />
                          </div>
                          <div>{t('routes.admin.Layout.My Profile')}</div>
                        </div>
                      ),
                    },
                    {
                      key: '2',
                      className: 'h-11 !border-b-slate-300 border-b !rounded-none',
                      label: (
                        <div
                          className="flex"
                          onClick={() => navigate(`/${lang}${routerLinks('MyProfile')}?tab=2`, { replace: true })}
                        >
                          <div className="flex items-center">
                            <Key className="w-6 h-6 pr-2 text-black" />
                          </div>
                          <div>{t('routes.admin.Layout.Change Password')}</div>
                        </div>
                      ),
                    },
                    {
                      key: '3',
                      className: 'h-11',
                      label: (
                        <div
                          className="flex"
                          onClick={() => navigate(`/${lang}${routerLinks('Login')}`, { replace: true })}
                        >
                          <div className="flex items-center">
                            <Out className="w-6 h-6 pr-2 text-black" />
                          </div>
                          <div>{t('routes.admin.Layout.Sign out')}</div>
                        </div>
                      ),
                    },
                  ],
                }}
                placement="bottomRight"
              >
                <section className="flex items-center !rounded-full" id={'dropdown-profile'}>
                  <Avatar src={user?.userModel?.avatarUrl || ''} size={9} />
                </section>
              </Dropdown>
            </div>
          </div>
        </Header>
        <Divider className={'my-0'} />
        <Content className={'w-full !max-h-full overflow-auto miniScroll'}>
          <Outlet context={outletCtx} />
        </Content>
        {/* <Footer className={'text-center h-7 leading-7 !p-0'}>
          {t('layout.footer', { year: new Date().getFullYear() })}
        </Footer> */}
      </Layout>
    </Layout>
  );
};

export const SubHeader = (props: {
  children?: React.ReactNode;
  tool?: React.ReactNode;
  breadcrumb?: string;
  isVisible?: boolean;
}) => {
  return (
    <div className={'flex flex-col sticky top-0 z-10'}>
      <div className={'flex justify-between bg-white'}>
        <AppBreadCrumb breadCrumb={props.breadcrumb ?? ''} visible={props.isVisible ?? true} />
        <div className={'mx-3 flex items-center'}>{props.tool}</div>
      </div>
      <Content className={'!max-h-[90%] overflow-auto miniScroll'}>{props.children}</Content>
    </div>
  );
};

export default MasterLayout;
