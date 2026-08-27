import AuthLayout from '@layouts/auth';
import { keyToken, lang, routerLinks } from '@utils';
import { Spin } from 'antd';
import React, { Suspense } from 'react';
import { HashRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';

const pages = [
  {
    layout: React.lazy(() => import('@layouts/auth')),
    isPublic: true,
    child: [
      {
        path: routerLinks('Login'),
        component: React.lazy(() => import('@pages/login')),
      },
      {
        path: routerLinks('ForgetPassword'),
        component: React.lazy(() => import('@pages/forget-password')),
      },
      {
        path: routerLinks('VerifyForotPassword'),
        component: React.lazy(() => import('@pages/forget-password/otp')),
      },
      {
        path: routerLinks('SetPassword'),
        component: React.lazy(() => import('@pages/forget-password/otp/set-password')),
      },
    ],
  },
  {
    layout: React.lazy(() => import('@layouts/admin')),
    isPublic: false,
    child: [
      {
        path: '/',
        component: routerLinks('Dashboard'),
      },
      {
        path: routerLinks('Dashboard'),
        component: React.lazy(() => import('@pages/dashboard')),
      },
      {
        path: routerLinks('MyProfile'),
        component: React.lazy(() => import('@pages/my-profile')),
      },
      {
        path: routerLinks('Parameter'),
        component: React.lazy(() => import('@pages/parameter')),
      },
      {
        path: routerLinks('Navigation'),
        component: React.lazy(() => import('@pages/navigation')),
      },
      {
        path: routerLinks('Code'),
        component: React.lazy(() => import('@pages/code')),
      },
      {
        path: routerLinks('User'),
        component: React.lazy(() => import('@pages/user')),
      },
      {
        path: routerLinks('KhachHang'),
        component: React.lazy(() => import('@pages/khach-hang')),
      },
      {
        path: routerLinks('KhachHang') + '/:id/:type/:idLSCS',
        component: React.lazy(() => import('@pages/khach-hang/')),
      },
      {
        path: routerLinks('SanPham'),
        component: React.lazy(() => import('@pages/san-pham')),
      },
      {
        path: routerLinks('LaiXe'),
        component: React.lazy(() => import('@pages/lai-xe')),
      },
      {
        path: routerLinks('Xe'),
        component: React.lazy(() => import('@pages/quan-ly-xe')),
      },
      {
        path: routerLinks('Kho'),
        component: React.lazy(() => import('@pages/kho')),
      },
      {
        path: routerLinks('ProductConfiguration'),
        component: React.lazy(() => import('@pages/product-configuration')),
      },
      {
        path: routerLinks('ChiPhiVanChuyen'),
        component: React.lazy(() => import('@pages/chi-phi-van-chuyen')),
      },
      {
        path: routerLinks('DonHang'),
        component: React.lazy(() => import('@pages/don-hang')),
      },
      {
        path: routerLinks('DonHang') + '/add',
        component: React.lazy(() => import('@pages/don-hang/add')),
      },
      {
        path: routerLinks('DonHang') + '/:id/edit',
        component: React.lazy(() => import('@pages/don-hang/add')),
      },
      {
        path: routerLinks('DonHang') + '/:id',
        component: React.lazy(() => import('@pages/don-hang/detail')),
      },
      {
        path: routerLinks('RightMapRole'),
        component: React.lazy(() => import('@pages/right-map-role')),
      },
      {
        path: routerLinks('TonKho'),
        component: React.lazy(() => import('@pages/kho-ton')),
      },
      {
        path: routerLinks('BaoCaoXuatNhap'),
        component: React.lazy(() => import('@pages/bao-cao-xuat-nhap')),
      },
    ], // 💬 generate link to here
  },
];

const Layout = ({
                  layout: MasterLayout,
                  isPublic = false,
                }: {
  layout: React.LazyExoticComponent<({ children }: { children?: React.ReactNode }) => JSX.Element>;
  isPublic: boolean;
}) => {
  if (isPublic || !!localStorage.getItem(keyToken))
    return (
      <MasterLayout>
        <Outlet />
      </MasterLayout>
    );

  return <Navigate to={`/${lang}${routerLinks('Login')}`} />;
};

const Page = ({
                component: Comp,
              }: {
  component: React.LazyExoticComponent<() => JSX.Element> | React.LazyExoticComponent<React.FC<{}>>;
}) => <Comp />;
const Pages = () => {
  return (
    <HashRouter>
      <Routes>
        <Route path={'/:lang'}>
          <Route path={'/:lang' + '/auth/login'} element={<AuthLayout />} />
          {pages.map(({ layout, isPublic, child }, index) => (
            // <Route key={index} element={<MasterLayout isPublic={isPublic} />}>
            <Route key={index} element={<Layout layout={layout} isPublic={isPublic} />}>
              {child.map(({ path = '', component }, subIndex: number) => (
                <Route
                  key={path + subIndex}
                  path={'/:lang' + path}
                  element={
                    <Suspense
                      fallback={
                        <Spin>
                          <div className="!w-screen !h-screen" />
                        </Spin>
                      }
                    >
                      {typeof component === 'string' ? (
                        <Navigate to={'/' + lang + component} />
                      ) : (
                        <Page component={component} />
                      )}
                    </Suspense>
                  }
                />
              ))}
            </Route>
          ))}
        </Route>
        <Route path="*" element={<Navigate to={'/' + lang + '/'} />} />
      </Routes>
    </HashRouter>
  );
};

export default Pages;
