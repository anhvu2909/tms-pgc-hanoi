import React, { forwardRef, useImperativeHandle, PropsWithChildren, Ref, useEffect } from 'react';
import { Modal as AntModal, Divider, Spin } from 'antd';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';

import { Button, Space } from 'antd';

export const Modal = forwardRef(
  (
    {
      facade,
      keyState = 'isVisible',
      keyId = 'id',
      title,
      widthModal = 9999,
      onOk,
      textSubmit,
      textCancel,
      className = '',
      footerCustom,
      children,
      name,
    }: Type,
    ref: Ref<{ handleCancel: () => void }>,
  ) => {
    useImperativeHandle(ref, () => ({ handleCancel }));
    const [searchParams, setSearchParams] = useSearchParams();
    const { data, isLoading, ...state } = facade;
    const { t } = useTranslation();
    const handleCancel = () => facade.set({ [keyState]: false });
    const handleOk = async () => {
      if (onOk) onOk();
      else handleCancel();
    };

    useEffect(() => {
      if (name) {
        if (
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
            searchParams.get('modal') || '',
          )
        )
          facade.getById({ id: searchParams.get('modal') });
        else if (searchParams.get('modal')) facade.set({ [keyState]: true, isLoading: false });
      }
    }, []);

    useEffect(() => {
      if (name) {
        if (facade[keyState] && !searchParams.has('modal')) {
          setSearchParams((params) => {
            params.set('modal', facade[keyId] || name);
            return params;
          });
        } else if (searchParams.has('modal')) {
          setSearchParams((params) => {
            params.delete('modal');
            return params;
          });
        }
      }
    }, [facade[keyState]]);

    return (
      <AntModal
        maskClosable={false}
        destroyOnClose={true}
        centered={true}
        width="100vw"
        className={'modal-fullScreen'}
        title={title && <h3 className="font-bold text-lg">{title(data)}</h3>}
        open={state[keyState]}
        onOk={handleOk}
        onCancel={handleCancel}
        wrapClassName={className}
        footer={
          !!onOk &&
          ((footerCustom && footerCustom(handleOk, handleCancel)) || (
            <>
              <Divider />
              <Space className={'flex justify-end sticky bottom-0'}>
                <Button onClick={handleCancel}>{t(textCancel || '') || t('components.datatable.cancel')}</Button>
                <Button onClick={handleOk} type={'primary'}>
                  {t(textSubmit || '') || t('components.form.modal.save')}
                </Button>
              </Space>
            </>
          ))
        }
      >
        <Spin spinning={isLoading}>{children}</Spin>
        {/* {} */}
      </AntModal>
    );
  },
);
Modal.displayName = 'HookModal';
type Type = PropsWithChildren<{
  facade: any;
  keyState?: string;
  keyId?: string;
  title?: (data: any) => string;
  widthModal?: number | string;
  onOk?: () => any;
  onCancel?: () => void;
  textSubmit?: string;
  textCancel?: string;
  className?: string;
  footerCustom?: (handleOk: () => Promise<void>, handleCancel: () => void) => JSX.Element[] | JSX.Element;
  name?: string;
}>;
