import { EStatusNavigation, Navigation, NavigationFacade } from '@store';
import { lang, uuidv4 } from '@utils';
import { Collapse, Popover, TreeNodeProps } from 'antd';
import classNames from 'classnames';
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import './index.less';

const Layout = ({ isCollapsed = false }: { isCollapsed: boolean; permission?: string[] }) => {
  const navigationFacade = NavigationFacade();
  const navigate = useNavigate();
  const location = useLocation();
  const refMenu = useRef<HTMLUListElement>(null);
  const clearTime = useRef<NodeJS.Timeout>();
  const [listMenu, setListMenu] = useState<TreeNodeProps[]>();
  const [menuActive, setMenuActive] = useState<string[]>();

  useEffect(() => {
    if (!navigationFacade?.menu) navigationFacade.getMenu({ isAdmin: 1, isGetRoles: true });
  }, []);

  useEffect(() => {
    let linkActive = '';
    switch (navigationFacade.status) {
      case EStatusNavigation.userWebappPending:
        // eslint-disable-next-line no-case-declarations
        const tree = navigationFacade.menu;
        if (tree) {
          tree.forEach((item) => {
            if (
              !linkActive &&
              !!item.subChild &&
              item?.subChild?.some((subItem: any) => location.pathname.indexOf(`/${lang}${subItem.urlRewrite}`) > -1)
            ) {
              linkActive = `/${lang}${item.urlRewrite}`;
            }
          });
          setTimeout(() => setMenuActive([linkActive]), 200);

          const menus = tree
            .flatMap((itemFlatMap) => {
              if (itemFlatMap.subChild.length > 0) return [itemFlatMap, ...itemFlatMap.subChild];
              return itemFlatMap;
            })
            .find((itemFilter) => `/${lang}${itemFilter.urlRewrite}` === location.pathname);

          setListMenu(tree);
        }
        break;
    }
    return () => clearTimeout(clearTime.current);
  }, [navigationFacade.status, location]);

  useEffect(() => {
    if (isCollapsed) refMenu!.current!.scrollTop = 0;
  }, [isCollapsed]);

  const subMenu = (subChild: Navigation[]) => {
    return (
      <ul className={'menu'}>
        {subChild.map((subItem, index) => (
          <li
            key={index + uuidv4()}
            className={classNames(
              'group flex items-center pl-3 py-2 cursor-pointer rounded-2xl text-gray-700 font-medium hover:bg-gray-200',
              {
                '!text-blue-500 !fill-gray-300 !bg-white':
                  location.pathname.indexOf(`/${lang}${subItem.urlRewrite}`) > -1,
              },
            )}
            onClick={() =>
              location.pathname.indexOf(`/${lang}${subItem.urlRewrite}`) === -1 &&
              navigate({
                pathname: `/${lang}${subItem.urlRewrite}`,
                // search: `?${createSearchParams(subItem.queryParams)}`,
              })
            }
          >
            <p
              className={classNames(
                'h-1.5 w-1.5 mr-3 rounded-lg group-hover:bg-blue-500 bg-gray-300 group-hover:w-2.5 duration-300 ease-in-out transition-all',
                {
                  '!bg-blue-500': location.pathname.indexOf(`/${lang}${subItem.urlRewrite}`) > -1,
                },
              )}
            ></p>
            <a className="group-hover:text-blue-500 sub-menu">
              <span>{subItem.name}</span>
            </a>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <ul
      className="menu relative h-[calc(100vh-5rem)] text-sm text-gray-700 overflow-hidden hover:overflow-auto customScroll"
      id={'menu-sidebar'}
      ref={refMenu}
    >
      {!!menuActive &&
        listMenu &&
        listMenu.map((item, index) => {
          if (item.subChild && item.subChild.length === 0) {
            return (
              <li
                className={classNames(
                  'text-[14px] hover:bg-gray-200 flex items-center text-gray-700 my-2 mx-1 py-1 px-3 relative cursor-pointer before:top-2/5 text-primary before:absolute before:block before:h-4/5 before:w-1 before:rounded-ee-md before:rounded-se-md before:-start-1',
                  {
                    '!bg-blue-50 !text-blue-500 !fill-gray-300 opacity-100 before:bg-blue-500':
                      location.pathname === `/${lang}${item.urlRewrite}`,
                    'fill-gray-300': location.pathname !== `/${lang}${item.urlRewrite}`,
                    'justify-center h-10': isCollapsed,
                  },
                )}
                onClick={() =>
                  location.pathname !== `/${lang}${item.urlRewrite}` &&
                  navigate({
                    pathname: `/${lang}${item.urlRewrite}`,
                    // search: `?${createSearchParams(item.queryParams)}`,
                  })
                }
                key={index}
              >
                <div className={classNames({ absolute: isCollapsed })}>
                  <i className={`las text-2xl font-semibold ${item.iconClass}`}></i>
                </div>
                <p
                  className={classNames(
                    'ml-1.5 my-1 transition-all duration-300 ease-in-out font-medium line-clamp-1 ',
                    {
                      'opacity-100': !isCollapsed,
                    },
                  )}
                >
                  <span
                    className={classNames(' ', {
                      hidden: isCollapsed,
                    })}
                  >
                    {item.name}
                  </span>
                </p>
              </li>
            );
          } else {
            return isCollapsed ? (
              <Popover key={index} placement="rightTop" trigger={'hover'} content={subMenu(item.subChild)}>
                <li
                  className={classNames('h-12 m-2 px-2 text-gray-700 fill-gray-300 flex items-center', {
                    '!bg-blue-50 !text-blue-500 before:top-2/5 text-primary before:absolute before:block before:h-9 before:w-1 before:rounded-ee-md before:rounded-se-md before:-start-0 !fill-gray-300 before:bg-blue-500':
                      item?.subChild?.some(
                        (subItem: any) => location.pathname.indexOf(`/${lang}${subItem.urlRewrite}`) > -1,
                      ),
                  })}
                >
                  <i className={classNames(`las text-2xl font-semibold ${item.iconClass} ml-2`, {})}></i>
                </li>
              </Popover>
            ) : (
              <li className="px-1 " key={index}>
                <Collapse
                  accordion
                  bordered={false}
                  className={classNames('bg-white !text-gray-700', {
                    'active-menu': location.pathname.indexOf(`/${lang}${item.urlRewrite}`) > -1,
                  })}
                  defaultActiveKey={menuActive}
                  items={[
                    {
                      key: `/${lang}${item.urlRewrite}`,
                      showArrow: !isCollapsed,
                      label: (
                        <ul
                          className={classNames('text-gray-700 py-1 relative cursor-pointer', {
                            '!text-blue-500 before:top-2/5 text-primary before:absolute before:block before:h-4/5 before:w-1 before:rounded-ee-md before:rounded-se-md before:-start-3 !fill-gray-300 rounded-2xl before:bg-blue-500':
                              item?.subChild?.some(
                                (subItem: any) => location.pathname.indexOf(`/${lang}${subItem.urlRewrite}`) > -1,
                              ),
                          })}
                        >
                          <li
                            className={classNames('flex items-center fill-gray-300 menu ', {
                              'justify-center ': isCollapsed,
                            })}
                          >
                            <i
                              className={classNames(`las text-2xl font-semibold ${item.iconClass}`, {
                                'ml-1': !isCollapsed,
                              })}
                            ></i>
                            <span
                              className={classNames('pl-2.5 transition-all duration-300 ease-in-out font-medium', {
                                'opacity-100': !isCollapsed,
                                'opacity-0 text-[0]': isCollapsed,
                              })}
                            >
                              {item.name}
                            </span>
                          </li>
                        </ul>
                      ),
                      children: subMenu(item.subChild),
                    },
                  ]}
                />
              </li>
            );
          }
        })}
    </ul>
  );
};
export default Layout;
