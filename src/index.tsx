import { App, ConfigProvider, message, Modal, notification, Spin } from 'antd';
import 'line-awesome/dist/line-awesome/css/line-awesome.min.css';
import i18n from 'i18next';
import XHR from 'i18next-xhr-backend';
import React, { lazy, Suspense, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { initReactI18next } from 'react-i18next';
import { Provider } from 'react-redux';
import { LoadingOutlined } from '@ant-design/icons';
import { GlobalFacade, setupMessaging, setupStore } from '@store';
import { lang, reportWebVitals } from '@utils';
import Router from './router';
import { MessageInstance } from 'antd/es/message/interface';
import { HookAPI } from 'antd/es/modal/useModal';

export let customMessage: MessageInstance;
export let customModal: HookAPI;
const fallbackLng = localStorage.getItem('i18nextLng');
if (!fallbackLng) {
  localStorage.setItem('i18nextLng', 'en');
}
i18n
  .use(XHR)
  // .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },
    fallbackLng: fallbackLng || 'en',
    interpolation: {
      escapeValue: false,
    },
  });
const store = setupStore();
let container: HTMLElement;
const Styling = lazy(() => import('./utils/init/styling'));
setupMessaging(store)

const Context = () => {
  const { locale, setLanguage } = GlobalFacade();
  const [api, contextHolder] = message.useMessage({});
  const [modal, modalContextHolder] = Modal.useModal();
  useEffect(() => {
    for (let i = 0; i < localStorage.length; i++) {
      if (localStorage.key(i)?.indexOf('temp-') === 0) {
        localStorage.removeItem(localStorage.key(i) || '');
      }
    }
    customMessage = api;
    customModal = modal;
    setLanguage(lang);
  }, []);

  return (
    <Styling>
      {contextHolder}
      {modalContextHolder}
      {/*<ConfigProvider theme={{ token: { controlHeight: 38 } }} locale={locale}>*/}
      <ConfigProvider theme={{ token: { controlHeight: 32 } }} locale={locale}>
        <App>
          <Router />
        </App>
      </ConfigProvider>
    </Styling>
  );
};

document.addEventListener(
  'DOMContentLoaded',
  () => {
    if (!container) {
      container = document.getElementById('root') as HTMLElement;
      const root = createRoot(container);

      root.render(
        <Suspense
          fallback={
            <div id="handle-preloader">
              <div className={'!w-full !h-full flex justify-center items-center'}>
                <Spin indicator={<LoadingOutlined style={{ fontSize: 26 }} spin />}>
                  <img width={80} height={80} src={'/assets/images/logo.png'} alt={'logo'} />
                </Spin>
              </div>
            </div>
          }
        >
          <Provider store={store}>
            <Context />
          </Provider>
        </Suspense>,
      );
    }
  },
  { passive: true },
);
reportWebVitals();